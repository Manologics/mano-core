import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const raw = await req.json();

    // Accept both { data: {...} } and flat { name, phone, ... } payloads
    const lead = raw?.data || raw || {};

    const name       = lead.name        || 'Unknown';
    const phone      = lead.phone       || 'Unknown';
    const serviceNeed= lead.service_need || 'Unknown';
    const urgency    = lead.urgency     || 'Unknown';
    const location   = lead.location    || lead.business_type || 'Unknown';
    const source     = lead.source      || 'Unknown';
    const timestamp  = new Date().toLocaleString('en-US', { timeZone: 'America/Phoenix', hour12: true });

    const body = `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#f9f9f9;border-radius:12px;">
        <h2 style="margin:0 0 20px;font-size:20px;color:#111;">🔥 New HVAC Lead</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#333;">
          <tr><td style="padding:10px 12px;background:#fff;border:1px solid #e5e5e5;font-weight:600;width:130px;">Name</td><td style="padding:10px 12px;background:#fff;border:1px solid #e5e5e5;">${name}</td></tr>
          <tr><td style="padding:10px 12px;background:#f4f4f4;border:1px solid #e5e5e5;font-weight:600;">Phone</td><td style="padding:10px 12px;background:#f4f4f4;border:1px solid #e5e5e5;">${phone}</td></tr>
          <tr><td style="padding:10px 12px;background:#fff;border:1px solid #e5e5e5;font-weight:600;">Service Need</td><td style="padding:10px 12px;background:#fff;border:1px solid #e5e5e5;">${serviceNeed}</td></tr>
          <tr><td style="padding:10px 12px;background:#f4f4f4;border:1px solid #e5e5e5;font-weight:600;">Urgency</td><td style="padding:10px 12px;background:#f4f4f4;border:1px solid #e5e5e5;">${urgency}</td></tr>
          <tr><td style="padding:10px 12px;background:#fff;border:1px solid #e5e5e5;font-weight:600;">Location</td><td style="padding:10px 12px;background:#fff;border:1px solid #e5e5e5;">${location}</td></tr>
          <tr><td style="padding:10px 12px;background:#f4f4f4;border:1px solid #e5e5e5;font-weight:600;">Source</td><td style="padding:10px 12px;background:#f4f4f4;border:1px solid #e5e5e5;">${source}</td></tr>
          <tr><td style="padding:10px 12px;background:#fff;border:1px solid #e5e5e5;font-weight:600;">Timestamp</td><td style="padding:10px 12px;background:#fff;border:1px solid #e5e5e5;">${timestamp} MST</td></tr>
        </table>
      </div>
    `;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: 'info@monkeebizznus.com',
      subject: `New HVAC Lead — ${name} (${phone})`,
      body,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('[notifyNewLead] ERROR:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});