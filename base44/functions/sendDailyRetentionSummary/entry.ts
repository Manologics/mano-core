import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const S = base44.asServiceRole;

    const settings = await S.entities.AppSettings.list();
    const get = (k, d) => { const s = settings.find(x => x.key === k); return s ? s.value : d; };

    const adminEmail   = get("admin_email",    "info@monkeebizai.com");
    const businessName = get("business_name",  "Monkee Bizz AI");
    const tz           = get("app_timezone",   "America/Phoenix");
    const appUrl       = get("app_url",        "https://app.monkeebizzai.com");

    const [events, leads] = await Promise.all([
      S.entities.RetentionEvents.list(),
      S.entities.Lead.list()
    ]);

    const pending = events.filter(e => e.status === "Pending");
    if (pending.length === 0) {
      return Response.json({ success: true, message: "No pending events — no email sent" });
    }

    const now = new Date();
    const today = now.toLocaleDateString("en-CA", { timeZone: tz });
    const leadMap = Object.fromEntries(leads.map(l => [l.id, l]));

    const dueToday = pending.filter(e => {
      const d = new Date(e.scheduled_at).toLocaleDateString("en-CA", { timeZone: tz });
      return d === today;
    });

    const overdue = pending.filter(e => new Date(e.scheduled_at) < now);

    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const respondedThisWeek = events.filter(e =>
      e.status === "Responded" && e.response_at && new Date(e.response_at) >= weekAgo
    ).length;

    const fmtDate = (iso) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: tz });

    const rows = (items) => items.map(e => {
      const l = leadMap[e.lead_id] || {};
      return `<tr>
        <td style="padding:8px 10px;border-bottom:1px solid #1a1a1a">${l.name || "—"}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #1a1a1a">${e.event_type.replace(/_/g, " ")}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #1a1a1a">${fmtDate(e.scheduled_at)}</td>
      </tr>`;
    }).join("");

    const body = `<div style="font-family:Arial,sans-serif;max-width:700px;background:#0a0a0a;color:#fff;padding:32px;border-radius:16px">
      <div style="font-family:monospace;font-size:11px;color:#8b5cf6;letter-spacing:3px;margin-bottom:8px">♻️ RETENTION SUMMARY</div>
      <h2 style="margin:0 0 4px;color:#fff">${now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: tz })}</h2>
      <div style="display:flex;gap:20px;margin:20px 0;flex-wrap:wrap">
        ${[["PENDING", pending.length, "#8b5cf6"], ["DUE TODAY", dueToday.length, "#00ff88"], ["OVERDUE", overdue.length, overdue.length > 0 ? "#ff3333" : "#555"], ["RESPONDED THIS WEEK", respondedThisWeek, "#00ff88"]].map(([l, v, c]) =>
          `<div style="background:#111;border:1px solid ${c}22;border-radius:8px;padding:12px 16px;min-width:120px">
            <div style="font-family:monospace;font-size:9px;color:#555;margin-bottom:4px">${l}</div>
            <div style="font-size:28px;font-weight:700;color:${c}">${v}</div>
          </div>`
        ).join("")}
      </div>
      ${dueToday.length > 0 ? `<div style="margin-bottom:20px">
        <div style="font-family:monospace;font-size:10px;color:#00ff88;margin-bottom:8px">DUE TODAY</div>
        <table style="width:100%;border-collapse:collapse">${rows(dueToday)}</table>
      </div>` : ""}
      ${overdue.length > 0 ? `<div style="margin-bottom:20px">
        <div style="font-family:monospace;font-size:10px;color:#ff3333;margin-bottom:8px">OVERDUE</div>
        <table style="width:100%;border-collapse:collapse">${rows(overdue)}</table>
      </div>` : ""}
      <div style="margin-top:20px;padding:14px;background:#111;border-radius:8px">
        <p style="margin:0 0 8px;font-family:monospace;font-size:10px;color:#555">QUICK ACTIONS</p>
        <p><a href="${appUrl}/AgentRetention" style="color:#8b5cf6">View Retention Queue →</a></p>
        <p><a href="${appUrl}/CommandCenter" style="color:#8b5cf6">View Full Pipeline →</a></p>
      </div>
    </div>`;

    await S.integrations.Core.SendEmail({
      to: adminEmail,
      subject: `♻️ Retention Summary — ${pending.length} pending — ${now.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: tz })}`,
      body
    });

    await S.entities.ActivityLog.create({
      lead_id: "system",
      event: "Daily retention summary sent",
      created_at: now.toISOString()
    }).catch(() => {});

    return Response.json({ success: true, pending: pending.length, due_today: dueToday.length, overdue: overdue.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});