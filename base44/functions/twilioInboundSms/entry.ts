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
  console.log('[twilioInboundSms] Webhook hit:', now);

  // Twilio sends application/x-www-form-urlencoded
  let params;
  try {
    const text = await req.text();
    params = Object.fromEntries(new URLSearchParams(text));
    console.log('[twilioInboundSms] Payload parsed:', JSON.stringify(params));
  } catch (err) {
    console.error('[twilioInboundSms] Failed to parse payload:', err.message);
    return new Response('<Response/>', { status: 200, headers: { 'Content-Type': 'text/xml' } });
  }

  const fromRaw   = params.From    || '';
  const toNumber  = params.To      || '';
  const body      = params.Body    || '';
  const msgSid    = params.MessageSid || '';

  console.log(`[twilioInboundSms] From=${fromRaw} To=${toNumber} Sid=${msgSid} Body="${body}"`);

  try {
    const base44 = createClientFromRequest(req);
    const S = base44.asServiceRole;

    const settings = await S.entities.AppSettings.list();
    const get = (k, d) => { const s = settings.find(x => x.key === k); return s ? s.value : d; };
    const adminEmail      = get('admin_email',         'info@monkeebizai.com');
    const businessName    = get('business_name',       'Monkee Bizz AI');
    const autoReplyEnabled = get('sms_auto_reply_enabled', 'false') === 'true';
    const autoReplyMsg    = get('sms_auto_reply_message', `Thanks for reaching out to ${businessName}! We'll be in touch shortly.`);
    const appUrl          = get('app_url',             'https://app.monkeebizzai.com');

    const e164 = toE164(fromRaw) || fromRaw;
    const token  = Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
    const source = 'monkee';

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
      // Append inbound message to notes
      const existingNotes = lead.notes || '';
      const noteEntry = `\n[SMS ${now}] ${body}`;
      await S.entities.Lead.update(lead.id, {
        notes: existingNotes + noteEntry,
        status: lead.status === 'Nurture' || lead.status === 'Closed — No Response' ? 'Follow Up' : lead.status,
      });
      console.log(`[twilioInboundSms] Existing lead found: ${lead.id} — updated`);
    } else {
      lead = await S.entities.Lead.create({
        name:              e164,
        phone:             e164,
        email:             '',
        source,
        status:            'New',
        score:             'PENDING',
        submission_token:  token,
        processing_mode:   'twilio_inbound_sms',
        webhook_status:    'received',
        notes:             `[SMS inbound ${now}] ${body}`,
        service_need:      body || null,
      });
      isNew = true;
      console.log(`[twilioInboundSms] New lead created: ${lead.id}`);
    }

    // Activity log
    await S.entities.ActivityLog.create({
      lead_id: lead.id,
      event: `Inbound SMS received — Sid: ${msgSid} — "${body.substring(0, 80)}"`,
      created_at: now,
    }).catch(() => {});
    console.log(`[twilioInboundSms] Activity logged for lead ${lead.id}`);

    // Admin notification email
    try {
      await S.integrations.Core.SendEmail({
        to: adminEmail,
        subject: `📱 Inbound SMS — ${e164} — ${businessName}`,
        body: `<div style="font-family:Arial,sans-serif;max-width:600px;background:#0a0a0a;color:#fff;padding:32px;border-radius:16px">
          <div style="font-family:monospace;font-size:11px;color:#00ff88;letter-spacing:3px;margin-bottom:16px">📱 INBOUND SMS</div>
          <p><strong>From:</strong> ${e164}</p>
          <p><strong>Message:</strong> ${body || '(empty)'}</p>
          <p><strong>Twilio SID:</strong> ${msgSid}</p>
          <p><strong>Lead:</strong> ${isNew ? 'NEW — just created' : 'EXISTING — ' + lead.id}</p>
          <p><strong>Status:</strong> ${lead.status}</p>
          <div style="margin-top:20px;padding:14px;background:#111;border-radius:8px">
            <p><a href="${appUrl}/AgentIntake" style="color:#00ff88">View Lead →</a></p>
          </div>
        </div>`
      });
      console.log(`[twilioInboundSms] Admin notification sent to ${adminEmail}`);
      await S.entities.ActivityLog.create({
        lead_id: lead.id,
        event: `Admin notified — inbound SMS from ${e164}`,
        created_at: new Date().toISOString(),
      }).catch(() => {});
    } catch (emailErr) {
      console.error('[twilioInboundSms] Email notification failed:', emailErr.message);
    }

    // Optional auto-reply SMS
    if (autoReplyEnabled && isNew) {
      const twilioSid   = Deno.env.get('TWILIO_ACCOUNT_SID');
      const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');
      if (twilioSid && twilioToken) {
        try {
          const smsSid = await sendSms(e164, autoReplyMsg, twilioSid, twilioToken);
          console.log(`[twilioInboundSms] Auto-reply sent — sid: ${smsSid}`);
          await S.entities.ActivityLog.create({
            lead_id: lead.id,
            event: `Auto-reply SMS sent — sid: ${smsSid}`,
            created_at: new Date().toISOString(),
          }).catch(() => {});
        } catch (smsErr) {
          console.error('[twilioInboundSms] Auto-reply failed:', smsErr.message);
        }
      }
    }

    // Return empty TwiML — Twilio requires a valid XML response
    return new Response('<Response/>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('[twilioInboundSms] Fatal error:', error.message);
    return new Response('<Response/>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  }
});