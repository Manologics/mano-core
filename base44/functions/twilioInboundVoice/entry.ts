// twilioInboundVoice — instant inbound call handler
// ARCHITECTURE: Pure Polly <Say>. Zero DB, zero LLM, zero ElevenLabs on first ring.
// TwiML is static — returns in <50ms guaranteed.

const BASE_URL = "https://mano-app-8159dde8.base44.app";

Deno.serve(async (req) => {
  const t0 = Date.now();
  console.log(`[twilioInboundVoice] call_received_at:${new Date(t0).toISOString()}`);

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew-Neural">Hey — got you. Is this for repair, replacement, or emergency service?</Say>
  <Gather input="speech" action="${BASE_URL}/functions/voiceProcess?intent=init" method="POST" speechTimeout="3" timeout="10" language="en-US">
  </Gather>
  <Say voice="Polly.Matthew-Neural">I didn't catch that. What service do you need help with?</Say>
  <Gather input="speech" action="${BASE_URL}/functions/voiceProcess?intent=init" method="POST" speechTimeout="3" timeout="10" language="en-US">
  </Gather>
  <Say voice="Polly.Matthew-Neural">We'll follow up shortly. Goodbye!</Say>
  <Hangup/>
</Response>`;

  console.log(`[twilioInboundVoice] twiml_returned_at:${new Date().toISOString()} total_ms:${Date.now() - t0}`);

  return new Response(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
});