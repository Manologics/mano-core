// Schedules a 3-part SMS follow-up sequence for a lead
// Attempts: 1hr, 24hr, 3 days after call
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const S = createClientFromRequest(req).asServiceRole;

  const body = await req.json();

  // Entity automation payload shape: { event, data, old_data, changed_fields }
  // Direct invocation shape: { lead_id } or { id }
  // Extract lead_id from any known payload shape.
  const lead_id =
    body.lead_id ||
    body.id ||
    body.data?.id ||
    body.event?.entity_id ||
    body.record?.id ||
    body.entity?.id ||
    null;

  if (!lead_id) {
    // Log payload shape so we can diagnose unexpected structures
    console.warn('[scheduleSmsFollowUp] Could not extract lead_id. Payload keys:', JSON.stringify(Object.keys(body)));
    await S.entities.ActivityLog.create({
      lead_id: 'system',
      event: `[scheduleSmsFollowUp] Skipped — could not extract lead_id. Payload keys: ${JSON.stringify(Object.keys(body))}`,
      created_at: new Date().toISOString(),
    }).catch(() => {});
    return Response.json({ skipped: true, reason: 'missing_lead_id', payload_keys: Object.keys(body) });
  }

  let lead;
  try {
    lead = await S.entities.Lead.get(lead_id);
  } catch (_) {
    return Response.json({ skipped: true, reason: 'lead_not_found', lead_id });
  }
  if (!lead || !lead.phone) {
    return Response.json({ skipped: true, reason: 'lead_missing_phone', lead_id });
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

  // If a missed-call SMS was already sent (last_message set by twilioInboundVoice),
  // push attempt 1 to 24hr instead of 1hr to avoid stacking with the immediate missed-call SMS.
  const hadImmediateSms = lead.processing_mode === 'twilio_voice' && !!lead.last_message;
  const DELAYS_MS = hadImmediateSms
    ? [
        24 * 60 * 60 * 1000,       // 24 hours (skip 1hr — immediate SMS already sent)
        48 * 60 * 60 * 1000,       // 48 hours
        3 * 24 * 60 * 60 * 1000,   // 3 days
      ]
    : [
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
    event: hadImmediateSms
      ? `SMS follow-up sequence scheduled — 3 attempts at 24hr, 48hr, 3 days (1hr skipped — missed-call SMS already sent)`
      : `SMS follow-up sequence scheduled — 3 attempts at 1hr, 24hr, 3 days`,
    created_at: now.toISOString(),
  }).catch(() => {});

  return Response.json({ success: true, scheduled: created.length });
});