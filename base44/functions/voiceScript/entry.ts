const BASE_URL = Deno.env.get("BASE_URL") || "";

Deno.serve(async (_req) => {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">
    Hi there, this is Mano from Monkee Bizz A I. 
    I'm reaching out because you recently submitted a request.
    How can I help you today?
  </Say>
  <Gather input="speech" action="${BASE_URL}/functions/voiceProcess" method="POST" speechTimeout="3" timeout="10">
    <Say voice="Polly.Joanna">Go ahead and speak after the tone.</Say>
  </Gather>
  <Say voice="Polly.Joanna">I didn't catch that. We'll follow up with you shortly. Goodbye!</Say>
</Response>`;

  return new Response(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
});