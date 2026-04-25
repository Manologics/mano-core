// twilioVoiceMenu — handles digit selection from main menu
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BASE_URL = Deno.env.get("BASE_URL") || "";

const MENU_XML = (base) => `<Gather input="dtmf" numDigits="1" action="${base}/functions/twilioVoiceMenu" method="POST" timeout="8">
    <Say>Press 1 to speak with someone now. Press 2 to learn how we help recover missed leads. Press 3 to request a demo.</Say>
  </Gather>
  <Say>We didn't catch that. Connecting you now.</Say>
  <Dial>+16232822252</Dial>`;

Deno.serve(async (req) => {
  try {
    const text = await req.text();
    const params = new URLSearchParams(text);
    const digits = params.get("Digits") || "";
    const callerPhone = params.get("From") || "unknown";

    console.log("[twilioVoiceMenu] Digits:", digits, "From:", callerPhone);

    // Press 1 — forward to agent
    if (digits === "1") {
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Dial>+16232822252</Dial></Response>`,
        { status: 200, headers: { "Content-Type": "text/xml; charset=utf-8" } }
      );
    }

    // Press 2 — info about Monkee Biz AI, then return to menu
    if (digits === "2") {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Monkee Biz AI captures missed calls, responds instantly, qualifies leads, and books appointments automatically for service businesses.</Say>
  ${MENU_XML(BASE_URL)}
</Response>`;
      return new Response(twiml, {
        status: 200,
        headers: { "Content-Type": "text/xml; charset=utf-8" },
      });
    }

    // Press 3 — demo request, log lead, offer to connect
    if (digits === "3") {
      // Log demo request as a lead
      try {
        const base44 = createClientFromRequest(req);
        await base44.asServiceRole.entities.Lead.create({
          name: `Voice Demo Request`,
          phone: callerPhone,
          source: "inbound_voice",
          service_need: "Demo request via inbound voice menu",
          status: "Action Required",
          score: "WARM",
          notes: `Demo requested via inbound call from ${callerPhone}`,
        });
        console.log("[twilioVoiceMenu] Demo lead created for:", callerPhone);
      } catch (e) {
        console.error("[twilioVoiceMenu] Failed to log demo lead:", e.message);
      }

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Your demo request has been received. Someone will follow up shortly.</Say>
  <Gather input="dtmf" numDigits="1" action="${BASE_URL}/functions/twilioInboundVoice" method="POST" timeout="8">
    <Say>Press 1 to speak with someone now.</Say>
  </Gather>
  <Hangup/>
</Response>`;
      return new Response(twiml, {
        status: 200,
        headers: { "Content-Type": "text/xml; charset=utf-8" },
      });
    }

    // No valid input — repeat menu once, then forward
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${MENU_XML(BASE_URL)}
</Response>`;
    return new Response(twiml, {
      status: 200,
      headers: { "Content-Type": "text/xml; charset=utf-8" },
    });

  } catch (e) {
    console.error("[twilioVoiceMenu] ERROR:", e.message);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, something went wrong.</Say><Dial>+16232822252</Dial></Response>`,
      { status: 200, headers: { "Content-Type": "text/xml; charset=utf-8" } }
    );
  }
});