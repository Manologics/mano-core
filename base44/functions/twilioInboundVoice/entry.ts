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

  try {
    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);
    const from = params.get('From') || '';
    const e164 = toE164(from);
    const now = new Date().toISOString();

    // 1. Create lead immediately on any inbound call
    if (from) {
      try {
        const lead = await S.entities.Lead.create({
          name:             from,
          phone:            e164 || from,
          email:            'unknown@inbound.call',
          status:           'New',
          score:            'PENDING',
          source:           'monkee',
          processing_mode:  'twilio_voice',
          webhook_status:   'received',
          submission_token: 'CALL-' + Date.now().toString(36).toUpperCase(),
          notes:            `[Inbound Call ${now}]`,
        });
        console.log(`[twilioInboundVoice] Lead created — id:${lead.id} from:${from}`);

        // 2. Send instant SMS after lead is created
        if (e164) {
          try {
            const smsSid = await sendSms(e164, "Hey, this is Monkee Bizz AI — we just missed your call! What can we help you with? Reply here and we'll get right back to you 🐒");
            console.log(`[twilioInboundVoice] SMS sent — to:${e164} sid:${smsSid}`);
            await S.entities.Lead.update(lead.id, {
              notes: `[Inbound Call ${now}]\n[SMS Sent ${new Date().toISOString()}] sid:${smsSid}`,
            });
          } catch (smsErr) {
            console.error(`[twilioInboundVoice] SMS FAILED — to:${e164} error:${smsErr.message}`);
          }
        }
      } catch (leadErr) {
        console.error(`[twilioInboundVoice] Lead create FAILED: ${leadErr.message}`);
      }
    }

    // 3. Return the voice menu
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Gather numDigits="1" action="https://mano-dd309130.base44.app/functions/twilioVoiceMenu" method="POST"><Say voice="alice">Welcome to Monkee Bizz AI. Press 1 for a quote. Press 2 for support. Press 3 for a callback.</Say></Gather><Say voice="alice">We did not receive your selection. Goodbye.</Say><Hangup/></Response>`,
      { status: 200, headers: { 'Content-Type': 'text/xml' } }
    );

  } catch (err) {
    console.error(`[twilioInboundVoice] FATAL: ${err.message}`);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">We are experiencing technical difficulties. Please try again later.</Say><Hangup/></Response>`,
      { status: 200, headers: { 'Content-Type': 'text/xml' } }
    );
  }
});