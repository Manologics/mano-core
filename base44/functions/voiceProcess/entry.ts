// voiceProcess — intent-based voice handler with call logging
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BASE_URL = "https://mano-app-8159dde8.base44.app";
const HUMAN = "+16232822252";

async function logCall(req, { phone, speech, detectedIntent, callSid }) {
  try {
    const base44 = createClientFromRequest(req);
    const timestamp = new Date().toISOString();
    const newStatus = detectedIntent === "demo" ? "Action Required" : detectedIntent === "support" ? "Contacted" : "New";
    const newScore = detectedIntent === "demo" ? "WARM" : detectedIntent === "lead" ? "WARM" : "COLD";
    const appendNote = `[${timestamp}] Intent: ${detectedIntent} | Transcript: ${speech}`;

    // Search for existing lead with this CallSid in notes
    const existing = await base44.asServiceRole.entities.Lead.filter({ source: "inbound_voice" });
    const match = existing.find(l => l.notes && l.notes.includes(`CallSid: ${callSid}`));

    if (match) {
      // Update existing lead — append transcript, update status/score if escalating
      const updatedNotes = `${match.notes}\n${appendNote}`;
      await base44.asServiceRole.entities.Lead.update(match.id, {
        last_message: speech || null,
        notes: updatedNotes,
        status: newStatus,
        score: newScore,
      });
      console.log("[voiceProcess] Lead UPDATED for CallSid:", callSid, "| id:", match.id);
    } else {
      // First interaction — create new lead
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
    }
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

    // ── Confirm connect or schedule after demo/lead offer ────────────────────
    if (intent === "confirm_connect" || intent === "confirm_lead") {
      if (/\b(connect|now|call|talk|speak|yes|yeah|sure|please|ok|okay)\b/.test(speech)) {
        return twiml(
          `<Say voice="Polly.Joanna">Great, connecting you now. One moment.</Say>` +
          dial(HUMAN)
        );
      } else if (/\b(schedule|book|appointment|day|week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|morning|afternoon|tomorrow|next)\b/.test(speech)) {
        return twiml(
          `<Say voice="Polly.Joanna">Perfect. What day works best for you?</Say>` +
          `<Gather input="speech" action="${BASE_URL}/functions/voiceProcess?intent=capture_day" method="POST" speechTimeout="4" timeout="10" language="en-US"></Gather>` +
          `<Say voice="Polly.Joanna">No worries. Someone from MonkeeBiz AI will follow up with you shortly. Take care!</Say>` +
          `<Hangup/>`
        );
      } else {
        // Unclear — re-ask with the new next-step prompt
        return twiml(
          `<Say voice="Polly.Joanna">I can get you scheduled or connect you now. What would you prefer?</Say>` +
          `<Gather input="speech" action="${BASE_URL}/functions/voiceProcess?intent=confirm_connect" method="POST" speechTimeout="4" timeout="10" language="en-US"></Gather>` +
          `<Say voice="Polly.Joanna">Someone from MonkeeBiz AI will be in touch shortly. Take care!</Say>` +
          `<Hangup/>`
        );
      }
    }

    // ── Capture preferred day for scheduling ──────────────────────────────────
    if (intent === "capture_day") {
      return twiml(
        `<Say voice="Polly.Joanna">Got it. We will get that on the calendar and reach out to confirm. Talk soon!</Say>` +
        `<Hangup/>`
      );
    }

    // ── Demo / appointment / consultation / meeting ───────────────────────────
    if (/\b(demo|appointment|consultation|meeting|schedule|book)\b/.test(speech)) {
      logCall(req, { phone, speech, detectedIntent: "demo", callSid });
      return twiml(
        `<Say voice="Polly.Joanna">Absolutely. I can help get that started.</Say>` +
        `<Say voice="Polly.Joanna">I can get you scheduled or connect you now. What would you prefer?</Say>` +
        `<Gather input="speech" action="${BASE_URL}/functions/voiceProcess?intent=confirm_connect" method="POST" speechTimeout="4" timeout="10" language="en-US"></Gather>` +
        `<Say voice="Polly.Joanna">Someone from MonkeeBiz AI will follow up shortly. Take care!</Say>` +
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
        `<Say voice="Polly.Joanna">I can get you scheduled or connect you now. What would you prefer?</Say>` +
        `<Gather input="speech" action="${BASE_URL}/functions/voiceProcess?intent=confirm_lead" method="POST" speechTimeout="4" timeout="10" language="en-US"></Gather>` +
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