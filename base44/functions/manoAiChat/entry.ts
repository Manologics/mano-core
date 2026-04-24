import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    console.log('[manoAiChat] Request received');
    
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    console.log('[manoAiChat] User authenticated:', user?.email);
    
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { message, history } = await req.json();
    console.log('[manoAiChat] Message received:', message.substring(0, 50));
    console.log('[manoAiChat] History length:', history?.length || 0);
    
    if (!message) return Response.json({ error: 'message required' }, { status: 400 });

    const systemPrompt = `You are Mano, the AI assistant for Monkee Bizz AI. You're helpful, friendly, and straightforward. Answer questions, provide insights, and help with whatever the user asks about.`;

    console.log('[manoAiChat] Calling InvokeLLM...');
    const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `${systemPrompt}\n\nConversation history:\n${(history || []).slice(-6).map(m => `${m.role}: ${m.content}`).join('\n')}\n\nUser: ${message}`,
    });

    console.log('[manoAiChat] Response received, length:', response?.length || 0);
    console.log('[manoAiChat] Response type:', typeof response);
    
    return Response.json({ reply: response });
  } catch (error) {
    console.error('[manoAiChat] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});