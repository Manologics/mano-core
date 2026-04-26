// generateVoiceAudio — converts text to speech using ElevenLabs API
// Voice: Eric (premium male), Model: eleven_turbo_v2

const VOICE_ID = "cjVigY5qzO58G2mP4cmz"; // Eric — ElevenLabs premium male voice
const MODEL_ID = "eleven_turbo_v2";

Deno.serve(async (req) => {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== "string" || !text.trim()) {
      return Response.json({ success: false, error: "text is required" }, { status: 400 });
    }

    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!apiKey) {
      return Response.json({ success: false, error: "ElevenLabs API key not configured" }, { status: 500 });
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
      console.error("[generateVoiceAudio] ElevenLabs error:", err);
      return Response.json({ success: false, error: `ElevenLabs API error: ${res.status}` }, { status: 500 });
    }

    const audioBuffer = await res.arrayBuffer();
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));

    console.log("[generateVoiceAudio] Audio generated, size:", audioBuffer.byteLength, "bytes");

    return Response.json({
      success: true,
      audio_base64: base64Audio,
      content_type: "audio/mpeg",
    });

  } catch (error) {
    console.error("[generateVoiceAudio] ERROR:", error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});