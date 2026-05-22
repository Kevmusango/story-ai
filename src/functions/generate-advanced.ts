import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { generateStoryFromConversation } from "@/lib/groq";
import { generateVoiceover, type VoiceStyleId } from "@/lib/elevenlabs";
import { fetchStockClips } from "@/lib/pexels";
import { createEditTimings } from "@/lib/edit-timing";

const Schema = z.object({
  userId: z.string(),
  conversationText: z.string(),
  platform: z.string(),
  duration: z.number(),
  voiceStyle: z.enum(["warm", "energetic", "calm", "premium"]).default("warm"),
  userMediaUrls: z.array(z.string()).default([]),
});

export const generateAdvancedStory = createServerFn()
  .inputValidator(Schema)
  .handler(async ({ data }) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: videoRow, error: insertError } = await supabase
      .from("videos")
      .insert({
        user_id: data.userId,
        status: "generating" as const,
        mode: "advanced" as const,
        platform: data.platform as any,
        duration_seconds: data.duration,
      })
      .select("id")
      .single();

    if (insertError || !videoRow) {
      throw new Error(`Failed to create video record: ${insertError?.message ?? "unknown"}`);
    }

    const videoId = videoRow.id;

    try {
      const storyScript = await generateStoryFromConversation(
        data.conversationText,
        data.platform,
        data.duration
      );

      const clipCount = data.duration <= 30 ? 4 : 6;
      const minClipSecs = Math.max(4, Math.floor(data.duration / clipCount) - 1);

      // If user uploaded their own media, use it. Fill remaining slots with Pexels.
      const userMedia = data.userMediaUrls ?? [];
      const pexelsNeeded = Math.max(0, clipCount - userMedia.length);

      let voiceoverError = "";
      const [stockClips, audioResult] = await Promise.all([
        pexelsNeeded > 0
          ? fetchStockClips(storyScript.visual_prompts, data.platform, pexelsNeeded, minClipSecs)
          : Promise.resolve([]),
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
        } catch {}
        const { error: uploadError } = await supabase.storage
          .from("videos")
          .upload(audioPath, audioResult, { contentType: "audio/mpeg", upsert: true });
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("videos").getPublicUrl(audioPath);
          voiceoverUrl = urlData.publicUrl;
        }
      }

      // User media goes first (their actual content), Pexels fills the rest
      const stockUrls = [...userMedia, ...stockClips.map((c) => c.videoUrl)];
      const thumbnailUrl = userMedia[0] ?? stockClips[0]?.thumbnailUrl ?? null;
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
          status: "complete",
        })
        .eq("id", videoId);

      return {
        videoId,
        script: storyScript.script,
        opening_line: storyScript.opening_line,
        voiceoverUrl,
        stockUrls,
        voiceoverError,
      };
    } catch (err) {
      await supabase.from("videos").update({ status: "failed" }).eq("id", videoId);
      const raw = err instanceof Error ? err.message : String(err);
      console.error("[generate-advanced] Fatal:", raw);
      // Never expose supplier names, API keys, or internal service details
      const safe = /api[_ ]?key|pexels|elevenlabs|groq|supabase|process\.env/i.test(raw)
        ? "Video generation failed. Please try again."
        : raw;
      throw new Error(safe);
    }
  });
