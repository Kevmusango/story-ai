import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const retryRender = createServerFn()
  .inputValidator(z.object({ videoId: z.string().uuid() }))
  .handler(async ({ data: { videoId } }) => {
    const renderServiceUrl = process.env.RENDER_SERVICE_URL;
    if (!renderServiceUrl) throw new Error("Render service not configured");

    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch video + generation + uploads
    const { data: video } = await supabase
      .from("videos")
      .select("*, generations(script, hook, cta, voiceover_url, project_id, user_id)")
      .eq("id", videoId)
      .single();

    if (!video) throw new Error("Video not found");

    const gen = video.generations as {
      script: string | null; hook: string | null; cta: string | null;
      voiceover_url: string | null; project_id: string; user_id: string;
    } | null;

    const { data: uploads } = await supabase
      .from("uploads")
      .select("file_url")
      .eq("project_id", gen?.project_id ?? "")
      .order("sort_order");

    const clipUrls = (uploads ?? []).map((u) => u.file_url);
    const script = [gen?.hook, gen?.script ?? gen?.cta].filter(Boolean).join(" ");

    // Reset status
    await supabase
      .from("videos")
      .update({ render_status: "pending", render_error: null })
      .eq("id", videoId);

    // Dispatch
    await fetch(`${renderServiceUrl}/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        video_id: videoId,
        user_id: video.user_id,
        clip_urls: clipUrls,
        voiceover_url: gen?.voiceover_url ?? null,
        script_text: script,
        bucket: "media",
      }),
    });

    return { ok: true };
  });
