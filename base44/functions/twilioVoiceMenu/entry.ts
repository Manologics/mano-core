// v7 — lead creation moved to twilioInboundVoice
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function twiml(message) {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">${message}</Say><Hangup/></Response>`,
    { status: 200, headers: { "Content-Type": "text/xml" } }
  );
}

const fallback = new Response(
  `<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`,
  { status: 200, headers: { "Content-Type": "text/xml" } }
);

Deno.serve(async (req) => {
  try {
    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);
    const digit = params.get('Digits') || '';

    return fallback;

  } catch (err) {
    console.error(`[twilioVoiceMenu] FATAL: ${err.message}`);
    return fallback;
  }
});