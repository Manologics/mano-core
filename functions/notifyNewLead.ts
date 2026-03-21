import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { event, data } = body;

    if (!data) {
      return Response.json({ error: 'No lead data provided' }, { status: 400 });
    }

    const leadDetails = `
      <h2>🎉 New Lead Submitted!</h2>
      <table style="border-collapse: collapse; width: 100%; max-width: 600px; font-family: Arial, sans-serif;">
        <tr style="background-color: #f8f9fa;">
          <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Name</td>
          <td style="padding: 12px; border: 1px solid #dee2e6;">${data.full_name || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Email</td>
          <td style="padding: 12px; border: 1px solid #dee2e6;">${data.email || 'N/A'}</td>
        </tr>
        <tr style="background-color: #f8f9fa;">
          <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Phone</td>
          <td style="padding: 12px; border: 1px solid #dee2e6;">${data.phone || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Company</td>
          <td style="padding: 12px; border: 1px solid #dee2e6;">${data.company || 'N/A'}</td>
        </tr>
        <tr style="background-color: #f8f9fa;">
          <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Source</td>
          <td style="padding: 12px; border: 1px solid #dee2e6;">${(data.source || 'N/A').replace(/_/g, ' ')}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Message</td>
          <td style="padding: 12px; border: 1px solid #dee2e6;">${data.message || 'No message provided'}</td>
        </tr>
        <tr style="background-color: #f8f9fa;">
          <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Submitted At</td>
          <td style="padding: 12px; border: 1px solid #dee2e6;">${data.created_date ? new Date(data.created_date).toLocaleString() : new Date().toLocaleString()}</td>
        </tr>
      </table>
    `;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: 'info@monkeebizznus.com',
      subject: `New Lead: ${data.full_name} - ${data.company || 'No Company'}`,
      body: leadDetails,
    });

    return Response.json({ success: true, message: 'Notification email sent' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});