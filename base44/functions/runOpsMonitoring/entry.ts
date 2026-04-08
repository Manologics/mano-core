import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const S = base44.asServiceRole;
    const now = new Date();

    const log = (lead_id, event) =>
      S.entities.ActivityLog.create({ lead_id: lead_id || 'system', event, created_at: now.toISOString() }).catch(() => {});

    // Load settings
    const settings = await S.entities.AppSettings.list();
    const get = (k, d) => { const s = settings.find(x => x.key === k); return s ? s.value : d; };

    const staleMinutes         = parseFloat(get('ops_hot_lead_stale_minutes',    '30'));
    const fuOverdueHours       = parseFloat(get('ops_followup_overdue_hours',    '2'));
    const retOverdueHours      = parseFloat(get('ops_retention_overdue_hours',   '2'));
    const noshowEscHours       = parseFloat(get('ops_noshow_escalation_hours',   '6'));
    const criticalAlerts       = get('ops_critical_alerts_enabled', 'true') === 'true';
    const autoResolve          = get('ops_auto_resolve_enabled',    'true') === 'true';
    const opsEmail             = get('ops_admin_email',             'info@monkeebizai.com');
    const appUrl               = get('app_url',                     'https://app.monkeebizzai.com');
    const avgDeal              = parseFloat(get('ops_average_deal_value', '1500'));

    // Load all data in parallel
    const [leads, bookings, followups, retentionEvents, openAlerts] = await Promise.all([
      S.entities.Lead.list(),
      S.entities.Booking.list(),
      S.entities.FollowUp.list(),
      S.entities.RetentionEvents.list(),
      S.entities.OpsAlerts.filter({ status: 'Open' }),
    ]);

    const leadMap = Object.fromEntries(leads.map(l => [l.id, l]));
    const bookingsByLead = leads.reduce((acc, l) => { acc[l.id] = []; return acc; }, {});
    for (const b of bookings) {
      if (!bookingsByLead[b.lead_id]) bookingsByLead[b.lead_id] = [];
      bookingsByLead[b.lead_id].push(b);
    }
    const followupsByLead = leads.reduce((acc, l) => { acc[l.id] = []; return acc; }, {});
    for (const f of followups) {
      if (!followupsByLead[f.lead_id]) followupsByLead[f.lead_id] = [];
      followupsByLead[f.lead_id].push(f);
    }
    const retentionByLead = leads.reduce((acc, l) => { acc[l.id] = []; return acc; }, {});
    for (const r of retentionEvents) {
      if (!retentionByLead[r.lead_id]) retentionByLead[r.lead_id] = [];
      retentionByLead[r.lead_id].push(r);
    }

    const hasOpenAlert = (type, match = {}) =>
      openAlerts.some(a => a.alert_type === type &&
        (!match.lead_id || a.lead_id === match.lead_id) &&
        (!match.followup_id || a.followup_id === match.followup_id) &&
        (!match.booking_id || a.booking_id === match.booking_id) &&
        (!match.retention_event_id || a.retention_event_id === match.retention_event_id)
      );

    const createAlert = async (data) => {
      const alert = await S.entities.OpsAlerts.create({ ...data, status: 'Open', detected_at: now.toISOString() });
      const lead = data.lead_id ? (leadMap[data.lead_id] || {}) : {};
      await log(data.lead_id || 'system', `Agent 5 — Alert created — ${data.alert_type} — ${lead.name || data.title}`);
      return alert;
    };

    let created = 0;

    // ── TASK 2: HOT LEAD STALE ──────────────────────────────────────────────
    const staleMs = staleMinutes * 60 * 1000;
    for (const lead of leads) {
      if (lead.score !== 'HOT') continue;
      if (!['Action Required', 'Follow Up'].includes(lead.status)) continue;
      if ((now - new Date(lead.created_date)) < staleMs) continue;
      const lb = bookingsByLead[lead.id] || [];
      if (lb.some(b => ['Requested','Confirmed','Rescheduled','Completed'].includes(b.status))) continue;
      if (hasOpenAlert('hot_lead_stale', { lead_id: lead.id })) continue;

      await createAlert({
        alert_type: 'hot_lead_stale', severity: 'critical', source_agent: 'Agent 1',
        lead_id: lead.id,
        title: 'HOT lead not moving',
        description: `HOT lead ${lead.name} has had no booking or contact within ${staleMinutes} minutes. Created: ${new Date(lead.created_date).toLocaleString()}`,
      });
      await S.entities.Lead.update(lead.id, { ops_priority_flag: 'urgent' }).catch(() => {});
      created++;

      if (criticalAlerts) {
        const ageMin = Math.round((now - new Date(lead.created_date)) / 60000);
        await S.integrations.Core.SendEmail({
          to: opsEmail,
          subject: `🚨 HOT Lead Stale — ${lead.name} — ${ageMin} min`,
          body: `<div style="font-family:Arial,sans-serif;max-width:600px;background:#0a0a0a;color:#fff;padding:32px;border-radius:16px">
            <div style="font-family:monospace;font-size:11px;color:#ff3333;letter-spacing:3px;margin-bottom:16px">🚨 HOT LEAD STALE</div>
            <p><strong>Lead:</strong> ${lead.name}</p>
            <p><strong>Score:</strong> HOT</p>
            <p><strong>Status:</strong> ${lead.status}</p>
            <p><strong>Created:</strong> ${new Date(lead.created_date).toLocaleString()}</p>
            <p>No booking or contact within ${staleMinutes} minute threshold.</p>
            <p><strong>Est. at risk:</strong> $${avgDeal.toLocaleString()}</p>
            <div style="margin-top:20px;padding:14px;background:#111;border-radius:8px">
              <p><a href="${appUrl}/AgentIntake" style="color:#ff3333">View HOT Leads →</a></p>
              <p><a href="${appUrl}/AgentOps" style="color:#ff3333">View Ops Dashboard →</a></p>
            </div>
          </div>`
        }).catch(() => {});
      }
    }

    // ── TASK 3: FOLLOW-UP OVERDUE ───────────────────────────────────────────
    const fuOverdueMs = fuOverdueHours * 3600 * 1000;
    for (const fu of followups) {
      if (fu.status !== 'Pending') continue;
      const overdue = now - new Date(fu.scheduled_at);
      if (overdue < fuOverdueMs) continue;
      if (hasOpenAlert('overdue_followup', { lead_id: fu.lead_id, followup_id: fu.id })) continue;
      const lead = leadMap[fu.lead_id] || {};
      await createAlert({
        alert_type: 'overdue_followup', severity: 'high', source_agent: 'Agent 3',
        lead_id: fu.lead_id, followup_id: fu.id,
        title: 'Follow-up overdue',
        description: `Follow-up attempt ${fu.attempt_number} missed scheduled send by ${Math.round(overdue/3600000)} hours. Lead: ${lead.name || fu.lead_id}`,
      });
      created++;
    }

    // ── TASK 4: NO-SHOW UNHANDLED ───────────────────────────────────────────
    const noshowMs = noshowEscHours * 3600 * 1000;
    for (const booking of bookings) {
      if (!booking.no_show_flagged) continue;
      const age = now - new Date(booking.updated_date || booking.created_date);
      if (age < noshowMs) continue;
      const lf = followupsByLead[booking.lead_id] || [];
      if (lf.some(f => f.sequence_type === 'no_show')) continue;
      if (hasOpenAlert('no_show_unhandled', { booking_id: booking.id })) continue;
      const lead = leadMap[booking.lead_id] || {};
      await createAlert({
        alert_type: 'no_show_unhandled', severity: 'critical', source_agent: 'Agent 2',
        lead_id: booking.lead_id, booking_id: booking.id,
        title: 'No-show not handed to Agent 3',
        description: `No-show detected for ${lead.name || booking.lead_id} but no follow-up sequence created within ${noshowEscHours} hours`,
      });
      created++;
      if (criticalAlerts) {
        await S.integrations.Core.SendEmail({
          to: opsEmail,
          subject: `🚨 No-Show Unhandled — ${lead.name || 'Unknown Lead'}`,
          body: `<div style="font-family:Arial,sans-serif;max-width:600px;background:#0a0a0a;color:#fff;padding:32px;border-radius:16px">
            <div style="font-family:monospace;font-size:11px;color:#ff3333;letter-spacing:3px;margin-bottom:16px">🚨 NO-SHOW UNHANDLED</div>
            <p><strong>Lead:</strong> ${lead.name || '—'}</p>
            <p>No follow-up sequence was created within ${noshowEscHours} hours of this no-show.</p>
            <p><a href="${appUrl}/AgentBooking" style="color:#ff3333">View Bookings →</a></p>
            <p><a href="${appUrl}/AgentOps" style="color:#ff3333">View Ops Dashboard →</a></p>
          </div>`
        }).catch(() => {});
      }
    }

    // ── TASK 5: RETENTION OVERDUE ───────────────────────────────────────────
    const retOverdueMs = retOverdueHours * 3600 * 1000;
    for (const evt of retentionEvents) {
      if (evt.status !== 'Pending') continue;
      const overdue = now - new Date(evt.scheduled_at);
      if (overdue < retOverdueMs) continue;
      if (hasOpenAlert('retention_overdue', { lead_id: evt.lead_id, retention_event_id: evt.id })) continue;
      const lead = leadMap[evt.lead_id] || {};
      await createAlert({
        alert_type: 'retention_overdue', severity: 'medium', source_agent: 'Agent 4',
        lead_id: evt.lead_id, retention_event_id: evt.id,
        title: 'Retention event overdue',
        description: `${evt.event_type.replace(/_/g,' ')} missed scheduled send by ${Math.round(overdue/3600000)} hours. Lead: ${lead.name || evt.lead_id}`,
      });
      created++;
    }

    // ── TASK 6: INVALID STATUS CONFLICTS ───────────────────────────────────
    const activeRetStages = ['satisfaction_check_due','review_request_due','referral_ask_due','upsell_due','reengage_due'];
    for (const lead of leads) {
      const lb  = bookingsByLead[lead.id]  || [];
      const lf  = followupsByLead[lead.id] || [];
      const lr  = retentionByLead[lead.id] || [];

      const flag = async (desc) => {
        const exists = openAlerts.find(a => a.alert_type === 'invalid_status_conflict' && a.lead_id === lead.id && a.description === desc);
        if (exists) return;
        await createAlert({
          alert_type: 'invalid_status_conflict', severity: 'high', source_agent: 'Agent 5',
          lead_id: lead.id, title: 'Invalid cross-agent state', description: desc,
        });
        created++;
      };

      if (lead.status === 'Booked' && lf.some(f => f.status === 'Pending'))
        await flag('Lead status = Booked but Pending FollowUp records exist');
      if ((lead.status === 'Closed \u2014 Won') && !lb.some(b => b.status === 'Completed'))
        await flag('Lead status = Closed — Won but no Completed booking exists');
      if (lead.retention_stage && activeRetStages.includes(lead.retention_stage) && !lb.some(b => b.status === 'Completed'))
        await flag('Lead has active retention stage but no Completed booking');
      if (lead.status === 'Closed \u2014 No Response' && lb.some(b => b.status === 'Confirmed'))
        await flag('Lead status = Closed — No Response but a Confirmed booking exists');
      if (lead.retention_opt_out && lr.some(r => r.status === 'Pending'))
        await flag('retention_opt_out = true but Pending RetentionEvent records exist');
      lb.forEach(b => {
        if (b.no_show_flagged && b.status === 'Booked') {
          flag('Booking has no_show_flagged = true and status = Booked simultaneously');
        }
      });
      if (lead.status === 'Booked' && lr.some(r => r.status === 'Pending'))
        await flag('Lead status = Booked but Pending RetentionEvent records exist');
    }

    // ── TASK 7: DUPLICATE & ORPHANED RECORDS ───────────────────────────────
    const leadIds = new Set(leads.map(l => l.id));

    // Duplicate active follow-up sequences per lead + type
    const fuSeqCount = {};
    for (const f of followups) {
      if (!['Pending','Sent'].includes(f.status) || f.attempt_number !== 1) continue;
      const key = `${f.lead_id}::${f.sequence_type}`;
      fuSeqCount[key] = (fuSeqCount[key] || 0) + 1;
    }
    for (const [key, cnt] of Object.entries(fuSeqCount)) {
      if (cnt <= 1) continue;
      const [leadId, seqType] = key.split('::');
      const lead = leadMap[leadId] || {};
      const exists = openAlerts.find(a => a.alert_type === 'duplicate_sequence_attempt' && a.lead_id === leadId && (a.description || '').includes(seqType));
      if (exists) continue;
      await createAlert({
        alert_type: 'duplicate_sequence_attempt', severity: 'high', source_agent: 'Agent 5',
        lead_id: leadId, title: 'Duplicate follow-up sequence',
        description: `Duplicate active ${seqType} follow-up sequence detected for ${lead.name || leadId}`,
      });
      created++;
    }

    // Duplicate retention event types per lead
    const retEvtCount = {};
    for (const r of retentionEvents) {
      if (!['Pending','Sent'].includes(r.status)) continue;
      const key = `${r.lead_id}::${r.event_type}`;
      retEvtCount[key] = (retEvtCount[key] || 0) + 1;
    }
    for (const [key, cnt] of Object.entries(retEvtCount)) {
      if (cnt <= 1) continue;
      const [leadId, evtType] = key.split('::');
      const lead = leadMap[leadId] || {};
      const exists = openAlerts.find(a => a.alert_type === 'duplicate_sequence_attempt' && a.lead_id === leadId && (a.description || '').includes(evtType));
      if (exists) continue;
      await createAlert({
        alert_type: 'duplicate_sequence_attempt', severity: 'medium', source_agent: 'Agent 5',
        lead_id: leadId, title: 'Duplicate retention event',
        description: `Duplicate active ${evtType} retention events for ${lead.name || leadId}`,
      });
      created++;
    }

    // Orphaned records
    for (const b of bookings) {
      if (leadIds.has(b.lead_id)) continue;
      if (openAlerts.find(a => a.alert_type === 'orphaned_record' && a.booking_id === b.id)) continue;
      await createAlert({
        alert_type: 'orphaned_record', severity: 'medium', source_agent: 'Agent 5',
        booking_id: b.id, title: 'Orphaned booking record',
        description: `Booking ${b.id} references a lead_id that does not exist`,
      });
      created++;
    }
    for (const f of followups) {
      if (leadIds.has(f.lead_id)) continue;
      if (openAlerts.find(a => a.alert_type === 'orphaned_record' && a.followup_id === f.id)) continue;
      await createAlert({
        alert_type: 'orphaned_record', severity: 'medium', source_agent: 'Agent 5',
        followup_id: f.id, title: 'Orphaned follow-up record',
        description: `FollowUp ${f.id} references a lead_id that does not exist`,
      });
      created++;
    }
    for (const r of retentionEvents) {
      if (leadIds.has(r.lead_id)) continue;
      if (openAlerts.find(a => a.alert_type === 'orphaned_record' && a.retention_event_id === r.id)) continue;
      await createAlert({
        alert_type: 'orphaned_record', severity: 'medium', source_agent: 'Agent 5',
        retention_event_id: r.id, title: 'Orphaned retention event',
        description: `RetentionEvent ${r.id} references a lead_id that does not exist`,
      });
      created++;
    }

    // ── TASK 8: CONTRACT VIOLATIONS ─────────────────────────────────────────
    // Monitor 1: pending follow-up on booked lead
    for (const fu of followups) {
      if (fu.status !== 'Pending') continue;
      const lead = leadMap[fu.lead_id];
      if (!lead || lead.status !== 'Booked') continue;
      const exists = openAlerts.find(a => a.alert_type === 'contract_violation' && a.lead_id === fu.lead_id && a.followup_id === fu.id);
      if (exists) continue;
      await createAlert({
        alert_type: 'contract_violation', severity: 'high', source_agent: 'Agent 5',
        lead_id: fu.lead_id, followup_id: fu.id,
        title: 'Contract violation — pending follow-up on booked lead',
        description: `Lead ${fu.lead_id} status = Booked but Pending FollowUp records exist. Agent 3 should have stopped.`,
      });
      await log(fu.lead_id, `Agent 5 — Contract violation — pending follow-up on booked lead ${fu.lead_id}`);
      created++;
    }

    // Monitor 2: retention on non-completed lead
    for (const evt of retentionEvents) {
      if (evt.status !== 'Pending') continue;
      const lb = bookingsByLead[evt.lead_id] || [];
      if (lb.some(b => b.status === 'Completed')) continue;
      const exists = openAlerts.find(a => a.alert_type === 'contract_violation' && a.lead_id === evt.lead_id && a.retention_event_id === evt.id);
      if (exists) continue;
      await createAlert({
        alert_type: 'contract_violation', severity: 'high', source_agent: 'Agent 5',
        lead_id: evt.lead_id, retention_event_id: evt.id,
        title: 'Contract violation — retention on non-completed lead',
        description: `Lead ${evt.lead_id} has active retention events but no Completed booking.`,
      });
      await log(evt.lead_id, `Agent 5 — Contract violation — retention on non-completed lead ${evt.lead_id}`);
      created++;
    }

    // ── AUTO-RESOLVE ─────────────────────────────────────────────────────────
    if (autoResolve) {
      const allOpen = await S.entities.OpsAlerts.filter({ status: 'Open' });
      for (const alert of allOpen) {
        let clear = false;
        if (alert.alert_type === 'hot_lead_stale' && alert.lead_id) {
          const lead = leadMap[alert.lead_id];
          if (!lead) { clear = true; }
          else {
            const lb = bookingsByLead[alert.lead_id] || [];
            if (lb.some(b => ['Requested','Confirmed','Rescheduled','Completed'].includes(b.status))) clear = true;
            else if (!['HOT'].includes(lead.score)) clear = true;
          }
        } else if (alert.alert_type === 'overdue_followup' && alert.followup_id) {
          const fu = followups.find(f => f.id === alert.followup_id);
          if (!fu || fu.status !== 'Pending') clear = true;
        } else if (alert.alert_type === 'retention_overdue' && alert.retention_event_id) {
          const evt = retentionEvents.find(r => r.id === alert.retention_event_id);
          if (!evt || evt.status !== 'Pending') clear = true;
        } else if (alert.alert_type === 'no_show_unhandled' && alert.lead_id) {
          const lf = followupsByLead[alert.lead_id] || [];
          if (lf.some(f => f.sequence_type === 'no_show')) clear = true;
        }
        if (clear) {
          await S.entities.OpsAlerts.update(alert.id, { status: 'Resolved', resolved_at: now.toISOString() });
          await log(alert.lead_id || 'system', `Ops alert auto-resolved — condition cleared — ${alert.alert_type}`);
        }
      }
    }

    return Response.json({ success: true, alerts_created: created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});