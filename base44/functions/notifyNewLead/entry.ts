import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { data } = body;

    if (!data) {
      return Response.json({ error: 'No lead data provided' }, { status: 400 });
    }

    const source = data.source || "monkee";
    const adminTo = source === "vendorfy" ? "info@vendorfyai.com" : source === "surplus" ? "info@surplussyndicatestore.com" : "info@monkeebizai.com";
    const brandName = source === "vendorfy" ? "VENDORFY AI" : source === "surplus" ? "SURPLUS SYNDICATE" : "MONKEE BIZZ AI";

    const urgencyLabel = {
      low: '🟢 Low — Just exploring',
      medium: '🟡 Medium — Ready in weeks',
      high: '🔴 High — Needs ASAP',
    };

    const emailBody = `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0a0a0a; border-radius: 16px; padding: 32px; color: #fff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="font-size: 32px; margin-bottom: 8px;">🐒</div>
            <div style="font-family: monospace; font-size: 11px; color: #00ff88; letter-spacing: 3px;">${brandName} — NEW LEAD SUBMITTED</div>
          </div>

          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 14px; border-bottom: 1px solid #1a1a1a; font-family: monospace; font-size: 10px; color: #555; letter-spacing: 2px; width: 140px;">NAME</td>
              <td style="padding: 14px; border-bottom: 1px solid #1a1a1a; color: #ddd; font-size: 14px;">${data.name || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 14px; border-bottom: 1px solid #1a1a1a; font-family: monospace; font-size: 10px; color: #555; letter-spacing: 2px;">EMAIL</td>
              <td style="padding: 14px; border-bottom: 1px solid #1a1a1a; color: #ddd; font-size: 14px;">
                <a href="mailto:${data.email}" style="color: #00ff88; text-decoration: none;">${data.email || 'N/A'}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 14px; border-bottom: 1px solid #1a1a1a; font-family: monospace; font-size: 10px; color: #555; letter-spacing: 2px;">PHONE</td>
              <td style="padding: 14px; border-bottom: 1px solid #1a1a1a; color: #ddd; font-size: 14px;">
                <a href="tel:${data.phone}" style="color: #00ff88; text-decoration: none;">${data.phone || 'N/A'}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 14px; border-bottom: 1px solid #1a1a1a; font-family: monospace; font-size: 10px; color: #555; letter-spacing: 2px;">BUSINESS TYPE</td>
              <td style="padding: 14px; border-bottom: 1px solid #1a1a1a; color: #ddd; font-size: 14px;">${data.business_type || 'Not specified'}</td>
            </tr>
            <tr>
              <td style="padding: 14px; border-bottom: 1px solid #1a1a1a; font-family: monospace; font-size: 10px; color: #555; letter-spacing: 2px;">SERVICE NEED</td>
              <td style="padding: 14px; border-bottom: 1px solid #1a1a1a; color: #ddd; font-size: 14px;">${data.service_need || 'Not specified'}</td>
            </tr>
            <tr>
              <td style="padding: 14px; font-family: monospace; font-size: 10px; color: #555; letter-spacing: 2px;">URGENCY</td>
              <td style="padding: 14px; color: #ddd; font-size: 14px;">${urgencyLabel[data.urgency] || data.urgency || 'Medium'}</td>
            </tr>
          </table>

          <div style="margin-top: 24px; padding: 16px; background: #111; border: 1px solid #1a1a1a; border-radius: 10px; text-align: center;">
            <div style="font-family: monospace; font-size: 10px; color: #333; letter-spacing: 1px;">
              SUBMITTED ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} EST
            </div>
          </div>
        </div>
      </div>
    `;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: adminTo,
      subject: `🐒 New Lead [${brandName}]: ${data.name} — ${data.business_type || 'General Inquiry'}`,
      body: emailBody,
    });

    return Response.json({ success: true, message: 'Notification email sent' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});