import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const S = base44.asServiceRole;
    const body = await req.json();
    const { alert_id, action } = body;

    if (!alert_id || !action) return Response.json({ error: 'Missing alert_id or action' }, { status: 400 });
    if (!['acknowledge', 'resolve', 'ignore'].includes(action)) {
      return Response.json({ error: 'Invalid action. Use: acknowledge | resolve | ignore' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const alert = await S.entities.OpsAlerts.get(alert_id);

    let update = {};
    if (action === 'acknowledge') {
      update = { status: 'Acknowledged', acknowledged_at: now };
    } else if (action === 'resolve') {
      update = { status: 'Resolved', resolved_at: now };
    } else if (action === 'ignore') {
      update = { status: 'Ignored', resolved_at: now };
    }

    await S.entities.OpsAlerts.update(alert_id, update);
    await S.entities.ActivityLog.create({
      lead_id: alert.lead_id || 'system',
      event: `Ops alert ${action}d — ${alert.alert_type}`,
      created_at: now,
    }).catch(() => {});

    return Response.json({ success: true, action, alert_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});