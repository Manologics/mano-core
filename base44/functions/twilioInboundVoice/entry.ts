// twilioInboundVoice — minimal, guaranteed-safe, no SDK/DB/SMS
Deno.serve(async (req) => {
  try {
    const text = await req.text();
    console.log('[twilioInboundVoice] Raw body:', text);

    const params = new URLSearchParams(text);
    const digits = params.get('Digits') || '';
    console.log('[twilioInboundVoice] Digits:', JSON.stringify(digits));

    if (digits === '1') {
      console.log('[twilioInboundVoice] Digit 1 pressed — dialing');
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Dial>+16232822252</Dial></Response>`,
        { status: 200, headers: { 'Content-Type': 'text/xml; charset=utf-8' } }
      );
    }

    console.log('[twilioInboundVoice] No digit — returning Gather');
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Gather input="dtmf" numDigits="1" action="https://mano-app-8159dde8.base44.app/functions/twilioInboundVoice" method="POST" timeout="5"><Say>Hello. This is Monkee Bizz AI. Press 1 to speak to someone.</Say></Gather></Response>`,
      { status: 200, headers: { 'Content-Type': 'text/xml; charset=utf-8' } }
    );
  } catch (_) {
    console.log('[twilioInboundVoice] ERROR in catch block');
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, something went wrong.</Say><Hangup/></Response>`,
      { status: 200, headers: { 'Content-Type': 'text/xml; charset=utf-8' } }
    );
  }
});