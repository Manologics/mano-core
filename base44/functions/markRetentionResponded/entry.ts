import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const S = base44.asServiceRole;
    const body = await req.json();
    const { lead_id, event_id } = body;

    if (!lead_id) return Response.json({ error: "Missing lead_id" }, { status: 400 });

    const settings = await S.entities.AppSettings.list();
    const get = (k, d) => { const s = settings.find(x => x.key === k); return s ? s.value : d; };
    const adminEmail   = get("admin_email",            "info@monkeebizznus.com");
    const appUrl       = get("app_url",                "https://app.monkeebizzai.com");
    const businessName = get("business_name",          "Monkee Bizz AI");
    const upsellLink   = get("retention_upsell_link",  "");

    const now = new Date().toISOString();
    const lead = await S.entities.Lead.get(lead_id);
    const allEvents = await S.entities.RetentionEvents.list();
    const leadEvents = allEvents.filter(e => e.lead_id === lead_id);

    const respondedEvt = event_id
      ? leadEvents.find(e => e.id === event_id)
      : leadEvents.find(e => e.status === "Sent");

    const updates = leadEvents.map(e => {
      if (e.status === "Pending") return S.entities.RetentionEvents.update(e.id, { status: "Skipped" });
      if (e.id === respondedEvt?.id) return S.entities.RetentionEvents.update(e.id, { status: "Responded", response_received: true, response_at: now });
      return Promise.resolve();
    });
    await Promise.all(updates);
    await S.entities.Lead.update(lead_id, { retention_stage: "complete" });

    const log = (event) => S.entities.ActivityLog.create({ lead_id, event, created_at: now }).catch(() => {});
    await log("Retention response detected — remaining events cancelled");

    const notifyBody = `<div style="font-family:Arial,sans-serif;max-width:600px;background:#0a0a0a;color:#fff;padding:32px;border-radius:16px">
      <div style="font-family:monospace;font-size:11px;color:#8b5cf6;letter-spacing:3px;margin-bottom:16px">🙌 PAST CLIENT RE-ENGAGED</div>
      <p><strong>Client:</strong> ${lead.name}</p>
      <p><strong>Phone:</strong> ${lead.phone || "—"}</p>
      <p><strong>Email:</strong> ${lead.email || "—"}</p>
      <p><strong>Triggered by:</strong> ${respondedEvt?.event_type || "manual"}</p>
      <div style="margin-top:20px;padding:14px;background:#111;border-radius:8px">
        <p style="font-family:monospace;font-size:10px;color:#555;margin-bottom:8px">QUICK ACTIONS</p>
        <p><a href="${appUrl}/AgentRetention" style="color:#8b5cf6">View Client →</a></p>
        ${upsellLink ? `<p><a href="${upsellLink}" style="color:#8b5cf6">Book Next Step →</a></p>` : ""}
        <p><a href="${appUrl}/AgentRetention" style="color:#8b5cf6">View Retention Queue →</a></p>
      </div>
    </div>`;

    await S.integrations.Core.SendEmail({
      to: adminEmail,
      subject: `🙌 Past Client Re-Engaged — ${lead.name}`,
      body: notifyBody
    }).catch(() => {});
    await log("Admin notified — retention response detected");

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});