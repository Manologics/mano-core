// sendWelcomeSms — sends a welcome SMS when a new lead is created
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const WELCOME_MSG = "Hey! Thanks for reaching out to Monkee Bizz AI 🐒 We got your info and will be in touch shortly. What service can we help you with today?";

function toE164(phone) {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits[0] === '1') return '+' + digits;
  return phone || null;
}

Deno.serve(async (req) => {
  const now = new Date().toISOString();
  try {
    const base44 = createClientFromRequest(req);
    const S = base44.asServiceRole;

    const raw = await req.json();
    const lead = raw?.data || raw || {};
    const phone = lead.phone || null;

    if (!phone) {
      console.warn('[sendWelcomeSms] No phone number — skipping');
      return Response.json({ success: false, reason: 'no_phone' });
    }

    // Skip if lead opted out
    if (lead.opted_out) {
      console.log('[sendWelcomeSms] Lead opted out — skipping');
      return Response.json({ success: false, reason: 'opted_out' });
    }

    const e164 = toE164(phone) || phone;

    const sid   = Deno.env.get('TWILIO_ACCOUNT_SID');
    const token = Deno.env.get('TWILIO_AUTH_TOKEN');
    const from  = Deno.env.get('TWILIO_NUMBER');

    const params = new URLSearchParams({ To: e164, From: from, Body: WELCOME_MSG });
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${sid}:${token}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await res.json();
    if (!res.ok || data.error_code) {
      throw new Error(`[${data.error_code}] ${data.error_message || data.message}`);
    }

    console.log(`[sendWelcomeSms] Sent to ${e164} — SID: ${data.sid}`);

    // Log to ActivityLog
    S.entities.ActivityLog.create({
      lead_id: lead.id || 'system',
      event: `[${now}] Welcome SMS sent — SID: ${data.sid}`,
      created_at: now,
    }).catch(() => {});

    // Update lead record
    if (lead.id) {
      S.entities.Lead.update(lead.id, {
        last_message: WELCOME_MSG,
        twilio_message_sid: data.sid,
        webhook_status: 'welcome_sms_sent',
      }).catch(() => {});
    }

    return Response.json({ success: true, sid: data.sid });

  } catch (error) {
    console.error('[sendWelcomeSms] ERROR:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});