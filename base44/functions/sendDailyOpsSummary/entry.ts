import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const S = base44.asServiceRole;
    const now = new Date();

    const settings = await S.entities.AppSettings.list();
    const get = (k, d) => { const s = settings.find(x => x.key === k); return s ? s.value : d; };

    if (get('ops_summary_enabled', 'true') !== 'true') {
      return Response.json({ success: true, message: 'Daily ops summary disabled' });
    }

    const opsEmail    = get('ops_admin_email',        'info@monkeebizai.com');
    const appUrl      = get('app_url',                'https://app.monkeebizzai.com');
    const tz          = get('app_timezone',           'America/Phoenix');
    const avgDeal     = parseFloat(get('ops_average_deal_value', '1500'));
    const fuOverdueH  = parseFloat(get('ops_followup_overdue_hours', '2'));
    const retOverdueH = parseFloat(get('ops_retention_overdue_hours', '2'));

    const today = now.toLocaleDateString('en-CA', { timeZone: tz });

    const [leads, bookings, followups, retentionEvents, opsAlerts, activityLogs] = await Promise.all([
      S.entities.Lead.list(),
      S.entities.Booking.list(),
      S.entities.FollowUp.list(),
      S.entities.RetentionEvents.list(),
      S.entities.OpsAlerts.list(),
      S.entities.ActivityLog.list(),
    ]);

    // ── METRICS ──────────────────────────────────────────────────────────────
    const bookingsByLead = {};
    for (const b of bookings) {
      if (!bookingsByLead[b.lead_id]) bookingsByLead[b.lead_id] = [];
      bookingsByLead[b.lead_id].push(b);
    }

    const total_leads      = leads.length;
    const hot_leads        = leads.filter(l => l.score === 'HOT').length;
    const warm_leads       = leads.filter(l => l.score === 'WARM').length;
    const cold_leads       = leads.filter(l => l.score === 'COLD').length;
    const new_leads_today  = leads.filter(l => new Date(l.created_date).toLocaleDateString('en-CA', { timeZone: tz }) === today).length;

    const hot_not_booked = leads.filter(l => {
      if (l.score !== 'HOT') return false;
      const lb = bookingsByLead[l.id] || [];
      return !lb.some(b => ['Requested','Confirmed','Rescheduled','Completed'].includes(b.status));
    }).length;

    const bookings_requested  = bookings.filter(b => b.status === 'Requested').length;
    const bookings_confirmed  = bookings.filter(b => b.status === 'Confirmed').length;
    const todayBookings       = bookings.filter(b => b.status === 'Completed' && new Date(b.updated_date).toLocaleDateString('en-CA', { timeZone: tz }) === today);
    const bookings_completed  = todayBookings.length;
    const no_shows            = bookings.filter(b => b.no_show_flagged).length;

    const noShowLeadIds = new Set(bookings.filter(b => b.no_show_flagged).map(b => b.lead_id));
    const no_shows_not_reengaged = [...noShowLeadIds].filter(lid => {
      const lf = followups.filter(f => f.lead_id === lid && f.sequence_type === 'no_show');
      return lf.length === 0;
    }).length;

    const fuOverdueMs = fuOverdueH * 3600 * 1000;
    const followups_active    = followups.filter(f => f.status === 'Pending').length;
    const followups_due_today = followups.filter(f => f.status === 'Pending' && new Date(f.scheduled_at).toLocaleDateString('en-CA', { timeZone: tz }) === today).length;
    const followups_overdue   = followups.filter(f => f.status === 'Pending' && (now - new Date(f.scheduled_at)) > fuOverdueMs).length;

    const retOverdueMs = retOverdueH * 3600 * 1000;
    const retention_pending    = retentionEvents.filter(r => r.status === 'Pending').length;
    const retention_due_today  = retentionEvents.filter(r => r.status === 'Pending' && new Date(r.scheduled_at).toLocaleDateString('en-CA', { timeZone: tz }) === today).length;
    const retention_overdue    = retentionEvents.filter(r => r.status === 'Pending' && (now - new Date(r.scheduled_at)) > retOverdueMs).length;

    const open_alerts     = opsAlerts.filter(a => a.status === 'Open').length;
    const critical_alerts = opsAlerts.filter(a => a.status === 'Open' && a.severity === 'critical').length;
    const todayLogs = activityLogs.filter(l => new Date(l.created_at).toLocaleDateString('en-CA', { timeZone: tz }) === today);
    const failed_sends = todayLogs.filter(l => (l.event || '').toLowerCase().includes('failed')).length;

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const completed_revenue_month = bookings.filter(b => b.status === 'Completed' && new Date(b.updated_date || b.created_date) >= monthStart).length * avgDeal;
    const pipeline_value_est      = hot_not_booked * avgDeal;
    const at_risk_value_est       = hot_not_booked * avgDeal;
    const booked_pipeline_value   = bookings_confirmed * avgDeal;
    const retention_opportunity   = Math.round(retention_pending * avgDeal * 0.3);

    const metrics = {
      total_leads, hot_leads, warm_leads, cold_leads, new_leads_today,
      bookings_requested, bookings_confirmed, bookings_completed, no_shows, no_shows_not_reengaged,
      followups_active, followups_due_today, followups_overdue,
      retention_pending, retention_due_today, retention_overdue,
      hot_not_booked, failed_sends, open_alerts, critical_alerts,
      pipeline_value_est, at_risk_value_est, booked_pipeline_value,
      completed_revenue_month, retention_opportunity,
    };

    // ── RECOMMENDATIONS ──────────────────────────────────────────────────────
    const staleMinutes = parseFloat(get('ops_hot_lead_stale_minutes', '30'));
    const recs = [];
    if (hot_not_booked > 0)         recs.push(`🔥 ${hot_not_booked} HOT lead${hot_not_booked > 1 ? 's' : ''} with no booking in ${staleMinutes} min. Est. at risk: $${(hot_not_booked * avgDeal).toLocaleString()} → View HOT Leads: ${appUrl}/AgentIntake`);
    if (no_shows_not_reengaged > 0) recs.push(`⚠️ ${no_shows_not_reengaged} no-show${no_shows_not_reengaged > 1 ? 's' : ''} with no follow-up sequence running. These are re-bookable. → View Bookings: ${appUrl}/AgentBooking`);
    if (followups_overdue > 0)      recs.push(`⚠️ ${followups_overdue} follow-up${followups_overdue > 1 ? 's' : ''} overdue by more than ${fuOverdueH} hrs. Leads going cold. → View Follow-Up Queue: ${appUrl}/AgentFollowUp`);
    if (retention_overdue > 0)      recs.push(`⚠️ ${retention_overdue} retention event${retention_overdue > 1 ? 's' : ''} overdue. Revenue sitting in queue untouched. → View Retention Queue: ${appUrl}/AgentRetention`);
    if (critical_alerts > 0)        recs.push(`🚨 ${critical_alerts} critical alert${critical_alerts > 1 ? 's' : ''} need immediate attention. → View Ops Dashboard: ${appUrl}/AgentOps`);
    const contractViolations = opsAlerts.filter(a => a.status === 'Open' && a.alert_type === 'contract_violation').length;
    if (contractViolations > 0)     recs.push(`⚡ ${contractViolations} cross-agent contract violation${contractViolations > 1 ? 's' : ''} detected. → View Ops Dashboard: ${appUrl}/AgentOps`);

    const top5 = recs.slice(0, 5);
    if (top5.length === 0) {
      top5.push(`✅ System running clean. ${total_leads} leads in pipeline. ${bookings_confirmed} confirmed bookings. Pipeline est: $${(hot_leads * avgDeal).toLocaleString()}`);
    }

    // ── SAVE RECORDS ─────────────────────────────────────────────────────────
    const reportJson = JSON.stringify({ ...metrics, recommendations: top5, generated_at: now.toISOString() });

    const existing = await S.entities.DailyReports.filter({ report_date: today }).catch(() => []);
    if (existing && existing.length > 0) {
      await S.entities.DailyReports.update(existing[0].id, { ...metrics, generated_at: now.toISOString(), report_json: reportJson });
    } else {
      await S.entities.DailyReports.create({ report_date: today, generated_at: now.toISOString(), ...metrics, report_json: reportJson });
    }

    const dateLabel = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: tz });
    const subject = `🧠 Daily Ops Summary — ${today} — ${new_leads_today} new — ${hot_leads} HOT — ${open_alerts} alerts`;

    const openAlertsList = opsAlerts.filter(a => a.status === 'Open')
      .sort((a, b) => {
        const order = { critical: 0, high: 1, medium: 2, low: 3 };
        return (order[a.severity] || 4) - (order[b.severity] || 4);
      })
      .slice(0, 20)
      .map(a => `<tr><td style="padding:6px 10px;border-bottom:1px solid #1a1a1a">${a.alert_type === 'contract_violation' ? '⚡' : a.severity === 'critical' ? '🚨' : '⚠️'} ${a.severity.toUpperCase()}</td><td style="padding:6px 10px;border-bottom:1px solid #1a1a1a">${a.title}</td><td style="padding:6px 10px;border-bottom:1px solid #1a1a1a;color:#888;font-size:11px">${a.description}</td></tr>`)
      .join('');

    const fmt = (n) => `$${Number(n).toLocaleString()}`;
    const flag = (n) => n > 0 ? ` ⚠️` : '';

    const body = `<div style="font-family:Arial,sans-serif;max-width:720px;background:#0a0a0a;color:#fff;padding:32px;border-radius:16px">
      <div style="font-family:monospace;font-size:11px;color:#8b5cf6;letter-spacing:3px;margin-bottom:8px">🧠 MONKEE BIZZ AI — SAOS</div>
      <h2 style="margin:0 0 4px;color:#fff">Daily Ops Summary — ${dateLabel}</h2>
      <p style="color:#555;margin:0 0 24px;font-family:monospace;font-size:10px">Generated: ${now.toLocaleString('en-US', { timeZone: tz })}</p>

      <h3 style="color:#00ff88;font-family:monospace;font-size:12px;letter-spacing:2px;border-bottom:1px solid #1a1a1a;padding-bottom:6px">PIPELINE</h3>
      <table style="width:100%;margin-bottom:20px"><tbody>
        <tr><td style="padding:5px;color:#555;font-size:11px">New Leads Today</td><td style="padding:5px;color:#fff;font-weight:bold">${new_leads_today}</td></tr>
        <tr><td style="padding:5px;color:#555;font-size:11px">HOT Leads</td><td style="padding:5px;color:#ff3333;font-weight:bold">${hot_leads}</td></tr>
        <tr><td style="padding:5px;color:#555;font-size:11px">HOT Not Booked${flag(hot_not_booked)}</td><td style="padding:5px;color:#fff;font-weight:bold">${hot_not_booked}</td></tr>
        <tr><td style="padding:5px;color:#555;font-size:11px">Pipeline Est</td><td style="padding:5px;color:#fff;font-weight:bold">${fmt(pipeline_value_est)}</td></tr>
        <tr><td style="padding:5px;color:#555;font-size:11px">At Risk Est</td><td style="padding:5px;color:#ff3333;font-weight:bold">${fmt(at_risk_value_est)}</td></tr>
      </tbody></table>

      <h3 style="color:#00ff88;font-family:monospace;font-size:12px;letter-spacing:2px;border-bottom:1px solid #1a1a1a;padding-bottom:6px">REVENUE ESTIMATE</h3>
      <table style="width:100%;margin-bottom:20px"><tbody>
        <tr><td style="padding:5px;color:#555;font-size:11px">HOT Pipeline</td><td style="padding:5px;color:#ff3333;font-weight:bold">${fmt(pipeline_value_est)}</td></tr>
        <tr><td style="padding:5px;color:#555;font-size:11px">Booked Pipeline</td><td style="padding:5px;color:#ffdd00;font-weight:bold">${fmt(booked_pipeline_value)}</td></tr>
        <tr><td style="padding:5px;color:#555;font-size:11px">Completed (month)</td><td style="padding:5px;color:#00ff88;font-weight:bold">${fmt(completed_revenue_month)}</td></tr>
        <tr><td style="padding:5px;color:#555;font-size:11px">Retention Opp</td><td style="padding:5px;color:#8b5cf6;font-weight:bold">${fmt(retention_opportunity)}</td></tr>
        <tr><td colspan="2" style="padding:5px;color:#333;font-size:10px;font-family:monospace">Based on ${fmt(avgDeal)} avg deal value</td></tr>
      </tbody></table>

      <h3 style="color:#00ff88;font-family:monospace;font-size:12px;letter-spacing:2px;border-bottom:1px solid #1a1a1a;padding-bottom:6px">BOOKINGS</h3>
      <table style="width:100%;margin-bottom:20px"><tbody>
        <tr><td style="padding:5px;color:#555;font-size:11px">Confirmed</td><td style="padding:5px;color:#fff;font-weight:bold">${bookings_confirmed}</td></tr>
        <tr><td style="padding:5px;color:#555;font-size:11px">Completed Today</td><td style="padding:5px;color:#00ff88;font-weight:bold">${bookings_completed}</td></tr>
        <tr><td style="padding:5px;color:#555;font-size:11px">No-Shows</td><td style="padding:5px;color:#fff;font-weight:bold">${no_shows}</td></tr>
        <tr><td style="padding:5px;color:#555;font-size:11px">Not Re-Engaged${flag(no_shows_not_reengaged)}</td><td style="padding:5px;color:#fff;font-weight:bold">${no_shows_not_reengaged}</td></tr>
      </tbody></table>

      <h3 style="color:#f59e0b;font-family:monospace;font-size:12px;letter-spacing:2px;border-bottom:1px solid #1a1a1a;padding-bottom:6px">FOLLOW-UP</h3>
      <table style="width:100%;margin-bottom:20px"><tbody>
        <tr><td style="padding:5px;color:#555;font-size:11px">Active Sequences</td><td style="padding:5px;color:#fff;font-weight:bold">${followups_active}</td></tr>
        <tr><td style="padding:5px;color:#555;font-size:11px">Due Today</td><td style="padding:5px;color:#fff;font-weight:bold">${followups_due_today}</td></tr>
        <tr><td style="padding:5px;color:#555;font-size:11px">Overdue${flag(followups_overdue)}</td><td style="padding:5px;color:#fff;font-weight:bold">${followups_overdue}</td></tr>
      </tbody></table>

      <h3 style="color:#8b5cf6;font-family:monospace;font-size:12px;letter-spacing:2px;border-bottom:1px solid #1a1a1a;padding-bottom:6px">RETENTION</h3>
      <table style="width:100%;margin-bottom:20px"><tbody>
        <tr><td style="padding:5px;color:#555;font-size:11px">Pending Events</td><td style="padding:5px;color:#fff;font-weight:bold">${retention_pending}</td></tr>
        <tr><td style="padding:5px;color:#555;font-size:11px">Due Today</td><td style="padding:5px;color:#fff;font-weight:bold">${retention_due_today}</td></tr>
        <tr><td style="padding:5px;color:#555;font-size:11px">Overdue${flag(retention_overdue)}</td><td style="padding:5px;color:#fff;font-weight:bold">${retention_overdue}</td></tr>
      </tbody></table>

      <h3 style="color:#ff3333;font-family:monospace;font-size:12px;letter-spacing:2px;border-bottom:1px solid #1a1a1a;padding-bottom:6px">SYSTEM HEALTH</h3>
      <table style="width:100%;margin-bottom:20px"><tbody>
        <tr><td style="padding:5px;color:#555;font-size:11px">Open Alerts</td><td style="padding:5px;color:#fff;font-weight:bold">${open_alerts}</td></tr>
        <tr><td style="padding:5px;color:#555;font-size:11px">Critical Alerts${critical_alerts > 0 ? ' 🚨' : ''}</td><td style="padding:5px;color:${critical_alerts > 0 ? '#ff3333' : '#fff'};font-weight:bold">${critical_alerts}</td></tr>
        <tr><td style="padding:5px;color:#555;font-size:11px">Failed Sends${flag(failed_sends)}</td><td style="padding:5px;color:#fff;font-weight:bold">${failed_sends}</td></tr>
      </tbody></table>

      <h3 style="color:#fff;font-family:monospace;font-size:12px;letter-spacing:2px;border-bottom:1px solid #1a1a1a;padding-bottom:6px">TOP PRIORITIES</h3>
      <div style="margin-bottom:20px">${top5.map(r => `<p style="padding:8px 12px;background:#111;border-radius:6px;margin:6px 0;font-size:12px">${r}</p>`).join('')}</div>

      ${openAlertsList ? `<h3 style="color:#ff3333;font-family:monospace;font-size:12px;letter-spacing:2px;border-bottom:1px solid #1a1a1a;padding-bottom:6px">ACTIVE ALERTS</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">${openAlertsList}</table>` : ''}

      <div style="margin-top:24px;padding:16px;background:#111;border-radius:10px">
        <p style="font-family:monospace;font-size:9px;color:#555;margin:0 0 10px;letter-spacing:2px">QUICK ACTIONS</p>
        <p><a href="${appUrl}/CommandCenter" style="color:#8b5cf6">Command Center →</a></p>
        <p><a href="${appUrl}/AgentIntake" style="color:#8b5cf6">HOT Leads →</a></p>
        <p><a href="${appUrl}/AgentBooking" style="color:#8b5cf6">Bookings →</a></p>
        <p><a href="${appUrl}/AgentFollowUp" style="color:#8b5cf6">Follow-Up Queue →</a></p>
        <p><a href="${appUrl}/AgentRetention" style="color:#8b5cf6">Retention Queue →</a></p>
        <p><a href="${appUrl}/AgentOps" style="color:#8b5cf6">Ops Dashboard →</a></p>
      </div>
    </div>`;

    let emailSent = false;
    try {
      await S.integrations.Core.SendEmail({ to: opsEmail, subject, body });
      emailSent = true;
    } catch (emailErr) {
      await S.entities.ActivityLog.create({ lead_id: 'system', event: `Agent 5 — Daily summary failed: ${emailErr.message}`, created_at: now.toISOString() }).catch(() => {});
      await S.entities.OpsAlerts.create({
        alert_type: 'summary_generation_failure', severity: 'high', source_agent: 'Agent 5',
        title: 'Daily ops summary failed to send',
        description: emailErr.message, status: 'Open', detected_at: now.toISOString(),
      }).catch(() => {});
    }

    // Save ReportHistory
    const rh = await S.entities.ReportHistory.create({
      report_type: 'daily_ops_summary',
      generated_at: now.toISOString(),
      subject,
      summary_json: reportJson,
      email_sent: emailSent,
      email_sent_at: emailSent ? now.toISOString() : null,
      status: emailSent ? 'Sent' : 'Failed',
    });

    // Update DailyReports email flag
    const dr = await S.entities.DailyReports.filter({ report_date: today }).catch(() => []);
    if (dr && dr.length > 0) {
      await S.entities.DailyReports.update(dr[0].id, { email_sent: emailSent });
    }

    await S.entities.ActivityLog.create({ lead_id: 'system', event: `Agent 5 — Daily ops summary ${emailSent ? 'sent' : 'failed'} — ${today}`, created_at: now.toISOString() }).catch(() => {});

    return Response.json({ success: true, email_sent: emailSent, metrics });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});