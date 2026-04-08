import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const allSettings = await base44.asServiceRole.entities.AppSettings.list();
    const get = (key, def = "") => { const s = allSettings.find(s => s.key === key); return s ? s.value : def; };
    const adminEmail = get("admin_email", "info@monkeebizai.com");
    const tz = get("app_timezone", "America/Phoenix");

    const today = new Date().toLocaleDateString("en-US", { timeZone: tz });
    const todayISO = new Date().toLocaleDateString("en-CA", { timeZone: tz });

    const bookings = await base44.asServiceRole.entities.Booking.list();
    const todayBookings = bookings.filter(b =>
      b.scheduled_date === todayISO &&
      ["Confirmed", "Rescheduled"].includes(b.status)
    ).sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));

    if (todayBookings.length === 0) {
      return Response.json({ success: true, message: "No appointments today, no email sent" });
    }

    const leads = await base44.asServiceRole.entities.Lead.list();
    const leadMap = Object.fromEntries(leads.map(l => [l.id, l]));

    const rows = todayBookings.map(b => {
      const lead = leadMap[b.lead_id] || {};
      return `<tr>
        <td style="padding:10px;border-bottom:1px solid #1a1a1a">${b.scheduled_time}</td>
        <td style="padding:10px;border-bottom:1px solid #1a1a1a">${lead.name || "—"}</td>
        <td style="padding:10px;border-bottom:1px solid #1a1a1a">${lead.score || "—"}</td>
        <td style="padding:10px;border-bottom:1px solid #1a1a1a">${lead.phone || "—"}</td>
        <td style="padding:10px;border-bottom:1px solid #1a1a1a">${b.notes || "—"}</td>
      </tr>`;
    }).join("");

    const body = `<div style="font-family:Arial,sans-serif;max-width:700px;background:#0a0a0a;color:#fff;padding:32px;border-radius:16px">
      <div style="font-family:monospace;font-size:11px;color:#00ff88;letter-spacing:3px;margin-bottom:8px">📅 TODAY'S SCHEDULE</div>
      <h2 style="margin:0 0 4px;color:#fff">${todayBookings.length} Appointment${todayBookings.length > 1 ? "s" : ""}</h2>
      <p style="color:#555;font-size:12px;margin:0 0 20px">${today}</p>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="border-bottom:1px solid #1a1a1a">
          <th style="padding:8px 10px;text-align:left;font-family:monospace;font-size:9px;color:#555">TIME</th>
          <th style="padding:8px 10px;text-align:left;font-family:monospace;font-size:9px;color:#555">NAME</th>
          <th style="padding:8px 10px;text-align:left;font-family:monospace;font-size:9px;color:#555">SCORE</th>
          <th style="padding:8px 10px;text-align:left;font-family:monospace;font-size:9px;color:#555">PHONE</th>
          <th style="padding:8px 10px;text-align:left;font-family:monospace;font-size:9px;color:#555">NOTES</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="margin-top:20px;padding:14px;background:#111;border-radius:8px">
        <p style="margin:0;font-size:11px;color:#555">Powered by Monkee Bizz AI — SAOS</p>
      </div>
    </div>`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: adminEmail,
      subject: `📅 Today's Schedule — ${todayBookings.length} appointment${todayBookings.length > 1 ? "s" : ""} — ${today}`,
      body
    });

    return Response.json({ success: true, sent: todayBookings.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});