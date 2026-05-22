import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const Schema = z.object({
  videoId: z.string(),
  userId: z.string(),
});

export interface ExportVideoResult {
  status: "ready" | "queued";
  finalVideoUrl: string;
}

export const exportVideo = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Schema.parse(data))
  .handler(async ({ data }): Promise<ExportVideoResult> => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: video, error } = await supabase
      .from("videos")
      .select("id,user_id,script_text,opening_line,tone_used,stock_urls,asset_urls,output_url,platform,duration_seconds,final_video_url,render_status")
      .eq("id", data.videoId)
      .eq("user_id", data.userId)
      .single();

    if (error || !video) {
      throw new Error("Video not found.");
    }

    if (video.final_video_url) {
      return { status: "ready", finalVideoUrl: video.final_video_url };
    }

    const renderServiceUrl = process.env.RENDER_SERVICE_URL;
    if (!renderServiceUrl) {
      await supabase
        .from("videos")
        .update({
          render_status: "not_configured",
          render_error: "Video export is not configured yet.",
        })
        .eq("id", data.videoId)
        .eq("user_id", data.userId);
      throw new Error("Video export is not configured yet.");
    }

    await supabase
      .from("videos")
      .update({ render_status: "queued", render_error: null })
      .eq("id", data.videoId)
      .eq("user_id", data.userId);

    const endpoint = renderServiceUrl.endsWith("/render")
      ? renderServiceUrl
      : `${renderServiceUrl.replace(/\/$/, "")}/render`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        videoId: video.id,
        userId: video.user_id,
        scriptText: video.script_text,
        openingLine: video.opening_line,
        tone: video.tone_used,
        stockUrls: video.stock_urls,
        assetUrls: video.asset_urls,
        voiceoverUrl: video.output_url,
        platform: video.platform,
        durationSeconds: video.duration_seconds,
      }),
    });

    if (!res.ok) {
      await supabase
        .from("videos")
        .update({
          render_status: "failed",
          render_error: "Video export failed. Please try again.",
        })
        .eq("id", data.videoId)
        .eq("user_id", data.userId);
      throw new Error("Video export failed. Please try again.");
    }

    let finalVideoUrl = "";
    try {
      const json = (await res.json()) as { finalVideoUrl?: string };
      finalVideoUrl = json.finalVideoUrl ?? "";
    } catch {
      finalVideoUrl = "";
    }

    if (finalVideoUrl) {
      await supabase
        .from("videos")
        .update({
          final_video_url: finalVideoUrl,
          render_status: "complete",
          render_error: null,
          rendered_at: new Date().toISOString(),
        })
        .eq("id", data.videoId)
        .eq("user_id", data.userId);
      return { status: "ready", finalVideoUrl };
    }

    return { status: "queued", finalVideoUrl: "" };
  });
