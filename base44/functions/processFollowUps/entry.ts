import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const STANDARD_TEMPLATES = {
  1: {
    subject: (biz) => `Still thinking it over? — ${biz}`,
    body: (name, svc, cal, biz, sig) => `<div style="font-family:Arial,sans-serif;max-width:600px;background:#0a0a0a;color:#fff;padding:32px;border-radius:16px">
      <p>Hi ${name},</p>
      <p>Just checking in after your recent inquiry.</p>
      <p>We would love to help with ${svc || "your business needs"}.</p>
      <p>Are you ready to get something scheduled? It only takes a minute.</p>
      ${cal ? `<p><a href="${cal}" style="color:#00ff88">Book a time here →</a></p>` : ""}
      <p style="color:#555;margin-top:24px">${sig}</p>
    </div>`
  },
  2: {
    subject: (biz) => `Quick question — ${biz}`,
    body: (name, svc, cal, biz, sig) => `<div style="font-family:Arial,sans-serif;max-width:600px;background:#0a0a0a;color:#fff;padding:32px;border-radius:16px">
      <p>Hi ${name},</p>
      <p>Wanted to follow up one more time.</p>
      <p>We have availability this week if you are ready to move forward.</p>
      <p>What is the best way to connect?</p>
      ${cal ? `<p><a href="${cal}" style="color:#00ff88">Book here anytime →</a></p>` : ""}
      <p style="color:#555;margin-top:24px">${sig}</p>
    </div>`
  },
  3: {
    subject: (biz) => `Last check-in — ${biz}`,
    body: (name, svc, cal, biz, sig) => `<div style="font-family:Arial,sans-serif;max-width:600px;background:#0a0a0a;color:#fff;padding:32px;border-radius:16px">
      <p>Hi ${name},</p>
      <p>We do not want to keep filling your inbox so this will be our last check-in for now.</p>
      <p>If the timing is better later we are always here.</p>
      ${cal ? `<p><a href="${cal}" style="color:#00ff88">Whenever you are ready →</a></p>` : ""}
      <p style="color:#555;margin-top:24px">${sig}</p>
    </div>`
  }
};

const NOSHOW_TEMPLATES = {
  1: {
    subject: (biz) => `We missed you — ${biz}`,
    body: (name, svc, cal, biz, sig) => `<div style="font-family:Arial,sans-serif;max-width:600px;background:#0a0a0a;color:#fff;padding:32px;border-radius:16px">
      <p>Hi ${name},</p>
      <p>It looks like we missed each other at our scheduled appointment.</p>
      <p>No worries at all — things come up.</p>
      <p>Would you like to find another time that works better for you?</p>
      ${cal ? `<p><a href="${cal}" style="color:#00ff88">Grab a new slot here →</a></p>` : ""}
      <p style="color:#555;margin-top:24px">${sig}</p>
    </div>`
  },
  2: {
    subject: (biz) => `Still want to connect? — ${biz}`,
    body: (name, svc, cal, biz, sig) => `<div style="font-family:Arial,sans-serif;max-width:600px;background:#0a0a0a;color:#fff;padding:32px;border-radius:16px">
      <p>Hi ${name},</p>
      <p>Just following up one more time after our missed appointment.</p>
      <p>We still have availability and would love to help with ${svc || "your business needs"}.</p>
      ${cal ? `<p><a href="${cal}" style="color:#00ff88">Book a new time here →</a></p>` : ""}
      <p style="color:#555;margin-top:24px">${sig}</p>
    </div>`
  },
  3: {
    subject: (biz) => `Last follow-up — ${biz}`,
    body: (name, svc, cal, biz, sig) => `<div style="font-family:Arial,sans-serif;max-width:600px;background:#0a0a0a;color:#fff;padding:32px;border-radius:16px">
      <p>Hi ${name},</p>
      <p>This will be our last follow-up after our missed appointment.</p>
      <p>Whenever the timing is right for you we are here.</p>
      ${cal ? `<p><a href="${cal}" style="color:#00ff88">${cal}</a></p>` : ""}
      <p style="color:#555;margin-top:24px">${sig}</p>
    </div>`
  }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const S = base44.asServiceRole;

    const settings = await S.entities.AppSettings.list();
    const get = (k, d) => { const s = settings.find(x => x.key === k); return s ? s.value : d; };

    if (get("followup_enabled", "true") !== "true") {
      return Response.json({ success: true, message: "Follow-up disabled" });
    }

    const businessName = get("business_name", "Monkee Bizz AI");
    const adminEmail = get("admin_email", "info@monkeebizai.com");
    const calendlyUrl = get("calendly_event_url", "");
    const appUrl = get("app_url", "https://app.monkeebizzai.com");
    const tz = get("app_timezone", "America/Phoenix");
    const signature = get("email_signature", "— Monkee Bizz AI Team");

    const now = new Date();
    const log = (lead_id, event) =>
      S.entities.ActivityLog.create({ lead_id, event, created_at: now.toISOString() }).catch(() => {});

    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
    const checkGap = (lead) => {
      if (!lead.last_followup_sent_at) return true;
      return (now - new Date(lead.last_followup_sent_at)) >= TWO_HOURS_MS;
    };

    const [allFollowUps, leads] = await Promise.all([
      S.entities.FollowUp.list(),
      S.entities.Lead.list()
    ]);

    const due = allFollowUps.filter(f =>
      f.status === "Pending" && new Date(f.scheduled_at) <= now
    ).sort((a, b) => a.attempt_number - b.attempt_number);

    let sent = 0, failed = 0;

    for (const fu of due) {
      const lead = leads.find(l => l.id === fu.lead_id);
      if (!lead || !lead.email) {
        await S.entities.FollowUp.update(fu.id, { status: "Skipped" });
        continue;
      }

      if (["Booked", "Closed \u2014 Won"].includes(lead.status)) {
        await S.entities.FollowUp.update(fu.id, { status: "Skipped" });
        continue;
      }

      if (!checkGap(lead)) {
        const lastSentDisplay = new Date(lead.last_followup_sent_at).toLocaleString("en-US", { timeZone: tz, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
        await S.entities.FollowUp.update(fu.id, { status: "Skipped" });
        await log(fu.lead_id, `Follow-up skipped \u2014 minimum send gap enforced (last sent: ${lastSentDisplay})`);
        continue;
      }

      const templates = fu.sequence_type === "no_show" ? NOSHOW_TEMPLATES : STANDARD_TEMPLATES;
      const tmpl = templates[fu.attempt_number];
      const seqLabel = fu.sequence_type === "no_show" ? "no-show sequence" : "standard sequence";

      try {
        await S.integrations.Core.SendEmail({
          to: lead.email,
          subject: tmpl.subject(businessName),
          body: tmpl.body(lead.name, lead.service_need, calendlyUrl, businessName, signature)
        });

        await S.entities.FollowUp.update(fu.id, { status: "Sent", sent_at: now.toISOString() });
        await S.entities.Lead.update(fu.lead_id, { last_followup_sent_at: now.toISOString() });
        await log(fu.lead_id, `Follow-up attempt ${fu.attempt_number} sent \u2014 ${seqLabel}`);
        sent++;

        if (fu.attempt_number === 3) {
          await S.entities.Lead.update(fu.lead_id, { status: "Nurture" });
          await log(fu.lead_id, `Follow-up sequence complete \u2014 lead moved to Nurture`);

          const seqCompleteBody = `<div style="font-family:Arial,sans-serif;max-width:600px;background:#0a0a0a;color:#fff;padding:32px;border-radius:16px">
            <div style="font-family:monospace;font-size:11px;color:#ffdd00;letter-spacing:3px;margin-bottom:20px">📋 SEQUENCE COMPLETE \u2014 NO RESPONSE</div>
            <p><strong>Lead:</strong> ${lead.name}</p>
            <p><strong>Score:</strong> ${lead.score || "\u2014"}</p>
            <p><strong>Phone:</strong> ${lead.phone || "\u2014"}</p>
            <p>All 3 follow-up attempts sent. No response received. Lead moved to Nurture.</p>
            <div style="margin-top:20px;padding:14px;background:#111;border-radius:8px">
              <p style="margin:0 0 8px;font-family:monospace;font-size:10px;color:#555">QUICK ACTIONS</p>
              <p><a href="${appUrl}/AgentFollowUp" style="color:#00ff88">Archive Lead \u2192</a></p>
              <p><a href="${appUrl}/AgentFollowUp" style="color:#00ff88">View Queue \u2192</a></p>
            </div>
          </div>`;
          await S.integrations.Core.SendEmail({
            to: adminEmail,
            subject: `\ud83d\udccb Sequence Complete \u2014 ${lead.name} \u2014 No Response`,
            body: seqCompleteBody
          }).catch(() => {});
          await log(fu.lead_id, `Admin notified \u2014 sequence complete, no response`);
        }
      } catch (err) {
        await S.entities.FollowUp.update(fu.id, { status: "Failed" });
        await log(fu.lead_id, `Follow-up attempt ${fu.attempt_number} failed: ${err.message}`);
        failed++;

        const failBody = `<div style="font-family:Arial,sans-serif;max-width:600px;background:#0a0a0a;color:#fff;padding:32px;border-radius:16px">
          <div style="font-family:monospace;font-size:11px;color:#ff3333;letter-spacing:3px;margin-bottom:20px">\u26a0\ufe0f FOLLOW-UP FAILED</div>
          <p><strong>Lead:</strong> ${lead.name}</p>
          <p><strong>Attempt:</strong> ${fu.attempt_number} of 3</p>
          <p><strong>Error:</strong> ${err.message}</p>
          <div style="margin-top:20px;padding:14px;background:#111;border-radius:8px">
            <p><a href="${appUrl}/AgentFollowUp" style="color:#00ff88">View Follow-Up Queue \u2192</a></p>
          </div>
        </div>`;
        await S.integrations.Core.SendEmail({
          to: adminEmail,
          subject: `\u26a0\ufe0f Follow-Up Failed \u2014 ${lead.name} \u2014 Attempt ${fu.attempt_number}`,
          body: failBody
        }).catch(() => {});
      }
    }

    return Response.json({ success: true, sent, failed });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});