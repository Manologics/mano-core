import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const allSettings = await base44.asServiceRole.entities.AppSettings.list();
    const get = (key, def = "") => { const s = allSettings.find(s => s.key === key); return s ? s.value : def; };
    const noShowWindowMinutes = parseInt(get("no_show_window_minutes", "30"));
    const adminEmail = get("admin_email", "info@monkeebizznus.com");
    const tz = get("app_timezone", "America/Phoenix");

    const bookings = await base44.asServiceRole.entities.Booking.list();
    const now = new Date();
    let flagged = 0;

    for (const booking of bookings) {
      if (booking.status !== "Confirmed" && booking.status !== "Rescheduled") continue;
      if (booking.no_show_flagged) continue;

      const apptTime = new Date(`${booking.scheduled_date}T${booking.scheduled_time}`);
      const minutesPast = (now - apptTime) / (1000 * 60);

      if (minutesPast < noShowWindowMinutes) continue;

      const log = async (event) => {
        await base44.asServiceRole.entities.ActivityLog.create({ lead_id: booking.lead_id, event, created_at: new Date().toISOString() });
      };

      // Flag as no-show
      await base44.asServiceRole.entities.Booking.update(booking.id, { status: "No-Show", no_show_flagged: true });
      await base44.asServiceRole.entities.Lead.update(booking.lead_id, { status: "Follow Up" });
      await log("No-show detected — lead returned to follow up");

      // Notify admin
      const lead = await base44.asServiceRole.entities.Lead.get(booking.lead_id).catch(() => null);
      const timeStr = apptTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz, timeZoneName: "short" });
      const dateStr = apptTime.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: tz });

      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: adminEmail,
          subject: `⚠️ No-Show — ${lead?.name || "Lead"} — ${dateStr}`,
          body: `<div style="font-family:Arial,sans-serif;max-width:600px;background:#0a0a0a;color:#fff;padding:32px;border-radius:16px">
            <div style="font-family:monospace;font-size:11px;color:#ff3333;letter-spacing:3px;margin-bottom:20px">NO-SHOW DETECTED</div>
            <p><strong>Lead:</strong> ${lead?.name || "—"}</p>
            <p><strong>Phone:</strong> ${lead?.phone || "—"}</p>
            <p><strong>Appointment:</strong> ${dateStr} at ${timeStr}</p>
            <p><strong>Action:</strong> Lead has been returned to Follow Up status for Agent 3.</p>
          </div>`
        });
        await log("No-show admin notification sent");
      } catch (err) {
        await log(`No-show admin notification failed: ${err.message}`);
      }

      flagged++;
    }

    return Response.json({ success: true, flagged });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});