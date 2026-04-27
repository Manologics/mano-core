// twilioSmsWebhook — CANONICAL inbound SMS handler
// Architecture: instant first SMS → fire-and-forget async CRM/score/notify pipeline
// twilioInboundSms is DEPRECATED — this is the single active path
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const FIRST_SMS     = "Hey, sorry we missed you. Is this repair, replacement, or emergency service?";
const BASE_URL      = Deno.env.get("BASE_URL") || "";
const STATUS_CB_URL = BASE_URL ? `${BASE_URL}/functions/twilioStatusCallback` : null;
const ADMIN_EMAIL   = "tex@monkeebizai.com";

const EMPTY_TWIML = new Response('<?xml version="1.0"?><Response></Response>', {
  headers: { 'Content-Type': 'text/xml' },
});

function toE164(phone) {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits[0] === '1') return '+' + digits;
  return phone || null;
}

// Uses Messaging Service SID if available, falls back to TWILIO_NUMBER
async function sendSms(to, body, statusCallback) {
  const sid    = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token  = Deno.env.get('TWILIO_AUTH_TOKEN');
  const msgSid = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID');
  const from   = Deno.env.get('TWILIO_NUMBER');

  const params = new URLSearchParams({ To: to, Body: body });
  if (msgSid) params.set('MessagingServiceSid', msgSid);
  else params.set('From', from);
  if (statusCallback) params.set('StatusCallback', statusCallback);

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${sid}:${token}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  const data = await res.json();
  if (!res.ok || data.error_code) throw new Error(`[${data.error_code}] ${data.error_message || data.message}`);
  return { sid: data.sid, status: data.status };
}

function scoreLead(lead) {
  const u = { high: 3, medium: 2, low: 1 }[lead.urgency] || 1;
  const total = u + (lead.email ? 1 : 0) + (lead.phone ? 1 : 0) + (lead.business_type ? 1 : 0) + (lead.service_need ? 1 : 0);
  return total >= 6 ? 'HOT' : total >= 4 ? 'WARM' : 'COLD';
}

function routeFromScore(score) {
  return score === 'HOT' ? 'Action Required' : score === 'WARM' ? 'Follow Up' : 'Nurture';
}

// ── Async pipeline — runs after instant SMS is already sent ───────────────────
function runPipeline(S, { lead, isNew, From, Body, MessageSid, now, firstSmsSid }) {
  const log = (lead_id, event) =>
    S.entities.ActivityLog.create({ lead_id: lead_id || 'system', event, created_at: now }).catch(() => {});

  const run = async () => {
    try {
      // Load settings
      const settings    = await S.entities.AppSettings.list().catch(() => []);
      const get         = (k, d) => { const s = settings.find(x => x.key === k); return s ? s.value : d; };
      const adminEmail  = get('admin_email',       ADMIN_EMAIL);
      const businessName= get('business_name',     'Monkee Bizz AI');
      const autoReply   = get('sms_auto_reply',     'true') === 'true';
      const autoReplyMsg= get('sms_auto_reply_msg', `Thanks for reaching out to ${businessName}! We received your message and will be in touch shortly. 🐒`);
      const calendlyUrl = get('calendly_event_url', '');
      const appUrl      = get('app_url',            'https://app.monkeebizzai.com');
      const e164        = toE164(From) || From;

      // Auto-score and route
      const score        = scoreLead(lead);
      const routedStatus = routeFromScore(score);
      const protectedStatuses = ['Booked', 'Closed — Won', 'Contacted', 'Appointment Requested'];

      let updatedLead = lead;
      if (!protectedStatuses.includes(lead.status)) {
        await S.entities.Lead.update(lead.id, {
          score,
          status: routedStatus,
          webhook_status: firstSmsSid ? 'sms_sent' : lead.webhook_status,
          last_message: firstSmsSid ? FIRST_SMS : lead.last_message,
          notes: firstSmsSid
            ? [lead.notes, `[${now}] First SMS sent — SID: ${firstSmsSid}`].filter(Boolean).join('\n')
            : lead.notes,
        }).catch(() => {});
        updatedLead = { ...lead, score, status: routedStatus };
        await log(lead.id, `[twilioSmsWebhook] Auto-scored: ${score} → Status: ${routedStatus}`);
      } else {
        await S.entities.Lead.update(lead.id, { score }).catch(() => {});
        await log(lead.id, `[twilioSmsWebhook] Auto-scored: ${score} (status preserved: ${lead.status})`);
      }

      // Admin notification email
      await S.integrations.Core.SendEmail({
        to: adminEmail,
        subject: `📱 Inbound SMS — ${From} — ${businessName}`,
        body: `<div style="font-family:Arial,sans-serif;max-width:600px;background:#0a0a0a;color:#fff;padding:32px;border-radius:16px">
          <div style="font-family:monospace;font-size:11px;color:#00ff88;letter-spacing:3px;margin-bottom:16px">📱 INBOUND SMS</div>
          <p><strong>From:</strong> ${From}</p>
          <p><strong>Message:</strong> ${Body || '(empty)'}</p>
          <p><strong>MessageSid:</strong> ${MessageSid}</p>
          <p><strong>Lead:</strong> ${isNew ? 'NEW' : 'EXISTING'} — ID: ${lead.id}</p>
          <p><strong>Score:</strong> ${score} | <strong>Status:</strong> ${updatedLead.status}</p>
          <p><strong>First SMS:</strong> ${firstSmsSid ? `Sent — SID: ${firstSmsSid}` : 'Not sent (existing lead)'}</p>
          <div style="margin-top:20px;padding:14px;background:#111;border-radius:8px">
            <p><a href="${appUrl}/AgentIntake" style="color:#00ff88">View Lead →</a></p>
            ${calendlyUrl ? `<p><a href="${calendlyUrl}" style="color:#00ff88">Book Appointment →</a></p>` : ''}
          </div>
        </div>`,
      }).catch(async (emailErr) => {
        await log(lead.id, `[twilioSmsWebhook] Admin notification FAILED: ${emailErr.message}`);
      });
      await log(lead.id, `[twilioSmsWebhook] Admin notification sent to ${adminEmail}`);

      // Secondary reply for existing leads with service intent or booking link
      const msg = Body.trim().toLowerCase();
      const SERVICE_KEYWORDS = ['website','seo','marketing','social','ads','branding','design','automation','ai','app','help','need','want','looking','build','create','fix','manage','grow','email','content','video','photo','logo','repair','replace','emergency','hvac','heat','cool','ac','furnace'];
      const hasServiceIntent = SERVICE_KEYWORDS.some(k => msg.includes(k)) || msg.length > 10;

      if (!isNew && hasServiceIntent && calendlyUrl && !lead.booking_offered) {
        try {
          const bookingMsg = `Got it! You can book a quick call here: ${calendlyUrl} 📅`;
          const { sid: bSid } = await sendSms(e164, bookingMsg, STATUS_CB_URL);
          await S.entities.Lead.update(lead.id, {
            score: 'WARM', status: 'Action Required', booking_offered: true,
            service_need: lead.service_need || Body,
            notes: [lead.notes, `[Booking link sent ${now}]`].filter(Boolean).join('\n'),
            last_message: bookingMsg,
          }).catch(() => {});
          await log(lead.id, `[twilioSmsWebhook] Booking link sent — sid:${bSid}`);
        } catch (smsErr) {
          await log(lead.id, `[twilioSmsWebhook] Booking link FAILED: ${smsErr.message}`);
        }
      } else if (autoReply && !isNew && !hasServiceIntent && e164) {
        // Existing lead, no service intent — send auto-reply
        try {
          const { sid: aSid } = await sendSms(e164, autoReplyMsg, STATUS_CB_URL);
          await log(lead.id, `[twilioSmsWebhook] Auto-reply sent — sid:${aSid}`);
        } catch (smsErr) {
          await log(lead.id, `[twilioSmsWebhook] Auto-reply FAILED: ${smsErr.message}`);
        }
      }

    } catch (err) {
      console.error("[twilioSmsWebhook] Pipeline error:", err.message);
      log('system', `[twilioSmsWebhook] Pipeline error: ${err.message}`);
    }
  };

  run(); // fire-and-forget
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const S   = createClientFromRequest(req).asServiceRole;
  const now = new Date().toISOString();
  const log = (lead_id, event) =>
    S.entities.ActivityLog.create({ lead_id: lead_id || 'system', event, created_at: now }).catch(() => {});

  try {
    const text   = await req.text();
    const params = new URLSearchParams(text);
    const From       = params.get('From') || '';
    const Body       = params.get('Body') || '';
    const MessageSid = params.get('MessageSid') || '';

    console.log(`[twilioSmsWebhook] From:${From} Sid:${MessageSid} Body:"${Body.slice(0, 100)}"`);

    if (!From) return EMPTY_TWIML;

    const e164 = toE164(From) || From;

    // ── Compliance keywords — handle immediately ───────────────────────────────
    const msgTrimmed = Body.trim().toUpperCase();
    const isSTOP = ['STOP','STOPALL','UNSUBSCRIBE','CANCEL','QUIT','END'].includes(msgTrimmed);
    const isHELP = ['HELP','INFO','SUPPORT'].includes(msgTrimmed);

    // ── Dedup — find existing lead ─────────────────────────────────────────────
    const allLeads   = await S.entities.Lead.list().catch(() => []);
    let lead         = allLeads.find(l => l.phone && toE164(l.phone) === e164);
    const isNew      = !lead;
    const isOptedOut = lead?.opted_out === true;

    // ── STOP compliance ────────────────────────────────────────────────────────
    if (isSTOP) {
      if (lead) {
        await S.entities.Lead.update(lead.id, { opted_out: true, status: 'Closed — No Response' }).catch(() => {});
        await log(lead.id, `[SMS Compliance] STOP received — lead opted_out`);
      }
      await log(lead?.id || 'system', `[SMS Compliance] STOP from ${From}`);
      return EMPTY_TWIML;
    }

    // ── HELP compliance ────────────────────────────────────────────────────────
    if (isHELP) {
      sendSms(e164, `For support email tex@monkeebizai.com. To stop messages, reply STOP.`).catch(() => {});
      S.integrations.Core.SendEmail({
        to: ADMIN_EMAIL,
        subject: `📟 HELP Request — ${From}`,
        body: `A HELP request was received from ${From}. Please follow up manually.`,
      }).catch(() => {});
      if (lead) await log(lead.id, `[SMS Compliance] HELP request from ${From}`);
      return EMPTY_TWIML;
    }

    // ── Opted-out — no automated response ─────────────────────────────────────
    if (isOptedOut) {
      await log(lead.id, `[SMS Compliance] Inbound from opted-out lead ${From} — no response sent`);
      return EMPTY_TWIML;
    }

    // ── STEP 1: Send instant first SMS immediately for new leads ──────────────
    let firstSmsSid = null;
    if (isNew) {
      try {
        const result = await sendSms(e164, FIRST_SMS, STATUS_CB_URL);
        firstSmsSid = result.sid;
        console.log(`[twilioSmsWebhook] Instant first SMS sent: ${firstSmsSid} → ${e164}`);
      } catch (smsErr) {
        console.error("[twilioSmsWebhook] Instant first SMS FAILED:", smsErr.message);
        // Alert admin asynchronously
        S.integrations.Core.SendEmail({
          to: ADMIN_EMAIL,
          subject: `⚠️ MANO: Instant SMS failed — ${e164}`,
          body: `First SMS failed.\n\nPhone: ${e164}\nError: ${smsErr.message}\n\nManual follow-up required.`,
        }).catch(() => {});
      }
    }

    // ── STEP 2: Create/update lead record ──────────────────────────────────────
    if (isNew) {
      lead = await S.entities.Lead.create({
        name:             e164,
        phone:            e164,
        email:            '',
        service_need:     Body || 'Inbound SMS',
        status:           'New',
        score:            'PENDING',
        source:           'monkee',
        submission_token: MessageSid || ('SMS-' + Date.now().toString(36).toUpperCase()),
        processing_mode:  'twilio_inbound_sms',
        webhook_status:   firstSmsSid ? 'sms_sent' : 'received',
        notes:            `[Inbound SMS ${now}]: ${Body}`,
        last_message:     Body,
      });
      await log(lead.id, `[twilioSmsWebhook] New lead created — From:${From}`);
    } else {
      const updatedNotes    = [lead.notes, `[Inbound SMS ${now}]: ${Body}`].filter(Boolean).join('\n');
      const reactivateStatus = ['Nurture', 'Closed — No Response'].includes(lead.status) ? 'Follow Up' : lead.status;
      await S.entities.Lead.update(lead.id, {
        notes:       updatedNotes,
        last_message: Body,
        status:      reactivateStatus,
      }).catch(() => {});
      lead = { ...lead, notes: updatedNotes, status: reactivateStatus, last_message: Body };
      await log(lead.id, `[twilioSmsWebhook] Existing lead updated — Sid:${MessageSid}`);
    }

    // ── STEP 3: Fire async pipeline (score, notify admin, follow-up) ───────────
    runPipeline(S, { lead, isNew, From, Body, MessageSid, now, firstSmsSid });

    // Return immediately to Twilio
    return EMPTY_TWIML;

  } catch (error) {
    console.error("[twilioSmsWebhook] FATAL:", error.message);
    log('system', `[twilioSmsWebhook] FATAL ERROR: ${error.message}`);
    return EMPTY_TWIML;
  }
});