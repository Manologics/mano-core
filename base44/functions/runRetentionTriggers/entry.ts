import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const S = base44.asServiceRole;

    const settings = await S.entities.AppSettings.list();
    const get = (k, d) => { const s = settings.find(x => x.key === k); return s ? s.value : d; };

    if (get("retention_enabled", "true") !== "true") {
      return Response.json({ success: true, message: "Retention disabled" });
    }

    const satDays   = parseFloat(get("retention_satisfaction_days", "2"));
    const revDays   = parseFloat(get("retention_review_days",       "3"));
    const refDays   = parseFloat(get("retention_referral_days",     "7"));
    const upsellDays= parseFloat(get("retention_upsell_days",      "14"));
    const reengDays = parseFloat(get("retention_reengage_days",    "45"));

    const [leads, bookings, retentionEvents] = await Promise.all([
      S.entities.Lead.list(),
      S.entities.Booking.list(),
      S.entities.RetentionEvents.list()
    ]);

    const log = (lead_id, event) =>
      S.entities.ActivityLog.create({ lead_id, event, created_at: new Date().toISOString() }).catch(() => {});

    const days = (d) => d * 24 * 60 * 60 * 1000;
    let created = 0;

    for (const lead of leads) {
      if (lead.retention_opt_out) continue;

      const completedBookings = bookings.filter(b => b.lead_id === lead.id && b.status === "Completed");
      if (completedBookings.length === 0) continue;

      const mostRecent = completedBookings.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
      const anchor = new Date(mostRecent.created_date);

      const existingEvents = retentionEvents.filter(e => e.lead_id === lead.id);

      // TASK 10 — New completion reset: if retention_stage = complete and new booking detected
      if (lead.retention_stage === "complete" && lead.last_completed_booking_at) {
        const lastCompleted = new Date(lead.last_completed_booking_at);
        if (anchor > lastCompleted) {
          const activeEvents = existingEvents.filter(e => ["Pending", "Sent"].includes(e.status));
          if (activeEvents.length > 0) {
            await log(lead.id, "New completion detected — retention reset skipped. Active events still running.");
            continue;
          }
          await S.entities.Lead.update(lead.id, {
            review_received: false,
            retention_stage: "satisfaction_check_due",
            last_completed_booking_at: anchor.toISOString()
          });
          await log(lead.id, "New completed booking detected — retention cycle reset for fresh sequence");
          // Create fresh sequence below
          const t1 = new Date(anchor.getTime() + days(satDays));
          const t2 = new Date(t1.getTime() + days(revDays));
          const t3 = new Date(t2.getTime() + days(refDays));
          const t4 = new Date(t3.getTime() + days(upsellDays));
          const t5 = new Date(t4.getTime() + days(reengDays));
          await Promise.all([
            S.entities.RetentionEvents.create({ lead_id: lead.id, event_type: "satisfaction_check",  status: "Pending", scheduled_at: t1.toISOString() }),
            S.entities.RetentionEvents.create({ lead_id: lead.id, event_type: "review_request",      status: "Pending", scheduled_at: t2.toISOString() }),
            S.entities.RetentionEvents.create({ lead_id: lead.id, event_type: "referral_ask",        status: "Pending", scheduled_at: t3.toISOString() }),
            S.entities.RetentionEvents.create({ lead_id: lead.id, event_type: "upsell_trigger",      status: "Pending", scheduled_at: t4.toISOString() }),
            S.entities.RetentionEvents.create({ lead_id: lead.id, event_type: "past_client_reengage",status: "Pending", scheduled_at: t5.toISOString() }),
          ]);
          await log(lead.id, `Fresh retention sequence created — 5 events scheduled Day 2 / Day 5 / Day 12 / Day 26 / Day 71`);
          created++;
          continue;
        }
      }

      // Skip if already has any retention events (sequence already running)
      if (existingEvents.length > 0) continue;

      // RULE 6 — Only create if Completed booking exists (already checked above)
      await S.entities.Lead.update(lead.id, {
        last_completed_booking_at: anchor.toISOString(),
        retention_stage: "satisfaction_check_due"
      });

      const t1 = new Date(anchor.getTime() + days(satDays));
      const t2 = new Date(t1.getTime() + days(revDays));
      const t3 = new Date(t2.getTime() + days(refDays));
      const t4 = new Date(t3.getTime() + days(upsellDays));
      const t5 = new Date(t4.getTime() + days(reengDays));

      await Promise.all([
        S.entities.RetentionEvents.create({ lead_id: lead.id, event_type: "satisfaction_check",  status: "Pending", scheduled_at: t1.toISOString() }),
        S.entities.RetentionEvents.create({ lead_id: lead.id, event_type: "review_request",      status: "Pending", scheduled_at: t2.toISOString() }),
        S.entities.RetentionEvents.create({ lead_id: lead.id, event_type: "referral_ask",        status: "Pending", scheduled_at: t3.toISOString() }),
        S.entities.RetentionEvents.create({ lead_id: lead.id, event_type: "upsell_trigger",      status: "Pending", scheduled_at: t4.toISOString() }),
        S.entities.RetentionEvents.create({ lead_id: lead.id, event_type: "past_client_reengage",status: "Pending", scheduled_at: t5.toISOString() }),
      ]);
      await log(lead.id, `Retention sequence created — 5 events scheduled Day 2 / Day 5 / Day 12 / Day 26 / Day 71`);
      created++;
    }

    return Response.json({ success: true, sequences_created: created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});