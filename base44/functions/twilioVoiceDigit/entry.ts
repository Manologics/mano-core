// twilioVoiceDigit — handles Gather callback, dials if Digits === "1"
Deno.serve(async (req) => {
  try {
    const text = await req.text();
    const params = new URLSearchParams(text);
    const digits = params.get('Digits') || '';
    console.log('[twilioVoiceDigit] Digits:', JSON.stringify(digits));

    if (digits === '1') {
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Dial>+16232822252</Dial></Response>`,
        { status: 200, headers: { 'Content-Type': 'text/xml; charset=utf-8' } }
      );
    }

    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`,
      { status: 200, headers: { 'Content-Type': 'text/xml; charset=utf-8' } }
    );
  } catch (_) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`,
      { status: 200, headers: { 'Content-Type': 'text/xml; charset=utf-8' } }
    );
  }
});