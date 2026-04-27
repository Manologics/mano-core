// twilioStatusCallback — handles Twilio delivery status webhooks
// Tracks: queued, sent, delivered, failed, undelivered
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const body   = await req.text();
    const params = new URLSearchParams(body);

    const messageSid    = params.get("MessageSid")    || "";
    const messageStatus = params.get("MessageStatus") || "";
    const to            = params.get("To")            || "";
    const errorCode     = params.get("ErrorCode")     || null;
    const errorMessage  = params.get("ErrorMessage")  || null;
    const timestamp     = new Date().toISOString();

    console.log("[twilioStatusCallback] SID:", messageSid, "| Status:", messageStatus, "| To:", to, "| Error:", errorCode);

    // Only log meaningful statuses
    const trackStatuses = ["sent", "delivered", "failed", "undelivered"];
    if (!trackStatuses.includes(messageStatus)) {
      return new Response("OK", { status: 200 });
    }

    // Find lead by phone number and update delivery status
    const run = async () => {
      try {
        const base44 = createClientFromRequest(req);
        const S = base44.asServiceRole;

        // Find lead matching this phone
        const leads = await S.entities.Lead.filter({ phone: to });
        const lead  = leads.find(l => l.phone === to || l.phone === to.replace("+1", ""));

        if (!lead) {
          console.log("[twilioStatusCallback] No lead found for:", to);
          return;
        }

        const isFailed = messageStatus === "failed" || messageStatus === "undelivered";
        const note = `[${timestamp}] Twilio delivery: ${messageStatus.toUpperCase()} | SID: ${messageSid}${errorCode ? ` | Error ${errorCode}: ${errorMessage}` : ""}`;

        await S.entities.Lead.update(lead.id, {
          webhook_status: isFailed ? "sms_failed" : "sms_delivered",
          notes: `${lead.notes || ""}\n${note}`,
        }).catch(() => {});

        await S.entities.ActivityLog.create({
          lead_id: lead.id,
          event: note,
          created_at: timestamp,
        }).catch(() => {});

        // Trigger admin alert on failure
        if (isFailed) {
          console.log("[twilioStatusCallback] SMS FAILED for lead:", lead.id, "| Error:", errorCode, errorMessage);
          await S.integrations.Core.SendEmail({
            to: "tex@monkeebizai.com",
            subject: `⚠️ SMS delivery failed — ${to}`,
            body: `SMS delivery failed.\n\nPhone: ${to}\nLead: ${lead.name} (${lead.id})\nStatus: ${messageStatus}\nError: ${errorCode} — ${errorMessage || "unknown"}\nSID: ${messageSid}\n\nManual follow-up required.`,
          }).catch(() => {});
        }

        console.log("[twilioStatusCallback] Lead updated:", lead.id, "→", messageStatus);
      } catch (e) {
        console.error("[twilioStatusCallback] DB update failed:", e.message);
      }
    };

    run(); // fire-and-forget, return 200 to Twilio immediately
    return new Response("OK", { status: 200 });

  } catch (error) {
    console.error("[twilioStatusCallback] ERROR:", error.message);
    return new Response("OK", { status: 200 }); // always 200 to Twilio
  }
});