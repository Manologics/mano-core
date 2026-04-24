import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { message, history } = await req.json();
    if (!message) return Response.json({ error: 'message required' }, { status: 400 });

    const systemPrompt = `You are Mano, the AI assistant for Monkee Bizz AI. You're helpful, friendly, and straightforward. Answer questions, provide insights, and help with whatever the user asks about.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(history || []).slice(-10),
      { role: 'user', content: message },
    ];

    const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `${systemPrompt}\n\nConversation history:\n${(history || []).slice(-6).map(m => `${m.role}: ${m.content}`).join('\n')}\n\nUser: ${message}`,
    });

    return Response.json({ reply: response });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});