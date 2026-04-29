// twilioSmsWebhook — CANONICAL inbound SMS handler
// SPEED ARCHITECTURE:
//   1. Parse request — ~0ms
//   2. Compliance check (STOP/HELP/opted-out) — uses filter(), not list()
//   3. NEW LEAD: fire instant SMS immediately — no DB reads before this
//   4. Create/update lead + async pipeline — all non-blocking after SMS sent
// twilioInboundSms is DEPRECATED — this is the single active path
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const FIRST_SMS     = "Hey, sorry we missed your call — how can we help?";
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

// ── Send SMS via Twilio ────────────────────────────────────────────────────────
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

// ── Async pipeline — runs after EMPTY_TWIML is already returned ───────────────
function runPipeline(S, { lead, isNew, From, Body, MessageSid, now, firstSmsSid, timings }) {
  const log = (lead_id, event) =>
    S.entities.ActivityLog.create({ lead_id: lead_id || 'system', event, created_at: now }).catch(() => {});

  const run = async () => {
    try {
      const pipelineStart = Date.now();

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

      // Admin notification email (non-blocking)
      S.integrations.Core.SendEmail({
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
          <hr style="border-color:#1a1a1a;margin:16px 0"/>
          <p style="font-family:monospace;font-size:10px;color:#555">
            webhook_received_at: ${timings.webhook_received_at}<br/>
            sms_send_started_at: ${timings.sms_send_started_at || '—'}<br/>
            sms_send_completed_at: ${timings.sms_send_completed_at || '—'}<br/>
            total_initial_response_ms: ${timings.total_initial_response_ms || '—'}ms
          </p>
          <div style="margin-top:20px;padding:14px;background:#111;border-radius:8px">
            <p><a href="${appUrl}/AgentIntake" style="color:#00ff88">View Lead →</a></p>
            ${calendlyUrl ? `<p><a href="${calendlyUrl}" style="color:#00ff88">Book Appointment →</a></p>` : ''}
          </div>
        </div>`,
      }).catch(async (emailErr) => {
        await log(lead.id, `[twilioSmsWebhook] Admin notification FAILED: ${emailErr.message}`);
      });

      console.log(`[twilioSmsWebhook] Pipeline complete in ${Date.now() - pipelineStart}ms`);

    } catch (err) {
      console.error("[twilioSmsWebhook] Pipeline error:", err.message);
      log('system', `[twilioSmsWebhook] Pipeline error: ${err.message}`);
    }
  };

  run(); // fire-and-forget
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const webhookReceivedAt = Date.now();
  const now = new Date(webhookReceivedAt).toISOString();

  console.log(`[twilioSmsWebhook] webhook_received_at: ${now}`);

  const S   = createClientFromRequest(req).asServiceRole;
  const log = (lead_id, event) =>
    S.entities.ActivityLog.create({ lead_id: lead_id || 'system', event, created_at: now }).catch(() => {});

  const timings = { webhook_received_at: now };

  try {
    const text   = await req.text();
    const params = new URLSearchParams(text);
    const From       = params.get('From') || '';
    const Body       = params.get('Body') || '';
    const MessageSid = params.get('MessageSid') || '';

    console.log(`[twilioSmsWebhook] From:${From} Sid:${MessageSid} Body:"${Body.slice(0, 100)}"`);

    if (!From) return EMPTY_TWIML;

    const e164 = toE164(From) || From;

    // ── Compliance keywords — check immediately before any DB work ─────────────
    const msgTrimmed = Body.trim().toUpperCase();
    const isSTOP = ['STOP','STOPALL','UNSUBSCRIBE','CANCEL','QUIT','END'].includes(msgTrimmed);
    const isHELP = ['HELP','INFO','SUPPORT'].includes(msgTrimmed);

    // ── STEP 1: DB lookup first, then branch on new vs returning ─────────────
    //    New lead → send FIRST_SMS immediately. Returning → LLM contextual reply.
    let existingLead = null;
    let isNew = true;
    let firstSmsSid = null;

    if (!isSTOP && !isHELP) {
      // ── DB lookup FIRST to determine new vs returning ─────────────────────
      const matchingLeads = await S.entities.Lead.filter({ phone: e164 }).catch(() => []);
      existingLead = matchingLeads[0] || null;

      // Fallback: try raw From format if E164 didn't match
      if (!existingLead) {
        const raw = await S.entities.Lead.filter({ phone: From }).catch(() => []);
        existingLead = raw[0] || null;
      }

      isNew = !existingLead;

      if (isNew) {
        // ── NEW LEAD: send FIRST_SMS immediately ────────────────────────────
        timings.sms_send_started_at = new Date().toISOString();
        try {
          const result = await sendSms(e164, FIRST_SMS, STATUS_CB_URL);
          firstSmsSid = result.sid;
          timings.sms_send_completed_at = new Date().toISOString();
          timings.sms_sid = firstSmsSid;
          timings.total_initial_response_ms = Date.now() - webhookReceivedAt;
          console.log(`[twilioSmsWebhook] NEW LEAD — FIRST_SMS sent sid:${firstSmsSid} total_ms:${timings.total_initial_response_ms}`);
        } catch (smsErr) {
          timings.sms_send_completed_at = new Date().toISOString();
          timings.total_initial_response_ms = Date.now() - webhookReceivedAt;
          console.error(`[twilioSmsWebhook] FIRST_SMS FAILED after ${timings.total_initial_response_ms}ms:`, smsErr.message);
          S.integrations.Core.SendEmail({
            to: ADMIN_EMAIL,
            subject: `⚠️ MANO: Instant SMS failed — ${e164}`,
            body: `First SMS failed.\n\nPhone: ${e164}\nError: ${smsErr.message}\n\nManual follow-up required.`,
          }).catch(() => {});
        }
      } else {
        // ── RETURNING LEAD: route to smsProcess LLM for contextual reply ────
        console.log(`[twilioSmsWebhook] RETURNING LEAD — routing to smsProcess for ${e164}`);
        timings.routed_to_sms_process = true;

        // Build recent history from lead notes
        const history = [];
        if (existingLead.notes) {
          const lines = existingLead.notes.split('\n').filter(l => l.includes('| Out:'));
          for (const line of lines.slice(-6)) {
            const inMatch  = line.match(/In: (.+?) \| Out:/);
            const outMatch = line.match(/\| Out: (.+)$/);
            if (inMatch && outMatch) {
              history.push({ role: 'user',      content: inMatch[1].trim() });
              history.push({ role: 'assistant', content: outMatch[1].trim() });
            }
          }
        }

        // Invoke smsProcess LLM logic inline (avoids HTTP round-trip)
        const BOOKING_LINK  = 'https://calendly.com/monkeebizai';
        const MANO_SMS_PROMPT = `You are a friendly AI assistant for a home service contractor. Your job is to recover missed calls by qualifying the customer and booking them in.

QUALIFICATION FLOW — ask these in order, one at a time, based on what's missing:
1. What service do you need? (e.g. plumbing, AC, electrical, roofing)
2. Is this urgent or can it wait?
3. What city are you in?
4. Would you like to book a time?

Once they say yes to booking OR have answered all 4 questions, send the booking link: ${BOOKING_LINK}

RULES:
- 1–2 short sentences per reply. SMS-friendly. No bullet points. No lists.
- Ask only ONE question at a time.
- Be warm, helpful, and human-sounding.
- If they give you a service type, urgency, and city — move straight to booking.
- Never reveal you are an AI system or mention any internal tools.
- Never send the booking link until the customer is qualified (has given service type + urgency OR said yes to booking).`;

        const historyText = history.map(m => `${m.role === 'user' ? 'Customer' : 'MANO'}: ${m.content}`).join('\n');
        const prompt = historyText
          ? `${MANO_SMS_PROMPT}\n\nRecent conversation:\n${historyText}\n\nCustomer: ${Body}\nMANO:`
          : `${MANO_SMS_PROMPT}\n\nCustomer: ${Body}\nMANO:`;

        try {
          const llmResponse = await S.integrations.Core.InvokeLLM({ prompt });
          let reply = typeof llmResponse === 'string' ? llmResponse.trim() : '';
          if (reply.startsWith('MANO:')) reply = reply.slice(5).trim();
          if (!reply) reply = "Got it! What service do you need help with?";

          // Cap at 160 chars to avoid Twilio splitting
          if (reply.length > 160) reply = reply.slice(0, 157) + '…';

          await sendSms(e164, reply, STATUS_CB_URL);
          console.log(`[twilioSmsWebhook] smsProcess reply sent to ${e164}: "${reply.slice(0, 80)}"`);

          // Update lead notes with this exchange
          // Parse service/urgency/city from conversation for structured logging
          const serviceMatch = Body.match(/\b(plumb|ac|hvac|electric|roof|heat|cool|drain|leak|pipe|panel|furnace|water heater|pest|handyman|clean)\w*/i);
          const urgencyMatch = Body.match(/\b(urgent|emergency|asap|today|tonight|now|can.?t wait|soon|few days|next week|no rush|whenever)\b/i);
          const cityMatch    = Body.match(/\b([A-Z][a-z]+(?: [A-Z][a-z]+)?)\b/);
          const noteEntry = `[${now}] In: ${Body} | Out: ${reply}${serviceMatch ? ` | Service: ${serviceMatch[0]}` : ''}${urgencyMatch ? ` | Urgency: ${urgencyMatch[0]}` : ''}${cityMatch ? ` | City: ${cityMatch[0]}` : ''}`;
          S.entities.Lead.update(existingLead.id, {
            last_message: Body,
            notes: [existingLead.notes, noteEntry].filter(Boolean).join('\n').slice(-4000),
          }).catch(() => {});

        } catch (llmErr) {
          console.error(`[twilioSmsWebhook] LLM reply failed:`, llmErr.message);
          // Fallback reply so lead never gets silence
          sendSms(e164, "Got it! What service do you need help with?", STATUS_CB_URL).catch(() => {});
        }

        // Log and return — skip the rest of the new-lead pipeline
        log(existingLead.id, `[twilioSmsWebhook] Returning lead reply sent — Sid:${MessageSid}`);
        console.log(`[twilioSmsWebhook] twiml_returned_at:${new Date().toISOString()} total_ms:${Date.now() - webhookReceivedAt}`);
        return EMPTY_TWIML;
      }
    }
    const isOptedOut = existingLead?.opted_out === true;

    // ── STOP compliance ────────────────────────────────────────────────────────
    if (isSTOP) {
      if (existingLead) {
        await S.entities.Lead.update(existingLead.id, { opted_out: true, status: 'Closed — No Response' }).catch(() => {});
        await log(existingLead.id, `[SMS Compliance] STOP received — lead opted_out`);
      }
      await log(existingLead?.id || 'system', `[SMS Compliance] STOP from ${From}`);
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
      if (existingLead) await log(existingLead.id, `[SMS Compliance] HELP request from ${From}`);
      return EMPTY_TWIML;
    }

    // ── Opted-out — no automated response ─────────────────────────────────────
    if (isOptedOut) {
      log(existingLead.id, `[SMS Compliance] Inbound from opted-out lead ${From} — no response sent`);
      return EMPTY_TWIML;
    }

    // ── STEP 2: Create/update lead record (async after SMS sent) ───────────────
    let lead = existingLead;

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
      log(lead.id, `[twilioSmsWebhook] New lead created — From:${From}`);
    } else {
      const updatedNotes    = [lead.notes, `[Inbound SMS ${now}]: ${Body}`].filter(Boolean).join('\n');
      const reactivateStatus = ['Nurture', 'Closed — No Response'].includes(lead.status) ? 'Follow Up' : lead.status;
      S.entities.Lead.update(lead.id, {
        notes:        updatedNotes,
        last_message: Body,
        status:       reactivateStatus,
      }).catch(() => {});
      lead = { ...lead, notes: updatedNotes, status: reactivateStatus, last_message: Body };
      log(lead.id, `[twilioSmsWebhook] Existing lead updated — Sid:${MessageSid}`);
    }

    // ── STEP 3: Fire async pipeline (score, notify admin, follow-up) ───────────
    runPipeline(S, { lead, isNew, From, Body, MessageSid, now, firstSmsSid, timings });

    // Return immediately to Twilio
    console.log(`[twilioSmsWebhook] twiml_returned_at:${new Date().toISOString()} total_ms:${Date.now() - webhookReceivedAt}`);
    return EMPTY_TWIML;

  } catch (error) {
    console.error("[twilioSmsWebhook] FATAL:", error.message);
    log('system', `[twilioSmsWebhook] FATAL ERROR: ${error.message}`);
    return EMPTY_TWIML;
  }
});