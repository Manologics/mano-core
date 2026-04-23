// DEPRECATED — twilioInboundSms is no longer the active inbound SMS handler.
// All inbound SMS processing has been consolidated into twilioSmsWebhook.
// Do NOT point Twilio SMS webhooks here. Use twilioSmsWebhook instead.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const S = createClientFromRequest(req).asServiceRole;
  await S.entities.ActivityLog.create({
    lead_id: 'system',
    event: '[twilioInboundSms] DEPRECATED — request received. Redirect Twilio SMS webhook to twilioSmsWebhook.',
    created_at: new Date().toISOString(),
  }).catch(() => {});
  // Return valid TwiML so Twilio does not error
  return new Response('<?xml version="1.0"?><Response></Response>', {
    headers: { 'Content-Type': 'text/xml' },
  });
});