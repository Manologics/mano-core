import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const TEMPLATES = {
  satisfaction_check: {
    subject: (biz) => `Quick check-in — ${biz}`,
    body: (name, biz, reviewLink, referralOffer, upsellLink, sig) => `<div style="font-family:Arial,sans-serif;max-width:600px;background:#0a0a0a;color:#fff;padding:32px;border-radius:16px">
      <p>Hi ${name},</p>
      <p>Just wanted to check in and make sure everything went well.</p>
      <p>If there is anything you need or anything we can improve, reply to this email and let us know.</p>
      <p>We appreciate the opportunity to help.</p>
      <p style="color:#555;margin-top:24px">${sig}</p>
    </div>`
  },
  review_request: {
    subject: (biz) => `Would you mind leaving a review? — ${biz}`,
    body: (name, biz, reviewLink, referralOffer, upsellLink, sig) => `<div style="font-family:Arial,sans-serif;max-width:600px;background:#0a0a0a;color:#fff;padding:32px;border-radius:16px">
      <p>Hi ${name},</p>
      <p>We are grateful for the chance to work with you.</p>
      <p>If you had a good experience, would you mind taking a minute to leave us a review?</p>
      ${reviewLink ? `<p><a href="${reviewLink}" style="color:#8b5cf6">Leave a review here →</a></p>` : ""}
      <p>Thank you — it really helps.</p>
      <p style="color:#555;margin-top:24px">${sig}</p>
    </div>`
  },
  referral_ask: {
    subject: (biz) => `Know anyone we can help? — ${biz}`,
    body: (name, biz, reviewLink, referralOffer, upsellLink, sig) => `<div style="font-family:Arial,sans-serif;max-width:600px;background:#0a0a0a;color:#fff;padding:32px;border-radius:16px">
      <p>Hi ${name},</p>
      <p>We appreciate the opportunity to work with you.</p>
      <p>If you know someone who could use help like this, we would be honored to take care of them too.</p>
      ${referralOffer ? `<p>${referralOffer}</p>` : ""}
      <p>Reply here if someone comes to mind.</p>
      <p style="color:#555;margin-top:24px">${sig}</p>
    </div>`
  },
  upsell_trigger: {
    subject: (biz) => `Next step if you want it — ${biz}`,
    body: (name, biz, reviewLink, referralOffer, upsellLink, sig) => `<div style="font-family:Arial,sans-serif;max-width:600px;background:#0a0a0a;color:#fff;padding:32px;border-radius:16px">
      <p>Hi ${name},</p>
      <p>Since we have already worked together, this may be a good time to take the next step if it makes sense for you.</p>
      <p>If you would like to talk about additional help, a follow-up service, or the next phase, use the link below.</p>
      ${upsellLink ? `<p><a href="${upsellLink}" style="color:#8b5cf6">${upsellLink}</a></p>` : ""}
      <p>We would love to help if the timing is right.</p>
      <p style="color:#555;margin-top:24px">${sig}</p>
    </div>`
  },
  past_client_reengage: {
    subject: (biz) => `Just checking back in — ${biz}`,
    body: (name, biz, reviewLink, referralOffer, upsellLink, sig) => `<div style="font-family:Arial,sans-serif;max-width:600px;background:#0a0a0a;color:#fff;padding:32px;border-radius:16px">
      <p>Hi ${name},</p>
      <p>It has been a little while since we last worked together.</p>
      <p>If anything has changed or if there is anything new you need help with, we would be glad to reconnect.</p>
      ${upsellLink ? `<p><a href="${upsellLink}" style="color:#8b5cf6">${upsellLink}</a></p>` : ""}
      <p>Hope all is well.</p>
      <p style="color:#555;margin-top:24px">${sig}</p>
    </div>`
  }
};

const STAGE_AFTER = {
  satisfaction_check:   "review_request_due",
  review_request:       "referral_ask_due",
  referral_ask:         "upsell_due",
  upsell_trigger:       "reengage_due",
  past_client_reengage: "complete"
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const S = base44.asServiceRole;

    const settings = await S.entities.AppSettings.list();
    const get = (k, d) => { const s = settings.find(x => x.key === k); return s ? s.value : d; };

    if (get("retention_enabled", "true") !== "true") {
      return Response.json({ success: true, message: "Retention disabled" });
    }

    const businessName    = get("business_name",           "Monkee Bizz AI");
    const retentionFrom   = get("retention_from_name",     businessName);
    const adminEmail      = get("admin_email",             "info@monkeebizai.com");
    const appUrl          = get("app_url",                 "https://app.monkeebizzai.com");
    const reviewLink      = get("retention_review_link",   "");
    const referralOffer   = get("retention_referral_offer","");
    const upsellLink      = get("retention_upsell_link",   "");
    const tz              = get("app_timezone",            "America/Phoenix");
    const revDays         = parseFloat(get("retention_review_days", "3"));
    const signature       = get("email_signature",         "— Monkee Bizz AI Team");

    const now = new Date();
    const TWO_HOURS = 2 * 60 * 60 * 1000;

    const log = (lead_id, event) =>
      S.entities.ActivityLog.create({ lead_id, event, created_at: now.toISOString() }).catch(() => {});

    const [allEvents, leads, bookings] = await Promise.all([
      S.entities.RetentionEvents.list(),
      S.entities.Lead.list(),
      S.entities.Booking.list()
    ]);

    const due = allEvents.filter(e =>
      e.status === "Pending" && new Date(e.scheduled_at) <= now
    );

    let sent = 0, failed = 0;

    for (const evt of due) {
      const lead = leads.find(l => l.id === evt.lead_id);
      if (!lead || !lead.email) {
        await S.entities.RetentionEvents.update(evt.id, { status: "Skipped" });
        continue;
      }

      if (lead.retention_opt_out) {
        await S.entities.RetentionEvents.update(evt.id, { status: "Skipped" });
        await S.entities.Lead.update(lead.id, { retention_stage: "opted_out" });
        await log(lead.id, "Retention skipped — client opted out");
        continue;
      }

      if (lead.last_retention_sent_at) {
        const gap = now - new Date(lead.last_retention_sent_at);
        if (gap < TWO_HOURS) {
          const lastSentDisplay = new Date(lead.last_retention_sent_at).toLocaleString("en-US", { timeZone: tz, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
          await S.entities.RetentionEvents.update(evt.id, { status: "Skipped" });
          await log(lead.id, `Retention send skipped — minimum send gap enforced (last sent: ${lastSentDisplay})`);
          continue;
        }
      }

      if (lead.last_completed_booking_at) {
        const newerBooking = bookings.find(b =>
          b.lead_id === lead.id &&
          ["Requested", "Confirmed", "Rescheduled", "Completed"].includes(b.status) &&
          new Date(b.created_date) > new Date(lead.last_completed_booking_at)
        );
        if (newerBooking) {
          const pendingEvents = allEvents.filter(e => e.lead_id === lead.id && e.status === "Pending");
          await Promise.all(pendingEvents.map(e => S.entities.RetentionEvents.update(e.id, { status: "Skipped" })));
          await S.entities.Lead.update(lead.id, { retention_stage: "complete" });
          await log(lead.id, `Retention sequence stopped — client rebooked after ${lead.last_completed_booking_at}`);
          continue;
        }
      }

      if (evt.event_type === "review_request" && lead.review_received) {
        await S.entities.RetentionEvents.update(evt.id, { status: "Skipped" });
        await S.entities.Lead.update(lead.id, { retention_stage: "referral_ask_due" });
        await log(lead.id, "Review request skipped — client already left a review. Advanced to referral ask.");

        const existingReferral = allEvents.find(e =>
          e.lead_id === lead.id && e.event_type === "referral_ask" && ["Pending", "Sent"].includes(e.status)
        );
        if (existingReferral) {
          await log(lead.id, "Referral ask already exists — no duplicate created");
        } else {
          const scheduledAt = new Date(now.getTime() + revDays * 24 * 60 * 60 * 1000).toISOString();
          await S.entities.RetentionEvents.create({ lead_id: lead.id, event_type: "referral_ask", status: "Pending", scheduled_at: scheduledAt });
          await log(lead.id, "Referral ask scheduled after review received");
        }
        continue;
      }

      const tmpl = TEMPLATES[evt.event_type];
      if (!tmpl) continue;

      try {
        await S.integrations.Core.SendEmail({
          to: lead.email,
          from_name: retentionFrom,
          subject: tmpl.subject(businessName),
          body: tmpl.body(lead.name, businessName, reviewLink, referralOffer, upsellLink, signature)
        });

        const newStage = STAGE_AFTER[evt.event_type] || "complete";
        await S.entities.RetentionEvents.update(evt.id, { status: "Sent", sent_at: now.toISOString() });
        await S.entities.Lead.update(lead.id, { last_retention_sent_at: now.toISOString(), retention_stage: newStage });
        await log(lead.id, `Retention ${evt.event_type} sent — stage: ${newStage}`);
        sent++;
      } catch (err) {
        await S.entities.RetentionEvents.update(evt.id, { status: "Failed" });
        await log(lead.id, `Retention ${evt.event_type} failed: ${err.message}`);
        failed++;

        const failBody = `<div style="font-family:Arial,sans-serif;max-width:600px;background:#0a0a0a;color:#fff;padding:32px;border-radius:16px">
          <div style="font-family:monospace;font-size:11px;color:#ff3333;letter-spacing:3px;margin-bottom:16px">⚠️ RETENTION FAILED</div>
          <p><strong>Lead:</strong> ${lead.name}</p>
          <p><strong>Event:</strong> ${evt.event_type}</p>
          <p><strong>Error:</strong> ${err.message}</p>
          <div style="margin-top:20px;padding:14px;background:#111;border-radius:8px">
            <p><a href="${appUrl}/AgentRetention" style="color:#8b5cf6">View Retention Queue →</a></p>
          </div>
        </div>`;
        await S.integrations.Core.SendEmail({
          to: adminEmail,
          subject: `⚠️ Retention Failed — ${evt.event_type} — ${lead.name}`,
          body: failBody
        }).catch(() => {});
      }
    }

    return Response.json({ success: true, sent, failed });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});