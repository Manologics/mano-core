// voiceProcess — AI-assisted intent classification + ElevenLabs TTS
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BASE_URL = "https://mano-app-8159dde8.base44.app";
const HUMAN = "+16232822252";

// ── ElevenLabs audio helper ───────────────────────────────────────────────────
function el(text) {
  const encoded = encodeURIComponent(text);
  return `<Play>${BASE_URL}/functions/serveVoiceAudio?text=${encoded}</Play>`;
}

// ── AI Intent Classification ──────────────────────────────────────────────────
// Classifies caller speech into structured intent + short reply
async function classifyIntent(req, speech) {
  try {
    const base44 = createClientFromRequest(req);
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are MANO, a voice AI for Monkee Biz AI — a service that helps HVAC contractors and service businesses capture missed leads, respond instantly, qualify customers, and book jobs automatically.

A caller just said: "${speech}"

Classify their intent and generate a SHORT, natural, conversion-focused reply (1-2 sentences max). Do NOT freestyle. Always guide back to business outcomes.

Intent options:
- demo: wants a demo or to learn more
- connect: wants to speak with someone now
- schedule: wants to book an appointment or pick a time
- support: existing customer with an issue or billing question
- missed_leads: asking about missed calls, leads, or revenue recovery
- pricing: asking about cost or pricing
- small_talk: off-topic, weather, casual conversation
- unknown: unclear or unrelated

Rules for reply:
- demo/missed_leads: "I can get you scheduled or connect you with our team now. What would you prefer?"
- connect/support: "Absolutely, let me connect you right now."
- schedule: "Of course! What day works best for you?"
- pricing: "Great question. Let me connect you with someone who can walk you through options. Or I can get you scheduled for a quick demo."
- small_talk: Briefly acknowledge (1 sentence), then redirect: "Real quick — are you calling about a demo, missed leads, or support?"
- unknown: "I can help with demos, missed lead recovery, or support. Which one are you calling about?"

Respond ONLY with valid JSON, no markdown:
{
  "intent": "...",
  "reply": "...",
  "shouldDial": false,
  "shouldSchedule": false
}

Set shouldDial=true only for connect or support.
Set shouldSchedule=true only for schedule.`,
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
    console.log("[voiceProcess] AI classification:", JSON.stringify(result));
    return result;
  } catch (e) {
    console.error("[voiceProcess] classifyIntent failed:", e.message);
    return null;
  }
}

// ── SMS follow-up ─────────────────────────────────────────────────────────────
async function sendSmsFollowUp(phone) {
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

    console.log("[voiceProcess] SMS follow-up sent to:", phone);
  } catch (e) {
    console.error("[voiceProcess] SMS follow-up failed:", e.message);
  }
}

// ── Lead logging ──────────────────────────────────────────────────────────────
async function logCall(req, { phone, speech, detectedIntent, callSid }) {
  try {
    const base44 = createClientFromRequest(req);
    const timestamp = new Date().toISOString();
    const hotIntents = ["demo", "missed_leads", "connect", "schedule", "pricing"];
    const newStatus = hotIntents.includes(detectedIntent) ? "Action Required" : detectedIntent === "support" ? "Contacted" : "New";
    const newScore = hotIntents.includes(detectedIntent) ? "WARM" : "COLD";
    const appendNote = `[${timestamp}] Intent: ${detectedIntent} | Transcript: ${speech}`;

    if (hotIntents.includes(detectedIntent)) {
      console.log(`🔥 HOT LEAD: ${phone} | intent: ${detectedIntent} | ${speech} | CallSid: ${callSid}`);
    }

    // Dedup: search for existing lead with this CallSid
    const existing = await base44.asServiceRole.entities.Lead.filter({ source: "inbound_voice" });
    const match = existing.find(l => l.notes && l.notes.includes(`CallSid: ${callSid}`));

    if (match) {
      await base44.asServiceRole.entities.Lead.update(match.id, {
        last_message: speech || null,
        notes: `${match.notes}\n${appendNote}`,
        status: newStatus,
        score: newScore,
      });
      console.log("[voiceProcess] Lead UPDATED for CallSid:", callSid, "| id:", match.id);
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
      console.log("[voiceProcess] Lead CREATED for CallSid:", callSid, "| phone:", phone);
      sendSmsFollowUp(phone); // async, no await
    }
  } catch (e) {
    console.error("[voiceProcess] Logging failed:", e.message);
  }
}

// ── TwiML helpers ─────────────────────────────────────────────────────────────
function gather(action) {
  return `<Gather input="speech" action="${BASE_URL}/functions/${action}" method="POST" speechTimeout="3" timeout="10" language="en-US"></Gather>`;
}

function gatherWithIntent(intent) {
  return `<Gather input="speech" action="${BASE_URL}/functions/voiceProcess?intent=${intent}" method="POST" speechTimeout="4" timeout="10" language="en-US"></Gather>`;
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

    console.log("[voiceProcess] CallSid:", callSid, "| From:", phone, "| intent:", intent, "| speech:", JSON.stringify(speech));

    // ── No speech detected ────────────────────────────────────────────────────
    if (!speech) {
      return twiml(
        el("I didn't catch that. Can you say that one more time?") +
        gather("voiceProcess")
      );
    }

    // ── Scripted follow-up intents (no AI needed) ─────────────────────────────

    // After offering connect or schedule — confirm which
    if (intent === "confirm_connect" || intent === "confirm_lead") {
      const lower = speech.toLowerCase();
      if (/\b(connect|now|call|talk|speak|yes|yeah|sure|please|ok|okay)\b/.test(lower)) {
        return twiml(
          el("Great, connecting you now. One moment.") +
          dial(HUMAN)
        );
      } else if (/\b(schedule|book|appointment|day|week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|morning|afternoon|tomorrow|next)\b/.test(lower)) {
        return twiml(
          el("Perfect. What day works best for you?") +
          gatherWithIntent("capture_day") +
          el("No worries. Someone from MonkeeBiz AI will follow up with you shortly. Take care!") +
          `<Hangup/>`
        );
      } else {
        // Unclear — run AI on this too
        const ai = await classifyIntent(req, speech);
        if (ai && ai.shouldDial) {
          return twiml(el("Let me connect you now. One moment.") + dial(HUMAN));
        }
        return twiml(
          el("I can get you scheduled or connect you now. What would you prefer?") +
          gatherWithIntent("confirm_connect") +
          el("Someone from MonkeeBiz AI will be in touch shortly. Take care!") +
          `<Hangup/>`
        );
      }
    }

    // Caller stated a preferred day for scheduling
    if (intent === "capture_day") {
      return twiml(
        el("Got it. We will get that on the calendar and reach out to confirm. Talk soon!") +
        `<Hangup/>`
      );
    }

    // ── Pricing — already gave the spiel, now just dial ──────────────────────
    if (intent === "pricing_offered") {
      const isPricingAgain = /\b(price|pricing|cost|charge|monthly|how much|expensive|fee|fees)\b/.test(speech.toLowerCase());
      logCall(req, { phone, speech, detectedIntent: "pricing", callSid });
      if (isPricingAgain) {
        return twiml(
          el("That's exactly why I should connect you with the team. One moment.") +
          dial(HUMAN)
        );
      }
      // Treat their response as a connect/schedule choice
      const lower = speech.toLowerCase();
      if (/\b(connect|now|call|talk|speak|yes|yeah|sure|please|ok|okay)\b/.test(lower)) {
        return twiml(el("Great, connecting you now. One moment.") + dial(HUMAN));
      }
      if (/\b(schedule|book|appointment|day|week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|morning|afternoon|tomorrow|next)\b/.test(lower)) {
        return twiml(
          el("Perfect. What day works best for you?") +
          gatherWithIntent("capture_day") +
          el("Someone from MonkeeBiz AI will follow up shortly. Take care!") +
          `<Hangup/>`
        );
      }
      // Unclear — connect to human
      return twiml(el("Let me connect you with someone who can help. One moment.") + dial(HUMAN));
    }

    // ── followup_route: caller responded after small_talk or unknown ──────────
    // followup_route_1 = first attempt, followup_route_2 = second (final) attempt
    if (intent === "followup_route_1" || intent === "followup_route_2") {
      const isSecondAttempt = intent === "followup_route_2";
      const ai2 = await classifyIntent(req, speech);

      if (!ai2) {
        // AI failed — forward to human
        return twiml(el("Let me get someone for you right now.") + dial(HUMAN));
      }

      const { intent: aiIntent2, reply: reply2, shouldDial: sd2, shouldSchedule: ss2 } = ai2;
      logCall(req, { phone, speech, detectedIntent: aiIntent2, callSid });

      if (sd2 || aiIntent2 === "connect" || aiIntent2 === "support") {
        return twiml(el(reply2) + dial(HUMAN));
      }
      if (ss2 || aiIntent2 === "schedule") {
        return twiml(
          el(reply2) +
          gatherWithIntent("capture_day") +
          el("Someone from MonkeeBiz AI will follow up shortly. Take care!") +
          `<Hangup/>`
        );
      }
      if (aiIntent2 === "pricing") {
        logCall(req, { phone, speech, detectedIntent: "pricing", callSid });
        return twiml(
          el("Pricing depends on call volume, automation depth, and how much revenue we're recovering. Most businesses start with a private implementation plan. I can connect you now or get you scheduled. Which would you prefer?") +
          gatherWithIntent("pricing_offered") +
          el("Someone from MonkeeBiz AI will follow up shortly. Take care!") +
          `<Hangup/>`
        );
      }
      if (aiIntent2 === "demo" || aiIntent2 === "missed_leads") {
        return twiml(
          el(reply2) +
          gatherWithIntent("confirm_connect") +
          el("Someone from MonkeeBiz AI will follow up shortly. Take care!") +
          `<Hangup/>`
        );
      }

      // Still unclear
      if (isSecondAttempt) {
        // Two strikes — forward to human
        return twiml(
          el("Let me connect you with someone who can help. One moment.") +
          dial(HUMAN)
        );
      }

      // First attempt still unclear — one more try
      return twiml(
        el("I can help with demos, missed lead recovery, or support. Which one do you need?") +
        gatherWithIntent("followup_route_2") +
        el("Someone from MonkeeBiz AI will follow up shortly. Take care!") +
        `<Hangup/>`
      );
    }

    // ── Pricing keyword intercept (before AI) ─────────────────────────────────
    if (/\b(price|pricing|cost|charge|monthly|how much|expensive|fee|fees)\b/.test(speech.toLowerCase())) {
      logCall(req, { phone, speech, detectedIntent: "pricing", callSid });
      return twiml(
        el("Pricing depends on call volume, automation depth, and how much revenue we're recovering. Most businesses start with a private implementation plan. I can connect you now or get you scheduled. Which would you prefer?") +
        gatherWithIntent("pricing_offered") +
        el("Someone from MonkeeBiz AI will follow up shortly. Take care!") +
        `<Hangup/>`
      );
    }

    // ── AI-assisted intent classification for all other speech ────────────────
    const ai = await classifyIntent(req, speech);

    // Fallback if AI fails — use keyword routing
    if (!ai) {
      const lower = speech.toLowerCase();
      if (/\b(demo|appointment|consultation|meeting)\b/.test(lower)) {
        logCall(req, { phone, speech, detectedIntent: "demo", callSid });
        return twiml(
          el("Absolutely. I can get you scheduled or connect you with our team now. What would you prefer?") +
          gatherWithIntent("confirm_connect") +
          el("Someone from MonkeeBiz AI will follow up shortly. Take care!") +
          `<Hangup/>`
        );
      }
      if (/\b(support|billing|issue|problem|account)\b/.test(lower)) {
        logCall(req, { phone, speech, detectedIntent: "support", callSid });
        return twiml(el("Let me connect you now.") + dial(HUMAN));
      }
      logCall(req, { phone, speech, detectedIntent: "unknown", callSid });
      return twiml(
        el("I can help with demos, missed lead recovery, or support. Which one are you calling about?") +
        gather("voiceProcess")
      );
    }

    // ── Route based on AI classification ──────────────────────────────────────
    const { intent: aiIntent, reply, shouldDial, shouldSchedule } = ai;

    // Log the call (fire async, don't block response)
    logCall(req, { phone, speech, detectedIntent: aiIntent, callSid });

    // Dial immediately
    if (shouldDial || aiIntent === "connect" || aiIntent === "support") {
      return twiml(
        el(reply) +
        dial(HUMAN)
      );
    }

    // Ask for preferred day
    if (shouldSchedule || aiIntent === "schedule") {
      return twiml(
        el(reply) +
        gatherWithIntent("capture_day") +
        el("No worries. Someone from MonkeeBiz AI will follow up with you shortly. Take care!") +
        `<Hangup/>`
      );
    }

    // Demo or missed_leads — offer connect or schedule
    if (aiIntent === "demo" || aiIntent === "missed_leads") {
      return twiml(
        el(reply) +
        gatherWithIntent("confirm_connect") +
        el("Someone from MonkeeBiz AI will follow up with you shortly. Take care!") +
        `<Hangup/>`
      );
    }

    // Small talk — acknowledge once, then gather with followup_route
    if (aiIntent === "small_talk") {
      return twiml(
        el(reply) +
        gatherWithIntent("followup_route_1") +
        el("Someone from MonkeeBiz AI will follow up shortly. Take care!") +
        `<Hangup/>`
      );
    }

    // Unknown — redirect with followup_route
    return twiml(
      el(reply) +
      gatherWithIntent("followup_route_1") +
      el("Someone from MonkeeBiz AI will follow up shortly. Take care!") +
      `<Hangup/>`
    );

  } catch (error) {
    console.error("[voiceProcess] ERROR:", error.message);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna">Something went wrong. Please call back shortly. Goodbye!</Say><Hangup/></Response>`,
      { status: 200, headers: { "Content-Type": "text/xml; charset=utf-8" } }
    );
  }
});