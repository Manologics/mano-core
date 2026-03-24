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

    const businessName  = get("business_name",         "Monkee Bizz AI");
    const retentionFrom = get("retention_from_name",   businessName);
    const upsellLink    = get("retention_upsell_link", "");
    const tz            = get("app_timezone",          "America/Phoenix");

    const lead = await S.entities.Lead.get(lead_id);
    const allEvents = await S.entities.RetentionEvents.list();
    const leadEvents = allEvents.filter(e => e.lead_id === lead_id);
    const bookings = await S.entities.Booking.list();
    const now = new Date();

    const log = (event) => S.entities.ActivityLog.create({ lead_id, event, created_at: now.toISOString() }).catch(() => {});

    // Safety checks
    if (lead.retention_opt_out) {
      await log("Manual retention send blocked — opted out");
      return Response.json({ blocked: true, reason: "opted_out" });
    }

    const completedBooking = bookings.find(b => b.lead_id === lead_id && b.status === "Completed");
    if (!completedBooking) {
      await log("Manual retention send blocked — no completed booking found");
      return Response.json({ blocked: true, reason: "no_completed_booking" });
    }

    if (lead.last_retention_sent_at) {
      const gap = now - new Date(lead.last_retention_sent_at);
      if (gap < 2 * 60 * 60 * 1000) {
        const lastSentDisplay = new Date(lead.last_retention_sent_at).toLocaleString("en-US", { timeZone: tz, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
        await log(`Manual retention send blocked — minimum send gap enforced (last sent: ${lastSentDisplay})`);
        return Response.json({ blocked: true, reason: "recent_send", last_sent: lead.last_retention_sent_at });
      }
    }

    if (lead.last_completed_booking_at) {
      const newerBooking = bookings.find(b =>
        b.lead_id === lead_id &&
        ["Requested", "Confirmed", "Rescheduled", "Completed"].includes(b.status) &&
        new Date(b.created_date) > new Date(lead.last_completed_booking_at)
      );
      if (newerBooking) {
        await log("Manual retention send blocked — client rebooked");
        return Response.json({ blocked: true, reason: "client_rebooked" });
      }
    }

    // Duplicate manual_reengage check
    const existingManual = leadEvents.find(e => e.event_type === "manual_reengage" && ["Pending", "Sent"].includes(e.status));
    if (existingManual) {
      await log("Manual re-engage skipped — active manual re-engage already exists");
      return Response.json({ blocked: true, reason: "already_pending" });
    }

    const emailBody = `<div style="font-family:Arial,sans-serif;max-width:600px;background:#0a0a0a;color:#fff;padding:32px;border-radius:16px">
      <p>Hi ${lead.name},</p>
      <p>Wanted to reach back out and see how things are going.</p>
      <p>If anything new has come up or if you want to reconnect, we are here.</p>
      ${upsellLink ? `<p><a href="${upsellLink}" style="color:#8b5cf6">${upsellLink}</a></p>` : ""}
      <p style="color:#555;margin-top:24px">— The ${businessName} Team</p>
    </div>`;

    await S.integrations.Core.SendEmail({
      to: lead.email,
      from_name: retentionFrom,
      subject: `Wanted to reconnect — ${businessName}`,
      body: emailBody
    });

    const sentAt = now.toISOString();
    await S.entities.RetentionEvents.create({
      lead_id,
      event_type: "manual_reengage",
      status: "Sent",
      sent_at: sentAt,
      scheduled_at: sentAt
    });
    await S.entities.Lead.update(lead_id, {
      last_retention_sent_at: sentAt,
      retention_stage: "reengage_due"
    });
    await log("Manual re-engagement sent — client reactivated");

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});