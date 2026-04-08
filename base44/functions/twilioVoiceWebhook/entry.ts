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

Deno.serve(async (req) => {
  const S = createClientFromRequest(req).asServiceRole;
  const now = new Date().toISOString();

  const log = (lead_id, event) =>
    S.entities.ActivityLog.create({ lead_id: lead_id || 'system', event, created_at: now }).catch(() => {});

  try {
    // ── 1. Parse Twilio form payload ──────────────────────────────────────────
    const text = await req.text();
    await log('system', `[twilioVoiceWebhook] Raw payload received: ${text.slice(0, 500)}`);

    const params     = new URLSearchParams(text);
    const From       = params.get('From') || '';
    const To         = params.get('To') || '';
    const CallSid    = params.get('CallSid') || '';
    const CallStatus = params.get('CallStatus') || 'ringing';

    await log('system', `[twilioVoiceWebhook] Parsed — From:${From} To:${To} CallSid:${CallSid} CallStatus:${CallStatus}`);

    // ── 2. Return TwiML immediately so Twilio doesn't timeout ─────────────────
    // (Background work continues after response via fire-and-forget)
    const twiml = buildTwiML();

    // ── 3. Background: load settings, create/update lead, notify ─────────────
    processCallAsync(S, log, { From, To, CallSid, CallStatus, now }).catch(async (err) => {
      await log('system', `[twilioVoiceWebhook] Background processing error: ${err.message}`);
    });

    return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });

  } catch (error) {
    await log('system', `[twilioVoiceWebhook] FATAL ERROR: ${error.message}`);
    return new Response(buildTwiML(), { headers: { 'Content-Type': 'text/xml' } });
  }
});

function buildTwiML() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Thank you for calling Monkee Bizz AI. We are unable to take your call right now, but we will reach out to you shortly. Goodbye.</Say>
  <Hangup/>
</Response>`;
}

async function processCallAsync(S, log, { From, To, CallSid, CallStatus, now }) {
  const settings = await S.entities.AppSettings.list();
  const get = (k, d) => { const s = settings.find(x => x.key === k); return s ? s.value : d; };

  const adminEmail           = get('admin_email',             'info@monkeebizai.com');
  const businessName         = get('business_name',           'Monkee Bizz AI');
  const missedCallSmsEnabled = get('missed_call_sms_enabled', 'true') === 'true';
  const missedCallSmsMsg     = get('missed_call_sms_msg',     `Hi, we missed your call at ${businessName}! Reply here and we'll get back to you right away. 🐒`);
  const calendlyUrl          = get('calendly_event_url',       '');
  const appUrl               = get('app_url',                  'https://app.monkeebizzai.com');

  const e164 = toE164(From) || From;

  // ── Mapped lead fields ───────────────────────────────────────────────────
  const mappedLead = {
    phone:        e164,
    name:         null,
    email:        null,
    service_need: 'Inbound phone call',
    source:       'monkee',
    status:       'New',
    score:        'PENDING',
    processing_mode: 'twilio_voice',
    webhook_status:  'received',
  };

  await log('system', `[twilioVoiceWebhook] Mapped lead data: ${JSON.stringify(mappedLead)}`);

  // ── Find or create Lead ───────────────────────────────────────────────────
  const allLeads = await S.entities.Lead.list();
  let lead = allLeads.find(l => l.phone && toE164(l.phone) === e164);
  let isNew = false;

  if (lead) {
    await S.entities.Lead.update(lead.id, {
      notes: [lead.notes, `[Inbound Call ${now}] CallSid:${CallSid} Status:${CallStatus}`].filter(Boolean).join('\n'),
    });
    await log(lead.id, `[twilioVoiceWebhook] Existing lead updated — phone:${e164} CallSid:${CallSid} Status:${CallStatus}`);
  } else {
    lead = await S.entities.Lead.create({
      ...mappedLead,
      submission_token: CallSid || ('CALL-' + Date.now().toString(36).toUpperCase()),
      notes: `[Inbound Call ${now}] From:${From} To:${To} CallSid:${CallSid} Status:${CallStatus}`,
    });
    isNew = true;
    await log(lead.id, `[twilioVoiceWebhook] New lead created — phone:${e164} source:monkee CallSid:${CallSid}`);
  }

  // ── Admin email notification ──────────────────────────────────────────────
  try {
    await S.integrations.Core.SendEmail({
      to: adminEmail,
      subject: `📞 Inbound Call — ${e164} — ${businessName}`,
      body: `<div style="font-family:Arial,sans-serif;max-width:600px;background:#0a0a0a;color:#fff;padding:32px;border-radius:16px">
        <div style="font-family:monospace;font-size:11px;color:#00ff88;letter-spacing:3px;margin-bottom:16px">📞 INBOUND CALL</div>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px;border-bottom:1px solid #1a1a1a;color:#555;font-size:11px">FROM</td><td style="padding:8px;border-bottom:1px solid #1a1a1a">${e164}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #1a1a1a;color:#555;font-size:11px">TO</td><td style="padding:8px;border-bottom:1px solid #1a1a1a">${To}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #1a1a1a;color:#555;font-size:11px">CALL STATUS</td><td style="padding:8px;border-bottom:1px solid #1a1a1a">${CallStatus}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #1a1a1a;color:#555;font-size:11px">CALL SID</td><td style="padding:8px;border-bottom:1px solid #1a1a1a">${CallSid}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #1a1a1a;color:#555;font-size:11px">TIMESTAMP</td><td style="padding:8px;border-bottom:1px solid #1a1a1a">${now}</td></tr>
          <tr><td style="padding:8px;color:#555;font-size:11px">LEAD</td><td style="padding:8px">${isNew ? '🆕 NEW' : 'EXISTING'} — ID: ${lead.id}</td></tr>
        </table>
        <div style="margin-top:20px;padding:14px;background:#111;border-radius:8px">
          <p><a href="${appUrl}/AgentIntake" style="color:#00ff88">View Lead →</a></p>
          ${calendlyUrl ? `<p><a href="${calendlyUrl}" style="color:#00ff88">Book Appointment →</a></p>` : ''}
        </div>
      </div>`
    });
    await log(lead.id, `[twilioVoiceWebhook] Admin notification sent to ${adminEmail}`);
  } catch (emailErr) {
    await log(lead.id, `[twilioVoiceWebhook] Admin notification FAILED: ${emailErr.message}`);
  }

  // ── Missed call SMS follow-up ─────────────────────────────────────────────
  if (missedCallSmsEnabled && e164) {
    try {
      const smsSid = await sendSms(e164, missedCallSmsMsg);
      await log(lead.id, `[twilioVoiceWebhook] Missed-call SMS sent — sid:${smsSid} to:${e164}`);
    } catch (smsErr) {
      await log(lead.id, `[twilioVoiceWebhook] Missed-call SMS FAILED: ${smsErr.message}`);
    }
  }
}