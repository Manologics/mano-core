import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { lead_id, slot, notes, event_type_uri } = body;

    if (!lead_id || !slot) return Response.json({ error: "Missing required fields" }, { status: 400 });

    const allSettings = await base44.asServiceRole.entities.AppSettings.list();
    const get = (key, def = "") => { const s = allSettings.find(s => s.key === key); return s ? s.value : def; };
    const apiKey = get("calendly_api_key");
    const businessName = get("business_name", "Monkee Bizz AI");
    const tz = get("app_timezone", "America/Phoenix");
    const getBrandConfig = (source) => {
      if (source === "vendorfy") return { adminEmail: get("vendorfy_email", "info@vendorfyai.com"), signature: get("vendorfy_signature", "— Vendorfy AI Support") };
      if (source === "surplus") return { adminEmail: get("surplus_email", "info@surplussyndicatestore.com"), signature: get("surplus_signature", "— Surplus Syndicate Team") };
      return { adminEmail: get("admin_email", "info@monkeebizai.com"), signature: get("email_signature", "— Monkee Bizz AI Team") };
    };

    const log = async (event) => {
      await base44.asServiceRole.entities.ActivityLog.create({ lead_id, event, created_at: new Date().toISOString() });
    };

    await log(`Booking initiated: ${slot.start_time}`);

    // Re-verify slot availability
    if (apiKey && event_type_uri) {
      const headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
      const start = new Date(slot.start_time);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      const checkRes = await fetch(
        `https://api.calendly.com/event_type_available_times?event_type=${encodeURIComponent(event_type_uri)}&start_time=${start.toISOString()}&end_time=${end.toISOString()}`,
        { headers }
      );
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        const slotStillAvail = (checkData.collection || []).some(
          s => s.status === "available" && Math.abs(new Date(s.start_time) - new Date(slot.start_time)) < 60000
        );
        if (!slotStillAvail) {
          await log("Slot conflict detected — availability refreshed");
          await log("Booking attempt failed: slot no longer available");
          return Response.json({ error: "slot_taken", message: "That slot was just taken. Please select another time." }, { status: 409 });
        }
      }
    }

    const lead = await base44.asServiceRole.entities.Lead.get(lead_id);
    const { adminEmail, signature } = getBrandConfig(lead.source);
    const slotDate = new Date(slot.start_time);
    const dateStr = slotDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: tz });
    const timeStr = slotDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz, timeZoneName: "short" });
    const scheduledDate = slotDate.toISOString().split("T")[0];
    const scheduledTime = slotDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: tz });

    // Create booking record
    const booking = await base44.asServiceRole.entities.Booking.create({
      lead_id,
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime,
      timezone: tz,
      status: "Confirmed",
      notes: notes || "",
      booking_source: "Admin",
      calendly_event_url: slot.scheduling_url || "",
      confirmation_sent: false,
      reminder_24hr_sent: false,
      reminder_1hr_sent: false,
      no_show_flagged: false,
      rescheduled_count: 0
    });

    // Update lead status
    await base44.asServiceRole.entities.Lead.update(lead_id, { status: "Booked" });

    await log(`Appointment confirmed: ${dateStr} at ${timeStr}`);
    await log(`Lead status updated to: Booked`);

    // Fire emails async (non-blocking)
    const sendEmails = async () => {
      // Lead confirmation
      try {
        const leadBody = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;padding:32px;border-radius:16px">
          <div style="text-align:center;margin-bottom:24px"><div style="font-size:32px">🐒</div>
          <div style="font-family:monospace;font-size:11px;color:#00ff88;letter-spacing:3px">APPOINTMENT CONFIRMED</div></div>
          <p>Hi ${lead.name},</p><p>Your appointment is confirmed.</p>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:10px;border-bottom:1px solid #1a1a1a;color:#888;font-size:12px">Date</td><td style="padding:10px;border-bottom:1px solid #1a1a1a;color:#fff">${dateStr}</td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #1a1a1a;color:#888;font-size:12px">Time</td><td style="padding:10px;border-bottom:1px solid #1a1a1a;color:#fff">${timeStr}</td></tr>
          </table>
          ${slot.scheduling_url ? `<p style="margin-top:20px"><a href="${slot.scheduling_url}" style="color:#00ff88">Add to your calendar / Reschedule →</a></p>` : ""}
          <p style="color:#555;margin-top:24px">See you then.<br>${signature}</p>
        </div>`;
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: lead.email,
          subject: `You are booked — ${businessName}`,
          body: leadBody
        });
        await base44.asServiceRole.entities.Booking.update(booking.id, { confirmation_sent: true });
        await log("Confirmation email sent to lead");
      } catch (err) {
        await log(`Confirmation email failed: ${err.message}`);
        await log("Booking attempt succeeded but confirmation email failed");
      }

      // Admin notification
      try {
        const adminBody = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;padding:32px;border-radius:16px">
          <div style="font-family:monospace;font-size:11px;color:#00ff88;letter-spacing:3px;margin-bottom:20px">📅 APPOINTMENT CONFIRMED</div>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:10px;border-bottom:1px solid #1a1a1a;color:#888;font-size:11px">LEAD</td><td style="padding:10px;border-bottom:1px solid #1a1a1a">${lead.name}</td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #1a1a1a;color:#888;font-size:11px">SCORE</td><td style="padding:10px;border-bottom:1px solid #1a1a1a">${lead.score || "—"}</td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #1a1a1a;color:#888;font-size:11px">PHONE</td><td style="padding:10px;border-bottom:1px solid #1a1a1a">${lead.phone || "—"}</td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #1a1a1a;color:#888;font-size:11px">EMAIL</td><td style="padding:10px;border-bottom:1px solid #1a1a1a">${lead.email || "—"}</td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #1a1a1a;color:#888;font-size:11px">DATE</td><td style="padding:10px;border-bottom:1px solid #1a1a1a">${dateStr}</td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #1a1a1a;color:#888;font-size:11px">TIME</td><td style="padding:10px;border-bottom:1px solid #1a1a1a">${timeStr}</td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #1a1a1a;color:#888;font-size:11px">NOTES</td><td style="padding:10px;border-bottom:1px solid #1a1a1a">${notes || "—"}</td></tr>
          </table>
          <div style="margin-top:20px;padding:14px;background:#111;border-radius:8px">
            <div style="font-family:monospace;font-size:10px;color:#555;margin-bottom:8px">QUICK ACTIONS</div>
            ${slot.scheduling_url ? `<p><a href="${slot.scheduling_url}" style="color:#00ff88">Reschedule →</a></p>` : ""}
            <p style="color:#555;font-size:11px">Booked at: ${new Date().toLocaleString("en-US", { timeZone: tz })}</p>
          </div>
        </div>`;
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: adminEmail,
          subject: `📅 Booked — ${lead.name} — ${dateStr}`,
          body: adminBody
        });
        await log("Admin booking notification sent");
      } catch (err) {
        await log(`Admin notification failed: ${err.message}`);
      }
    };

    sendEmails().catch(console.error);

    return Response.json({ success: true, booking_id: booking.id, scheduled_date: scheduledDate, scheduled_time: scheduledTime, dateStr, timeStr });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});