import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TWILIO_FROM = '+16233001709';

function toE164(phone) {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits[0] === '1') return '+' + digits;
  return phone || null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { lead_id, message } = await req.json();
    if (!lead_id || !message) return Response.json({ error: 'lead_id and message required' }, { status: 400 });

    const S = base44.asServiceRole;
    const lead = await S.entities.Lead.filter({ id: lead_id });
    const l = lead[0];
    if (!l) return Response.json({ error: 'Lead not found' }, { status: 404 });

    const e164 = toE164(l.phone);
    if (!e164) return Response.json({ error: 'No valid phone number' }, { status: 400 });

    const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const token = Deno.env.get('TWILIO_AUTH_TOKEN');
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${sid}:${token}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ From: TWILIO_FROM, To: e164, Body: message }).toString(),
    });

    const data = await res.json();
    if (!res.ok || data.error_code) throw new Error(`[${data.error_code}] ${data.error_message || data.message}`);

    const now = new Date().toISOString();
    const updatedNotes = [l.notes, `[Outbound SMS ${now}]: ${message}`].filter(Boolean).join('\n');
    await S.entities.Lead.update(lead_id, { notes: updatedNotes, last_message: message });
    await S.entities.ActivityLog.create({ lead_id, event: `[Admin SMS Reply] ${message.slice(0, 80)}`, created_at: now }).catch(() => {});

    return Response.json({ success: true, sms_sid: data.sid });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});