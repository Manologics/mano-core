import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const twiml = (msg) => new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">${msg}</Say><Hangup/></Response>`,
    { status: 200, headers: { "Content-Type": "text/xml" } }
  );

  const fallback = `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">We did not receive your selection. Goodbye.</Say><Hangup/></Response>`;

  try {
    const body = await req.text();
    const params = new URLSearchParams(body);
    const digit = params.get('Digits') || '';
    const from = params.get('From') || '';

    // Create lead record
    if (from) {
      try {
        const base44 = createClientFromRequest(req);
        await base44.asServiceRole.entities.Lead.create({
          name: from,
          phone: from,
          email: '',
          status: 'New',
          score: 'PENDING',
          source: 'monkee',
          processing_mode: 'twilio_voice',
          webhook_status: 'received',
          notes: `[Inbound Call ${new Date().toISOString()}] Pressed: ${digit || 'none'}`,
          submission_token: 'CALL-' + Date.now().toString(36).toUpperCase(),
        });
      } catch (_) {
        // non-blocking — still return TwiML
      }
    }

    if (digit === '1') return twiml('Thank you. A specialist will contact you shortly. Goodbye.');
    if (digit === '2') return twiml('Thank you. We will text you shortly. Goodbye.');
    if (digit === '3') return twiml('Got it. We will call you back shortly. Goodbye.');

    return new Response(fallback, { status: 200, headers: { "Content-Type": "text/xml" } });

  } catch (_) {
    return new Response(fallback, { status: 200, headers: { "Content-Type": "text/xml" } });
  }
});