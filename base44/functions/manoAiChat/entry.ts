import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const message = body.message;
    const history = body.history || [];

    if (!message || !message.trim()) {
      return Response.json({ success: false, error: "Message required" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    const systemPrompt = `You are Mano, an AI Revenue Operator for service businesses like HVAC, plumbing, and contractors. Help explain how MANO helps capture missed leads, respond instantly, qualify customers, and book jobs. Be conversational and friendly.`;

    const historyText = history.map(m => `${m.role === "user" ? "User" : "Mano"}: ${m.content}`).join("\n");
    const prompt = `${systemPrompt}\n\nConversation history:\n${historyText}\n\nUser: ${message}`;

    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });

    const reply = typeof llmResponse === "string" ? llmResponse.trim() : "";

    if (!reply) {
      return Response.json({ success: false, error: "Empty response from AI" }, { status: 500 });
    }

    return Response.json({ success: true, reply });

  } catch (error) {
    console.error("[manoAiChat] ERROR:", error.message);
    return Response.json({ success: false, error: error.message || "Server error" }, { status: 500 });
  }
});