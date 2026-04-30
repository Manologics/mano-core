// voiceProcess — MANO inbound voice handler
// ARCHITECTURE:
//   1. Parse speech from Twilio Gather
//   2. Normalize to lowercase
//   3. Run detectIntent() — regex fast path, zero latency
//   4. Return prebuilt Polly <Say> TwiML immediately if intent matched
//   5. GPT only fires if regex misses — hard 2500ms timeout, then fallback
//   6. ElevenLabs is NOT used anywhere in this file
//   7. Every branch returns valid TwiML

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BASE_URL   = "https://mano-app-8159dde8.base44.app";
const HUMAN_NUM  = "+16232822252";
const GPT_LIMIT  = 2500; // ms before we give up and use fallback

// ── Regex intent patterns ─────────────────────────────────────────────────────
const INTENTS = [
  { name: "emergency",    re: /\b(emergency|urgent|asap|right now|today|immediately|no air|no heat|flooding)\b/i },
  { name: "repair",       re: /\b(repair|fix|broken|not working|stopped working|issue|problem|leak|no cool|no heat)\b/i },
  { name: "replacement",  re: /\b(replace|replacement|new unit|install|installation|upgrade)\b/i },
  { name: "maintenance",  re: /\b(maintenance|tune up|tune-up|checkup|inspection)\b/i },
  { name: "pricing",      re: /\b(price|pricing|cost|quote|estimate|how much|charge)\b/i },
  { name: "callback",     re: /\b(call me|call back|callback|text me)\b/i },
  { name: "location",     re: /\b(phoenix|scottsdale|tempe|mesa|chandler|glendale|peoria|surprise|gilbert|in [a-z]+|my city|my zip)\b/i },
  { name: "availability", re: /\b(available|when|appointment|schedule|tomorrow|morning|afternoon|next week)\b/i },
  { name: "confusion",    re: /\b(not sure|i don't know|confused|what do you mean|repeat|say that again)\b/i },
  { name: "small_talk",   re: /\b(hello|hi|hey|thanks|thank you|are you real|who is this|what is this)\b/i },
];

// ── Prebuilt responses — all Polly, all under 12 words ───────────────────────
const RESPONSES = {
  emergency:    "Understood — emergency. Let's move fast. What city are you in?",
  repair:       "Got it — sounds like a repair. What city are you in?",
  replacement:  "Got it — replacement job. What city are you in?",
  maintenance:  "Got it — maintenance request. What city are you in?",
  pricing:      "Pricing depends on the service. What type of issue are you dealing with?",
  callback:     "Got it. I'll help route this. What's the best phone number and city?",
  location:     "Perfect. What type of service — repair, replacement, or emergency?",
  availability: "Got it. I'll help route that. What city are you in?",
  confusion:    "No problem. What service do you need help with?",
  small_talk:   "I'm here and ready to help. Is this repair, replacement, or emergency?",
  gpt_fallback: "Got it — let's keep this simple. What city are you in?",
  no_speech:    "I didn't catch that. Is this for repair, replacement, or emergency service?",
};

// ── Detect intent — runs before GPT, zero latency ────────────────────────────
function detectIntent(speech) {
  for (const { name, re } of INTENTS) {
    if (re.test(speech)) return name;
  }
  return null;
}

// ── Build Polly <Say> + <Gather> TwiML ───────────────────────────────────────
function buildSayGatherResponse(message, nextIntent = "followup") {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew-Neural">${message}</Say>
  <Gather input="speech" action="${BASE_URL}/functions/voiceProcess?intent=${nextIntent}" method="POST" speechTimeout="3" timeout="10" language="en-US">
  </Gather>
  <Say voice="Polly.Matthew-Neural">We'll follow up shortly. Goodbye!</Say>
  <Hangup/>
</Response>`;
}

// ── Build dial-to-human TwiML ─────────────────────────────────────────────────
function buildDialResponse(ack = "") {
  const say = ack ? `<Say voice="Polly.Matthew-Neural">${ack}</Say>` : "";
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${say}<Dial>${HUMAN_NUM}</Dial></Response>`;
}

// ── Fire-and-forget CRM log ───────────────────────────────────────────────────
function logCall(req, { phone, speech, intent, callSid }) {
  (async () => {
    try {
      const base44 = createClientFromRequest(req);
      const ts = new Date().toISOString();
      const note = `[${ts}] Intent: ${intent} | Speech: ${speech}`;
      const existing = await base44.asServiceRole.entities.Lead.filter({ source: "inbound_voice" });
      const match = existing.find(l => l.notes && l.notes.includes(`CallSid: ${callSid}`));
      if (match) {
        await base44.asServiceRole.entities.Lead.update(match.id, {
          last_message: speech || null,
          notes: `${match.notes}\n${note}`,
        });
      } else {
        await base44.asServiceRole.entities.Lead.create({
          name:         `Voice Call — ${phone || "Unknown"}`,
          phone:        phone || null,
          source:       "inbound_voice",
          service_need: speech || null,
          status:       "New",
          score:        "PENDING",
          notes:        `[Voice Call] CallSid: ${callSid} | Time: ${ts}\n${note}`,
          last_message: speech || null,
        });
      }
    } catch (e) {
      console.error("[voiceProcess] logCall failed:", e.message);
    }
  })();
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const t0 = Date.now();
  const url    = new URL(req.url);
  const body   = await req.text();
  const params = new URLSearchParams(body);

  const rawSpeech = (params.get("SpeechResult") || "").trim();
  const speech    = rawSpeech.toLowerCase();
  const callSid   = params.get("CallSid") || "unknown";
  const phone     = params.get("From") || null;
  const stateIntent = url.searchParams.get("intent") || "init";

  console.log(`[voiceProcess] gather_received_at:${new Date(t0).toISOString()} intent:${stateIntent} speech:"${rawSpeech.slice(0, 80)}"`);

  // ── No speech ──────────────────────────────────────────────────────────────
  if (!speech) {
    const resp = new Response(buildSayGatherResponse(RESPONSES.no_speech, "init"), {
      status: 200, headers: { "Content-Type": "text/xml; charset=utf-8" },
    });
    console.log(`[voiceProcess] twiml_returned_at:${new Date().toISOString()} total_response_ms:${Date.now() - t0} fast_path_used:true fast_path_intent:no_speech`);
    return resp;
  }

  // ── State: location captured — route to confirm/book ─────────────────────
  if (stateIntent === "ask_city") {
    logCall(req, { phone, speech: rawSpeech, intent: "qualified", callSid });
    const resp = new Response(buildSayGatherResponse("Perfect — let me get you connected. One moment.", "confirm"), {
      status: 200, headers: { "Content-Type": "text/xml; charset=utf-8" },
    });
    console.log(`[voiceProcess] twiml_returned_at:${new Date().toISOString()} total_response_ms:${Date.now() - t0} fast_path_used:true fast_path_intent:ask_city`);
    return resp;
  }

  // ── State: confirm — dial or schedule ────────────────────────────────────
  if (stateIntent === "confirm") {
    const yes = /\b(yes|yeah|sure|ok|okay|connect|now|talk|speak|please)\b/i.test(speech);
    logCall(req, { phone, speech: rawSpeech, intent: yes ? "connect" : "schedule", callSid });
    const resp = new Response(yes ? buildDialResponse("Connecting you now. One moment.") : buildSayGatherResponse("Got it. Someone will follow up shortly. Goodbye!"), {
      status: 200, headers: { "Content-Type": "text/xml; charset=utf-8" },
    });
    console.log(`[voiceProcess] twiml_returned_at:${new Date().toISOString()} total_response_ms:${Date.now() - t0} fast_path_used:true fast_path_intent:confirm`);
    return resp;
  }

  // ── Regex fast-path ───────────────────────────────────────────────────────
  const fastIntent = detectIntent(speech);

  if (fastIntent) {
    logCall(req, { phone, speech: rawSpeech, intent: fastIntent, callSid });

    // Emergency → connect directly
    if (fastIntent === "emergency") {
      const resp = new Response(buildDialResponse("Understood — emergency. Connecting you now."), {
        status: 200, headers: { "Content-Type": "text/xml; charset=utf-8" },
      });
      console.log(`[voiceProcess] twiml_returned_at:${new Date().toISOString()} total_response_ms:${Date.now() - t0} fast_path_used:true fast_path_intent:emergency`);
      return resp;
    }

    // Location given → ask what type
    const nextState = fastIntent === "location" ? "init" : "ask_city";
    const resp = new Response(buildSayGatherResponse(RESPONSES[fastIntent], nextState), {
      status: 200, headers: { "Content-Type": "text/xml; charset=utf-8" },
    });
    console.log(`[voiceProcess] twiml_returned_at:${new Date().toISOString()} total_response_ms:${Date.now() - t0} fast_path_used:true fast_path_intent:${fastIntent}`);
    return resp;
  }

  // ── GPT fallback — only if regex misses, hard timeout ────────────────────
  console.log(`[voiceProcess] gpt_started_at:${new Date().toISOString()} fast_path_used:false`);
  let gptReply = null;

  try {
    const base44 = createClientFromRequest(req);
    const gptPromise = base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are MANO, a friendly voice AI for an HVAC contractor.
Caller said: "${rawSpeech}"
Write a SHORT natural reply under 12 words to keep them talking. Ask what city they are in if unclear.
Do NOT mention you are AI. Do NOT use lists. Plain conversational sentence only.`,
    });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), GPT_LIMIT)
    );
    const result = await Promise.race([gptPromise, timeoutPromise]);
    if (typeof result === "string" && result.trim()) {
      gptReply = result.trim();
    }
  } catch (e) {
    console.warn(`[voiceProcess] gpt_failed:${e.message}`);
  }

  console.log(`[voiceProcess] gpt_completed_at:${new Date().toISOString()} total_response_ms:${Date.now() - t0}`);

  const finalMessage = gptReply || RESPONSES.gpt_fallback;
  logCall(req, { phone, speech: rawSpeech, intent: "gpt_fallback", callSid });

  return new Response(buildSayGatherResponse(finalMessage, "ask_city"), {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
});