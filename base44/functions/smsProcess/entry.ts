// smsProcess — inbound SMS handler for MANO
// Classifies intent via regex (fast-path) → LLM fallback → replies via Twilio SMS
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const FROM_NUMBER = Deno.env.get("TWILIO_NUMBER");
const ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const AUTH_TOKEN  = Deno.env.get("TWILIO_AUTH_TOKEN");
const BOOKING_LINK = "https://calendly.com/monkeebizai";

// ── Regex fast-paths ──────────────────────────────────────────────────────────
const RE = {
  pricing:  /\b(price|pricing|cost|charge|monthly|how much|expensive|fee|fees)\b/i,
  demo:     /\b(demo|demonstration|show me|learn more|tell me more|interested|find out)\b/i,
  schedule: /\b(schedule|book|appointment|calendar|pick a time|set up|meeting)\b/i,
  connect:  /\b(connect|speak with|talk to|call me|transfer|real person|human|agent|someone now)\b/i,
  missed:   /\b(missed (calls?|leads?)|lost calls?|revenue|hvac|contractor|service business)\b/i,
  support:  /\b(support|billing|issue|problem|account|existing customer|help with my)\b/i,
  stop:     /^\s*(stop|unsubscribe|cancel|quit|end)\s*$/i,
  yes:      /^\s*(yes|yeah|yep|sure|ok|okay|let'?s? go|do it|connect me|i'm in)\s*$/i,
};

// ── Send SMS via Twilio ───────────────────────────────────────────────────────
async function sendSms(to, body) {
  const params = new URLSearchParams({ To: to, From: FROM_NUMBER, Body: body });
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${ACCOUNT_SID}:${AUTH_TOKEN}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    console.error("[smsProcess] SMS send failed:", err);
  }
}

// ── Fire-and-forget lead log/update ──────────────────────────────────────────
function logLead(req, { phone, message, detectedIntent }) {
  const run = async () => {
    try {
      const base44 = createClientFromRequest(req);
      const timestamp = new Date().toISOString();
      const hotIntents = ["demo", "missed_leads", "connect", "schedule", "pricing"];
      const status = hotIntents.includes(detectedIntent) ? "Action Required" : detectedIntent === "support" ? "Contacted" : "New";
      const score  = hotIntents.includes(detectedIntent) ? "WARM" : "COLD";
      const note   = `[${timestamp}] SMS Intent: ${detectedIntent} | Msg: ${message}`;

      const existing = await base44.asServiceRole.entities.Lead.filter({ source: "inbound_sms" });
      const match = existing.find(l => l.phone === phone);

      if (match) {
        await base44.asServiceRole.entities.Lead.update(match.id, {
          last_message: message,
          notes: `${match.notes || ""}\n${note}`,
          status,
          score,
        });
        console.log("[smsProcess] Lead UPDATED:", match.id);
      } else {
        await base44.asServiceRole.entities.Lead.create({
          name: `SMS Lead — ${phone}`,
          phone,
          source: "inbound_sms",
          service_need: message,
          status,
          score,
          notes: `[Inbound SMS] Time: ${timestamp}\n${note}`,
          last_message: message,
        });
        console.log("[smsProcess] Lead CREATED for:", phone);
      }
    } catch (e) {
      console.error("[smsProcess] logLead failed:", e.message);
    }
  };
  run();
}

// ── LLM fallback for vague/unknown ───────────────────────────────────────────
async function classifyWithLLM(req, message) {
  try {
    const base44 = createClientFromRequest(req);
    return await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are MANO, an AI for Monkee Biz AI — helping HVAC contractors capture missed leads and book jobs.

Inbound SMS: "${message}"

Classify intent. Options: demo, connect, schedule, support, missed_leads, pricing, unknown

Respond ONLY with valid JSON:
{"intent":"...","reply":"..."}

Reply must be 1 sentence, SMS-friendly, conversion-focused. No fluff.`,
      response_json_schema: {
        type: "object",
        properties: {
          intent: { type: "string" },
          reply:  { type: "string" },
        },
        required: ["intent", "reply"],
      },
    });
  } catch (e) {
    console.error("[smsProcess] LLM failed:", e.message);
    return null;
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const body   = await req.text();
    const params = new URLSearchParams(body);
    const phone   = params.get("From") || "";
    const message = (params.get("Body") || "").trim();

    console.log("[smsProcess] From:", phone, "| Body:", message);

    if (!phone || !message) {
      return new Response("OK", { status: 200 });
    }

    // STOP — opt-out compliance
    if (RE.stop.test(message)) {
      logLead(req, { phone, message, detectedIntent: "opt_out" });
      await sendSms(phone, "You've been unsubscribed. Reply START anytime to re-enable messages.");
      return new Response("OK", { status: 200 });
    }

    // YES — connect intent shortcut
    if (RE.yes.test(message)) {
      logLead(req, { phone, message, detectedIntent: "connect" });
      await sendSms(phone, `Great! Book a time here: ${BOOKING_LINK} — or reply CALL and we'll ring you.`);
      return new Response("OK", { status: 200 });
    }

    let intent = "unknown";
    let reply  = "";

    // ── Regex fast-paths ──────────────────────────────────────────────────────
    if (RE.pricing.test(message)) {
      intent = "pricing";
      reply  = `Pricing depends on call volume and setup — most businesses start around $500–$1,500/mo. Want to schedule a quick call to get an exact number?`;
    } else if (RE.missed.test(message)) {
      intent = "missed_leads";
      reply  = `MANO recovers missed calls with instant SMS, AI voice, and booking automation. Want to see it in action? ${BOOKING_LINK}`;
    } else if (RE.demo.test(message)) {
      intent = "demo";
      reply  = `Absolutely! Book a quick demo here: ${BOOKING_LINK} — takes 15 min and I'll show you exactly what MANO can do for your business.`;
    } else if (RE.schedule.test(message)) {
      intent = "schedule";
      reply  = `Here's our booking link: ${BOOKING_LINK} — pick whatever time works for you!`;
    } else if (RE.connect.test(message)) {
      intent = "connect";
      reply  = `Got it — someone from Monkee Biz AI will call you shortly. Or book now: ${BOOKING_LINK}`;
    } else if (RE.support.test(message)) {
      intent = "support";
      reply  = `Got it — our team will reach out to help. In the meantime, email us at support@monkeebizai.com.`;
    } else {
      // LLM fallback
      const ai = await classifyWithLLM(req, message);
      if (ai) {
        intent = ai.intent || "unknown";
        reply  = ai.reply  || `Hey! I'm MANO with Monkee Biz AI. Want a demo or have a question? Just reply!`;
      } else {
        intent = "unknown";
        reply  = `Hey! I'm MANO with Monkee Biz AI. Reply DEMO, PRICING, or SCHEDULE and I'll get you sorted.`;
      }
    }

    logLead(req, { phone, message, detectedIntent: intent });
    await sendSms(phone, reply);

    return new Response("OK", { status: 200 });

  } catch (error) {
    console.error("[smsProcess] ERROR:", error.message);
    return new Response("OK", { status: 200 }); // always 200 to Twilio
  }
});