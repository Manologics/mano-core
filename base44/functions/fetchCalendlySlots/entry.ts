import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { lead_id } = body;

    const allSettings = await base44.asServiceRole.entities.AppSettings.list();
    const get = (key, def = "") => { const s = allSettings.find(s => s.key === key); return s ? s.value : def; };

    const apiKey = get("calendly_api_key");
    const eventUrl = get("calendly_event_url");
    const bufferDays = parseInt(get("booking_buffer_days", "2"));
    const slotsCount = parseInt(get("booking_slots_count", "3"));

    if (!apiKey || !eventUrl) {
      if (lead_id) {
        await base44.asServiceRole.entities.ActivityLog.create({
          lead_id,
          event: "Booking agent skipped — Calendly not configured",
          created_at: new Date().toISOString()
        });
      }
      return Response.json({ error: "Calendly not configured", not_configured: true }, { status: 200 });
    }

    const headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };

    // Get current user
    const meRes = await fetch("https://api.calendly.com/users/me", { headers });
    if (!meRes.ok) throw new Error(`Calendly auth failed: ${meRes.status}`);
    const meData = await meRes.json();
    const userUri = meData.resource.uri;

    // Get event types for user
    const etRes = await fetch(`https://api.calendly.com/event_types?user=${encodeURIComponent(userUri)}&active=true`, { headers });
    if (!etRes.ok) throw new Error(`Failed to fetch event types: ${etRes.status}`);
    const etData = await etRes.json();

    // Match event type by slug from URL
    const urlSlug = eventUrl.replace(/\/$/, "").split("/").pop();
    let eventType = etData.collection.find(et => et.scheduling_url && et.scheduling_url.endsWith("/" + urlSlug));
    if (!eventType && etData.collection.length > 0) eventType = etData.collection[0];
    if (!eventType) throw new Error("No matching Calendly event type found");

    const now = new Date();
    const startTime = new Date(now);
    startTime.setDate(startTime.getDate() + bufferDays);
    startTime.setHours(0, 0, 0, 0);
    const endTime = new Date(startTime);
    endTime.setDate(endTime.getDate() + 14);

    const availRes = await fetch(
      `https://api.calendly.com/event_type_available_times?event_type=${encodeURIComponent(eventType.uri)}&start_time=${startTime.toISOString()}&end_time=${endTime.toISOString()}`,
      { headers }
    );
    if (!availRes.ok) throw new Error(`Failed to fetch availability: ${availRes.status}`);
    const availData = await availRes.json();

    const slots = (availData.collection || [])
      .filter(s => s.status === "available")
      .slice(0, slotsCount)
      .map(s => ({
        start_time: s.start_time,
        end_time: s.invitee_end_time || s.end_time,
        status: s.status,
        duration_minutes: eventType.duration || 30,
        event_type_uri: eventType.uri,
        scheduling_url: eventType.scheduling_url
      }));

    if (lead_id) {
      await base44.asServiceRole.entities.ActivityLog.create({
        lead_id,
        event: `Calendly availability fetched — ${slots.length} slots found`,
        created_at: new Date().toISOString()
      });
      await base44.asServiceRole.entities.Lead.update(lead_id, { booking_offered: true });
    }

    return Response.json({ slots, event_type_uri: eventType.uri, scheduling_url: eventType.scheduling_url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});