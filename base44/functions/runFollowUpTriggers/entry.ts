import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const S = base44.asServiceRole;

    const settings = await S.entities.AppSettings.list();
    const get = (k, d) => { const s = settings.find(x => x.key === k); return s ? s.value : d; };

    if (get("followup_enabled", "true") !== "true") {
      return Response.json({ success: true, message: "Follow-up disabled" });
    }

    const delay1 = parseFloat(get("followup_delay_1_hours", "24"));
    const delay2 = parseFloat(get("followup_delay_2_hours", "48"));
    const delay3 = parseFloat(get("followup_delay_3_hours", "96"));
    const noShowDelay = parseFloat(get("no_show_followup_hours", "2"));

    const [leads, followups, bookings] = await Promise.all([
      S.entities.Lead.list(),
      S.entities.FollowUp.list(),
      S.entities.Booking.list()
    ]);

    const log = (lead_id, event) =>
      S.entities.ActivityLog.create({ lead_id, event, created_at: new Date().toISOString() }).catch(() => {});

    const hrs = (h) => h * 60 * 60 * 1000;
    let created = 0;

    // TRIGGER 1 — STANDARD SEQUENCE
    const bookedLeadIds = new Set(
      bookings.filter(b => ["Confirmed", "Rescheduled", "Completed"].includes(b.status)).map(b => b.lead_id)
    );
    const existingStandardLeadIds = new Set(
      followups.filter(f => f.sequence_type === "standard").map(f => f.lead_id)
    );

    for (const lead of leads) {
      if (!["HOT", "WARM"].includes(lead.score)) continue;
      if (!["Follow Up", "Action Required"].includes(lead.status)) continue;
      if (bookedLeadIds.has(lead.id)) continue;
      if (existingStandardLeadIds.has(lead.id)) continue;

      const base = new Date(lead.created_date || new Date());
      const t1 = new Date(base.getTime() + hrs(delay1));
      const t2 = new Date(t1.getTime() + hrs(delay2));
      const t3 = new Date(t2.getTime() + hrs(delay3));

      await Promise.all([
        S.entities.FollowUp.create({ lead_id: lead.id, sequence_type: "standard", attempt_number: 1, status: "Pending", scheduled_at: t1.toISOString() }),
        S.entities.FollowUp.create({ lead_id: lead.id, sequence_type: "standard", attempt_number: 2, status: "Pending", scheduled_at: t2.toISOString() }),
        S.entities.FollowUp.create({ lead_id: lead.id, sequence_type: "standard", attempt_number: 3, status: "Pending", scheduled_at: t3.toISOString() }),
      ]);
      await log(lead.id, "Follow-up sequence created — 3 attempts scheduled");
      created++;
    }

    // TRIGGER 2 — NO-SHOW SEQUENCE
    const existingNoShowLeadIds = new Set(
      followups.filter(f => f.sequence_type === "no_show").map(f => f.lead_id)
    );
    const noShowBookings = bookings.filter(b => b.no_show_flagged);

    for (const booking of noShowBookings) {
      const lead = leads.find(l => l.id === booking.lead_id);
      if (!lead) continue;
      if (lead.status !== "Follow Up") continue;
      if (existingNoShowLeadIds.has(lead.id)) continue;

      const now = new Date();
      const t1 = new Date(now.getTime() + hrs(noShowDelay));
      const t2 = new Date(t1.getTime() + hrs(delay2));
      const t3 = new Date(t2.getTime() + hrs(delay3));

      await Promise.all([
        S.entities.FollowUp.create({ lead_id: lead.id, sequence_type: "no_show", attempt_number: 1, status: "Pending", scheduled_at: t1.toISOString() }),
        S.entities.FollowUp.create({ lead_id: lead.id, sequence_type: "no_show", attempt_number: 2, status: "Pending", scheduled_at: t2.toISOString() }),
        S.entities.FollowUp.create({ lead_id: lead.id, sequence_type: "no_show", attempt_number: 3, status: "Pending", scheduled_at: t3.toISOString() }),
      ]);
      await log(lead.id, "No-show follow-up sequence created — 3 attempts scheduled");
      created++;
    }

    return Response.json({ success: true, sequences_created: created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});