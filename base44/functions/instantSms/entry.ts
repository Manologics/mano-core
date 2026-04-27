// instantSms — sends the first SMS immediately, then runs async AI/CRM/follow-up
// Architecture: event → instant SMS → fire-and-forget async pipeline
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const FIRST_SMS = "Hey, sorry we missed you. Is this repair, replacement, or emergency service?";
const BASE_URL  = Deno.env.get("BASE_URL") || "";

// ── Phone normalizer ──────────────────────────────────────────────────────────
function toE164(phone) {
  if (!phone) return null;
  const d = phone.replace(/\D/g, "");
  if (d.length === 10) return "+1" + d;
  if (d.length === 11 && d[0] === "1") return "+" + d;
  return null;
}

// ── Send SMS via Twilio ───────────────────────────────────────────────────────
async function sendTwilioSms(to, body, statusCallbackUrl) {
  const sid   = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  const msgSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID"); // optional
  const from  = Deno.env.get("TWILIO_NUMBER");

  const params = new URLSearchParams({ To: to, Body: body });

  // Prefer Messaging Service SID if available (better deliverability + dynamic sender)
  if (msgSid) {
    params.set("MessagingServiceSid", msgSid);
  } else {
    params.set("From", from);
  }

  // Attach status callback so we can track delivery
  if (statusCallbackUrl) {
    params.set("StatusCallback", statusCallbackUrl);
  }

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    }
  );

  const data = await res.json();
  console.log("[instantSms] Twilio response:", JSON.stringify({
    httpStatus: res.status,
    sid: data.sid,
    to: data.to,
    status: data.status,
    error_code: data.error_code,
    error_message: data.error_message,
  }));

  if (!res.ok || data.error_code) {
    throw new Error(`[${data.error_code || res.status}] ${data.error_message || data.message || "Twilio error"}`);
  }

  return { sid: data.sid, status: data.status };
}

// ── Admin fallback alert (fire-and-forget) ────────────────────────────────────
function alertAdmin(req, { phone, error, leadId }) {
  const run = async () => {
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: "tex@monkeebizai.com",
        subject: "⚠️ MANO: First SMS failed — manual follow-up needed",
        body: `First SMS failed to send.\n\nPhone: ${phone}\nLead ID: ${leadId || "not yet created"}\nError: ${error}\n\nManual outreach required.`,
      });
    } catch (e) {
      console.error("[instantSms] alertAdmin failed:", e.message);
    }
  };
  run();
}

// ── Async pipeline (AI scoring, CRM update, follow-up schedule) ───────────────
function runAsyncPipeline(req, { leadId, phone, message, token }) {
  const run = async () => {
    try {
      const base44 = createClientFromRequest(req);
      const S = base44.asServiceRole;

      // Basic intent scoring from message
      const lower = (message || "").toLowerCase();
      const score  = /emergency/.test(lower) ? "HOT" : /replacement|replace/.test(lower) ? "WARM" : "WARM";
      const status = score === "HOT" ? "Action Required" : "Follow Up";
      const urgency = /emergency/.test(lower) ? "high" : /replacement/.test(lower) ? "high" : "medium";

      if (leadId) {
        await S.entities.Lead.update(leadId, { score, status, urgency }).catch(() => {});
        await S.entities.ActivityLog.create({
          lead_id: leadId,
          event: `Async pipeline: scored ${score} | urgency: ${urgency} | trigger: ${token}`,
          created_at: new Date().toISOString(),
        }).catch(() => {});
      }

      // Schedule SMS follow-up sequence
      if (leadId && phone) {
        await base44.asServiceRole.functions.invoke("scheduleSmsFollowUp", { lead_id: leadId }).catch(() => {});
      }

      console.log("[instantSms] Async pipeline complete for lead:", leadId);
    } catch (e) {
      console.error("[instantSms] Async pipeline error:", e.message);
    }
  };
  run(); // fire-and-forget
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { phone, name, source, leadId, token, triggerMessage } = body;

    if (!phone) {
      return Response.json({ error: "phone is required" }, { status: 400 });
    }

    const e164 = toE164(phone);
    if (!e164) {
      return Response.json({ error: "Invalid phone number" }, { status: 400 });
    }

    const statusCallbackUrl = BASE_URL ? `${BASE_URL}/functions/twilioStatusCallback` : null;
    const timestamp = new Date().toISOString();

    // ── STEP 1: Send first SMS immediately ────────────────────────────────────
    let smsSid = null;
    let smsStatus = null;
    let smsError = null;

    try {
      const result = await sendTwilioSms(e164, FIRST_SMS, statusCallbackUrl);
      smsSid   = result.sid;
      smsStatus = result.status;
      console.log("[instantSms] First SMS sent:", smsSid, "→", e164);
    } catch (err) {
      smsError = err.message;
      console.error("[instantSms] First SMS FAILED:", smsError);
      alertAdmin(req, { phone: e164, error: smsError, leadId });
    }

    // ── STEP 2: Log SMS record (non-blocking) ─────────────────────────────────
    const logSms = async () => {
      try {
        const base44 = createClientFromRequest(req);
        const S = base44.asServiceRole;

        const smsRecord = {
          phone: e164,
          name: name || `Voice/Lead — ${e164}`,
          message_sid: smsSid || null,
          delivery_status: smsStatus || (smsError ? "failed" : "unknown"),
          sent_at: timestamp,
          error: smsError || null,
          source: source || "missed_call",
          lead_id: leadId || null,
          token: token || null,
        };

        // Update lead notes with SMS delivery info
        if (leadId) {
          const noteEntry = smsSid
            ? `[${timestamp}] First SMS sent — SID: ${smsSid} | status: ${smsStatus}`
            : `[${timestamp}] First SMS FAILED — error: ${smsError}`;

          await S.entities.Lead.update(leadId, {
            last_message: smsSid ? FIRST_SMS : null,
            notes: noteEntry,
            webhook_status: smsSid ? "sms_sent" : "sms_failed",
          }).catch(() => {});

          await S.entities.ActivityLog.create({
            lead_id: leadId,
            event: smsSid
              ? `Instant SMS sent — SID: ${smsSid} | to: ${e164}`
              : `Instant SMS FAILED — ${e164} — ${smsError}`,
            created_at: timestamp,
          }).catch(() => {});
        }

        console.log("[instantSms] SMS log complete:", JSON.stringify(smsRecord));
      } catch (e) {
        console.error("[instantSms] logSms failed:", e.message);
      }
    };
    logSms(); // fire-and-forget

    // ── STEP 3: Run async AI/CRM/follow-up pipeline ───────────────────────────
    if (smsSid || leadId) {
      runAsyncPipeline(req, { leadId, phone: e164, message: triggerMessage, token });
    }

    // ── Return immediately ────────────────────────────────────────────────────
    return Response.json({
      success: true,
      sms_sent: !!smsSid,
      sms_sid: smsSid,
      sms_status: smsStatus,
      sms_error: smsError || null,
      phone: e164,
      timestamp,
    });

  } catch (error) {
    console.error("[instantSms] ERROR:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});