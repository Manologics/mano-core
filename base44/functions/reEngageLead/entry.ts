import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const S = base44.asServiceRole;
    const body = await req.json();
    const { lead_id } = body;

    if (!lead_id) return Response.json({ error: "Missing lead_id" }, { status: 400 });

    const settings = await S.entities.AppSettings.list();
    const get = (k, d) => { const s = settings.find(x => x.key === k); return s ? s.value : d; };

    if (get("reengage_enabled", "true") !== "true") {
      return Response.json({ error: "Re-engagement is disabled in settings" }, { status: 403 });
    }

    const businessName = get("business_name", "Monkee Bizz AI");
    const calendlyUrl = get("calendly_event_url", "");

    const lead = await S.entities.Lead.get(lead_id);

    const emailBody = `<div style="font-family:Arial,sans-serif;max-width:600px;background:#0a0a0a;color:#fff;padding:32px;border-radius:16px">
      <p>Hi ${lead.name},</p>
      <p>It has been a while since we last connected.</p>
      <p>If your needs have changed or the timing is better now we would love to reconnect.</p>
      <p>What are you working on?</p>
      ${calendlyUrl ? `<p><a href="${calendlyUrl}" style="color:#00ff88">${calendlyUrl}</a></p>` : ""}
      <p style="color:#555;margin-top:24px">— The ${businessName} Team</p>
    </div>`;

    await S.integrations.Core.SendEmail({
      to: lead.email,
      subject: `It has been a while — ${businessName}`,
      body: emailBody
    });

    const now = new Date().toISOString();
    await Promise.all([
      S.entities.FollowUp.create({
        lead_id,
        sequence_type: "standard",
        attempt_number: 1,
        status: "Sent",
        sent_at: now,
        scheduled_at: now
      }),
      S.entities.Lead.update(lead_id, { status: "Follow Up" })
    ]);

    await S.entities.ActivityLog.create({ lead_id, event: "Manual re-engagement sent — lead reactivated", created_at: now });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});