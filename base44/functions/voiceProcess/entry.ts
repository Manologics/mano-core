// voiceProcess — debug: parse speech, echo back, prove loop works
Deno.serve(async (req) => {
  try {
    const body = await req.text();
    console.log("[voiceProcess] Raw body:", body);

    const params = new URLSearchParams(body);
    const speechResult = params.get("SpeechResult") || "";
    const callSid = params.get("CallSid") || "unknown";

    console.log("[voiceProcess] CallSid:", callSid);
    console.log("[voiceProcess] SpeechResult:", JSON.stringify(speechResult));

    if (!speechResult.trim()) {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">I didn't catch that. Can you say that one more time?</Say>
  <Gather input="speech" action="https://mano-app-8159dde8.base44.app/functions/voiceProcess" method="POST" speechTimeout="3" timeout="10" language="en-US">
  </Gather>
  <Hangup/>
</Response>`;
      return new Response(twiml, {
        status: 200,
        headers: { "Content-Type": "text/xml; charset=utf-8" },
      });
    }

    // Echo back what was heard — proves the full loop works
    const safe = speechResult.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">I heard you say: ${safe}. I can help with that. Give me just a moment.</Say>
  <Hangup/>
</Response>`;

    return new Response(twiml, {
      status: 200,
      headers: { "Content-Type": "text/xml; charset=utf-8" },
    });

  } catch (error) {
    console.error("[voiceProcess] ERROR:", error.message);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna">Something went wrong. Please try again later. Goodbye!</Say><Hangup/></Response>`,
      { status: 200, headers: { "Content-Type": "text/xml; charset=utf-8" } }
    );
  }
});