// twilioInboundVoice — redirects to TwiML Bin immediately
Deno.serve(async (req) => {
  const t0 = Date.now();
  console.log(`[twilioInboundVoice] call_received_at:${new Date(t0).toISOString()}`);

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Redirect method="POST">https://handler.twilio.com/twiml/EH49de5987401262b3f0580e75f1e4f20b</Redirect>
</Response>`;

  console.log(`[twilioInboundVoice] twiml_returned_at:${new Date().toISOString()} total_ms:${Date.now() - t0}`);

  return new Response(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
});