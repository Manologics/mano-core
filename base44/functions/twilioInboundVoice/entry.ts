// twilioInboundVoice — initial greeting + main menu
const BASE_URL = Deno.env.get("BASE_URL") || "";

const MENU_XML = `<Gather input="dtmf" numDigits="1" action="${BASE_URL}/functions/twilioVoiceMenu" method="POST" timeout="8">
    <Say>Press 1 to speak with someone now. Press 2 to learn how we help recover missed leads. Press 3 to request a demo.</Say>
  </Gather>
  <Say>We didn't catch that. Connecting you now.</Say>
  <Dial>+16232822252</Dial>`;

Deno.serve(async (req) => {
  try {
    const text = await req.text();
    const params = new URLSearchParams(text);
    const digits = params.get("Digits") || "";
    console.log("[twilioInboundVoice] Digits:", digits);

    // If returning from a submenu asking to press 1
    if (digits === "1") {
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Dial>+16232822252</Dial></Response>`,
        { status: 200, headers: { "Content-Type": "text/xml; charset=utf-8" } }
      );
    }

    // Initial call — play greeting then menu
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Hello, thanks for calling Monkee Biz AI.</Say>
  ${MENU_XML}
</Response>`;

    return new Response(twiml, {
      status: 200,
      headers: { "Content-Type": "text/xml; charset=utf-8" },
    });
  } catch (e) {
    console.error("[twilioInboundVoice] ERROR:", e.message);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, something went wrong.</Say><Hangup/></Response>`,
      { status: 200, headers: { "Content-Type": "text/xml; charset=utf-8" } }
    );
  }
});