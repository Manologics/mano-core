// voiceScript — outbound voice greeting for follow-up calls
// SHORT greeting under 12 words. Polly renders instantly, no ElevenLabs needed.
// Gather listens immediately after greeting ends.
const BASE_URL = Deno.env.get("BASE_URL") || "";

Deno.serve(async (_req) => {
  const t0 = Date.now();
  console.log(`[voiceScript] webhook_received_at:${new Date(t0).toISOString()}`);

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew-Neural">Hey, this is Mano. How can I help you?</Say>
  <Gather input="speech" action="${BASE_URL}/functions/voiceProcess" method="POST" speechTimeout="3" timeout="10" language="en-US">
  </Gather>
  <Say voice="Polly.Matthew-Neural">We'll follow up shortly. Goodbye!</Say>
  <Hangup/>
</Response>`;

  console.log(`[voiceScript] twiml_returned_at:${new Date().toISOString()} total_ms:${Date.now()-t0}`);
  return new Response(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
});