// voiceProcess — intent-based voice handler with call logging
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BASE_URL = "https://mano-app-8159dde8.base44.app";
const HUMAN = "+16232822252";

async function logCall(req, { phone, speech, detectedIntent, callSid }) {
  try {
    const base44 = createClientFromRequest(req);
    const timestamp = new Date().toISOString();

    // Log to Lead entity
    await base44.asServiceRole.entities.Lead.create({
      name: `Voice Call — ${phone || "Unknown"}`,
      phone: phone || null,
      source: "inbound_voice",
      service_need: speech || null,
      status: detectedIntent === "demo" ? "Action Required" : detectedIntent === "support" ? "Contacted" : "New",
      score: detectedIntent === "demo" ? "WARM" : detectedIntent === "lead" ? "WARM" : "COLD",
      notes: `[Voice Call] Intent: ${detectedIntent} | CallSid: ${callSid} | Time: ${timestamp}\nTranscript: ${speech}`,
      last_message: speech || null,
    });

    console.log("[voiceProcess] Lead logged for:", phone, "| intent:", detectedIntent);
  } catch (e) {
    console.error("[voiceProcess] Logging failed:", e.message);
  }
}

function gather(action) {
  return `<Gather input="speech" action="${BASE_URL}/functions/${action}" method="POST" speechTimeout="3" timeout="10" language="en-US"></Gather>`;
}

function twiml(body) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

function dial(number) {
  return `<Dial>${number}</Dial>`;
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const body = await req.text();
    const params = new URLSearchParams(body);
    const speech = (params.get("SpeechResult") || "").toLowerCase().trim();
    const callSid = params.get("CallSid") || "unknown";
    const phone = params.get("From") || null;
    // intent comes from query string (e.g. ?intent=confirm_lead), not POST body
    const intent = url.searchParams.get("intent") || "first";

    console.log("[voiceProcess] CallSid:", callSid, "| From:", phone, "| intent:", intent, "| speech:", JSON.stringify(speech));

    if (!speech) {
      return twiml(
        `<Say voice="Polly.Joanna">I didn't catch that. Can you say that one more time?</Say>` +
        gather("voiceProcess")
      );
    }

    // ── Confirm connect after demo offer ──────────────────────────────────────
    if (intent === "confirm_connect") {
      if (/\b(yes|yeah|sure|connect|now|please|ok|okay)\b/.test(speech)) {
        return twiml(
          `<Say voice="Polly.Joanna">Great, connecting you now. One moment.</Say>` +
          dial(HUMAN)
        );
      } else {
        return twiml(
          `<Say voice="Polly.Joanna">No problem. Someone from MonkeeBiz AI will follow up shortly. Have a great day!</Say>` +
          `<Hangup/>`
        );
      }
    }

    // ── Confirm connect after lead/revenue offer ──────────────────────────────
    if (intent === "confirm_lead") {
      if (/\b(yes|yeah|sure|connect|now|please|ok|okay)\b/.test(speech)) {
        return twiml(
          `<Say voice="Polly.Joanna">Perfect, connecting you now. One moment.</Say>` +
          dial(HUMAN)
        );
      } else {
        return twiml(
          `<Say voice="Polly.Joanna">Understood. Someone from MonkeeBiz AI will reach out to you soon. Take care!</Say>` +
          `<Hangup/>`
        );
      }
    }

    // ── Demo / appointment / consultation / meeting ───────────────────────────
    if (/\b(demo|appointment|consultation|meeting|schedule|book)\b/.test(speech)) {
      logCall(req, { phone, speech, detectedIntent: "demo", callSid });
      return twiml(
        `<Say voice="Polly.Joanna">Absolutely. I can help get that started. I will have someone follow up shortly, or I can connect you now.</Say>` +
        `<Say voice="Polly.Joanna">Would you like me to connect you now?</Say>` +
        `<Gather input="speech" action="${BASE_URL}/functions/voiceProcess?intent=confirm_connect" method="POST" speechTimeout="3" timeout="10" language="en-US"></Gather>` +
        `<Say voice="Polly.Joanna">No worries. Someone from MonkeeBiz AI will follow up shortly.</Say>` +
        `<Hangup/>`
      );
    }

    // ── Support / billing / existing customer ─────────────────────────────────
    if (/\b(support|help|billing|existing|customer|issue|problem|account)\b/.test(speech)) {
      logCall(req, { phone, speech, detectedIntent: "support", callSid });
      return twiml(
        `<Say voice="Polly.Joanna">Got it. I will connect you with someone now.</Say>` +
        dial(HUMAN)
      );
    }

    // ── Missed calls / leads / revenue / service business ────────────────────
    if (/\b(missed|calls|leads|revenue|hvac|contractor|plumber|plumbing|service|business|jobs|customers)\b/.test(speech)) {
      logCall(req, { phone, speech, detectedIntent: "lead", callSid });
      return twiml(
        `<Say voice="Polly.Joanna">That is exactly what MANO helps with. We capture missed calls, respond instantly, qualify leads, and help book jobs automatically.</Say>` +
        `<Say voice="Polly.Joanna">Would you like to speak with someone now?</Say>` +
        `<Gather input="speech" action="${BASE_URL}/functions/voiceProcess?intent=confirm_lead" method="POST" speechTimeout="3" timeout="10" language="en-US"></Gather>` +
        `<Say voice="Polly.Joanna">Someone from MonkeeBiz AI will follow up with you soon. Take care!</Say>` +
        `<Hangup/>`
      );
    }

    // ── Unclear / fallback ────────────────────────────────────────────────────
    logCall(req, { phone, speech, detectedIntent: "unknown", callSid });
    return twiml(
      `<Say voice="Polly.Joanna">I can help with demos, missed lead recovery, or support. Which one are you calling about?</Say>` +
      gather("voiceProcess")
    );

  } catch (error) {
    console.error("[voiceProcess] ERROR:", error.message);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna">Something went wrong. Please call back shortly. Goodbye!</Say><Hangup/></Response>`,
      { status: 200, headers: { "Content-Type": "text/xml; charset=utf-8" } }
    );
  }
});