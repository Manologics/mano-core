import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const S = base44.asServiceRole;
    const now = new Date();

    const settings = await S.entities.AppSettings.list();
    const get = (k, d) => { const s = settings.find(x => x.key === k); return s ? s.value : d; };

    if (get('ops_weekly_digest_enabled', 'true') !== 'true') {
      return Response.json({ success: true, message: 'Weekly digest disabled' });
    }

    const opsEmail = get('ops_admin_email', 'info@monkeebizai.com');
    const appUrl   = get('app_url',         'https://app.monkeebizzai.com');
    const tz       = get('app_timezone',    'America/Phoenix');
    const avgDeal  = parseFloat(get('ops_average_deal_value', '1500'));
    const fuOverdueH  = parseFloat(get('ops_followup_overdue_hours', '2'));
    const retOverdueH = parseFloat(get('ops_retention_overdue_hours', '2'));

    // Week range: last 7 days
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekStart = weekAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: tz });
    const weekEnd   = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: tz });
    const weekRange = `${weekStart} – ${weekEnd}`;

    const [leads, bookings, followups, retentionEvents, opsAlerts] = await Promise.all([
      S.entities.Lead.list(),
      S.entities.Booking.list(),
      S.entities.FollowUp.list(),
      S.entities.RetentionEvents.list(),
      S.entities.OpsAlerts.list(),
    ]);

    const thisWeek = (d) => d && new Date(d) >= weekAgo;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Conversion
    const weekly_leads     = leads.filter(l => thisWeek(l.created_date)).length;
    const weekly_hot       = leads.filter(l => thisWeek(l.created_date) && l.score === 'HOT').length;
    const weekly_booked    = bookings.filter(b => thisWeek(b.created_date) && ['Confirmed','Completed'].includes(b.status)).length;
    const weekly_completed = bookings.filter(b => thisWeek(b.updated_date) && b.status === 'Completed').length;
    const bookingRate      = weekly_leads > 0 ? Math.round((weekly_booked / weekly_leads) * 100) : 0;

    // Follow-up
    const fu_started    = followups.filter(f => thisWeek(f.created_date)).length;
    const fu_responded  = followups.filter(f => thisWeek(f.response_at) && f.response_received).length;
    const fu_response_rate = fu_started > 0 ? Math.round((fu_responded / fu_started) * 100) : 0;
    const fu_no_response = followups.filter(f => f.attempt_number === 3 && f.status === 'Sent' && thisWeek(f.sent_at)).length;

    // Retention
    const retByType = (type) => retentionEvents.filter(r => r.event_type === type && r.status === 'Sent' && thisWeek(r.sent_at)).length;
    const ret_satisfaction = retByType('satisfaction_check');
    const ret_review       = retByType('review_request');
    const ret_referral     = retByType('referral_ask');
    const ret_upsell       = retByType('upsell_trigger');
    const ret_reengaged    = retentionEvents.filter(r => r.response_received && thisWeek(r.response_at)).length;

    // Revenue
    const completed_month = bookings.filter(b => b.status === 'Completed' && new Date(b.updated_date || b.created_date) >= monthStart).length;
    const confirmed_week  = bookings.filter(b => b.status === 'Confirmed').length;
    const hot_not_booked  = leads.filter(l => {
      if (l.score !== 'HOT') return false;
      return !bookings.some(b => b.lead_id === l.id && ['Requested','Confirmed','Rescheduled','Completed'].includes(b.status));
    }).length;

    // System health
    const alerts_created     = opsAlerts.filter(a => thisWeek(a.detected_at)).length;
    const alerts_critical    = opsAlerts.filter(a => thisWeek(a.detected_at) && a.severity === 'critical').length;
    const alerts_auto_resolved = opsAlerts.filter(a => thisWeek(a.resolved_at) && a.status === 'Resolved').length;
    const alerts_still_open  = opsAlerts.filter(a => a.status === 'Open').length;

    // Recommendations (same rules, abbreviated)
    const recs = [];
    const fuOvMs = fuOverdueH * 3600 * 1000;
    const retOvMs = retOverdueH * 3600 * 1000;
    const fu_overdue  = followups.filter(f => f.status === 'Pending' && (now - new Date(f.scheduled_at)) > fuOvMs).length;
    const ret_overdue = retentionEvents.filter(r => r.status === 'Pending' && (now - new Date(r.scheduled_at)) > retOvMs).length;
    const critical_open = opsAlerts.filter(a => a.status === 'Open' && a.severity === 'critical').length;

    if (hot_not_booked > 0)  recs.push(`🔥 ${hot_not_booked} HOT leads unbooked — est. $${(hot_not_booked * avgDeal).toLocaleString()} at risk`);
    if (fu_overdue > 0)      recs.push(`⚠️ ${fu_overdue} follow-ups overdue — leads going cold`);
    if (ret_overdue > 0)     recs.push(`⚠️ ${ret_overdue} retention events overdue`);
    if (critical_open > 0)   recs.push(`🚨 ${critical_open} critical alerts open`);
    if (recs.length === 0)   recs.push(`✅ Clean week. System running well.`);

    const fmt = (n) => `$${Number(n).toLocaleString()}`;
    const subject = `📈 Weekly Performance Digest — ${weekRange}`;

    const body = `<div style="font-family:Arial,sans-serif;max-width:700px;background:#0a0a0a;color:#fff;padding:32px;border-radius:16px">
      <div style="font-family:monospace;font-size:11px;color:#8b5cf6;letter-spacing:3px;margin-bottom:8px">📈 MONKEE BIZZ AI — SAOS</div>
      <h2 style="margin:0 0 4px;color:#fff">Weekly Performance Digest</h2>
      <p style="color:#555;margin:0 0 24px;font-family:monospace;font-size:10px">${weekRange}</p>

      <h3 style="color:#00ff88;font-family:monospace;font-size:11px;letter-spacing:2px;border-bottom:1px solid #1a1a1a;padding-bottom:6px">CONVERSION</h3>
      <table style="width:100%;margin-bottom:20px"><tbody>
        <tr><td style="padding:5px;color:#555;font-size:11px">Total leads this week</td><td style="padding:5px;color:#fff;font-weight:bold">${weekly_leads}</td></tr>
        <tr><td style="padding:5px;color:#555;font-size:11px">HOT leads</td><td style="padding:5px;color:#ff3333;font-weight:bold">${weekly_hot}</td></tr>
        <tr><td style="padding:5px;color:#555;font-size:11px">Booked</td><td style="padding:5px;color:#fff;font-weight:bold">${weekly_booked}</td></tr>
        <tr><td style="padding:5px;color:#555;font-size:11px">Completed</td><td style="padding:5px;color:#00ff88;font-weight:bold">${weekly_completed}</td></tr>
        <tr><td style="padding:5px;color:#555;font-size:11px">Booking rate</td><td style="padding:5px;color:#fff;font-weight:bold">${bookingRate}%</td></tr>
      </tbody></table>

      <h3 style="color:#f59e0b;font-family:monospace;font-size:11px;letter-spacing:2px;border-bottom:1px solid #1a1a1a;padding-bottom:6px">FOLLOW-UP PERFORMANCE</h3>
      <table style="width:100%;margin-bottom:20px"><tbody>
        <tr><td style="padding:5px;color:#555;font-size:11px">Sequences started</td><td style="padding:5px;color:#fff;font-weight:bold">${fu_started}</td></tr>
        <tr><td style="padding:5px;color:#555;font-size:11px">Responses</td><td style="padding:5px;color:#00ff88;font-weight:bold">${fu_responded}</td></tr>
        <tr><td style="padding:5px;color:#555;font-size:11px">Response rate</td><td style="padding:5px;color:#fff;font-weight:bold">${fu_response_rate}%</td></tr>
        <tr><td style="padding:5px;color:#555;font-size:11px">Closed no response</td><td style="padding:5px;color:#fff;font-weight:bold">${fu_no_response}</td></tr>
      </tbody></table>

      <h3 style="color:#8b5cf6;font-family:monospace;font-size:11px;letter-spacing:2px;border-bottom:1px solid #1a1a1a;padding-bottom:6px">RETENTION PERFORMANCE</h3>
      <table style="width:100%;margin-bottom:20px"><tbody>
        <tr><td style="padding:5px;color:#555;font-size:11px">Satisfaction checks</td><td style="padding:5px;color:#fff;font-weight:bold">${ret_satisfaction}</td></tr>
        <tr><td style="padding:5px;color:#555;font-size:11px">Review requests</td><td style="padding:5px;color:#fff;font-weight:bold">${ret_review}</td></tr>
        <tr><td style="padding:5px;color:#555;font-size:11px">Referrals asked</td><td style="padding:5px;color:#fff;font-weight:bold">${ret_referral}</td></tr>
        <tr><td style="padding:5px;color:#555;font-size:11px">Upsells sent</td><td style="padding:5px;color:#fff;font-weight:bold">${ret_upsell}</td></tr>
        <tr><td style="padding:5px;color:#555;font-size:11px">Re-engaged clients</td><td style="padding:5px;color:#8b5cf6;font-weight:bold">${ret_reengaged}</td></tr>
      </tbody></table>

      <h3 style="color:#00ff88;font-family:monospace;font-size:11px;letter-spacing:2px;border-bottom:1px solid #1a1a1a;padding-bottom:6px">REVENUE ESTIMATE (THIS WEEK)</h3>
      <table style="width:100%;margin-bottom:20px"><tbody>
        <tr><td style="padding:5px;color:#555;font-size:11px">Completed revenue</td><td style="padding:5px;color:#00ff88;font-weight:bold">${fmt(completed_month * avgDeal)}</td></tr>
        <tr><td style="padding:5px;color:#555;font-size:11px">Booked pipeline</td><td style="padding:5px;color:#ffdd00;font-weight:bold">${fmt(confirmed_week * avgDeal)}</td></tr>
        <tr><td style="padding:5px;color:#555;font-size:11px">HOT pipeline</td><td style="padding:5px;color:#ff3333;font-weight:bold">${fmt(hot_not_booked * avgDeal)}</td></tr>
        <tr><td colspan="2" style="padding:5px;color:#333;font-size:10px;font-family:monospace">Based on ${fmt(avgDeal)} avg deal value</td></tr>
      </tbody></table>

      <h3 style="color:#ff3333;font-family:monospace;font-size:11px;letter-spacing:2px;border-bottom:1px solid #1a1a1a;padding-bottom:6px">SYSTEM HEALTH</h3>
      <table style="width:100%;margin-bottom:20px"><tbody>
        <tr><td style="padding:5px;color:#555;font-size:11px">Total alerts created</td><td style="padding:5px;color:#fff;font-weight:bold">${alerts_created}</td></tr>
        <tr><td style="padding:5px;color:#555;font-size:11px">Critical alerts</td><td style="padding:5px;color:#ff3333;font-weight:bold">${alerts_critical}</td></tr>
        <tr><td style="padding:5px;color:#555;font-size:11px">Auto-resolved</td><td style="padding:5px;color:#00ff88;font-weight:bold">${alerts_auto_resolved}</td></tr>
        <tr><td style="padding:5px;color:#555;font-size:11px">Still open</td><td style="padding:5px;color:#fff;font-weight:bold">${alerts_still_open}</td></tr>
      </tbody></table>

      <h3 style="color:#fff;font-family:monospace;font-size:11px;letter-spacing:2px;border-bottom:1px solid #1a1a1a;padding-bottom:6px">RECOMMENDATIONS</h3>
      <div style="margin-bottom:24px">${recs.slice(0,3).map(r => `<p style="padding:8px 12px;background:#111;border-radius:6px;margin:5px 0;font-size:12px">${r}</p>`).join('')}</div>

      <div style="padding:16px;background:#111;border-radius:10px">
        <p style="font-family:monospace;font-size:9px;color:#555;margin:0 0 10px;letter-spacing:2px">QUICK ACTIONS</p>
        <p><a href="${appUrl}/CommandCenter" style="color:#8b5cf6">View Full Pipeline →</a></p>
        <p><a href="${appUrl}/AgentOps" style="color:#8b5cf6">View Ops Dashboard →</a></p>
      </div>
    </div>`;

    let emailSent = false;
    try {
      await S.integrations.Core.SendEmail({ to: opsEmail, subject, body });
      emailSent = true;
    } catch (e) {
      await S.entities.ActivityLog.create({ lead_id: 'system', event: `Agent 5 — Weekly digest failed: ${e.message}`, created_at: now.toISOString() }).catch(() => {});
    }

    await S.entities.ReportHistory.create({
      report_type: 'weekly_performance_digest',
      generated_at: now.toISOString(),
      subject,
      summary_json: JSON.stringify({ weekRange, weekly_leads, weekly_hot, weekly_booked, weekly_completed, bookingRate, fu_started, fu_responded, fu_response_rate, ret_satisfaction, ret_review, ret_referral, ret_upsell, ret_reengaged, alerts_created, alerts_critical, alerts_auto_resolved, alerts_still_open, recommendations: recs }),
      email_sent: emailSent,
      email_sent_at: emailSent ? now.toISOString() : null,
      status: emailSent ? 'Sent' : 'Failed',
    });

    await S.entities.ActivityLog.create({ lead_id: 'system', event: `Agent 5 — Weekly digest ${emailSent ? 'sent' : 'failed'} — ${weekRange}`, created_at: now.toISOString() }).catch(() => {});

    return Response.json({ success: true, email_sent: emailSent, week: weekRange });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});