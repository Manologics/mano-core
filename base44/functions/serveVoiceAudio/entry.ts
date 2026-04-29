// serveVoiceAudio — streams ElevenLabs TTS audio directly as MP3
// Called by voiceProcess to generate <Play>-able audio for Twilio
// LATENCY: Common/short phrases are cached at Twilio edge for 24h (max-age=86400)
//          so ElevenLabs is only called ONCE per unique phrase — after that it's instant.

const VOICE_ID = "AVIlLDn2TVmdaDycgbo3"; // Eric — ElevenLabs premium male voice
const MODEL_ID = "eleven_turbo_v2";

// Common hardcoded lines — these get long cache TTL so Twilio never re-fetches
const COMMON_LINES = new Set([
  "got it.",
  "yeah, i can help.",
  "good question.",
  "one sec.",
  "what's going on with the ac?",
  "is this urgent or can it wait?",
  "what city are you in?",
  "and your name and best callback number?",
  "perfect, let me get you booked in.",
  "let me connect you now. one moment.",
  "i can help with that. what service do you need?",
]);

Deno.serve(async (req) => {
  const t0 = Date.now();
  try {
    const url = new URL(req.url);
    const text = url.searchParams.get("text");

    if (!text || !text.trim()) {
      return new Response("Missing text parameter", { status: 400 });
    }

    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!apiKey) {
      return new Response("ElevenLabs API key not configured", { status: 500 });
    }

    const isCommon = COMMON_LINES.has(text.trim().toLowerCase());
    // Long cache for common lines (24h), short for dynamic LLM replies (5min)
    const cacheMaxAge = isCommon ? 86400 : 300;

    console.log(`[serveVoiceAudio] elevenlabs_start_at:${new Date().toISOString()} text:"${text.slice(0,60)}" common:${isCommon}`);

    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify({
        text: text.trim(),
        model_id: MODEL_ID,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[serveVoiceAudio] ElevenLabs error:", res.status, err);
      return new Response("ElevenLabs error", { status: 502 });
    }

    const audioBuffer = await res.arrayBuffer();
    const elMs = Date.now() - t0;
    console.log(`[serveVoiceAudio] elevenlabs_end_at:${new Date().toISOString()} elevenlabs_ms:${elMs} bytes:${audioBuffer.byteLength} text:"${text.substring(0, 60)}"`);

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": `public, max-age=${cacheMaxAge}`,
      },
    });

  } catch (error) {
    console.error("[serveVoiceAudio] ERROR:", error.message);
    return new Response("Server error", { status: 500 });
  }
});