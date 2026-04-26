// serveVoiceAudio — streams ElevenLabs TTS audio directly as MP3
// Called by voiceProcess to generate <Play>-able audio for Twilio

const VOICE_ID = "AVIlLDn2TVmdaDycgbo3"; // Eric — ElevenLabs premium male voice
const MODEL_ID = "eleven_turbo_v2";

Deno.serve(async (req) => {
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
    console.log("[serveVoiceAudio] Served audio for:", text.substring(0, 60), "| bytes:", audioBuffer.byteLength);

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=300",
      },
    });

  } catch (error) {
    console.error("[serveVoiceAudio] ERROR:", error.message);
    return new Response("Server error", { status: 500 });
  }
});