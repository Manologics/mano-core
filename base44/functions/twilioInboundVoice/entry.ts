// twilioInboundVoice — answers inbound call with speech greeting
const BASE_URL = Deno.env.get("BASE_URL") || "";

Deno.serve(async (_req) => {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Hey, this is Mano with Monkee Biz AI. How can I help you today?</Say>
  <Gather input="speech" action="${BASE_URL}/functions/voiceProcess" method="POST" speechTimeout="3" timeout="10" language="en-US">
  </Gather>
  <Say voice="Polly.Joanna">I didn't catch that. Let me connect you with someone now.</Say>
  <Dial>+16232822252</Dial>
</Response>`;

  return new Response(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
});