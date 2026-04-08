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
    await log('system', `[twilioSmsWebhook] Raw payload received: ${text.slice(0, 500)}`);

    const params = new URLSearchParams(text);
    const From       = params.get('From') || '';
    const To         = params.get('To') || '';
    const Body       = params.get('Body') || '';
    const MessageSid = params.get('MessageSid') || '';

    await log('system', `[twilioSmsWebhook] Parsed — From:${From} To:${To} MessageSid:${MessageSid} Body:"${Body.slice(0,100)}"`);

    if (!From) {
      return new Response('<?xml version="1.0"?><Response></Response>', {
        headers: { 'Content-Type': 'text/xml' }
      });
    }

    // ── 2. Load settings ──────────────────────────────────────────────────────
    const settings = await S.entities.AppSettings.list();
    const get = (k, d) => { const s = settings.find(x => x.key === k); return s ? s.value : d; };

    const adminEmail     = get('admin_email',       'info@monkeebizai.com');
    const businessName   = get('business_name',     'Monkee Bizz AI');
    const autoReply      = get('sms_auto_reply',    'true') === 'true';
    const autoReplyMsg   = get('sms_auto_reply_msg', `Thanks for reaching out to ${businessName}! We received your message and will be in touch shortly. 🐒`);
    const calendlyUrl    = get('calendly_event_url', '');
    const appUrl         = get('app_url',            'https://app.monkeebizzai.com');

    // ── 3. Find or create Lead ────────────────────────────────────────────────
    const e164 = toE164(From);
    const allLeads = await S.entities.Lead.list();
    let lead = allLeads.find(l => l.phone && toE164(l.phone) === e164);
    let isNew = false;

    if (lead) {
      await S.entities.Lead.update(lead.id, {
        notes: [lead.notes, `[Inbound SMS ${now}]: ${Body}`].filter(Boolean).join('\n'),
      });
      await log(lead.id, `[twilioSmsWebhook] Inbound SMS from existing lead — MessageSid:${MessageSid}`);
    } else {
      lead = await S.entities.Lead.create({
        name:            From,
        phone:           e164 || From,
        email:           '',
        service_need:    Body || 'Inbound SMS',
        status:          'New',
        score:           'PENDING',
        source:          'monkee',
        submission_token: MessageSid || ('SMS-' + Date.now().toString(36).toUpperCase()),
        processing_mode: 'twilio_sms',
        webhook_status:  'received',
        notes:           `[Inbound SMS ${now}]: ${Body}`,
      });
      isNew = true;
      await log(lead.id, `[twilioSmsWebhook] New lead created from inbound SMS — From:${From}`);
    }

    // ── 4. Admin notification email ───────────────────────────────────────────
    try {
      await S.integrations.Core.SendEmail({
        to: adminEmail,
        subject: `📱 Inbound SMS — ${From} — ${businessName}`,
        body: `<div style="font-family:Arial,sans-serif;max-width:600px;background:#0a0a0a;color:#fff;padding:32px;border-radius:16px">
          <div style="font-family:monospace;font-size:11px;color:#00ff88;letter-spacing:3px;margin-bottom:16px">📱 INBOUND SMS</div>
          <p><strong>From:</strong> ${From}</p>
          <p><strong>Message:</strong> ${Body || '(empty)'}</p>
          <p><strong>MessageSid:</strong> ${MessageSid}</p>
          <p><strong>Lead:</strong> ${isNew ? 'NEW' : 'EXISTING'} — ID: ${lead.id}</p>
          <div style="margin-top:20px;padding:14px;background:#111;border-radius:8px">
            <p><a href="${appUrl}/AgentIntake" style="color:#00ff88">View Lead →</a></p>
            ${calendlyUrl ? `<p><a href="${calendlyUrl}" style="color:#00ff88">Book Appointment →</a></p>` : ''}
          </div>
        </div>`
      });
      await log(lead.id, `[twilioSmsWebhook] Admin notification sent to ${adminEmail}`);
    } catch (emailErr) {
      await log(lead.id, `[twilioSmsWebhook] Admin notification FAILED: ${emailErr.message}`);
    }

    // ── 5. Intent detection & conversation flow ─────────────────────────────
    const msg = Body.trim().toLowerCase();

    // Detect if this is a service intent reply from an existing lead
    const SERVICE_KEYWORDS = ['website','seo','marketing','social','ads','branding','design','automation','ai','app','help','need','want','looking','build','create','fix','manage','grow','email','content','video','photo','logo'];
    const hasServiceIntent = SERVICE_KEYWORDS.some(k => msg.includes(k)) || msg.length > 10;

    if (!isNew && hasServiceIntent && calendlyUrl && !lead.booking_offered) {
      // Lead replied with service need → send booking link
      try {
        const bookingMsg = `Got it! You can book a quick call here: ${calendlyUrl} 📅`;
        const smsSid = await sendSms(e164, bookingMsg);
        await S.entities.Lead.update(lead.id, {
          score:           'WARM',
          status:          'Action Required',
          booking_offered: true,
          service_need:    lead.service_need || Body,
          notes:           [lead.notes, `[Booking link sent ${now}]`].filter(Boolean).join('\n'),
        });
        await log(lead.id, `[twilioSmsWebhook] Booking link sent — sid:${smsSid} score:WARM`);
      } catch (smsErr) {
        await log(lead.id, `[twilioSmsWebhook] Booking link send FAILED: ${smsErr.message}`);
      }
    } else if (autoReply && isNew && e164) {
      // New lead — send welcome (only if sendWelcomeSms automation isn't handling it)
      // Skip if welcome already handled by entity automation
    } else if (autoReply && !isNew && !hasServiceIntent && e164) {
      // Generic reply for non-intent messages
      try {
        const smsSid = await sendSms(e164, autoReplyMsg);
        await log(lead.id, `[twilioSmsWebhook] Auto-reply sent — sid:${smsSid}`);
      } catch (smsErr) {
        await log(lead.id, `[twilioSmsWebhook] Auto-reply FAILED: ${smsErr.message}`);
      }
    }

    // ── 6. Return empty TwiML (suppress Twilio default reply) ─────────────────
    return new Response('<?xml version="1.0"?><Response></Response>', {
      headers: { 'Content-Type': 'text/xml' }
    });

  } catch (error) {
    await log('system', `[twilioSmsWebhook] FATAL ERROR: ${error.message}`);
    return new Response('<?xml version="1.0"?><Response></Response>', {
      headers: { 'Content-Type': 'text/xml' }
    });
  }
});