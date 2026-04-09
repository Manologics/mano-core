import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const twiml = (msg) => new Response(
  `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">${msg}</Say><Hangup/></Response>`,
  { status: 200, headers: { "Content-Type": "text/xml" } }
);

const fallback = new Response(
  `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">We did not receive your selection. Goodbye.</Say><Hangup/></Response>`,
  { status: 200, headers: { "Content-Type": "text/xml" } }
);

Deno.serve(async (req) => {
  try {
    // Create SDK client BEFORE consuming body stream
    const base44 = createClientFromRequest(req);

    // Parse form-encoded Twilio POST body
    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);
    const digit = params.get('Digits') || '';
    const from  = params.get('From')  || '';

    // Create lead record (non-blocking)
    if (from) {
      base44.asServiceRole.entities.Lead.create({
        name:             from,
        phone:            from,
        email:            '',
        status:           'New',
        score:            'PENDING',
        source:           'monkee',
        processing_mode:  'twilio_voice',
        webhook_status:   'received',
        notes:            `[Inbound Call ${new Date().toISOString()}] Pressed: ${digit || 'none'}`,
        submission_token: 'CALL-' + Date.now().toString(36).toUpperCase(),
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