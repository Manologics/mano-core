// Schedules a 3-part SMS follow-up sequence for a lead
// Attempts: 1hr, 24hr, 3 days after call
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const S = createClientFromRequest(req).asServiceRole;

  const body = await req.json();
  const { lead_id } = body;

  if (!lead_id) {
    return Response.json({ error: 'Missing lead_id' }, { status: 400 });
  }

  const lead = await S.entities.Lead.get(lead_id);
  if (!lead || !lead.phone) {
    return Response.json({ error: 'Lead not found or missing phone' }, { status: 404 });
  }

  // Don't schedule if lead already booked
  if (['Booked', 'Appointment Requested', 'Closed — Won'].includes(lead.status)) {
    return Response.json({ skipped: true, reason: 'lead_already_booked' });
  }

  // Check if a sequence already exists for this lead
  const allFollowUps = await S.entities.FollowUp.list();
  const existing = allFollowUps.filter(f => f.lead_id === lead_id && f.sequence_type === 'sms');
  if (existing.length > 0) {
    return Response.json({ skipped: true, reason: 'sequence_already_exists' });
  }

  const now = new Date();
  const DELAYS_MS = [
    1 * 60 * 60 * 1000,        // 1 hour
    24 * 60 * 60 * 1000,       // 24 hours
    3 * 24 * 60 * 60 * 1000,   // 3 days
  ];

  const created = await Promise.all(
    DELAYS_MS.map((delay, i) =>
      S.entities.FollowUp.create({
        lead_id,
        sequence_type: 'sms',
        attempt_number: i + 1,
        status: 'Pending',
        scheduled_at: new Date(now.getTime() + delay).toISOString(),
      })
    )
  );

  await S.entities.ActivityLog.create({
    lead_id,
    event: `SMS follow-up sequence scheduled — 3 attempts at 1hr, 24hr, 3 days`,
    created_at: now.toISOString(),
  }).catch(() => {});

  return Response.json({ success: true, scheduled: created.length });
});