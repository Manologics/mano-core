// twilioInbound — handles inbound Twilio voice webhooks
Deno.serve(async (req) => {
  const REDIRECT_URL = "https://handler.twilio.com/twiml/EH49de5987401262b3f0580e75f1e4f20b";
  const FALLBACK = `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Connection error.</Say><Hangup/></Response>`;

  try {
    const text = await req.text();
    const params = new URLSearchParams(text);

    const From    = params.get("From")    || "unknown";
    const To      = params.get("To")      || "unknown";
    const CallSid = params.get("CallSid") || "unknown";

    console.log("[MANO] Incoming Call");
    console.log("From:", From);
    console.log("To:", To);
    console.log("CallSid:", CallSid);

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Redirect method="POST">${REDIRECT_URL}</Redirect>
</Response>`;

    return new Response(twiml, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });

  } catch (err) {
    console.error("[MANO] Error:", err.message);
    return new Response(FALLBACK, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }
});