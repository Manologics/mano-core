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
  // Log full Twilio response so we can see error_code even on 201
  console.log('Twilio response:', JSON.stringify({ status: res.status, sid: data.sid, to: data.to, from: data.from, error_code: data.error_code, error_message: data.error_message, status_msg: data.status }));
  if (!res.ok) throw new Error(`[${data.error_code}] ${data.message || data.error_message || 'Twilio error'}`);
  if (data.error_code) throw new Error(`[${data.error_code}] ${data.error_message}`);
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
    const rawSource = body.source || "";
    const source = rawSource.includes("vendorfy") ? "vendorfy" : rawSource.includes("surplus") ? "surplus" : "monkee";

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
      source,
      submission_token: token,
      processing_mode: 'internal',
      webhook_status: 'none',
    });

    // ── Fire instant SMS immediately — do not await full pipeline ────────────
    const e164 = toE164(phone);
    let smsSid = null;
    let smsError = null;

    if (e164) {
      try {
        // Call instantSms which sends first SMS immediately and runs async pipeline
        const smsRes = await base44.asServiceRole.functions.invoke("instantSms", {
          phone: e164,
          name,
          source,
          leadId: lead.id,
          token,
          triggerMessage: service_need || "",
        });
        smsSid   = smsRes?.sms_sid || null;
        smsError = smsRes?.sms_error || null;
      } catch (err) {
        smsError = err.message;
        console.error("[submitLead] instantSms invoke failed:", smsError);
      }
    }

    // Log submission event (non-blocking)
    S.entities.ActivityLog.create({
      lead_id: lead.id,
      event: `Lead submitted via public form — token: ${token}`,
      created_at: new Date().toISOString(),
    }).catch(() => {});

    return Response.json({ success: true, lead_id: lead.id, sms_sent: !!smsSid, sms_error: smsError || null, sms_to: e164 || null });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});