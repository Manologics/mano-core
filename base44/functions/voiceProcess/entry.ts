// voiceProcess — intent-based voice handler with ElevenLabs TTS + Twilio <Play>
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BASE_URL = "https://mano-app-8159dde8.base44.app";
const HUMAN = "+16232822252";

// ── ElevenLabs audio helper ───────────────────────────────────────────────────
// Generates a <Play> tag pointing to serveVoiceAudio (Eric voice via ElevenLabs)
function el(text) {
  const encoded = encodeURIComponent(text);
  return `<Play>${BASE_URL}/functions/serveVoiceAudio?text=${encoded}</Play>`;
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
    const newStatus = detectedIntent === "demo" ? "Action Required" : detectedIntent === "support" ? "Contacted" : "New";
    const newScore = detectedIntent === "demo" ? "WARM" : detectedIntent === "lead" ? "WARM" : "COLD";
    const appendNote = `[${timestamp}] Intent: ${detectedIntent} | Transcript: ${speech}`;

    if (detectedIntent === "demo" || detectedIntent === "lead") {
      console.log(`🔥 HOT LEAD: ${phone} | ${speech} | CallSid: ${callSid}`);
    }

    // Dedup: search for existing lead with this CallSid
    const existing = await base44.asServiceRole.entities.Lead.filter({ source: "inbound_voice" });
    const match = existing.find(l => l.notes && l.notes.includes(`CallSid: ${callSid}`));

    if (match) {
      const updatedNotes = `${match.notes}\n${appendNote}`;
      await base44.asServiceRole.entities.Lead.update(match.id, {
        last_message: speech || null,
        notes: updatedNotes,
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
    const speech = (params.get("SpeechResult") || "").toLowerCase().trim();
    const callSid = params.get("CallSid") || "unknown";
    const phone = params.get("From") || null;
    const intent = url.searchParams.get("intent") || "first";

    console.log("[voiceProcess] CallSid:", callSid, "| From:", phone, "| intent:", intent, "| speech:", JSON.stringify(speech));

    if (!speech) {
      return twiml(
        el("I didn't catch that. Can you say that one more time?") +
        gather("voiceProcess")
      );
    }

    // ── Confirm connect or schedule after demo/lead offer ─────────────────────
    if (intent === "confirm_connect" || intent === "confirm_lead") {
      if (/\b(connect|now|call|talk|speak|yes|yeah|sure|please|ok|okay)\b/.test(speech)) {
        return twiml(
          el("Great, connecting you now. One moment.") +
          dial(HUMAN)
        );
      } else if (/\b(schedule|book|appointment|day|week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|morning|afternoon|tomorrow|next)\b/.test(speech)) {
        return twiml(
          el("Perfect. What day works best for you?") +
          gatherWithIntent("capture_day") +
          el("No worries. Someone from MonkeeBiz AI will follow up with you shortly. Take care!") +
          `<Hangup/>`
        );
      } else {
        return twiml(
          el("I can get you scheduled or connect you now. What would you prefer?") +
          gatherWithIntent("confirm_connect") +
          el("Someone from MonkeeBiz AI will be in touch shortly. Take care!") +
          `<Hangup/>`
        );
      }
    }

    // ── Capture preferred day for scheduling ──────────────────────────────────
    if (intent === "capture_day") {
      return twiml(
        el("Got it. We will get that on the calendar and reach out to confirm. Talk soon!") +
        `<Hangup/>`
      );
    }

    // ── Demo / appointment / consultation / meeting ───────────────────────────
    if (/\b(demo|appointment|consultation|meeting|schedule|book)\b/.test(speech)) {
      logCall(req, { phone, speech, detectedIntent: "demo", callSid });
      return twiml(
        el("Absolutely. I can help get that started.") +
        el("I can get you scheduled or connect you now. What would you prefer?") +
        gatherWithIntent("confirm_connect") +
        el("Someone from MonkeeBiz AI will follow up shortly. Take care!") +
        `<Hangup/>`
      );
    }

    // ── Support / billing / existing customer ─────────────────────────────────
    if (/\b(support|help|billing|existing|customer|issue|problem|account)\b/.test(speech)) {
      logCall(req, { phone, speech, detectedIntent: "support", callSid });
      return twiml(
        el("Got it. I will connect you with someone now.") +
        dial(HUMAN)
      );
    }

    // ── Missed calls / leads / revenue / service business ────────────────────
    if (/\b(missed|calls|leads|revenue|hvac|contractor|plumber|plumbing|service|business|jobs|customers)\b/.test(speech)) {
      logCall(req, { phone, speech, detectedIntent: "lead", callSid });
      return twiml(
        el("That is exactly what MANO helps with. We capture missed calls, respond instantly, qualify leads, and help book jobs automatically.") +
        el("I can get you scheduled or connect you now. What would you prefer?") +
        gatherWithIntent("confirm_lead") +
        el("Someone from MonkeeBiz AI will follow up with you soon. Take care!") +
        `<Hangup/>`
      );
    }

    // ── Unclear / fallback ────────────────────────────────────────────────────
    logCall(req, { phone, speech, detectedIntent: "unknown", callSid });
    return twiml(
      el("I can help with demos, missed lead recovery, or support. Which one are you calling about?") +
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