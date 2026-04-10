// Processes due SMS follow-up messages for leads without bookings
// Run on a schedule every 15 minutes
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const TWILIO_FROM = '+16233001709';

function toE164(phone) {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits[0] === '1') return '+' + digits;
  return null;
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

const SMS_TEMPLATES = {
  1: (name, cal) => `Hey${name ? ' ' + name.split(' ')[0] : ''}! We missed your call earlier. We'd love to help — reply here or book a quick call: ${cal || 'https://monkeebizzai.com'} 🐒`,
  2: (name, cal) => `Still thinking it over? We're here whenever you're ready. Book a time that works for you: ${cal || 'https://monkeebizzai.com'} — Monkee Bizz AI 🐒`,
  3: (name, cal) => `Last check-in from Monkee Bizz AI 🐒 If you ever need help with your business, we're just a message away. Book here anytime: ${cal || 'https://monkeebizzai.com'}`,
};

Deno.serve(async (req) => {
  const S = createClientFromRequest(req).asServiceRole;
  const now = new Date();

  const log = (lead_id, event) =>
    S.entities.ActivityLog.create({ lead_id, event, created_at: now.toISOString() }).catch(() => {});

  const settings = await S.entities.AppSettings.list();
  const get = (k, d) => { const s = settings.find(x => x.key === k); return s ? s.value : d; };
  const calendlyUrl = get('calendly_event_url', '');

  const [allFollowUps, leads, bookings] = await Promise.all([
    S.entities.FollowUp.list(),
    S.entities.Lead.list(),
    S.entities.Booking.list(),
  ]);

  // Only process SMS sequence follow-ups that are due
  const due = allFollowUps.filter(f =>
    f.sequence_type === 'sms' &&
    f.status === 'Pending' &&
    new Date(f.scheduled_at) <= now
  );

  let sent = 0, skipped = 0, failed = 0;

  for (const fu of due) {
    const lead = leads.find(l => l.id === fu.lead_id);
    if (!lead) {
      await S.entities.FollowUp.update(fu.id, { status: 'Skipped' });
      skipped++;
      continue;
    }

    // Skip if lead has booked
    const hasBooking = bookings.some(b =>
      b.lead_id === fu.lead_id &&
      ['Requested', 'Confirmed', 'Completed'].includes(b.status)
    );
    if (hasBooking || ['Booked', 'Appointment Requested', 'Closed — Won'].includes(lead.status)) {
      await S.entities.FollowUp.update(fu.id, { status: 'Skipped' });
      await log(fu.lead_id, `SMS follow-up attempt ${fu.attempt_number} skipped — lead already booked`);
      skipped++;
      continue;
    }

    const e164 = toE164(lead.phone);
    if (!e164) {
      await S.entities.FollowUp.update(fu.id, { status: 'Skipped' });
      await log(fu.lead_id, `SMS follow-up attempt ${fu.attempt_number} skipped — invalid phone`);
      skipped++;
      continue;
    }

    const message = SMS_TEMPLATES[fu.attempt_number]?.(lead.name, calendlyUrl);
    if (!message) {
      await S.entities.FollowUp.update(fu.id, { status: 'Skipped' });
      skipped++;
      continue;
    }

    try {
      const smsSid = await sendSms(e164, message);
      await S.entities.FollowUp.update(fu.id, { status: 'Sent', sent_at: now.toISOString() });
      await log(fu.lead_id, `SMS follow-up attempt ${fu.attempt_number} sent — sid:${smsSid}`);
      sent++;

      // After final attempt, move lead to Nurture if still no booking
      if (fu.attempt_number === 3) {
        await S.entities.Lead.update(fu.lead_id, { status: 'Nurture' });
        await log(fu.lead_id, 'SMS follow-up sequence complete — lead moved to Nurture');
      }
    } catch (err) {
      await S.entities.FollowUp.update(fu.id, { status: 'Failed' });
      await log(fu.lead_id, `SMS follow-up attempt ${fu.attempt_number} FAILED: ${err.message}`);
      failed++;
    }
  }

  return Response.json({ success: true, sent, skipped, failed });
});