import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const S = base44.asServiceRole;
    const body = await req.json();
    const { lead_id, followup_id } = body;

    if (!lead_id) return Response.json({ error: "Missing lead_id" }, { status: 400 });

    const settings = await S.entities.AppSettings.list();
    const get = (k, d) => { const s = settings.find(x => x.key === k); return s ? s.value : d; };
    const adminEmail = get("admin_email", "info@monkeebizai.com");
    const appUrl = get("app_url", "https://app.monkeebizzai.com");
    const calendlyUrl = get("calendly_event_url", "");

    const now = new Date().toISOString();
    const lead = await S.entities.Lead.get(lead_id);

    const [allFU] = await Promise.all([S.entities.FollowUp.list()]);
    const leadFUs = allFU.filter(f => f.lead_id === lead_id);

    const respondedFU = followup_id ? leadFUs.find(f => f.id === followup_id) : leadFUs.find(f => f.status === "Sent");
    const attemptN = respondedFU?.attempt_number || 1;

    // Update responded record
    const updates = leadFUs.map(f => {
      if (f.status === "Pending") {
        return S.entities.FollowUp.update(f.id, { status: "Skipped" });
      }
      if (f.id === respondedFU?.id || (!followup_id && f.status === "Sent")) {
        return S.entities.FollowUp.update(f.id, { status: "Responded", response_received: true, response_at: now });
      }
      return Promise.resolve();
    });
    await Promise.all(updates);
    await S.entities.Lead.update(lead_id, { status: "Contacted" });

    const log = (event) => S.entities.ActivityLog.create({ lead_id, event, created_at: now }).catch(() => {});
    await log("Lead responded to follow-up — sequence paused");
    await log("Remaining follow-up attempts cancelled");

    const notifyBody = `<div style="font-family:Arial,sans-serif;max-width:600px;background:#0a0a0a;color:#fff;padding:32px;border-radius:16px">
      <div style="font-family:monospace;font-size:11px;color:#00ff88;letter-spacing:3px;margin-bottom:20px">🙌 LEAD RESPONDED</div>
      <p><strong>Lead:</strong> ${lead.name}</p>
      <p><strong>Score:</strong> ${lead.score || "—"}</p>
      <p><strong>Phone:</strong> ${lead.phone || "—"}</p>
      <p><strong>Email:</strong> ${lead.email || "—"}</p>
      <p><strong>Responded after:</strong> Attempt ${attemptN}</p>
      <div style="margin-top:20px;padding:14px;background:#111;border-radius:8px">
        <p style="margin:0 0 8px;font-family:monospace;font-size:10px;color:#555">QUICK ACTIONS</p>
        <p><a href="${appUrl}/AgentIntake" style="color:#00ff88">View Lead →</a></p>
        ${calendlyUrl ? `<p><a href="${calendlyUrl}" style="color:#00ff88">Schedule Appointment →</a></p>` : ""}
        <p><a href="${appUrl}/AgentFollowUp" style="color:#00ff88">View Follow-Up Queue →</a></p>
      </div>
    </div>`;

    await S.integrations.Core.SendEmail({
      to: adminEmail,
      subject: `🙌 Lead Responded — ${lead.name} — ${lead.score || ""}`,
      body: notifyBody
    }).catch(() => {});
    await log("Admin notified — lead response detected");

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});