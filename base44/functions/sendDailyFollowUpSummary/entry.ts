import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const S = base44.asServiceRole;

    const settings = await S.entities.AppSettings.list();
    const get = (k, d) => { const s = settings.find(x => x.key === k); return s ? s.value : d; };

    const adminEmail = get("admin_email", "info@monkeebizai.com");
    const businessName = get("business_name", "Monkee Bizz AI");
    const tz = get("app_timezone", "America/Phoenix");
    const appUrl = get("app_url", "https://app.monkeebizzai.com");

    const [followups, leads] = await Promise.all([
      S.entities.FollowUp.list(),
      S.entities.Lead.list()
    ]);

    const activeSeqs = followups.filter(f => f.status === "Pending");
    if (activeSeqs.length === 0) {
      return Response.json({ success: true, message: "No active sequences — no email sent" });
    }

    const now = new Date();
    const today = now.toLocaleDateString("en-CA", { timeZone: tz });
    const leadMap = Object.fromEntries(leads.map(l => [l.id, l]));

    const dueToday = activeSeqs.filter(f => {
      const d = new Date(f.scheduled_at).toLocaleDateString("en-CA", { timeZone: tz });
      return d === today;
    });

    const overdue = activeSeqs.filter(f => new Date(f.scheduled_at) < now);

    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const respondedThisWeek = followups.filter(f =>
      f.status === "Responded" && f.response_at && new Date(f.response_at) >= weekAgo
    ).length;

    const fmtDate = (iso) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: tz });

    const dueTodayRows = dueToday.map(f => {
      const l = leadMap[f.lead_id] || {};
      return `<tr><td style="padding:8px 10px;border-bottom:1px solid #1a1a1a">${l.name||"—"}</td><td style="padding:8px 10px;border-bottom:1px solid #1a1a1a">${l.score||"—"}</td><td style="padding:8px 10px;border-bottom:1px solid #1a1a1a">Attempt ${f.attempt_number} of 3</td><td style="padding:8px 10px;border-bottom:1px solid #1a1a1a">${l.phone||"—"}</td></tr>`;
    }).join("");

    const overdueRows = overdue.map(f => {
      const l = leadMap[f.lead_id] || {};
      return `<tr><td style="padding:8px 10px;border-bottom:1px solid #1a1a1a">${l.name||"—"}</td><td style="padding:8px 10px;border-bottom:1px solid #1a1a1a">${l.score||"—"}</td><td style="padding:8px 10px;border-bottom:1px solid #1a1a1a">Was due: ${fmtDate(f.scheduled_at)}</td><td style="padding:8px 10px;border-bottom:1px solid #1a1a1a">${l.phone||"—"}</td></tr>`;
    }).join("");

    const body = `<div style="font-family:Arial,sans-serif;max-width:700px;background:#0a0a0a;color:#fff;padding:32px;border-radius:16px">
      <div style="font-family:monospace;font-size:11px;color:#f59e0b;letter-spacing:3px;margin-bottom:8px">🔁 FOLLOW-UP SUMMARY</div>
      <h2 style="margin:0 0 4px;color:#fff">${now.toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", timeZone:tz })}</h2>
      <div style="display:flex;gap:20px;margin:20px 0;flex-wrap:wrap">
        ${[["ACTIVE", activeSeqs.length, "#f59e0b"],["DUE TODAY", dueToday.length, "#00ff88"],["OVERDUE", overdue.length, overdue.length > 0 ? "#ff3333" : "#555"],["RESPONDED THIS WEEK", respondedThisWeek, "#00ff88"]].map(([l,v,c]) => `<div style="background:#111;border:1px solid ${c}22;border-radius:8px;padding:12px 16px;min-width:120px"><div style="font-family:monospace;font-size:9px;color:#555;margin-bottom:4px">${l}</div><div style="font-size:28px;font-weight:700;color:${c}">${v}</div></div>`).join("")}
      </div>
      ${dueToday.length > 0 ? `<div style="margin-bottom:20px"><div style="font-family:monospace;font-size:10px;color:#00ff88;margin-bottom:8px">DUE TODAY</div><table style="width:100%;border-collapse:collapse">${dueTodayRows}</table></div>` : ""}
      ${overdue.length > 0 ? `<div style="margin-bottom:20px"><div style="font-family:monospace;font-size:10px;color:#ff3333;margin-bottom:8px">OVERDUE</div><table style="width:100%;border-collapse:collapse">${overdueRows}</table></div>` : ""}
      <div style="margin-top:20px;padding:14px;background:#111;border-radius:8px">
        <p style="margin:0 0 8px;font-family:monospace;font-size:10px;color:#555">QUICK ACTIONS</p>
        <p><a href="${appUrl}/AgentFollowUp" style="color:#00ff88">View Follow-Up Queue →</a></p>
        <p><a href="${appUrl}/CommandCenter" style="color:#00ff88">View Full Pipeline →</a></p>
      </div>
    </div>`;

    await S.integrations.Core.SendEmail({
      to: adminEmail,
      subject: `🔁 Follow-Up Summary — ${activeSeqs.length} active sequences — ${now.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: tz })}`,
      body
    });

    return Response.json({ success: true, active: activeSeqs.length, due_today: dueToday.length, overdue: overdue.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});