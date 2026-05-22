export const VOICE_STYLES = {
  warm: {
    id: "warm" as const,
    label: "Warm & Friendly",
    hint: "Salons, food, lifestyle, community",
    voiceId: "EXAVITQu4vr4xnSDxMaL",
    settings: { stability: 0.55, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true },
  },
  energetic: {
    id: "energetic" as const,
    label: "Energetic & Bold",
    hint: "Promos, deals, fitness, launches",
    voiceId: "TX3LPaxmHKxFdv7VOQHJ",
    settings: { stability: 0.3, similarity_boost: 0.8, style: 0.65, use_speaker_boost: true },
  },
  calm: {
    id: "calm" as const,
    label: "Calm & Emotional",
    hint: "Real estate, storytelling, family",
    voiceId: "XrExE9yKIg1WjnnlVkGX",
    settings: { stability: 0.7, similarity_boost: 0.75, style: 0.45, use_speaker_boost: true },
  },
  premium: {
    id: "premium" as const,
    label: "Premium & Luxury",
    hint: "High-end brands, cars, property",
    voiceId: "onwK4e9ZLuTAKqWW03F9",
    settings: { stability: 0.8, similarity_boost: 0.7, style: 0.15, use_speaker_boost: true },
  },
} as const;

export type VoiceStyleId = keyof typeof VOICE_STYLES;
