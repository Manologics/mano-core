// twilioInboundVoice — initial inbound call handler
// LATENCY ARCHITECTURE:
//   - Greeting uses Polly <Say> — plays in ~100ms, no ElevenLabs round-trip on first ring
//   - TwiML is fully static — zero DB, LLM, or auth overhead
//   - Gather listens immediately after greeting ends
//   - voiceProcess handles all subsequent turns
const BASE_URL = "https://mano-app-8159dde8.base44.app";

// Short, punchy greeting — under 12 words, Polly plays instantly
const GREETING = "Hi, thanks for calling Monkee Bizz AI. Mano speaking — how can I help you today?";
const FALLBACK  = "I didn't catch that. Please call back and we will help you. Goodbye.";

Deno.serve(async (_req) => {
  const t0 = Date.now();
  console.log(`[twilioInboundVoice] webhook_received_at:${new Date(t0).toISOString()}`);

  // Use Amazon Polly <Say> for greeting — ~100ms vs ~600-900ms for ElevenLabs
  // Twilio renders Polly natively, no external HTTP call required.
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew-Neural">${GREETING}</Say>
  <Gather input="speech" action="${BASE_URL}/functions/voiceProcess" method="POST" speechTimeout="3" timeout="10" language="en-US">
  </Gather>
  <Say voice="Polly.Matthew-Neural">${FALLBACK}</Say>
  <Hangup/>
</Response>`;

  const resp = new Response(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });

  console.log(`[twilioInboundVoice] twiml_returned_at:${new Date().toISOString()} total_ms:${Date.now()-t0}`);
  return resp;
});