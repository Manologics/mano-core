import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const TWILIO_FROM = '+16233001709';

function toE164(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits[0] === '1') return '+' + digits;
  return null;
}

async function sendSms(to, body) {
  const sid   = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const url   = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${sid}:${token}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ From: TWILIO_FROM, To: to, Body: body }).toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Twilio error');
  return data.sid;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const S = base44.asServiceRole;

    const body = await req.json();
    const { name, phone, email, business_type, service_need, urgency, budget, timeline } = body;

    if (!name || !email || !phone) {
      return Response.json({ error: 'Name, email, and phone are required.' }, { status: 400 });
    }

    const token = Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();

    const lead = await S.entities.Lead.create({
      name,
      phone,
      email,
      business_type: business_type || null,
      service_need: service_need || null,
      urgency: urgency || 'medium',
      budget: budget || null,
      timeline: timeline || null,
      status: 'New',
      score: 'PENDING',
      submission_token: token,
      processing_mode: 'internal',
      webhook_status: 'none',
    });

    // Send confirmation SMS
    const e164 = toE164(phone);
    let smsSid = null;
    let smsError = null;
    if (e164) {
      try {
        smsSid = await sendSms(e164, '🔥 You\'re in. We got your info and will text you next steps shortly.');
      } catch (err) {
        smsError = err.message;
      }
    }

    await S.entities.ActivityLog.create({
      lead_id: lead.id,
      event: smsSid
        ? `SMS confirmation sent — ${e164} — sid: ${smsSid}`
        : `SMS skipped — ${smsError || 'could not parse phone'}`,
      created_at: new Date().toISOString(),
    }).catch(() => {});

    await S.entities.ActivityLog.create({
      lead_id: lead.id,
      event: `Lead submitted via public form — token: ${token}`,
      created_at: new Date().toISOString(),
    }).catch(() => {});

    return Response.json({ success: true, lead_id: lead.id, sms_sent: !!smsSid });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});