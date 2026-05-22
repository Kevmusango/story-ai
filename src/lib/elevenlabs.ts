import { VOICE_STYLES, type VoiceStyleId } from "@/lib/voice-styles";
export { VOICE_STYLES, type VoiceStyleId } from "@/lib/voice-styles";

export async function generateVoiceover(
  script: string,
  styleId: VoiceStyleId = "warm"
): Promise<ArrayBuffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set");

  const style = VOICE_STYLES[styleId];

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${style.voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: script,
        model_id: "eleven_multilingual_v2",
        voice_settings: style.settings,
      }),
    }
  );

  if (!res.ok) {
    let friendlyMessage = "Audio generation failed.";
    try {
      const errJson = await res.json() as any;
      const detail = errJson?.detail;
      if (detail?.code === "quota_exceeded") {
        friendlyMessage = "ElevenLabs quota exceeded. Please check your plan.";
      } else if (res.status === 401) {
        friendlyMessage = "ElevenLabs API key is invalid.";
      } else if (detail?.message) {
        friendlyMessage = detail.message;
      }
    } catch {
      // ignore parse failure, use generic message
    }
    throw new Error(friendlyMessage);
  }

  return res.arrayBuffer();
}
