import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { message, history } = await req.json();
    if (!message) return Response.json({ error: 'message required' }, { status: 400 });

    const S = base44.asServiceRole;

    // Gather context
    const [leads, bookings, followups] = await Promise.all([
      S.entities.Lead.list('-created_date', 50),
      S.entities.Booking.list('-created_date', 20),
      S.entities.FollowUp.list('-created_date', 30),
    ]);

    const hot = leads.filter(l => l.score === 'HOT').length;
    const warm = leads.filter(l => l.score === 'WARM').length;
    const cold = leads.filter(l => l.score === 'COLD').length;
    const booked = bookings.filter(b => b.status === 'Confirmed' || b.status === 'Requested').length;
    const recentLeads = leads.slice(0, 10).map(l => `${l.name} (${l.score || 'PENDING'}, ${l.status || 'New'})`).join(', ');

    const systemPrompt = `You are Mano, the AI operations assistant for Monkee Bizz AI — a SAOS (Sales Automation Operating System) for HVAC contractors.

You have access to live system context:
- Total Leads: ${leads.length} (HOT: ${hot}, WARM: ${warm}, COLD: ${cold})
- Active Bookings: ${booked}
- Recent Leads: ${recentLeads}

You help the admin understand lead status, pipeline health, what actions to take, who to follow up with, booking performance, and system operations. Be concise, direct, and tactical. Use the data above to give specific, actionable answers. You speak like a sharp ops manager, not a chatbot.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(history || []).slice(-10),
      { role: 'user', content: message },
    ];

    const response = await S.integrations.Core.InvokeLLM({
      prompt: `${systemPrompt}\n\nConversation history:\n${(history || []).slice(-6).map(m => `${m.role}: ${m.content}`).join('\n')}\n\nUser: ${message}`,
    });

    return Response.json({ reply: response });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});