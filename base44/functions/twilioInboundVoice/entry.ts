Deno.serve(async () => {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Gather numDigits="1" action="/functions/twilioVoiceMenu" method="POST"><Say voice="alice">Welcome to Monkee Bizz AI. Press 1 for a quote. Press 2 for support. Press 3 for a callback.</Say></Gather></Response>`,
    { status: 200, headers: { "Content-Type": "text/xml" } }
  );
});