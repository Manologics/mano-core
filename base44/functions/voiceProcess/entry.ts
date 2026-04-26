// voiceProcess — optimized MANO voice handler
// Fast-path regex → LLM only for vague/unknown → fire-and-forget logging
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BASE_URL = "https://mano-app-8159dde8.base44.app";
const HUMAN = "+16232822252";

// ── ElevenLabs audio (with Twilio Say fallback) ───────────────────────────────
function el(text) {
  const encoded = encodeURIComponent(text);
  return `<Play>${BASE_URL}/functions/serveVoiceAudio?text=${encoded}</Play>`;
}

// ── TwiML helpers ─────────────────────────────────────────────────────────────
function twiml(body) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

function gather(intentParam) {
  const action = intentParam
    ? `${BASE_URL}/functions/voiceProcess?intent=${intentParam}`
    : `${BASE_URL}/functions/voiceProcess`;
  return `<Gather input="speech" action="${action}" method="POST" speechTimeout="3" timeout="10" language="en-US"></Gather>`;
}

function dial() {
  return `<Dial>${HUMAN}</Dial>`;
}

function hangup(fallbackMsg) {
  return el(fallbackMsg) + `<Hangup/>`;
}

// ── Fire-and-forget logging ───────────────────────────────────────────────────
function logCall(req, { phone, speech, detectedIntent, callSid }) {
  const run = async () => {
    try {
      const base44 = createClientFromRequest(req);
      const timestamp = new Date().toISOString();
      const hotIntents = ["demo", "missed_leads", "connect", "schedule", "pricing", "owner_request"];
      const newStatus = hotIntents.includes(detectedIntent) ? "Action Required" : detectedIntent === "support" ? "Contacted" : "New";
      const newScore = ["demo", "missed_leads", "connect", "schedule", "pricing", "owner_request"].includes(detectedIntent) ? "WARM" : "COLD";
      const appendNote = `[${timestamp}] Intent: ${detectedIntent} | Transcript: ${speech}`;

      if (hotIntents.includes(detectedIntent)) {
        console.log(`🔥 HOT: ${phone} | ${detectedIntent} | ${speech} | ${callSid}`);
      }

      const existing = await base44.asServiceRole.entities.Lead.filter({ source: "inbound_voice" });
      const match = existing.find(l => l.notes && l.notes.includes(`CallSid: ${callSid}`));

      if (match) {
        await base44.asServiceRole.entities.Lead.update(match.id, {
          last_message: speech || null,
          notes: `${match.notes}\n${appendNote}`,
          status: newStatus,
          score: newScore,
        });
      } else {
        await base44.asServiceRole.entities.Lead.create({
          name: `Voice Call — ${phone || "Unknown"}`,
          phone: phone || null,
          source: "inbound_voice",
          service_need: speech || null,
          status: newStatus,
          score: newScore,
          notes: `[Voice Call] CallSid: ${callSid} | Time: ${timestamp}\n${appendNote}`,
          last_message: speech || null,
        });
        // SMS follow-up — also fire-and-forget
        sendSms(phone);
      }
    } catch (e) {
      console.error("[voiceProcess] logCall failed:", e.message);
    }
  };
  run(); // intentionally no await
}

// ── Fire-and-forget SMS ───────────────────────────────────────────────────────
function sendSms(phone) {
  const run = async () => {
    try {
      const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
      const fromNumber = Deno.env.get("TWILIO_NUMBER");
      if (!accountSid || !authToken || !fromNumber || !phone) return;
      const params = new URLSearchParams({
        To: phone,
        From: fromNumber,
        Body: "Hey — this is Mano with Monkee Biz AI. I just spoke with you. Want to lock in your demo? Reply YES and we'll get you scheduled.",
      });
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });
    } catch (e) {
      console.error("[voiceProcess] sendSms failed:", e.message);
    }
  };
  run();
}

// ── LLM fallback — only for vague/unknown speech ──────────────────────────────
async function classifyWithLLM(req, speech) {
  try {
    const base44 = createClientFromRequest(req);
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are MANO, a voice AI for Monkee Biz AI — helping HVAC contractors capture missed leads and book jobs.

Caller said: "${speech}"

Classify intent and write a SHORT 1-sentence reply.

Intent options: demo, connect, schedule, support, missed_leads, pricing, small_talk, unknown

Rules:
- demo/missed_leads → offer connect or schedule
- connect/support → dial immediately
- schedule → ask for day
- pricing → pricing scripted response
- small_talk → brief acknowledge + redirect
- unknown → ask what they need

Respond ONLY with valid JSON:
{"intent":"...","reply":"...","shouldDial":false,"shouldSchedule":false}

shouldDial=true only for connect/support. shouldSchedule=true only for schedule.`,
      response_json_schema: {
        type: "object",
        properties: {
          intent: { type: "string" },
          reply: { type: "string" },
          shouldDial: { type: "boolean" },
          shouldSchedule: { type: "boolean" },
        },
        required: ["intent", "reply", "shouldDial", "shouldSchedule"],
      },
    });
    return result;
  } catch (e) {
    console.error("[voiceProcess] LLM classify failed:", e.message);
    return null;
  }
}

// ── Regex fast-paths ──────────────────────────────────────────────────────────
const RE = {
  owner:      /\b(tex|owner|mr\.?\s*monks?|tex\s*taylor)\b|is\s+(tex|the\s+owner)\s+(in|there|available)|\b(talk|speak|get|reach)\s+(to\s+)?(tex|the\s+owner)\b|i\s+know\s+the\s+owner/i,
  pricing:    /\b(price|pricing|cost|charge|monthly|how much|expensive|fee|fees)\b/i,
  demo:       /\b(demo|demonstration|show me|learn more|find out|tell me more|interested)\b/i,
  schedule:   /\b(schedule|book|appointment|calendar|pick a time|set up a time|meeting)\b/i,
  connect:    /\b(connect|speak with|talk to|call me|transfer|real person|human|agent|someone)\b/i,
  missed:     /\b(missed (calls?|leads?)|lost calls?|revenue|hvac|contractor|service business|answering)\b/i,
  support:    /\b(support|billing|issue|problem|account|existing customer|help with my)\b/i,
};

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const body = await req.text();
    const params = new URLSearchParams(body);
    const speech = (params.get("SpeechResult") || "").trim();
    const callSid = params.get("CallSid") || "unknown";
    const phone = params.get("From") || null;
    const intent = url.searchParams.get("intent") || "first";
    const lower = speech.toLowerCase();

    console.log("[voiceProcess] intent:", intent, "| speech:", JSON.stringify(speech));

    // ── No speech ─────────────────────────────────────────────────────────────
    if (!speech) {
      return twiml(
        el("I didn't catch that. Go ahead and speak.") +
        gather()
      );
    }

    // ── State: confirm_connect ────────────────────────────────────────────────
    if (intent === "confirm_connect" || intent === "confirm_lead") {
      if (/\b(connect|now|call|talk|speak|yes|yeah|sure|please|ok|okay)\b/.test(lower)) {
        logCall(req, { phone, speech, detectedIntent: "connect", callSid });
        return twiml(el("Great, connecting you now. One moment.") + dial());
      }
      if (/\b(schedule|book|day|week|monday|tuesday|wednesday|thursday|friday|morning|afternoon|tomorrow|next)\b/.test(lower)) {
        logCall(req, { phone, speech, detectedIntent: "schedule", callSid });
        return twiml(
          el("Perfect. What day works best?") +
          gather("capture_day") +
          hangup("Someone from Monkee Biz AI will follow up. Take care!")
        );
      }
      // Unclear — one more prompt then dial
      return twiml(
        el("Connect now or schedule? Just say which.") +
        gather("confirm_connect") +
        hangup("Someone from Monkee Biz AI will follow up. Take care!")
      );
    }

    // ── State: capture_day ────────────────────────────────────────────────────
    if (intent === "capture_day") {
      logCall(req, { phone, speech, detectedIntent: "schedule", callSid });
      return twiml(
        el("Got it. We'll reach out to confirm. Talk soon!") +
        `<Hangup/>`
      );
    }

    // ── State: pricing_offered ────────────────────────────────────────────────
    if (intent === "pricing_offered") {
      logCall(req, { phone, speech, detectedIntent: "pricing", callSid });
      if (RE.pricing.test(lower)) {
        return twiml(el("That's exactly why you should talk to the team. One moment.") + dial());
      }
      if (/\b(connect|now|yes|yeah|sure|ok|okay|talk|speak)\b/.test(lower)) {
        return twiml(el("Connecting you now. One moment.") + dial());
      }
      if (/\b(schedule|book|day|week|morning|afternoon|tomorrow|next)\b/.test(lower)) {
        return twiml(
          el("What day works best?") +
          gather("capture_day") +
          hangup("Someone from Monkee Biz AI will follow up. Take care!")
        );
      }
      return twiml(el("Let me connect you with someone who can help. One moment.") + dial());
    }

    // ── State: followup_route_1 / followup_route_2 ────────────────────────────
    if (intent === "followup_route_1" || intent === "followup_route_2") {
      const isSecond = intent === "followup_route_2";

      // Try regex fast-path first
      if (RE.owner.test(lower)) {
        logCall(req, { phone, speech, detectedIntent: "owner_request", callSid });
        return twiml(el("Let me get Tex for you now. One moment.") + dial());
      }
      if (RE.pricing.test(lower)) {
        logCall(req, { phone, speech, detectedIntent: "pricing", callSid });
        return twiml(
          el("Pricing depends on call volume and setup. I can connect you now or get you scheduled. Which do you prefer?") +
          gather("pricing_offered") +
          hangup("Someone from Monkee Biz AI will follow up. Take care!")
        );
      }
      if (RE.connect.test(lower) || RE.support.test(lower)) {
        logCall(req, { phone, speech, detectedIntent: "connect", callSid });
        return twiml(el("Connecting you now. One moment.") + dial());
      }
      if (RE.demo.test(lower) || RE.missed.test(lower)) {
        logCall(req, { phone, speech, detectedIntent: "demo", callSid });
        return twiml(
          el("Absolutely. I can connect you now or schedule you. Which works better?") +
          gather("confirm_connect") +
          hangup("Someone from Monkee Biz AI will follow up. Take care!")
        );
      }
      if (RE.schedule.test(lower)) {
        logCall(req, { phone, speech, detectedIntent: "schedule", callSid });
        return twiml(
          el("What day works best for you?") +
          gather("capture_day") +
          hangup("Someone from Monkee Biz AI will follow up. Take care!")
        );
      }

      // Fall to LLM
      const ai = await classifyWithLLM(req, speech);
      if (!ai) {
        return twiml(el("Let me get someone for you now.") + dial());
      }

      const { intent: ai2, reply: r2, shouldDial: sd2, shouldSchedule: ss2 } = ai;
      logCall(req, { phone, speech, detectedIntent: ai2, callSid });

      if (sd2 || ai2 === "connect" || ai2 === "support") return twiml(el(r2) + dial());
      if (ss2 || ai2 === "schedule") return twiml(el(r2) + gather("capture_day") + hangup("Someone from Monkee Biz AI will follow up. Take care!"));
      if (ai2 === "pricing") return twiml(el("Pricing depends on call volume and setup. Connect now or schedule?") + gather("pricing_offered") + hangup("Someone from Monkee Biz AI will follow up. Take care!"));
      if (ai2 === "demo" || ai2 === "missed_leads") return twiml(el(r2) + gather("confirm_connect") + hangup("Someone from Monkee Biz AI will follow up. Take care!"));

      if (isSecond) return twiml(el("Let me connect you with someone who can help. One moment.") + dial());

      return twiml(
        el("I can help with demos, missed lead recovery, or support. Which one?") +
        gather("followup_route_2") +
        hangup("Someone from Monkee Biz AI will follow up. Take care!")
      );
    }

    // ── Regex fast-paths (main flow) ──────────────────────────────────────────

    // Owner request
    if (RE.owner.test(lower)) {
      logCall(req, { phone, speech, detectedIntent: "owner_request", callSid });
      // Update existing lead note async
      (async () => {
        try {
          const base44 = createClientFromRequest(req);
          const existing = await base44.asServiceRole.entities.Lead.filter({ source: "inbound_voice" });
          const match = existing.find(l => l.notes && l.notes.includes(`CallSid: ${callSid}`));
          if (match) {
            await base44.asServiceRole.entities.Lead.update(match.id, {
              status: "Action Required", score: "HOT",
              notes: match.notes + "\nCaller requested Tex / owner directly.",
            });
          }
        } catch (e) { console.error("[voiceProcess] owner note update failed:", e.message); }
      })();
      return twiml(el("Absolutely. Let me see if I can get Tex for you now. One moment.") + dial());
    }

    // Pricing
    if (RE.pricing.test(lower)) {
      logCall(req, { phone, speech, detectedIntent: "pricing", callSid });
      return twiml(
        el("Pricing depends on call volume and setup. I can connect you now or get you scheduled. Which do you prefer?") +
        gather("pricing_offered") +
        hangup("Someone from Monkee Biz AI will follow up. Take care!")
      );
    }

    // Missed leads / HVAC / revenue
    if (RE.missed.test(lower)) {
      logCall(req, { phone, speech, detectedIntent: "missed_leads", callSid });
      return twiml(
        el("MANO recovers missed calls with instant SMS, AI voice, and booking automation. Want to connect now or schedule?") +
        gather("confirm_connect") +
        hangup("Someone from Monkee Biz AI will follow up. Take care!")
      );
    }

    // Demo / learn more
    if (RE.demo.test(lower)) {
      logCall(req, { phone, speech, detectedIntent: "demo", callSid });
      return twiml(
        el("Absolutely. I can connect you now or schedule you. Which works better?") +
        gather("confirm_connect") +
        hangup("Someone from Monkee Biz AI will follow up. Take care!")
      );
    }

    // Schedule
    if (RE.schedule.test(lower)) {
      logCall(req, { phone, speech, detectedIntent: "schedule", callSid });
      return twiml(
        el("Of course. What day works best for you?") +
        gather("capture_day") +
        hangup("Someone from Monkee Biz AI will follow up. Take care!")
      );
    }

    // Connect / speak with someone
    if (RE.connect.test(lower)) {
      logCall(req, { phone, speech, detectedIntent: "connect", callSid });
      return twiml(el("Absolutely, connecting you now. One moment.") + dial());
    }

    // Support
    if (RE.support.test(lower)) {
      logCall(req, { phone, speech, detectedIntent: "support", callSid });
      return twiml(el("Let me connect you with the team now. One moment.") + dial());
    }

    // ── LLM fallback for small talk / vague / unknown ─────────────────────────
    const ai = await classifyWithLLM(req, speech);

    if (!ai) {
      logCall(req, { phone, speech, detectedIntent: "unknown", callSid });
      return twiml(
        el("I can help with demos, missed lead recovery, or support. Which one?") +
        gather("followup_route_1") +
        hangup("Someone from Monkee Biz AI will follow up. Take care!")
      );
    }

    const { intent: aiIntent, reply, shouldDial, shouldSchedule } = ai;
    logCall(req, { phone, speech, detectedIntent: aiIntent, callSid });

    if (shouldDial || aiIntent === "connect" || aiIntent === "support") {
      return twiml(el(reply) + dial());
    }
    if (shouldSchedule || aiIntent === "schedule") {
      return twiml(el(reply) + gather("capture_day") + hangup("Someone from Monkee Biz AI will follow up. Take care!"));
    }
    if (aiIntent === "pricing") {
      return twiml(
        el("Pricing depends on call volume and setup. Connect now or schedule?") +
        gather("pricing_offered") +
        hangup("Someone from Monkee Biz AI will follow up. Take care!")
      );
    }
    if (aiIntent === "demo" || aiIntent === "missed_leads") {
      return twiml(el(reply) + gather("confirm_connect") + hangup("Someone from Monkee Biz AI will follow up. Take care!"));
    }

    // Small talk or unknown — one redirect, then followup_route
    return twiml(
      el(reply) +
      gather("followup_route_1") +
      hangup("Someone from Monkee Biz AI will follow up. Take care!")
    );

  } catch (error) {
    console.error("[voiceProcess] ERROR:", error.message);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna">Something went wrong. Please call back shortly. Goodbye!</Say><Hangup/></Response>`,
      { status: 200, headers: { "Content-Type": "text/xml; charset=utf-8" } }
    );
  }
});