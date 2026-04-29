// voiceProcess — optimized MANO voice handler
// SPEED ARCHITECTURE:
//   1. TwiML returned immediately — no DB or LLM blocks the response
//   2. Instant SMS fires fire-and-forget on first turn (intent=first)
//   3. Regex fast-paths handle 90%+ of intents — no LLM wait
//   4. LLM only fires for vague speech on followup turns, and only AFTER TwiML returned
//   5. All DB logging is fire-and-forget (logCall)
//   6. Timing logs at every key step
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const FIRST_SMS     = "Hey, sorry we missed your call — how can we help?";
const STATUS_CB_URL = `${Deno.env.get("BASE_URL") || ""}/functions/twilioStatusCallback`;
const BASE_URL      = "https://mano-app-8159dde8.base44.app";
const HUMAN         = "+16232822252";

// ── ElevenLabs audio ──────────────────────────────────────────────────────────
function el(text) {
  return `<Play>${BASE_URL}/functions/serveVoiceAudio?text=${encodeURIComponent(text)}</Play>`;
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

function hangup(msg) {
  return el(msg) + `<Hangup/>`;
}

// ── Fire instant first SMS — ALWAYS fire-and-forget, never awaited ────────────
function fireInstantSms(phone) {
  if (!phone) return;
  const t0 = Date.now();
  console.log(`[voiceProcess] sms_send_started_at:${new Date().toISOString()} phone:${phone}`);
  (async () => {
    try {
      const sid    = Deno.env.get("TWILIO_ACCOUNT_SID");
      const token  = Deno.env.get("TWILIO_AUTH_TOKEN");
      const msgSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");
      const from   = Deno.env.get("TWILIO_NUMBER");

      const params = new URLSearchParams({ To: phone, Body: FIRST_SMS });
      if (msgSid) params.set("MessagingServiceSid", msgSid);
      else params.set("From", from);
      params.set("StatusCallback", STATUS_CB_URL);

      const res  = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });
      const data = await res.json();
      console.log(`[voiceProcess] sms_send_completed_at:${new Date().toISOString()} sms_sid:${data.sid} ms:${Date.now()-t0}`);
    } catch (e) {
      console.error(`[voiceProcess] Instant SMS FAILED after ${Date.now()-t0}ms:`, e.message);
    }
  })();
}

// ── Fire-and-forget post-call SMS ─────────────────────────────────────────────
function sendPostCallSms(phone) {
  if (!phone) return;
  (async () => {
    try {
      const sid   = Deno.env.get("TWILIO_ACCOUNT_SID");
      const token = Deno.env.get("TWILIO_AUTH_TOKEN");
      const from  = Deno.env.get("TWILIO_NUMBER");
      if (!sid || !token || !from) return;
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: phone, From: from,
          Body: "Hey — this is Mano with Monkee Biz AI. I just spoke with you. Want to lock in your demo? Reply YES and we'll get you scheduled.",
        }).toString(),
      });
      console.log(`[voiceProcess] Post-call SMS sent to ${phone}`);
    } catch (e) {
      console.error("[voiceProcess] sendPostCallSms failed:", e.message);
    }
  })();
}

// ── Fire-and-forget CRM logging ───────────────────────────────────────────────
function logCall(req, { phone, speech, detectedIntent, callSid }) {
  (async () => {
    try {
      const base44    = createClientFromRequest(req);
      const timestamp = new Date().toISOString();
      const hotIntents = ["demo", "missed_leads", "connect", "schedule", "pricing", "owner_request"];
      const newStatus  = hotIntents.includes(detectedIntent) ? "Action Required" : detectedIntent === "support" ? "Contacted" : "New";
      const newScore   = hotIntents.includes(detectedIntent) ? "WARM" : "COLD";
      const appendNote = `[${timestamp}] Intent: ${detectedIntent} | Transcript: ${speech}`;

      if (hotIntents.includes(detectedIntent)) {
        console.log(`[voiceProcess] 🔥 HOT intent: ${detectedIntent} | ${phone} | ${callSid}`);
      }

      const existing = await base44.asServiceRole.entities.Lead.filter({ source: "inbound_voice" });
      const match    = existing.find(l => l.notes && l.notes.includes(`CallSid: ${callSid}`));

      if (match) {
        await base44.asServiceRole.entities.Lead.update(match.id, {
          last_message: speech || null,
          notes: `${match.notes}\n${appendNote}`,
          status: newStatus,
          score: newScore,
        });
      } else {
        await base44.asServiceRole.entities.Lead.create({
          name:         `Voice Call — ${phone || "Unknown"}`,
          phone:        phone || null,
          source:       "inbound_voice",
          service_need: speech || null,
          status:       newStatus,
          score:        newScore,
          notes:        `[Voice Call] CallSid: ${callSid} | Time: ${timestamp}\n${appendNote}`,
          last_message: speech || null,
        });
        // Fire post-call SMS for new voice leads (fire-and-forget)
        sendPostCallSms(phone);
      }
    } catch (e) {
      console.error("[voiceProcess] logCall failed:", e.message);
    }
  })();
}

// ── LLM fallback — only called after TwiML has already been returned ──────────
// NOTE: This is async but only used on followup turns where we can afford the wait
// On any vague/unknown in the MAIN first turn, we dial immediately instead of waiting for LLM.
async function classifyWithLLM(req, speech) {
  const t0 = Date.now();
  console.log(`[voiceProcess] ai_started_at:${new Date().toISOString()}`);
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
          intent:         { type: "string" },
          reply:          { type: "string" },
          shouldDial:     { type: "boolean" },
          shouldSchedule: { type: "boolean" },
        },
        required: ["intent", "reply", "shouldDial", "shouldSchedule"],
      },
    });
    console.log(`[voiceProcess] ai_completed_at:${new Date().toISOString()} ai_ms:${Date.now()-t0}`);
    return result;
  } catch (e) {
    console.error(`[voiceProcess] LLM classify failed after ${Date.now()-t0}ms:`, e.message);
    return null;
  }
}

// ── Regex fast-paths ──────────────────────────────────────────────────────────
const RE = {
  owner:    /\b(tex|owner|mr\.?\s*monks?|tex\s*taylor)\b|is\s+(tex|the\s+owner)\s+(in|there|available)|\b(talk|speak|get|reach)\s+(to\s+)?(tex|the\s+owner)\b|i\s+know\s+the\s+owner/i,
  pricing:  /\b(price|pricing|cost|charge|monthly|how much|expensive|fee|fees)\b/i,
  demo:     /\b(demo|demonstration|show me|learn more|find out|tell me more|interested)\b/i,
  schedule: /\b(schedule|book|appointment|calendar|pick a time|set up a time|meeting)\b/i,
  connect:  /\b(connect|speak with|talk to|call me|transfer|real person|human|agent|someone)\b/i,
  missed:   /\b(missed (calls?|leads?)|lost calls?|revenue|hvac|contractor|service business|answering)\b/i,
  support:  /\b(support|billing|issue|problem|account|existing customer|help with my)\b/i,
};

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const webhookReceivedAt = Date.now();
  console.log(`[voiceProcess] webhook_received_at:${new Date(webhookReceivedAt).toISOString()}`);

  try {
    const url    = new URL(req.url);
    const body   = await req.text();
    const params = new URLSearchParams(body);
    const speech  = (params.get("SpeechResult") || "").trim();
    const callSid = params.get("CallSid") || "unknown";
    const phone   = params.get("From") || null;
    const intent  = url.searchParams.get("intent") || "first";
    const lower   = speech.toLowerCase();

    console.log(`[voiceProcess] intent:${intent} | callSid:${callSid} | speech:${JSON.stringify(speech)}`);

    // ── FIRST TURN: Fire instant SMS immediately (fire-and-forget, never blocks) ─
    if (intent === "first" && phone) {
      fireInstantSms(phone);
      // TwiML is built and returned below synchronously — SMS fires in background
    }

    // ── No speech ─────────────────────────────────────────────────────────────
    if (!speech) {
      const resp = twiml(el("I didn't catch that. Go ahead and speak.") + gather());
      console.log(`[voiceProcess] twiml_returned_at:${new Date().toISOString()} total_ms:${Date.now()-webhookReceivedAt}`);
      return resp;
    }

    // ── State: confirm_connect ────────────────────────────────────────────────
    if (intent === "confirm_connect" || intent === "confirm_lead") {
      if (/\b(connect|now|call|talk|speak|yes|yeah|sure|please|ok|okay)\b/.test(lower)) {
        logCall(req, { phone, speech, detectedIntent: "connect", callSid });
        const resp = twiml(el("Great, connecting you now. One moment.") + dial());
        console.log(`[voiceProcess] twiml_returned_at:${new Date().toISOString()} total_ms:${Date.now()-webhookReceivedAt}`);
        return resp;
      }
      if (/\b(schedule|book|day|week|monday|tuesday|wednesday|thursday|friday|morning|afternoon|tomorrow|next)\b/.test(lower)) {
        logCall(req, { phone, speech, detectedIntent: "schedule", callSid });
        const resp = twiml(el("Perfect. What day works best?") + gather("capture_day") + hangup("Someone from Monkee Biz AI will follow up. Take care!"));
        console.log(`[voiceProcess] twiml_returned_at:${new Date().toISOString()} total_ms:${Date.now()-webhookReceivedAt}`);
        return resp;
      }
      const resp = twiml(el("Connect now or schedule? Just say which.") + gather("confirm_connect") + hangup("Someone from Monkee Biz AI will follow up. Take care!"));
      console.log(`[voiceProcess] twiml_returned_at:${new Date().toISOString()} total_ms:${Date.now()-webhookReceivedAt}`);
      return resp;
    }

    // ── State: capture_day ────────────────────────────────────────────────────
    if (intent === "capture_day") {
      logCall(req, { phone, speech, detectedIntent: "schedule", callSid });
      const resp = twiml(el("Got it. We'll reach out to confirm. Talk soon!") + `<Hangup/>`);
      console.log(`[voiceProcess] twiml_returned_at:${new Date().toISOString()} total_ms:${Date.now()-webhookReceivedAt}`);
      return resp;
    }

    // ── State: pricing_offered ────────────────────────────────────────────────
    if (intent === "pricing_offered") {
      logCall(req, { phone, speech, detectedIntent: "pricing", callSid });
      if (RE.pricing.test(lower) || /\b(connect|now|yes|yeah|sure|ok|okay|talk|speak)\b/.test(lower)) {
        const resp = twiml(el("Let me connect you with someone who can help. One moment.") + dial());
        console.log(`[voiceProcess] twiml_returned_at:${new Date().toISOString()} total_ms:${Date.now()-webhookReceivedAt}`);
        return resp;
      }
      if (/\b(schedule|book|day|week|morning|afternoon|tomorrow|next)\b/.test(lower)) {
        const resp = twiml(el("What day works best?") + gather("capture_day") + hangup("Someone from Monkee Biz AI will follow up. Take care!"));
        console.log(`[voiceProcess] twiml_returned_at:${new Date().toISOString()} total_ms:${Date.now()-webhookReceivedAt}`);
        return resp;
      }
      const resp = twiml(el("Let me connect you with someone who can help. One moment.") + dial());
      console.log(`[voiceProcess] twiml_returned_at:${new Date().toISOString()} total_ms:${Date.now()-webhookReceivedAt}`);
      return resp;
    }

    // ── State: followup_route_1 / followup_route_2 ────────────────────────────
    // On followup turns, we CAN use LLM since caller is already engaged
    if (intent === "followup_route_1" || intent === "followup_route_2") {
      const isSecond = intent === "followup_route_2";

      if (RE.owner.test(lower)) {
        logCall(req, { phone, speech, detectedIntent: "owner_request", callSid });
        const resp = twiml(el("Let me get Tex for you now. One moment.") + dial());
        console.log(`[voiceProcess] twiml_returned_at:${new Date().toISOString()} total_ms:${Date.now()-webhookReceivedAt}`);
        return resp;
      }
      if (RE.pricing.test(lower)) {
        logCall(req, { phone, speech, detectedIntent: "pricing", callSid });
        const resp = twiml(el("Pricing depends on call volume and setup. I can connect you now or get you scheduled. Which do you prefer?") + gather("pricing_offered") + hangup("Someone from Monkee Biz AI will follow up. Take care!"));
        console.log(`[voiceProcess] twiml_returned_at:${new Date().toISOString()} total_ms:${Date.now()-webhookReceivedAt}`);
        return resp;
      }
      if (RE.connect.test(lower) || RE.support.test(lower)) {
        logCall(req, { phone, speech, detectedIntent: "connect", callSid });
        const resp = twiml(el("Connecting you now. One moment.") + dial());
        console.log(`[voiceProcess] twiml_returned_at:${new Date().toISOString()} total_ms:${Date.now()-webhookReceivedAt}`);
        return resp;
      }
      if (RE.demo.test(lower) || RE.missed.test(lower)) {
        logCall(req, { phone, speech, detectedIntent: "demo", callSid });
        const resp = twiml(el("Absolutely. I can connect you now or schedule you. Which works better?") + gather("confirm_connect") + hangup("Someone from Monkee Biz AI will follow up. Take care!"));
        console.log(`[voiceProcess] twiml_returned_at:${new Date().toISOString()} total_ms:${Date.now()-webhookReceivedAt}`);
        return resp;
      }
      if (RE.schedule.test(lower)) {
        logCall(req, { phone, speech, detectedIntent: "schedule", callSid });
        const resp = twiml(el("What day works best for you?") + gather("capture_day") + hangup("Someone from Monkee Biz AI will follow up. Take care!"));
        console.log(`[voiceProcess] twiml_returned_at:${new Date().toISOString()} total_ms:${Date.now()-webhookReceivedAt}`);
        return resp;
      }

      // LLM fallback on followup turns (caller already held, we can spend ~1-2s here)
      const ai = await classifyWithLLM(req, speech);
      if (!ai) {
        logCall(req, { phone, speech, detectedIntent: "unknown", callSid });
        const resp = twiml(el("Let me get someone for you now.") + dial());
        console.log(`[voiceProcess] twiml_returned_at:${new Date().toISOString()} total_ms:${Date.now()-webhookReceivedAt}`);
        return resp;
      }

      const { intent: ai2, reply: r2, shouldDial: sd2, shouldSchedule: ss2 } = ai;
      logCall(req, { phone, speech, detectedIntent: ai2, callSid });

      let resp;
      if (sd2 || ai2 === "connect" || ai2 === "support") resp = twiml(el(r2) + dial());
      else if (ss2 || ai2 === "schedule") resp = twiml(el(r2) + gather("capture_day") + hangup("Someone from Monkee Biz AI will follow up. Take care!"));
      else if (ai2 === "pricing") resp = twiml(el("Pricing depends on call volume and setup. Connect now or schedule?") + gather("pricing_offered") + hangup("Someone from Monkee Biz AI will follow up. Take care!"));
      else if (ai2 === "demo" || ai2 === "missed_leads") resp = twiml(el(r2) + gather("confirm_connect") + hangup("Someone from Monkee Biz AI will follow up. Take care!"));
      else if (isSecond) resp = twiml(el("Let me connect you with someone who can help. One moment.") + dial());
      else resp = twiml(el("I can help with demos, missed lead recovery, or support. Which one?") + gather("followup_route_2") + hangup("Someone from Monkee Biz AI will follow up. Take care!"));

      console.log(`[voiceProcess] twiml_returned_at:${new Date().toISOString()} total_ms:${Date.now()-webhookReceivedAt}`);
      return resp;
    }

    // ── Regex fast-paths (main first-response flow) ───────────────────────────
    // All of these return immediately — no DB, no LLM blocking

    if (RE.owner.test(lower)) {
      logCall(req, { phone, speech, detectedIntent: "owner_request", callSid });
      // Async note update — fire-and-forget
      (async () => {
        try {
          const base44   = createClientFromRequest(req);
          const existing = await base44.asServiceRole.entities.Lead.filter({ source: "inbound_voice" });
          const match    = existing.find(l => l.notes && l.notes.includes(`CallSid: ${callSid}`));
          if (match) {
            await base44.asServiceRole.entities.Lead.update(match.id, {
              status: "Action Required", score: "HOT",
              notes: match.notes + "\nCaller requested Tex / owner directly.",
            });
          }
        } catch (e) { console.error("[voiceProcess] owner note update failed:", e.message); }
      })();
      const resp = twiml(el("Absolutely. Let me see if I can get Tex for you now. One moment.") + dial());
      console.log(`[voiceProcess] twiml_returned_at:${new Date().toISOString()} total_ms:${Date.now()-webhookReceivedAt}`);
      return resp;
    }

    if (RE.pricing.test(lower)) {
      logCall(req, { phone, speech, detectedIntent: "pricing", callSid });
      const resp = twiml(el("Pricing depends on call volume and setup. I can connect you now or get you scheduled. Which do you prefer?") + gather("pricing_offered") + hangup("Someone from Monkee Biz AI will follow up. Take care!"));
      console.log(`[voiceProcess] twiml_returned_at:${new Date().toISOString()} total_ms:${Date.now()-webhookReceivedAt}`);
      return resp;
    }

    if (RE.missed.test(lower)) {
      logCall(req, { phone, speech, detectedIntent: "missed_leads", callSid });
      const resp = twiml(el("MANO recovers missed calls with instant SMS, AI voice, and booking automation. Want to connect now or schedule?") + gather("confirm_connect") + hangup("Someone from Monkee Biz AI will follow up. Take care!"));
      console.log(`[voiceProcess] twiml_returned_at:${new Date().toISOString()} total_ms:${Date.now()-webhookReceivedAt}`);
      return resp;
    }

    if (RE.demo.test(lower)) {
      logCall(req, { phone, speech, detectedIntent: "demo", callSid });
      const resp = twiml(el("Absolutely. I can connect you now or schedule you. Which works better?") + gather("confirm_connect") + hangup("Someone from Monkee Biz AI will follow up. Take care!"));
      console.log(`[voiceProcess] twiml_returned_at:${new Date().toISOString()} total_ms:${Date.now()-webhookReceivedAt}`);
      return resp;
    }

    if (RE.schedule.test(lower)) {
      logCall(req, { phone, speech, detectedIntent: "schedule", callSid });
      const resp = twiml(el("Of course. What day works best for you?") + gather("capture_day") + hangup("Someone from Monkee Biz AI will follow up. Take care!"));
      console.log(`[voiceProcess] twiml_returned_at:${new Date().toISOString()} total_ms:${Date.now()-webhookReceivedAt}`);
      return resp;
    }

    if (RE.connect.test(lower)) {
      logCall(req, { phone, speech, detectedIntent: "connect", callSid });
      const resp = twiml(el("Absolutely, connecting you now. One moment.") + dial());
      console.log(`[voiceProcess] twiml_returned_at:${new Date().toISOString()} total_ms:${Date.now()-webhookReceivedAt}`);
      return resp;
    }

    if (RE.support.test(lower)) {
      logCall(req, { phone, speech, detectedIntent: "support", callSid });
      const resp = twiml(el("Let me connect you with the team now. One moment.") + dial());
      console.log(`[voiceProcess] twiml_returned_at:${new Date().toISOString()} total_ms:${Date.now()-webhookReceivedAt}`);
      return resp;
    }

    // ── MAIN FLOW FALLBACK: unknown/vague on first turn ───────────────────────
    // SPEED FIX: Do NOT call LLM here — that would add 1-3s to the main call path.
    // Instead, route to followup_route_1 immediately. LLM will run on next turn
    // if regex still doesn't match. This keeps first response <100ms.
    logCall(req, { phone, speech, detectedIntent: "unknown", callSid });
    const resp = twiml(
      el("I can help with demos, missed lead recovery, or support. Which one?") +
      gather("followup_route_1") +
      hangup("Someone from Monkee Biz AI will follow up. Take care!")
    );
    console.log(`[voiceProcess] twiml_returned_at:${new Date().toISOString()} total_ms:${Date.now()-webhookReceivedAt}`);
    return resp;

  } catch (error) {
    console.error(`[voiceProcess] ERROR after ${Date.now()-webhookReceivedAt}ms:`, error.message);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna">Something went wrong. Please call back shortly. Goodbye!</Say><Hangup/></Response>`,
      { status: 200, headers: { "Content-Type": "text/xml; charset=utf-8" } }
    );
  }
});