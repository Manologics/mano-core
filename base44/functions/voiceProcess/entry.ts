Deno.serve(async (req) => {
  try {
    const body = await req.text();
    const params = new URLSearchParams(body);

    const speechResult = params.get("SpeechResult") || "";
    const callSid = params.get("CallSid") || "unknown";

    console.log(`[voiceProcess] CallSid: ${callSid}`);
    console.log(`[voiceProcess] SpeechResult: "${speechResult}"`);

    // Simple keyword-based reply for now (no full Mano memory yet)
    let reply = "Thanks for reaching out. A member of our team will follow up with you shortly.";

    const lower = speechResult.toLowerCase();
    if (lower.includes("appointment") || lower.includes("book") || lower.includes("schedule")) {
      reply = "Great! We'd love to get you scheduled. Someone will reach out within the hour to confirm your appointment.";
    } else if (lower.includes("price") || lower.includes("cost") || lower.includes("how much")) {
      reply = "We have flexible pricing based on your needs. A team member will reach out with a custom quote shortly.";
    } else if (lower.includes("cancel")) {
      reply = "No problem. We've noted your request and will update your appointment accordingly.";
    } else if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
      reply = "Hi there! Thanks for speaking with Mano. How can we help you today?";
    }

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${reply}</Say>
  <Say voice="Polly.Joanna">Have a great day!</Say>
  <Hangup/>
</Response>`;

    return new Response(twiml, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });

  } catch (error) {
    console.error("[voiceProcess] ERROR:", error.message);

    const fallback = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Sorry, we ran into an issue. Please try again later. Goodbye!</Say>
  <Hangup/>
</Response>`;

    return new Response(fallback, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }
});