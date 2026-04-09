// v2
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const TWILIO_FROM = '+16233001709';

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

function toE164(phone) {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits[0] === '1') return '+' + digits;
  return phone || null;
}

const fallback = new Response(

  `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">We did not receive your selection. Goodbye.</Say><Hangup/></Response>`,
  { status: 200, headers: { "Content-Type": "text/xml" } }
);

Deno.serve(async (req) => {
  try {
    // Read body FIRST before SDK client consumes the stream
    const bodyText = await req.text();
    const base44 = createClientFromRequest(req);

    // Parse form-encoded Twilio POST body
    const params = new URLSearchParams(bodyText);
    const digit = params.get('Digits') || '';
    const from  = params.get('From')  || '';

    // Create lead record, then send SMS
    if (from) {
      const e164 = toE164(from);
      base44.asServiceRole.entities.Lead.create({
        name:             from,
        phone:            e164 || from,
        email:            '',
        status:           'New',
        score:            'PENDING',
        source:           'monkee',
        processing_mode:  'twilio_voice',
        webhook_status:   'received',
        notes:            `[Inbound Call ${new Date().toISOString()}] Pressed: ${digit || 'none'}`,
        submission_token: 'CALL-' + Date.now().toString(36).toUpperCase(),
      }).then(async (lead) => {
        // SMS triggered after lead created
        if (e164) {
          try {
            const smsSid = await sendSms(e164, "Hey, this is Monkee Bizz AI — we got your call. What can we help you with?");
            await base44.asServiceRole.entities.Lead.update(lead.id, {
              notes: (lead.notes || '') + `\n[SMS Sent ${new Date().toISOString()}] to:${e164} sid:${smsSid}`
            }).catch(() => {});
            console.log(`[twilioVoiceMenu] SMS sent — to:${e164} sid:${smsSid}`);
          } catch (smsErr) {
            console.error(`[twilioVoiceMenu] SMS FAILED — to:${e164} error:${smsErr.message}`);
          }
        } else {
          console.warn(`[twilioVoiceMenu] SMS skipped — could not parse E.164 from:${from}`);
        }
      }).catch(() => {});
    }

    if (digit === '1') return twiml('Thank you. A specialist will contact you shortly. Goodbye.');
    if (digit === '2') return twiml('Thank you. We will text you shortly. Goodbye.');
    if (digit === '3') return twiml('Got it. We will call you back shortly. Goodbye.');

    return fallback;

  } catch (_) {
    return fallback;
  }
});