import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { generateStoryScript } from "@/lib/groq";
import { generateVoiceover, type VoiceStyleId } from "@/lib/elevenlabs";
import { fetchStockClips, type StockClip } from "@/lib/pexels";
import { createEditTimings } from "@/lib/edit-timing";

const Schema = z.object({
  userId: z.string(),
  businessType: z.string(),
  goal: z.string(),
  platform: z.string(),
  duration: z.number(),
  businessName: z.string().default(""),
  websiteUrl: z.string().default(""),
  voiceStyle: z.enum(["warm", "energetic", "calm", "premium"]).default("warm"),
});

export type QuickGenerateInput = z.infer<typeof Schema>;

export interface QuickGenerateResult {
  videoId: string;
  script: string;
  opening_line: string;
  archetype: string;
  tone: string;
  stockClips: StockClip[];
  voiceoverUrl: string;
  voiceoverError: string;
}

export const generateQuickStory = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Schema.parse(data))
  .handler(async ({ data }): Promise<QuickGenerateResult> => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: videoRecord, error: insertError } = await supabase
      .from("videos")
      .insert({
        user_id: data.userId,
        mode: "quick" as const,
        platform: data.platform as any,
        status: "generating" as const,
        duration_seconds: data.duration,
      })
      .select()
      .single();

    if (insertError || !videoRecord) {
      throw new Error(`DB insert failed: ${insertError?.message}`);
    }

    const videoId: string = videoRecord.id;

    try {
      const storyScript = await generateStoryScript({
        businessType: data.businessType,
        goal: data.goal,
        platform: data.platform,
        duration: data.duration,
        businessName: data.businessName,
        websiteUrl: data.websiteUrl,
      });

      // Clips per duration: 15s→3, 30s→4, 60s→6
      const clipCount = data.duration <= 15 ? 3 : data.duration <= 30 ? 4 : 6;
      // Each clip must be at least as long as its slot (minus 1s tolerance)
      const minClipSecs = Math.max(4, Math.floor(data.duration / clipCount) - 1);

      let voiceoverError = "";
      const [stockClips, audioResult] = await Promise.all([
        fetchStockClips(storyScript.visual_prompts, data.platform, clipCount, minClipSecs),
        generateVoiceover(storyScript.script, data.voiceStyle as VoiceStyleId).catch((err: Error) => {
          voiceoverError = err.message;
          console.error("[ElevenLabs] Voiceover failed:", err.message);
          return null;
        }),
      ]);

      let voiceoverUrl = "";

      if (audioResult) {
        const audioPath = `voiceovers/${videoId}.mp3`;
        try {
          await supabase.storage.createBucket("videos", { public: true });
        } catch {
        }
        const { error: uploadError } = await supabase.storage
          .from("videos")
          .upload(audioPath, audioResult, {
            contentType: "audio/mpeg",
            upsert: true,
          });
        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from("videos")
            .getPublicUrl(audioPath);
          voiceoverUrl = urlData.publicUrl;
        }
      }

      const stockUrls = stockClips.map((c) => c.videoUrl);
      const thumbnailUrl = stockClips[0]?.thumbnailUrl ?? null;
      const editTimings = createEditTimings(storyScript.script, data.duration * 30, stockUrls.length);

      await supabase
        .from("videos")
        .update({
          script_text: storyScript.script,
          opening_line: storyScript.opening_line,
          archetype_used: storyScript.archetype,
          tone_used: storyScript.tone,
          stock_urls: stockUrls,
          asset_urls: { editTimings },
          output_url: voiceoverUrl || null,
          thumbnail_url: thumbnailUrl,
          status: "complete" as const,
        })
        .eq("id", videoId);

      return {
        videoId,
        script: storyScript.script,
        opening_line: storyScript.opening_line,
        archetype: storyScript.archetype,
        tone: storyScript.tone,
        stockClips,
        voiceoverUrl,
        voiceoverError,
      };
    } catch (err) {
      await supabase
        .from("videos")
        .update({ status: "failed" as const })
        .eq("id", videoId);
      const raw = err instanceof Error ? err.message : String(err);
      console.error("[generate-quick] Fatal:", raw);
      // Never expose supplier names, API keys, or internal service details
      const safe = /api[_ ]?key|pexels|elevenlabs|groq|supabase|process\.env/i.test(raw)
        ? "Video generation failed. Please try again."
        : raw;
      throw new Error(safe);
    }
  });
