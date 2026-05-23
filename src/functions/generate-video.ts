import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { generateVoiceover, type VoiceStyleId } from "@/lib/elevenlabs";
import type { AngleOutput } from "./analyze-media";

export const generateVideo = createServerFn()
  .inputValidator(
    z.object({
      generationId: z.string().uuid(),
      selectedAngleId: z.string(),
      voiceStyle: z.enum(["warm", "energetic", "calm", "premium"]).default("warm"),
      videoFormat: z.enum(["portrait", "landscape", "square"]).default("portrait"),
      useOriginalAudio: z.boolean().default(false),
      durationSeconds: z.number().int().min(10).max(60).default(30),
    })
  )
  .handler(async ({ data: { generationId, selectedAngleId, voiceStyle, videoFormat, useOriginalAudio, durationSeconds } }) => {
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch generation + project
    const { data: generation, error: genErr } = await supabase
      .from("generations")
      .select("*, projects(*)")
      .eq("id", generationId)
      .single();

    if (genErr || !generation) throw new Error("Generation not found");

    const angles = (generation.angles as unknown as AngleOutput[]) ?? [];
    const angle = angles.find((a) => a.id === selectedAngleId);
    if (!angle) throw new Error(`Angle "${selectedAngleId}" not found in generation`);

    const fullScript = [angle.hook, angle.body, angle.cta].filter(Boolean).join(" ");

    // Mark generation as generating
    await supabase
      .from("generations")
      .update({
        selected_angle_id: selectedAngleId,
        script: fullScript,
        hook: angle.hook,
        cta: angle.cta,
        voice_style: voiceStyle,
        status: "generating",
      })
      .eq("id", generationId);

    // Generate voiceover via ElevenLabs (skip if using original audio)
    let voiceoverUrl: string | null = null;
    if (!useOriginalAudio) try {
      const audioBuffer = await generateVoiceover(fullScript, voiceStyle as VoiceStyleId);
      const audioPath = `${generation.user_id}/voiceovers/${generationId}.mp3`;
      const { error: uploadErr } = await supabase.storage
        .from("media")
        .upload(audioPath, audioBuffer, { contentType: "audio/mpeg", upsert: true });

      if (!uploadErr) {
        const { data: { publicUrl } } = supabase.storage
          .from("media")
          .getPublicUrl(audioPath);
        voiceoverUrl = publicUrl;
        await supabase
          .from("generations")
          .update({ voiceover_url: voiceoverUrl })
          .eq("id", generationId);
      }
    } catch (err) {
      console.error("Voiceover generation failed:", err);
    }

    // Fetch uploads for render-worker
    const { data: uploads } = await supabase
      .from("uploads")
      .select("file_url, file_type, sort_order")
      .eq("project_id", generation.project_id)
      .order("sort_order");

    const clipUrls = (uploads ?? []).map((u) => u.file_url);

    // Create videos record
    const { data: video, error: videoErr } = await supabase
      .from("videos")
      .insert({
        generation_id: generationId,
        project_id: generation.project_id,
        user_id: generation.user_id,
        render_status: "pending",
      })
      .select()
      .single();

    if (videoErr || !video) throw new Error("Failed to create video record");

    // Dispatch render-worker (non-blocking — don't fail wizard if worker is down)
    const renderServiceUrl = process.env.RENDER_SERVICE_URL;
    if (renderServiceUrl) {
      fetch(`${renderServiceUrl}/render`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_id: video.id,
          user_id: generation.user_id,
          clip_urls: clipUrls,
          voiceover_url: voiceoverUrl,
          script_text: fullScript,
          bucket: "media",
          format: videoFormat,
          use_original_audio: useOriginalAudio,
          duration_seconds: durationSeconds,
        }),
      }).catch(() => {
        // Fire-and-forget — render-worker handles its own status updates
      });
    }

    await supabase
      .from("generations")
      .update({ status: "complete" })
      .eq("id", generationId);

    return { videoId: video.id };
  });
