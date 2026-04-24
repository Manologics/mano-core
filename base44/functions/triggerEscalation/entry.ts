// triggerEscalation — creates an OpsAlert and emails admin for critical situations
// Called by other functions when a risky event is detected
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const URGENCY_LEVELS = {
  hot_lead_ready:        'HIGH',
  custom_pricing:        'MEDIUM',
  complaint_refund:      'HIGH',
  angry_customer:        'HIGH',
  legal_threat:          'HIGH',
  spam_suspicious:       'MEDIUM',
  failed_sms:            'MEDIUM',
  failed_webhook:        'HIGH',
  payment_issue:         'HIGH',
  booking_failure:       'HIGH',
  out_of_scope:          'LOW',
};

Deno.serve(async (req) => {
  try {
    const S = createClientFromRequest(req).asServiceRole;
    const body = await req.json();
    const { lead_id, type, contact, issue, context, recommended_action } = body;

    if (!type || !issue) {
      return Response.json({ error: 'type and issue are required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const urgency = URGENCY_LEVELS[type] || 'MEDIUM';

    const settings = await S.entities.AppSettings.list();
    const get = (k, d) => { const s = settings.find(x => x.key === k); return s ? s.value : d; };
    const adminEmail   = get('admin_email', 'info@monkeebizai.com');
    const businessName = get('business_name', 'Monkee Bizz AI');
    const appUrl       = get('app_url', 'https://app.monkeebizzai.com');

    const description =
      `ESCALATION ALERT\n` +
      `Contact: ${contact || lead_id || 'Unknown'}\n` +
      `Issue: ${issue}\n` +
      `Context: ${context || '—'}\n` +
      `Recommended Action: ${recommended_action || 'Review immediately'}\n` +
      `Urgency: ${urgency}`;

    // Save OpsAlert
    const alert = await S.entities.OpsAlerts.create({
      alert_type:    'manual_review_needed',
      severity:      urgency === 'HIGH' ? 'critical' : urgency === 'MEDIUM' ? 'high' : 'medium',
      source_agent:  'Security Layer',
      lead_id:       lead_id || null,
      title:         `Escalation — ${type.replace(/_/g, ' ').toUpperCase()}`,
      description,
      status:        'Open',
      detected_at:   now,
    });

    // Update lead if provided
    if (lead_id) {
      await S.entities.Lead.update(lead_id, {
        security_flag:     type,
        escalation_reason: issue,
        last_escalation_at: now,
      }).catch(() => {});
      await S.entities.ActivityLog.create({
        lead_id,
        event: `[Security] Escalation triggered — type:${type} — urgency:${urgency} — ${issue.slice(0, 120)}`,
        created_at: now,
      }).catch(() => {});
    }

    // Email admin
    const urgencyColor = urgency === 'HIGH' ? '#ff3333' : urgency === 'MEDIUM' ? '#ffaa00' : '#888888';
    await S.integrations.Core.SendEmail({
      to: adminEmail,
      subject: `🚨 [${urgency}] Escalation — ${type.replace(/_/g, ' ')} — ${businessName}`,
      body: `<div style="font-family:Arial,sans-serif;max-width:600px;background:#0a0a0a;color:#fff;padding:32px;border-radius:16px">
        <div style="font-family:monospace;font-size:11px;color:${urgencyColor};letter-spacing:3px;margin-bottom:20px">🚨 ESCALATION ALERT — ${urgency}</div>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:10px;border-bottom:1px solid #1a1a1a;color:#555;font-size:11px;width:160px;font-family:monospace">CONTACT</td><td style="padding:10px;border-bottom:1px solid #1a1a1a;color:#ddd">${contact || lead_id || '—'}</td></tr>
          <tr><td style="padding:10px;border-bottom:1px solid #1a1a1a;color:#555;font-size:11px;font-family:monospace">TYPE</td><td style="padding:10px;border-bottom:1px solid #1a1a1a;color:${urgencyColor};font-weight:700">${type.replace(/_/g, ' ').toUpperCase()}</td></tr>
          <tr><td style="padding:10px;border-bottom:1px solid #1a1a1a;color:#555;font-size:11px;font-family:monospace">ISSUE</td><td style="padding:10px;border-bottom:1px solid #1a1a1a;color:#fff">${issue}</td></tr>
          <tr><td style="padding:10px;border-bottom:1px solid #1a1a1a;color:#555;font-size:11px;font-family:monospace">CONTEXT</td><td style="padding:10px;border-bottom:1px solid #1a1a1a;color:#aaa">${context || '—'}</td></tr>
          <tr><td style="padding:10px;color:#555;font-size:11px;font-family:monospace">RECOMMENDED</td><td style="padding:10px;color:#00ff88">${recommended_action || 'Review immediately'}</td></tr>
        </table>
        <div style="margin-top:20px;padding:14px;background:#111;border-radius:8px">
          <p><a href="${appUrl}/AgentOps" style="color:${urgencyColor}">View Security Panel →</a></p>
          ${lead_id ? `<p><a href="${appUrl}/AgentIntake" style="color:#00ff88">View Lead →</a></p>` : ''}
        </div>
        <div style="margin-top:16px;font-family:monospace;font-size:9px;color:#333">${now}</div>
      </div>`,
    });

    console.log(`[triggerEscalation] Alert created — type:${type} urgency:${urgency} lead:${lead_id || 'none'}`);
    return Response.json({ success: true, alert_id: alert.id, urgency });

  } catch (error) {
    console.error('[triggerEscalation] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});