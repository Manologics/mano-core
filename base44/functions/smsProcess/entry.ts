// smsProcess — inbound SMS handler for MANO
// Multi-turn aware: uses LLM with persona for all non-compliance messages.
// Regex fast-paths for compliance (STOP) and strong-signal intents.
// For everything else (small talk, questions, objections) → LLM with MANO persona.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const FROM_NUMBER  = Deno.env.get("TWILIO_NUMBER");
const ACCOUNT_SID  = Deno.env.get("TWILIO_ACCOUNT_SID");
const AUTH_TOKEN   = Deno.env.get("TWILIO_AUTH_TOKEN");
const BOOKING_LINK = "https://calendly.com/monkeebizai";

const FALLBACK_REPLY = "Got it! What service do you need help with?";

const MANO_SMS_PROMPT = `You are a friendly AI assistant for a home service contractor. Your job is to recover missed calls by qualifying the customer and booking them in.

QUALIFICATION FLOW — ask these in order, one at a time, based on what's already been answered:
1. What service do you need? (e.g. plumbing, AC, electrical, roofing)
2. Is this urgent or can it wait?
3. What city are you in?
4. Would you like to book a time?

Once they say yes to booking OR have answered questions 1–3, send the booking link: ${BOOKING_LINK}

RULES:
- 1–2 short sentences per reply. SMS-friendly. No bullet points. No lists.
- Ask only ONE question at a time. Never stack questions.
- Be warm, helpful, and human-sounding — like a friendly dispatcher.
- If the customer gives service type + urgency in one message, skip to city or booking.
- Never send the booking link until service type and urgency are known.
- Never reveal you are an AI or mention internal tools/systems.
- If they say "yes", "ready", "let's go", or similar — send the booking link immediately.

EXAMPLES:
- "AC is out" → "Oh no, is this urgent or can it wait a bit?"
- "urgent" → "Got it. What city are you in?"
- "Phoenix" → "Perfect — you can book a time here: ${BOOKING_LINK}"
- "just looking" → "No problem! When you're ready, what service do you need?"
- "how much?" → "Pricing depends on the job — what service do you need help with?"`;

// ── Regex — compliance only ──────────────────────────────────────────────────
const RE_STOP = /^\s*(stop|unsubscribe|cancel|quit|end)\s*$/i;
const RE_YES  = /^\s*(yes|yeah|yep|sure|ok|okay|let'?s? go|do it|connect me|i'm in)\s*$/i;

// ── Send SMS ─────────────────────────────────────────────────────────────────
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
  const data = await res.json();
  if (!res.ok || data.error_code) {
    console.error("[smsProcess] SMS failed:", data.error_code, data.error_message);
  }
  return data;
}

// ── LLM reply with MANO persona ───────────────────────────────────────────────
async function getManoReply(req, message, recentHistory) {
  const t0 = Date.now();
  console.log(`[smsProcess] ai_started_at:${new Date().toISOString()}`);
  try {
    const base44 = createClientFromRequest(req);

    // Build short history string (last 6 turns max for SMS)
    const historyText = recentHistory.slice(-6)
      .map(m => `${m.role === "user" ? "Customer" : "MANO"}: ${m.content}`)
      .join("\n");

    const prompt = historyText
      ? `${MANO_SMS_PROMPT}\n\nRecent conversation:\n${historyText}\n\nCustomer: ${message}\nMANO:`
      : `${MANO_SMS_PROMPT}\n\nCustomer: ${message}\nMANO:`;

    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });

    let reply = typeof llmResponse === "string" ? llmResponse.trim() : "";
    if (reply.startsWith("MANO:")) reply = reply.slice(5).trim();

    console.log(`[smsProcess] ai_completed_at:${new Date().toISOString()} ms:${Date.now()-t0}`);
    return reply || null;
  } catch (e) {
    console.error(`[smsProcess] LLM failed after ${Date.now()-t0}ms:`, e.message);
    return null;
  }
}

// ── Fire-and-forget lead log ──────────────────────────────────────────────────
function logLead(req, { phone, message, reply }) {
  (async () => {
    try {
      const base44    = createClientFromRequest(req);
      const timestamp = new Date().toISOString();
      const note      = `[${timestamp}] In: ${message} | Out: ${reply}`;

      const existing = await base44.asServiceRole.entities.Lead.filter({ phone });
      const match    = existing[0] || null;

      // Extract structured data from conversation for cleaner lead records
      const serviceMatch = message.match(/\b(plumb|ac|hvac|electric|roof|heat|cool|drain|leak|pipe|panel|furnace|water heater|pest|handyman|clean)\w*/i);
      const urgencyMatch = message.match(/\b(urgent|emergency|asap|today|tonight|now|can.?t wait|soon|few days|next week|no rush|whenever)\b/i);

      if (match) {
        await base44.asServiceRole.entities.Lead.update(match.id, {
          last_message: message,
          service_need: serviceMatch ? serviceMatch[0] : (match.service_need || message),
          urgency:      urgencyMatch ? (urgencyMatch[0].match(/urgent|emergency|asap|today|tonight|now|can.?t wait/) ? 'high' : 'medium') : match.urgency,
          notes: `${match.notes || ""}\n${note}`.slice(-4000),
        });
      } else {
        await base44.asServiceRole.entities.Lead.create({
          name:         `Missed Call — ${phone}`,
          phone,
          source:       "missed_call_sms",
          service_need: serviceMatch ? serviceMatch[0] : message,
          urgency:      urgencyMatch ? (urgencyMatch[0].match(/urgent|emergency|asap|today|tonight|now|can.?t wait/) ? 'high' : 'medium') : 'medium',
          status:       "New",
          score:        "PENDING",
          notes:        `[Missed Call SMS] Time: ${timestamp}\n${note}`,
          last_message: message,
        });
      }
    } catch (e) {
      console.error("[smsProcess] logLead failed:", e.message);
    }
  })();
}

// ── Load recent SMS history for a phone number ────────────────────────────────
async function loadHistory(req, phone) {
  try {
    const base44   = createClientFromRequest(req);
    const existing = await base44.asServiceRole.entities.Lead.filter({ phone });
    const lead     = existing[0];
    if (!lead || !lead.notes) return [];

    // Parse history from notes: "[timestamp] In: ... | Out: ..."
    const lines = lead.notes.split("\n").filter(l => l.includes("| Out:"));
    const history = [];
    for (const line of lines.slice(-6)) {
      const inMatch  = line.match(/In: (.+?) \| Out:/);
      const outMatch = line.match(/\| Out: (.+)$/);
      if (inMatch && outMatch) {
        history.push({ role: "user",      content: inMatch[1].trim() });
        history.push({ role: "assistant", content: outMatch[1].trim() });
      }
    }
    return history;
  } catch {
    return [];
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const t0 = Date.now();
  console.log(`[smsProcess] webhook_received_at:${new Date(t0).toISOString()}`);

  try {
    const body    = await req.text();
    const params  = new URLSearchParams(body);
    const phone   = params.get("From") || "";
    const message = (params.get("Body") || "").trim();

    console.log(`[smsProcess] From:${phone} Body:"${message.slice(0, 100)}"`);

    if (!phone || !message) return new Response("OK", { status: 200 });

    // ── STOP — compliance, always handle first ────────────────────────────────
    if (RE_STOP.test(message)) {
      logLead(req, { phone, message, reply: "[opt-out]" });
      await sendSms(phone, "You've been unsubscribed. Reply START anytime to re-enable messages.");
      return new Response("OK", { status: 200 });
    }

    // ── YES shortcut — customer is ready to book ──────────────────────────────
    if (RE_YES.test(message)) {
      const reply = `Great! You can book a time right here: ${BOOKING_LINK}`;
      logLead(req, { phone, message, reply });
      await sendSms(phone, reply);
      return new Response("OK", { status: 200 });
    }

    // ── Load recent history (fire-and-forget safe: runs before LLM) ──────────
    const history = await loadHistory(req, phone);

    // ── LLM reply with MANO persona (handles all intents + small talk) ────────
    let reply = await getManoReply(req, message, history);

    if (!reply) {
      reply = FALLBACK_REPLY;
      console.warn(`[smsProcess] Using fallback reply for ${phone}`);
    }

    // Log and send
    logLead(req, { phone, message, reply });
    await sendSms(phone, reply);

    console.log(`[smsProcess] reply_sent total_ms:${Date.now()-t0}`);
    return new Response("OK", { status: 200 });

  } catch (error) {
    console.error(`[smsProcess] ERROR after ${Date.now()-t0}ms:`, error.message);
    return new Response("OK", { status: 200 }); // always 200 to Twilio
  }
});