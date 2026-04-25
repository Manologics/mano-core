// voiceProcess — AI-powered speech intent handler
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BASE_URL = Deno.env.get("BASE_URL") || "";
const FORWARD_NUMBER = "+16232822252";

function gatherAgain(prompt) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${prompt}</Say>
  <Gather input="speech" action="${BASE_URL}/functions/voiceProcess" method="POST" speechTimeout="3" timeout="10" language="en-US">
  </Gather>
  <Say voice="Polly.Joanna">I didn't catch that. Let me connect you with someone who can help.</Say>
  <Dial>${FORWARD_NUMBER}</Dial>
</Response>`;
}

function forwardNow(prompt) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${prompt}</Say>
  <Dial>${FORWARD_NUMBER}</Dial>
</Response>`;
}

function sayAndHangup(prompt) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${prompt}</Say>
  <Hangup/>
</Response>`;
}

Deno.serve(async (req) => {
  try {
    const body = await req.text();
    const params = new URLSearchParams(body);
    const speechResult = params.get("SpeechResult") || "";
    const callerPhone = params.get("From") || "unknown";
    const callSid = params.get("CallSid") || "unknown";

    console.log(`[voiceProcess] CallSid: ${callSid}`);
    console.log(`[voiceProcess] From: ${callerPhone}`);
    console.log(`[voiceProcess] Speech: "${speechResult}"`);

    if (!speechResult.trim()) {
      return new Response(forwardNow("I didn't catch anything. Let me connect you with someone now."), {
        status: 200,
        headers: { "Content-Type": "text/xml; charset=utf-8" },
      });
    }

    // Use AI to classify intent and generate a response
    const base44 = createClientFromRequest(req);

    const prompt = `You are Mano, a friendly AI voice assistant for Monkee Biz AI — a service that helps HVAC, plumbing, and contractor businesses capture missed calls, respond to leads instantly, and book jobs automatically.

A caller just said: "${speechResult}"

Classify their intent into ONE of these categories:
- demo: they want to see the product, learn more, or request a demonstration
- support: they are an existing customer needing help
- lead_question: they have a question about missed leads, lead capture, or how the service works
- connect_human: they explicitly want to speak to a person
- unclear: you cannot determine intent

Then write a short, conversational, human-like response (2-3 sentences max) appropriate for a phone call.

Rules:
- If intent is "demo": confirm you'll have someone follow up, ask for their name if not given
- If intent is "support" or "connect_human": say you're connecting them now
- If intent is "lead_question": briefly explain the service, then offer a demo
- If intent is "unclear": ask one clarifying follow-up question

Respond ONLY with valid JSON in this exact format:
{
  "intent": "demo|support|lead_question|connect_human|unclear",
  "response": "your spoken response here",
  "forward_to_human": true or false
}`;

    const aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          intent: { type: "string" },
          response: { type: "string" },
          forward_to_human: { type: "boolean" },
        },
        required: ["intent", "response", "forward_to_human"],
      },
    });

    const intent = aiResult?.intent || "unclear";
    const spokenResponse = aiResult?.response || "Let me connect you with someone who can help.";
    const forwardToHuman = aiResult?.forward_to_human || false;

    console.log(`[voiceProcess] Intent: ${intent}, Forward: ${forwardToHuman}`);

    // Log demo requests as leads
    if (intent === "demo") {
      try {
        await base44.asServiceRole.entities.Lead.create({
          name: "Voice Demo Request",
          phone: callerPhone,
          source: "inbound_voice",
          service_need: `Demo request via voice: "${speechResult}"`,
          status: "Action Required",
          score: "WARM",
          notes: `Inbound call demo request. Speech: "${speechResult}"`,
        });
        console.log(`[voiceProcess] Demo lead created for ${callerPhone}`);
      } catch (e) {
        console.error(`[voiceProcess] Failed to create lead: ${e.message}`);
      }
    }

    // Forward to human if needed
    if (forwardToHuman || intent === "support" || intent === "connect_human") {
      return new Response(forwardNow(spokenResponse), {
        status: 200,
        headers: { "Content-Type": "text/xml; charset=utf-8" },
      });
    }

    // For demo confirmed / lead explained — wrap up with hangup
    if (intent === "demo" && !spokenResponse.toLowerCase().includes("name")) {
      return new Response(sayAndHangup(spokenResponse), {
        status: 200,
        headers: { "Content-Type": "text/xml; charset=utf-8" },
      });
    }

    // For unclear or lead_question — gather again for follow-up
    return new Response(gatherAgain(spokenResponse), {
      status: 200,
      headers: { "Content-Type": "text/xml; charset=utf-8" },
    });

  } catch (error) {
    console.error("[voiceProcess] ERROR:", error.message);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna">Sorry, I ran into an issue. Let me connect you with someone now.</Say><Dial>+16232822252</Dial></Response>`,
      { status: 200, headers: { "Content-Type": "text/xml; charset=utf-8" } }
    );
  }
});