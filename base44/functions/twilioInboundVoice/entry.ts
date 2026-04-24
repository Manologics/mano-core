// twilioInboundVoice v10 — safe, minimal, TwiML-first
// Returns valid TwiML for every request. Lead/SMS ops are fire-and-forget.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const TWILIO_FROM = '+16233001709';
const FORWARD_TO  = '+16232822252';

const TWIML_GATHER = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" timeout="8" action="/twilioVoiceMenu" method="POST">
    <Say voice="alice">Hey — this is Monkee Bizz AI. We'll text you in just a second to help you out. If you'd like to speak to someone now, press 1.</Say>
  </Gather>
  <Hangup/>
</Response>`;

const TWIML_DIAL = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>${FORWARD_TO}</Dial>
</Response>`;

const TWIML_HANGUP = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Hangup/>
</Response>`;

function xmlResponse(twiml) {
  return new Response(twiml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
  });
}

function toE164(phone) {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits[0] === '1') return '+' + digits;
  return phone || null;
}

async function sendSms(to, body) {
  const sid   = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${sid}:${token}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ From: TWILIO_FROM, To: to, Body: body }).toString(),
  });
  const data = await res.json();
  if (!res.ok || data.error_code) throw new Error(`[${data.error_code}] ${data.error_message || data.message}`);
  return data.sid;
}

function scoreLead(lead) {
  const u = { high: 3, medium: 2, low: 1 }[lead.urgency] || 1;
  const total = u + (lead.email ? 1 : 0) + (lead.phone ? 1 : 0) + (lead.business_type ? 1 : 0) + (lead.service_need ? 1 : 0);
  return total >= 6 ? 'HOT' : total >= 4 ? 'WARM' : 'COLD';
}

function routeFromScore(score) {
  return score === 'HOT' ? 'Action Required' : score === 'WARM' ? 'Follow Up' : 'Nurture';
}

Deno.serve(async (req) => {
  console.log('[twilioInboundVoice] Request received');

  // Parse body — but return TwiML immediately if body parse fails
  let params;
  try {
    const text = await req.text();
    params = new URLSearchParams(text);
  } catch (parseErr) {
    console.error('[twilioInboundVoice] Body parse error:', parseErr.message);
    return xmlResponse(TWIML_GATHER);
  }

  const From    = params.get('From')    || '';
  const To      = params.get('To')      || '';
  const CallSid = params.get('CallSid') || '';
  const Digits  = params.get('Digits')  || '';

  console.log(`[twilioInboundVoice] From:${From} To:${To} CallSid:${CallSid} Digits:"${Digits}"`);

  // If caller pressed 1 → dial forward immediately
  if (Digits === '1') {
    console.log('[twilioInboundVoice] Digit 1 pressed — dialing forward');
    return xmlResponse(TWIML_DIAL);
  }

  // If Digits present but not 1 → hangup
  if (Digits && Digits !== '1') {
    console.log(`[twilioInboundVoice] Digit ${Digits} pressed — hanging up`);
    return xmlResponse(TWIML_HANGUP);
  }

  // ── No digit yet: play greeting + gather ──────────────────────────────
  // Fire lead capture + SMS in the background — do NOT await before returning TwiML
  if (From) {
    const e164 = toE164(From);
    const now  = new Date().toISOString();

    // Background async — never blocks TwiML response
    (async () => {
      try {
        const S = createClientFromRequest(req).asServiceRole;

        const log = (lead_id, event) =>
          S.entities.ActivityLog.create({ lead_id, event, created_at: now }).catch(() => {});

        // Load settings
        const settings = await S.entities.AppSettings.list();
        const get = (k, d) => { const s = settings.find(x => x.key === k); return s ? s.value : d; };
        const missedCallSmsEnabled = get('voice_missed_call_sms_enabled', 'true') === 'true';
        const businessName         = get('business_name', 'Monkee Bizz AI');
        const missedCallSmsMsg     = get('voice_missed_call_sms_msg', `Hey, sorry we missed your call! What can we help you with? — ${businessName} 🐒`);

        // Dedup — find existing lead by E.164 phone
        const allLeads = await S.entities.Lead.list();
        let lead = allLeads.find(l => l.phone && toE164(l.phone) === e164);

        console.log(`[twilioInboundVoice] Lead lookup — ${lead ? 'EXISTING id:' + lead.id : 'NEW'}`);

        if (lead) {
          const updatedNotes = [lead.notes, `[Inbound Call ${now}] CallSid:${CallSid}`].filter(Boolean).join('\n');
          await S.entities.Lead.update(lead.id, { notes: updatedNotes, processing_mode: 'twilio_voice' });
          lead = { ...lead, notes: updatedNotes };
          await log(lead.id, `[twilioInboundVoice] Inbound call from existing lead — ${From} — CallSid:${CallSid}`);
        } else {
          lead = await S.entities.Lead.create({
            name:             e164 || From,
            phone:            e164 || From,
            status:           'New',
            score:            'PENDING',
            source:           'monkee',
            processing_mode:  'twilio_voice',
            webhook_status:   'received',
            submission_token: 'CALL-' + CallSid.slice(-8),
            notes:            `[Inbound Call ${now}] CallSid:${CallSid}`,
          });
          console.log(`[twilioInboundVoice] New lead created — id:${lead.id}`);
          await log(lead.id, `[twilioInboundVoice] New lead created from inbound call — ${From}`);
        }

        // Auto-score + route
        const score  = scoreLead(lead);
        const status = routeFromScore(score);
        await S.entities.Lead.update(lead.id, { score, status });
        await log(lead.id, `[twilioInboundVoice] Score:${score} → Status:${status}`);

        // Missed-call SMS
        if (e164 && missedCallSmsEnabled) {
          console.log(`[twilioInboundVoice] Attempting missed-call SMS to ${e164}`);
          try {
            const smsSid = await sendSms(e164, missedCallSmsMsg);
            console.log(`[twilioInboundVoice] SMS sent — sid:${smsSid}`);
            await S.entities.Lead.update(lead.id, {
              last_message: missedCallSmsMsg,
              notes: [lead.notes, `[Missed-Call SMS ${now}] sid:${smsSid}`].filter(Boolean).join('\n'),
            });
            await log(lead.id, `[twilioInboundVoice] Missed-call SMS sent — sid:${smsSid}`);
          } catch (smsErr) {
            console.error(`[twilioInboundVoice] SMS FAILED — ${smsErr.message}`);
            await log(lead.id, `[twilioInboundVoice] Missed-call SMS FAILED — ${smsErr.message}`);
          }
        } else {
          console.log(`[twilioInboundVoice] SMS skipped — ${!e164 ? 'no e164' : 'disabled via AppSettings'}`);
        }

      } catch (bgErr) {
        console.error(`[twilioInboundVoice] Background task error: ${bgErr.message}`);
      }
    })();
  }

  console.log('[twilioInboundVoice] Returning TWIML_GATHER');
  return xmlResponse(TWIML_GATHER);
});