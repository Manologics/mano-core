import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    console.log('[manoAiChat] ====== REQUEST START ======');
    
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    console.log('[manoAiChat] User:', user?.email);
    
    if (!user) {
      console.log('[manoAiChat] No user, returning 401');
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const message = body.message;
    const history = body.history || [];
    
    console.log('[manoAiChat] Message:', message);
    console.log('[manoAiChat] History length:', history.length);
    
    if (!message || !message.trim()) {
      console.log('[manoAiChat] Empty message, returning 400');
      return Response.json({ success: false, error: 'Message required' }, { status: 400 });
    }

    const systemPrompt = `You are Mano, an AI Revenue Operator for service businesses like HVAC, plumbing, and contractors. Help explain how MANO helps capture missed leads, respond instantly, qualify customers, and book jobs. Be conversational and friendly.`;

    const prompt = `${systemPrompt}\n\nUser: ${message}`;
    
    console.log('[manoAiChat] Calling InvokeLLM...');
    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: prompt,
    });

    console.log('[manoAiChat] LLM Response type:', typeof llmResponse);
    console.log('[manoAiChat] LLM Response:', llmResponse ? llmResponse.substring(0, 100) : 'null');
    
    const replyText = llmResponse ? String(llmResponse).trim() : '';
    
    if (!replyText) {
      console.log('[manoAiChat] Empty LLM response');
      return Response.json({ success: false, error: 'Empty response from AI' }, { status: 500 });
    }

    console.log('[manoAiChat] Returning success response');
    return Response.json({ success: true, reply: replyText });
    
  } catch (error) {
    console.error('[manoAiChat] ERROR:', error);
    console.error('[manoAiChat] Error message:', error.message);
    return Response.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
});