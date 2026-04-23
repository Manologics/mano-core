// calendlyWebhook — Listens for Calendly booking events
// Handles: invitee.created (booking confirmed)
// Matches lead by phone or email, creates/updates Booking record,
// sets Lead.status = Booked, skips follow-up, sends confirmation SMS
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const TWILIO_FROM = '+16233001709';

function toE164(phone) {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits[0] === '1') return '+' + digits;
  return phone || null;
}

async function sendSms(to, body) {
  const sid   = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${sid}:${token}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ From: TWILIO_FROM, To: to, Body: body }).toString(),
  });
  const data = await res.json();
  if (!res.ok || data.error_code) throw new Error(`[${data.error_code}] ${data.error_message || data.message}`);
  return data.sid;
}

Deno.serve(async (req) => {
  const S = createClientFromRequest(req).asServiceRole;
  const now = new Date().toISOString();

  const log = (lead_id, event) =>
    S.entities.ActivityLog.create({ lead_id: lead_id || 'system', event, created_at: now }).catch(() => {});

  try {
    const payload = await req.json();
    const eventType = payload.event;

    await log('system', `[calendlyWebhook] Event received: ${eventType}`);

    // Only handle booking-created events
    if (eventType !== 'invitee.created') {
      return Response.json({ ok: true, skipped: true, reason: `unhandled event: ${eventType}` });
    }

    const invitee  = payload.payload?.invitee || {};
    const event    = payload.payload?.event   || {};

    const inviteeName  = invitee.name  || '';
    const inviteeEmail = (invitee.email || '').toLowerCase();
    const inviteePhone = invitee.text_reminder_number || invitee.phone_number || '';
    const e164Phone    = toE164(inviteePhone) || null;

    const startTime    = event.start_time || '';
    const endTime      = event.end_time   || '';
    const eventUri     = event.uri        || '';
    const eventName    = event.name       || 'Appointment';
    const eventTimezone = event.location?.timezone || 'America/Phoenix';
    const joinUrl      = event.location?.join_url || event.location?.data || '';
    const calendlyEventUrl = invitee.scheduling_url || '';

    await log('system', `[calendlyWebhook] Invitee: ${inviteeName} | email:${inviteeEmail} | phone:${inviteePhone} | start:${startTime}`);

    // Load settings
    const settings = await S.entities.AppSettings.list();
    const get = (k, d) => { const s = settings.find(x => x.key === k); return s ? s.value : d; };
    const tz           = get('app_timezone', 'America/Phoenix');
    const businessName = get('business_name', 'Monkee Bizz AI');
    const adminEmail   = get('admin_email', 'info@monkeebizai.com');

    // Match lead by phone (preferred) or email
    const allLeads = await S.entities.Lead.list();
    let lead = null;
    if (e164Phone) {
      lead = allLeads.find(l => l.phone && toE164(l.phone) === e164Phone);
    }
    if (!lead && inviteeEmail) {
      lead = allLeads.find(l => l.email && l.email.toLowerCase() === inviteeEmail);
    }

    // If no match, create a new lead
    if (!lead) {
      lead = await S.entities.Lead.create({
        name:             inviteeName || inviteeEmail || e164Phone || 'Calendly Booking',
        phone:            e164Phone || '',
        email:            inviteeEmail,
        status:           'Booked',
        score:            'WARM',
        source:           'monkee',
        processing_mode:  'calendly_webhook',
        webhook_status:   'received',
        submission_token: 'CAL-' + Date.now().toString(36).toUpperCase(),
        notes:            `[Calendly Booking ${now}] ${eventName}`,
        last_message:     `Appointment confirmed: ${eventName}`,
      });
      await log(lead.id, `[calendlyWebhook] New lead created from Calendly booking`);
    }

    // Format date/time strings for display
    const startDate = new Date(startTime);
    const dateStr = startDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: tz });
    const timeStr = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: tz, timeZoneName: 'short' });
    const scheduledDate = startDate.toISOString().split('T')[0];
    const scheduledTime = startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: tz });

    // Check for existing booking by Calendly event URI to avoid duplicates
    const allBookings = await S.entities.Booking.list();
    const existingBooking = allBookings.find(b => b.lead_id === lead.id && b.calendly_event_url === eventUri);

    let booking;
    if (existingBooking) {
      await S.entities.Booking.update(existingBooking.id, {
        status:         'Confirmed',
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        timezone:       tz,
      });
      booking = { ...existingBooking, status: 'Confirmed' };
      await log(lead.id, `[calendlyWebhook] Existing booking updated — id:${existingBooking.id}`);
    } else {
      booking = await S.entities.Booking.create({
        lead_id:            lead.id,
        calendly_event_id:  eventUri,
        calendly_event_url: eventUri,
        scheduled_date:     scheduledDate,
        scheduled_time:     scheduledTime,
        timezone:           tz,
        status:             'Confirmed',
        notes:              joinUrl ? `Join: ${joinUrl}` : '',
        booking_source:     'Lead',
        confirmation_sent:  false,
        reminder_24hr_sent: false,
        reminder_1hr_sent:  false,
        no_show_flagged:    false,
        rescheduled_count:  0,
      });
      await log(lead.id, `[calendlyWebhook] Booking record created — id:${booking.id}`);
    }

    // Update lead: Booked status, stop follow-up sequences, update last_message
    const confirmationText = `You're booked! ${eventName} on ${dateStr} at ${timeStr}. See you then — ${businessName} 🐒`;
    await S.entities.Lead.update(lead.id, {
      status:       'Booked',
      notes:        [lead.notes, `[Calendly Booking Confirmed ${now}] ${dateStr} at ${timeStr}`].filter(Boolean).join('\n'),
      last_message: confirmationText,
    });
    await log(lead.id, `[calendlyWebhook] Lead status set to Booked — ${dateStr} at ${timeStr}`);

    // Skip pending follow-up sequences for this lead
    const pendingFollowUps = allBookings; // reuse data, but we need FollowUps
    const allFollowUps = await S.entities.FollowUp.list();
    const pendingFUs = allFollowUps.filter(f => f.lead_id === lead.id && f.status === 'Pending');
    if (pendingFUs.length > 0) {
      await Promise.all(pendingFUs.map(f => S.entities.FollowUp.update(f.id, { status: 'Skipped' })));
      await log(lead.id, `[calendlyWebhook] ${pendingFUs.length} pending follow-up(s) skipped — lead booked`);
    }

    // Send confirmation SMS if phone exists
    const smsPhone = e164Phone || (lead.phone ? toE164(lead.phone) : null);
    if (smsPhone) {
      try {
        const smsSid = await sendSms(smsPhone, confirmationText);
        await S.entities.Booking.update(booking.id, { confirmation_sent: true });
        await log(lead.id, `[calendlyWebhook] Confirmation SMS sent — sid:${smsSid}`);
      } catch (smsErr) {
        await log(lead.id, `[calendlyWebhook] Confirmation SMS FAILED — ${smsErr.message}`);
      }
    }

    // Admin notification
    try {
      await S.integrations.Core.SendEmail({
        to: adminEmail,
        subject: `📅 Calendly Booking — ${inviteeName || e164Phone} — ${dateStr}`,
        body: `<div style="font-family:Arial,sans-serif;max-width:600px;background:#0a0a0a;color:#fff;padding:32px;border-radius:16px">
          <div style="font-family:monospace;font-size:11px;color:#00ff88;letter-spacing:3px;margin-bottom:16px">📅 CALENDLY BOOKING CONFIRMED</div>
          <p><strong>Name:</strong> ${inviteeName || '—'}</p>
          <p><strong>Email:</strong> ${inviteeEmail || '—'}</p>
          <p><strong>Phone:</strong> ${smsPhone || '—'}</p>
          <p><strong>Event:</strong> ${eventName}</p>
          <p><strong>Date:</strong> ${dateStr} at ${timeStr}</p>
          <p><strong>Lead ID:</strong> ${lead.id}</p>
          <p><strong>Lead:</strong> ${lead.name || '—'} | Score: ${lead.score || 'PENDING'}</p>
        </div>`
      });
      await log(lead.id, `[calendlyWebhook] Admin notification sent`);
    } catch (emailErr) {
      await log(lead.id, `[calendlyWebhook] Admin notification FAILED: ${emailErr.message}`);
    }

    return Response.json({ ok: true, lead_id: lead.id, booking_id: booking.id });

  } catch (error) {
    await log('system', `[calendlyWebhook] FATAL ERROR: ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});