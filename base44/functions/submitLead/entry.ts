import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const S = base44.asServiceRole;

    const body = await req.json();
    const { name, phone, email, business_type, service_need, urgency, budget, timeline } = body;

    if (!name || !email || !phone) {
      return Response.json({ error: 'Name, email, and phone are required.' }, { status: 400 });
    }

    const token = Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();

    const lead = await S.entities.Lead.create({
      name,
      phone,
      email,
      business_type: business_type || null,
      service_need: service_need || null,
      urgency: urgency || 'medium',
      budget: budget || null,
      timeline: timeline || null,
      status: 'New',
      score: 'PENDING',
      submission_token: token,
      processing_mode: 'internal',
      webhook_status: 'none',
    });

    await S.entities.ActivityLog.create({
      lead_id: lead.id,
      event: `Lead submitted via public form — token: ${token}`,
      created_at: new Date().toISOString(),
    }).catch(() => {});

    return Response.json({ success: true, lead_id: lead.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});