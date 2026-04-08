import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const TWILIO_FROM = '+16233001709';

function toE164(phone) {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits[0] === '1') return '+' + digits;
  return null;
}

async function sendSms(to, body, sid, token) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${sid}:${token}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ From: TWILIO_FROM, To: to, Body: body }).toString(),
  });
  const data = await res.json();
  if (!res.ok || data.error_code) throw new Error(`[${data.error_code}] ${data.message || data.error_message}`);
  return data.sid;
}

Deno.serve(async (req) => {
  const now = new Date().toISOString();
  console.log('[twilioInboundVoice] Webhook hit:', now);

  // CRITICAL: init SDK BEFORE consuming body — body can only be read once
  const base44 = createClientFromRequest(req);
  const S = base44.asServiceRole;

  let fromRaw = '', toNumber = '', callSid = '', callStatus = '';
  try {
    const text = await req.text();
    const params = Object.fromEntries(new URLSearchParams(text));
    console.log('[twilioInboundVoice] Payload parsed:', JSON.stringify(params));
    fromRaw    = params.From       || '';
    toNumber   = params.To         || '';
    callSid    = params.CallSid    || '';
    callStatus = params.CallStatus || '';
  } catch (err) {
    console.error('[twilioInboundVoice] Failed to parse payload:', err.message);
    return buildTwiml('Thanks for calling Monkee Biz AI. Please leave a message or text us and we will follow up shortly.');
  }

  console.log(`[twilioInboundVoice] From=${fromRaw} To=${toNumber} Sid=${callSid} Status=${callStatus}`);

  try {
    const e164 = toE164(fromRaw) || fromRaw;
    const token = Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();

    // Find or create lead by phone
    const allLeads = await S.entities.Lead.list();
    const existing = allLeads.find(l => {
      const lp = toE164(l.phone || '');
      return lp && lp === e164;
    });

    let lead;
    let isNew = false;

    if (existing) {
      lead = existing;
      const existingNotes = lead.notes || '';
      await S.entities.Lead.update(lead.id, {
        notes: existingNotes + `\n[CALL ${now}] Inbound call — Status: ${callStatus} — Sid: ${callSid}`,
      });
      console.log(`[twilioInboundVoice] Existing lead found: ${lead.id} — updated`);
    } else {
      lead = await S.entities.Lead.create({
        name:             e164,
        phone:            e164,
        email:            '',
        source,
        status:           'New',
        score:            'PENDING',
        submission_token: token,
        processing_mode:  'twilio_inbound_voice',
        webhook_status:   'received',
        notes:            `[CALL inbound ${now}] Status: ${callStatus} — Sid: ${callSid}`,
      });
      isNew = true;
      console.log(`[twilioInboundVoice] New lead created: ${lead.id}`);
    }

    // Activity log
    await S.entities.ActivityLog.create({
      lead_id: lead.id,
      event: `Inbound call received — Status: ${callStatus} — Sid: ${callSid}`,
      created_at: now,
    }).catch(() => {});
    console.log(`[twilioInboundVoice] Activity logged for lead ${lead.id}`);

    // Admin notification email
    try {
      await S.integrations.Core.SendEmail({
        to: adminEmail,
        subject: `📞 Inbound Call — ${e164} — ${businessName}`,
        body: `<div style="font-family:Arial,sans-serif;max-width:600px;background:#0a0a0a;color:#fff;padding:32px;border-radius:16px">
          <div style="font-family:monospace;font-size:11px;color:#00ff88;letter-spacing:3px;margin-bottom:16px">📞 INBOUND CALL</div>
          <p><strong>From:</strong> ${e164}</p>
          <p><strong>Call Status:</strong> ${callStatus}</p>
          <p><strong>Twilio SID:</strong> ${callSid}</p>
          <p><strong>Lead:</strong> ${isNew ? 'NEW — just created' : 'EXISTING — ' + lead.id}</p>
          <div style="margin-top:20px;padding:14px;background:#111;border-radius:8px">
            <p><a href="${appUrl}/AgentIntake" style="color:#00ff88">View Lead →</a></p>
          </div>
        </div>`
      });
      console.log(`[twilioInboundVoice] Admin notification sent to ${adminEmail}`);
      await S.entities.ActivityLog.create({
        lead_id: lead.id,
        event: `Admin notified — inbound call from ${e164}`,
        created_at: new Date().toISOString(),
      }).catch(() => {});
    } catch (emailErr) {
      console.error('[twilioInboundVoice] Email notification failed:', emailErr.message);
    }

    // Missed-call SMS trigger — fire only for inbound missed/no-answer calls
    const missedStatuses = ['no-answer', 'busy', 'failed', 'canceled'];
    if (missedCallSmsEnabled && missedStatuses.includes(callStatus)) {
      const twilioSid   = Deno.env.get('TWILIO_ACCOUNT_SID');
      const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');
      if (twilioSid && twilioToken) {
        try {
          const smsSid = await sendSms(e164, missedCallSmsMsg, twilioSid, twilioToken);
          console.log(`[twilioInboundVoice] Missed-call SMS sent — sid: ${smsSid}`);
          await S.entities.ActivityLog.create({
            lead_id: lead.id,
            event: `Missed-call SMS sent — sid: ${smsSid}`,
            created_at: new Date().toISOString(),
          }).catch(() => {});
        } catch (smsErr) {
          console.error('[twilioInboundVoice] Missed-call SMS failed:', smsErr.message);
          await S.entities.ActivityLog.create({
            lead_id: lead.id,
            event: `Missed-call SMS FAILED: ${smsErr.message}`,
            created_at: new Date().toISOString(),
          }).catch(() => {});
        }
      }
    }

    // Return TwiML — answer the call
    console.log('[twilioInboundVoice] Returning TwiML greeting');
    return buildTwiml(voiceGreeting);
  } catch (error) {
    console.error('[twilioInboundVoice] Fatal error:', error.message);
    return buildTwiml('Thanks for calling Monkee Biz AI. Please leave a message or text us and we will follow up shortly.');
  }
});

function buildTwiml(greeting) {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${greeting}</Say>
  <Hangup/>
</Response>`;
  console.log('[twilioInboundVoice] TwiML returned:', twiml);
  return new Response(twiml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  });
}