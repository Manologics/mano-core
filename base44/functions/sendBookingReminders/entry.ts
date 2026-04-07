import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const allSettings = await base44.asServiceRole.entities.AppSettings.list();
    const get = (key, def = "") => { const s = allSettings.find(s => s.key === key); return s ? s.value : def; };
    const reminder24Enabled = get("reminder_24hr_enabled", "true") === "true";
    const reminder1Enabled = get("reminder_1hr_enabled", "true") === "true";
    const businessName = get("business_name", "Monkee Bizz AI");
    const tz = get("app_timezone", "America/Phoenix");
    const signature = get("email_signature", "— Monkee Bizz AI Team");

    const bookings = await base44.asServiceRole.entities.Booking.list();
    const activeBookings = bookings.filter(b => ["Confirmed", "Rescheduled"].includes(b.status));

    const now = new Date();
    let sent24 = 0, sent1 = 0;

    for (const booking of activeBookings) {
      const lead = await base44.asServiceRole.entities.Lead.get(booking.lead_id).catch(() => null);
      if (!lead || !lead.email) continue;

      const apptTime = new Date(`${booking.scheduled_date}T${booking.scheduled_time}`);
      const msUntil = apptTime - now;
      const hoursUntil = msUntil / (1000 * 60 * 60);

      const log = async (event) => {
        await base44.asServiceRole.entities.ActivityLog.create({ lead_id: booking.lead_id, event, created_at: new Date().toISOString() });
      };

      const dateStr = apptTime.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: tz });
      const timeStr = apptTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz, timeZoneName: "short" });

      // 24hr reminder: between 23-25 hrs out
      if (reminder24Enabled && !booking.reminder_24hr_sent && hoursUntil >= 23 && hoursUntil <= 25) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: lead.email,
            subject: `See you tomorrow — ${businessName}`,
            body: `<div style="font-family:Arial,sans-serif;max-width:600px;background:#0a0a0a;color:#fff;padding:32px;border-radius:16px">
              <p>Hi ${lead.name},</p>
              <p>Just a reminder that your appointment is <strong>tomorrow</strong>.</p>
              <p><strong>Date:</strong> ${dateStr}</p>
              <p><strong>Time:</strong> ${timeStr}</p>
              ${booking.calendly_event_url ? `<p><a href="${booking.calendly_event_url}" style="color:#00ff88">Need to reschedule? →</a></p>` : ""}
              <p style="color:#555;margin-top:24px">See you soon.<br>${signature}</p>
            </div>`
          });
          await base44.asServiceRole.entities.Booking.update(booking.id, { reminder_24hr_sent: true });
          await log("24hr reminder sent to lead");
          sent24++;
        } catch (err) {
          await log(`24hr reminder failed: ${err.message}`);
        }
      }

      // 1hr reminder: between 55-65 min out
      if (reminder1Enabled && !booking.reminder_1hr_sent && hoursUntil >= 0.9 && hoursUntil <= 1.1) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: lead.email,
            subject: `Your appointment is in 1 hour — ${businessName}`,
            body: `<div style="font-family:Arial,sans-serif;max-width:600px;background:#0a0a0a;color:#fff;padding:32px;border-radius:16px">
              <p>Hi ${lead.name},</p>
              <p>Your appointment starts <strong>in about an hour</strong>.</p>
              <p><strong>Time:</strong> ${timeStr}</p>
              <p style="color:#555;margin-top:24px">See you very soon.<br>${signature}</p>
            </div>`
          });
          await base44.asServiceRole.entities.Booking.update(booking.id, { reminder_1hr_sent: true });
          await log("1hr reminder sent to lead");
          sent1++;
        } catch (err) {
          await log(`1hr reminder failed: ${err.message}`);
        }
      }
    }

    return Response.json({ success: true, sent_24hr: sent24, sent_1hr: sent1 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});