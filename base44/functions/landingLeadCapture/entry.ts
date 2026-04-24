// landingLeadCapture — handles submissions from the HVAC ROI Calculator on the Demo page
// Saves lead with calculator fields, then sends personalized SMS with real monthly_loss value
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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
  console.log('[landingLeadCapture] Twilio response:', JSON.stringify({
    status: res.status,
    sid: data.sid,
    error_code: data.error_code,
    error_message: data.error_message,
  }));
  if (!res.ok || data.error_code) throw new Error(`[${data.error_code}] ${data.error_message || data.message}`);
  return data.sid;
}

function formatCurrency(n) {
  return '$' + Math.round(n).toLocaleString('en-US');
}

Deno.serve(async (req) => {
  try {
    const S = createClientFromRequest(req).asServiceRole;

    const body = await req.json();
    const { name, phone, missedCallsPerWeek, jobValue, monthlyLoss, source } = body;

    // ── Parse + calculate ──────────────────────────────────────────────────
    const missedPerWeek = parseFloat(missedCallsPerWeek) || 0;
    const avgJob        = parseFloat(jobValue) || 0;
    const calcLoss      = missedPerWeek > 0 && avgJob > 0
      ? missedPerWeek * avgJob * 4
      : (parseFloat(monthlyLoss) || 0);

    console.log('[landingLeadCapture] Calculator inputs:', JSON.stringify({
      missed_calls_per_week: missedPerWeek,
      average_job_value: avgJob,
      calculated_monthly_loss: calcLoss,
      monthly_loss_from_payload: monthlyLoss,
    }));

    if (!name || !phone) {
      return Response.json({ error: 'Name and phone are required.' }, { status: 400 });
    }

    const token = Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();

    // ── Save lead with calculator fields ──────────────────────────────────
    const lead = await S.entities.Lead.create({
      name,
      phone,
      source: source || 'HVAC ROI Calculator',
      status: 'Action Required',
      score: 'HOT',
      submission_token: token,
      processing_mode: 'roi_calculator',
      webhook_status: 'none',
      missed_calls_per_week: missedPerWeek || null,
      average_job_value: avgJob || null,
      monthly_loss: calcLoss || null,
      service_need: 'HVAC missed call recovery',
      urgency: 'high',
    });

    console.log('[landingLeadCapture] Lead created:', lead.id, '— monthly_loss saved:', calcLoss);

    // ── Build personalized SMS ─────────────────────────────────────────────
    const lossDisplay = calcLoss > 0
      ? `${formatCurrency(calcLoss)}/month`
      : '$2,000–$5,000/month';

    const smsBody =
      `Hey — quick heads up.\n\n` +
      `Based on what we saw, you're losing about ${lossDisplay} in missed calls.\n\n` +
      `That's real jobs going to competitors.\n\n` +
      `Want me to lock this in for you today so that stops?`;

    console.log('[landingLeadCapture] Final SMS body:', smsBody);

    // ── Send SMS ──────────────────────────────────────────────────────────
    const e164 = toE164(phone);
    let smsSid = null;
    let smsError = null;

    if (e164) {
      try {
        smsSid = await sendSms(e164, smsBody);
        await S.entities.Lead.update(lead.id, { last_message: smsBody });
      } catch (err) {
        smsError = err.message;
        console.error('[landingLeadCapture] SMS failed:', smsError);
      }
    } else {
      smsError = 'Phone could not be parsed to E.164';
      console.warn('[landingLeadCapture] Could not parse phone:', phone);
    }

    await S.entities.ActivityLog.create({
      lead_id: lead.id,
      event: smsSid
        ? `ROI Calculator lead — SMS sent to ${e164} — loss: ${lossDisplay} — sid: ${smsSid}`
        : `ROI Calculator lead — SMS FAILED — ${smsError}`,
      created_at: new Date().toISOString(),
    }).catch(() => {});

    return Response.json({
      success: true,
      lead_id: lead.id,
      monthly_loss: calcLoss,
      sms_sent: !!smsSid,
      sms_error: smsError || null,
    });

  } catch (error) {
    console.error('[landingLeadCapture] Fatal error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});