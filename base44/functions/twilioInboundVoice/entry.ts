// twilioInboundVoice — initial inbound call handler
// SPEED: Returns TwiML immediately with zero DB/LLM/auth overhead.
// Timing logs help measure Twilio round-trip.
const BASE_URL = "https://mano-app-8159dde8.base44.app";

const GREETING = "Hey, this is Mano with Monkee Biz AI. How can I help you today?";
const FALLBACK = "I didn't catch that. Please call back and we will be happy to help. Goodbye!";

Deno.serve(async (_req) => {
  const t0 = Date.now();
  console.log(`[twilioInboundVoice] webhook_received_at:${new Date(t0).toISOString()}`);

  const encoded         = encodeURIComponent(GREETING);
  const fallbackEncoded = encodeURIComponent(FALLBACK);

  // TwiML is fully static — no DB, no LLM, no auth.
  // voiceProcess handles the next turn after Gather.
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${BASE_URL}/functions/serveVoiceAudio?text=${encoded}</Play>
  <Gather input="speech" action="${BASE_URL}/functions/voiceProcess" method="POST" speechTimeout="3" timeout="10" language="en-US">
  </Gather>
  <Play>${BASE_URL}/functions/serveVoiceAudio?text=${fallbackEncoded}</Play>
  <Hangup/>
</Response>`;

  const resp = new Response(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });

  console.log(`[twilioInboundVoice] twiml_returned_at:${new Date().toISOString()} total_ms:${Date.now()-t0}`);
  return resp;
});