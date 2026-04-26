// twilioInboundVoice — greeting using ElevenLabs TTS via serveVoiceAudio
const BASE_URL = "https://mano-app-8159dde8.base44.app";

const GREETING = "Hey, this is Mano with Monkee Biz AI. How can I help you today?";
const FALLBACK = "I didn't catch that. Please call back and we will be happy to help. Goodbye!";

Deno.serve(async (_req) => {
  const encoded = encodeURIComponent(GREETING);
  const fallbackEncoded = encodeURIComponent(FALLBACK);

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${BASE_URL}/functions/serveVoiceAudio?text=${encoded}</Play>
  <Gather input="speech" action="${BASE_URL}/functions/voiceProcess" method="POST" speechTimeout="3" timeout="10" language="en-US">
  </Gather>
  <Play>${BASE_URL}/functions/serveVoiceAudio?text=${fallbackEncoded}</Play>
  <Hangup/>
</Response>`;

  return new Response(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
});