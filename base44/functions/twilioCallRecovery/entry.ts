// twilioCallRecovery — Twilio call status webhook
// Fires when a call is missed (no-answer, busy, failed)
// Sends a recovery SMS and creates/updates a Lead record

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TRIGGER_STATUSES = ['no-answer', 'busy', 'failed'];
const RECOVERY_SMS = "Hey, this is Mano from Monkee Biz. Just missed your call—I'm flagging this for priority. Are you looking for the AI Workforce build or a Voice Relay demo?";

function toE164(phone) {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits[0] === '1') return '+' + digits;
  return phone || null;
}

async function sendSms(to, body) {
  const sid   = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from  = Deno.env.get('TWILIO_NUMBER');

  const params = new URLSearchParams({ To: to, From: from, Body: body });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${sid}:${token}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  const data = await res.json();
  if (!res.ok || data.error_code) throw new Error(`[${data.error_code}] ${data.error_message || data.message}`);
  return data;
}

Deno.serve(async (req) => {
  const now = new Date().toISOString();
  console.log(`[twilioCallRecovery] webhook_received_at:${now}`);

  try {
    const text   = await req.text();
    const params = new URLSearchParams(text);

    const CallStatus = params.get('CallStatus') || '';
    const From       = params.get('From') || '';
    const CallSid    = params.get('CallSid') || '';

    console.log(`[twilioCallRecovery] CallStatus:${CallStatus} From:${From} CallSid:${CallSid}`);

    // Only act on missed/failed calls
    if (!TRIGGER_STATUSES.includes(CallStatus)) {
      console.log(`[twilioCallRecovery] Skipping — status "${CallStatus}" not a trigger`);
      return new Response('OK', { status: 200 });
    }

    if (!From) {
      console.warn('[twilioCallRecovery] No From number — skipping');
      return new Response('OK', { status: 200 });
    }

    const e164 = toE164(From) || From;
    const S    = createClientFromRequest(req).asServiceRole;

    // Send recovery SMS immediately
    let smsSid = null;
    try {
      const smsResult = await sendSms(e164, RECOVERY_SMS);
      smsSid = smsResult.sid;
      console.log(`[twilioCallRecovery] Recovery SMS sent — sid:${smsSid}`);
    } catch (smsErr) {
      console.error(`[twilioCallRecovery] SMS failed:`, smsErr.message);
    }

    // Create or update Lead (fire-and-forget after SMS)
    (async () => {
      try {
        const existing = await S.entities.Lead.filter({ phone: e164 }).catch(() => []);
        const lead     = existing[0] || null;
        const note     = `[${now}] Missed call — Status: ${CallStatus} | CallSid: ${CallSid}${smsSid ? ` | SMS SID: ${smsSid}` : ''}`;

        if (lead) {
          await S.entities.Lead.update(lead.id, {
            notes:              [lead.notes, note].filter(Boolean).join('\n'),
            last_message:       RECOVERY_SMS,
            twilio_message_sid: smsSid || lead.twilio_message_sid,
          });
          console.log(`[twilioCallRecovery] Existing lead updated — id:${lead.id}`);
        } else {
          await S.entities.Lead.create({
            name:               e164,
            phone:              e164,
            source:             'missed_call',
            status:             'New',
            score:              'PENDING',
            processing_mode:    'twilio_call_recovery',
            webhook_status:     smsSid ? 'sms_sent' : 'sms_failed',
            notes:              note,
            last_message:       RECOVERY_SMS,
            twilio_message_sid: smsSid || null,
          });
          console.log(`[twilioCallRecovery] New lead created for ${e164}`);
        }
      } catch (dbErr) {
        console.error('[twilioCallRecovery] DB error:', dbErr.message);
      }
    })();

    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('[twilioCallRecovery] FATAL:', error.message);
    return new Response('OK', { status: 200 });
  }
});