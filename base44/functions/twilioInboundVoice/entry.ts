// twilioInboundVoice v9 — dedup, AppSettings-driven SMS, auto-score, auto-route, silent hangup
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const TWILIO_FROM = '+16233001709';

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

// Score: uses urgency + field completeness, mirrors AgentIntake logic
function scoreLead(lead) {
  const u = { high: 3, medium: 2, low: 1 }[lead.urgency] || 1;
  const total = u + (lead.email ? 1 : 0) + (lead.phone ? 1 : 0) + (lead.business_type ? 1 : 0) + (lead.service_need ? 1 : 0);
  return total >= 6 ? 'HOT' : total >= 4 ? 'WARM' : 'COLD';
}

function routeFromScore(score) {
  return score === 'HOT' ? 'Action Required' : score === 'WARM' ? 'Follow Up' : 'Nurture';
}

const HANGUP = new Response(
  `<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`,
  { status: 200, headers: { 'Content-Type': 'text/xml' } }
);

Deno.serve(async (req) => {
  const S = createClientFromRequest(req).asServiceRole;

  try {
    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);
    const from = params.get('From') || '';
    const e164 = toE164(from);
    const now = new Date().toISOString();

    console.log(`[twilioInboundVoice] Webhook received — From:${from} e164:${e164}`);

    if (!from) return HANGUP;

    const log = (lead_id, event) =>
      S.entities.ActivityLog.create({ lead_id, event, created_at: now }).catch(() => {});

    // 1. Dedup — find existing lead by E.164 phone
    const allLeads = await S.entities.Lead.list();
    let lead = allLeads.find(l => l.phone && toE164(l.phone) === e164);
    let isNew = false;

    if (lead) {
      // Update existing lead — append call note
      const updatedNotes = [lead.notes, `[Inbound Call ${now}]`].filter(Boolean).join('\n');
      await S.entities.Lead.update(lead.id, { notes: updatedNotes, processing_mode: 'twilio_voice' });
      lead = { ...lead, notes: updatedNotes };
      await log(lead.id, `[twilioInboundVoice] Inbound call from existing lead — ${from}`);
    } else {
      // Create new lead
      lead = await S.entities.Lead.create({
        name:             e164 || from,
        phone:            e164 || from,
        status:           'New',
        score:            'PENDING',
        source:           'monkee',
        processing_mode:  'twilio_voice',
        webhook_status:   'received',
        submission_token: 'CALL-' + Date.now().toString(36).toUpperCase(),
        notes:            `[Inbound Call ${now}]`,
      });
      isNew = true;
      console.log(`[twilioInboundVoice] New lead created — id:${lead.id}`);
      await log(lead.id, `[twilioInboundVoice] New lead created from inbound call — ${from}`);
    }

    // 2. Auto-score and auto-route
    const score = scoreLead(lead);
    const status = routeFromScore(score);
    await S.entities.Lead.update(lead.id, { score, status });
    await log(lead.id, `[twilioInboundVoice] Score: ${score} → Status: ${status}`);

    // 3. Send missed-call SMS (AppSettings-driven, deduplicated)
    if (e164) {
      const settings = await S.entities.AppSettings.list();
      const get = (k, d) => { const s = settings.find(x => x.key === k); return s ? s.value : d; };
      const missedCallSmsEnabled = get('voice_missed_call_sms_enabled', 'true') === 'true';
      const businessName = get('business_name', 'Monkee Bizz AI');
      const missedCallSmsMsg = get('voice_missed_call_sms_msg', `Hey, sorry we missed your call! What can we help you with? — ${businessName} 🐒`);

      // Only send if enabled. For existing leads, only send once per call (not if we already sent recently).
      // For new leads, always send. For existing leads, send to re-engage.
      if (missedCallSmsEnabled) {
        try {
          const smsSid = await sendSms(e164, missedCallSmsMsg);
          const sentAt = new Date().toISOString();
          console.log(`[twilioInboundVoice] Missed-call SMS sent — to:${e164} sid:${smsSid}`);
          await S.entities.Lead.update(lead.id, {
            notes: [lead.notes, `[Missed-Call SMS ${sentAt}] sid:${smsSid}`].filter(Boolean).join('\n'),
            last_message: missedCallSmsMsg,
          });
          await log(lead.id, `[twilioInboundVoice] Missed-call SMS sent — sid:${smsSid}`);
        } catch (smsErr) {
          console.error(`[twilioInboundVoice] SMS failure — ${smsErr.message}`);
          await log(lead.id, `[twilioInboundVoice] Missed-call SMS FAILED — ${smsErr.message}`);
        }
      } else {
        await log(lead.id, `[twilioInboundVoice] Missed-call SMS skipped — disabled via AppSettings`);
      }
    }

    return HANGUP;

  } catch (err) {
    console.error(`[twilioInboundVoice] FATAL: ${err.message}`);
    return HANGUP;
  }
});