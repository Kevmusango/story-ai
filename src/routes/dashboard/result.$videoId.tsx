import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Player } from "@remotion/player";
import { supabase } from "@/integrations/supabase/client";
import { StoryComposition } from "@/components/video/StoryComposition";
import { exportVideo } from "@/functions/export-video";
import { useAuth } from "@/hooks/use-auth";
import {
  Download, Share2, RotateCcw, ChevronRight, Loader2, Quote,
} from "lucide-react";

export const Route = createFileRoute("/dashboard/result/$videoId")({
  component: ResultPage,
});

interface VideoRecord {
  id: string;
  script_text: string | null;
  opening_line: string | null;
  archetype_used: string | null;
  tone_used: string | null;
  stock_urls: unknown;
  asset_urls: unknown;
  output_url: string | null;
  final_video_url: string | null;
  render_status: string | null;
  platform: string | null;
  duration_seconds: number | null;
}

const FPS = 30;

const PLATFORM_DIMS: Record<string, { w: number; h: number }> = {
  tiktok:            { w: 1080, h: 1920 },
  instagram_reels:   { w: 1080, h: 1920 },
  youtube_shorts:    { w: 1080, h: 1920 },
  facebook_reels:    { w: 1080, h: 1920 },
  instagram_square:  { w: 1080, h: 1080 },
  youtube:           { w: 1920, h: 1080 },
  facebook:          { w: 1920, h: 1080 },
};

function splitToCaptions(script: string, wordsPerLine = 3): string[] {
  const words = script.trim().split(/\s+/);
  const lines: string[] = [];
  for (let i = 0; i < words.length; i += wordsPerLine) {
    lines.push(words.slice(i, i + wordsPerLine).join(" "));
  }
  return lines.filter(Boolean);
}

function ResultPage() {
  const { videoId } = Route.useParams();
  const { user } = useAuth();
  const [video, setVideo] = useState<VideoRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState("");
  const [audioDuration, setAudioDuration] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      setError("You are not signed in.");
      setLoading(false);
      return;
    }
    supabase
      .from("videos")
      .select("id,script_text,opening_line,archetype_used,tone_used,stock_urls,asset_urls,output_url,final_video_url,render_status,platform,duration_seconds")
      .eq("id", videoId)
      .eq("user_id", user.id)
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) setError(err?.message ?? "Story not found.");
        else setVideo(data as VideoRecord);
        setLoading(false);
      });
  }, [videoId, user]);

  // Detect exact voiceover duration so composition ends exactly when narration ends
  useEffect(() => {
    const url = video?.output_url;
    if (!url) return;
    const a = new Audio();
    const handler = () => {
      if (isFinite(a.duration)) setAudioDuration(a.duration);
    };
    a.addEventListener("loadedmetadata", handler);
    a.src = url;
    a.load();
    return () => { a.removeEventListener("loadedmetadata", handler); a.src = ""; };
  }, [video?.output_url]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <p className="text-white/40 text-sm mb-4">{error}</p>
        <Link to="/dashboard/quick" className="text-[#c8ff00] text-sm hover:underline">
          Create a new story
        </Link>
      </div>
    );
  }

  const stockUrls = (Array.isArray(video.stock_urls) ? video.stock_urls : []) as string[];
  const captionLines = splitToCaptions(video.script_text ?? "", 3);
  const editTimings =
    video.asset_urls &&
    typeof video.asset_urls === "object" &&
    "editTimings" in video.asset_urls &&
    Array.isArray((video.asset_urls as { editTimings?: unknown }).editTimings)
      ? ((video.asset_urls as { editTimings: { startFrame: number; durationFrames: number }[] }).editTimings)
      : undefined;

  // Use actual voiceover duration when available — composition ends exactly when narration ends.
  // If no voiceover, fall back to user-selected duration.
  const hasVoiceover = !!video.output_url;
  const durationSecs = hasVoiceover
    ? (audioDuration ?? null)          // null = still loading metadata
    : (video.duration_seconds ?? 30);

  // Don't render the player until we know the exact duration
  const playerReady = !hasVoiceover || durationSecs !== null;
  const platform = video.platform ?? "tiktok";
  const dims = PLATFORM_DIMS[platform] ?? PLATFORM_DIMS.tiktok;
  const isPortrait = dims.h > dims.w;

  const playerStyle: React.CSSProperties = isPortrait
    ? { width: "100%", maxWidth: 300, aspectRatio: `${dims.w}/${dims.h}`, borderRadius: 16, overflow: "hidden" }
    : { width: "100%", aspectRatio: `${dims.w}/${dims.h}`, borderRadius: 16, overflow: "hidden" };

  const downloadFile = async (url: string) => {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `${video.opening_line?.slice(0, 40).replace(/[^a-z0-9]/gi, "-") ?? "story"}.mp4`;
    a.click();
    URL.revokeObjectURL(blobUrl);
  };

  const handleExport = async () => {
    if (!user) return;
    setExporting(true);
    setExportMessage("");
    try {
      if (video.final_video_url) {
        await downloadFile(video.final_video_url);
        return;
      }
      const result = await exportVideo({ data: { videoId: video.id, userId: user.id } });
      if (result.finalVideoUrl) {
        setVideo((prev) => prev ? { ...prev, final_video_url: result.finalVideoUrl, render_status: "complete" } : prev);
        await downloadFile(result.finalVideoUrl);
      } else {
        setVideo((prev) => prev ? { ...prev, render_status: "queued" } : prev);
        setExportMessage("Export queued. Refresh in a moment to download the final MP4.");
      }
    } catch (err) {
      setExportMessage(err instanceof Error ? err.message : "Video export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.15em] text-[#c8ff00]/70 font-semibold">Story Ready</p>
          <h1 className="font-serif font-bold text-xl text-white leading-tight">
            {video.opening_line ?? "Your Story"}
          </h1>
        </div>
        <Link
          to="/dashboard/quick"
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition"
        >
          <RotateCcw className="w-3.5 h-3.5" /> New
        </Link>
      </div>

      {!video.output_url && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 flex items-start gap-3">
          <span className="text-amber-400 text-base mt-0.5">⚠</span>
          <div>
            <p className="text-sm font-semibold text-amber-300">No audio generated</p>
            <p className="text-xs text-amber-400/70 mt-0.5">
              Check that <code className="font-mono bg-white/10 px-1 rounded">ELEVENLABS_API_KEY</code> is set in your <code className="font-mono bg-white/10 px-1 rounded">.env</code> file, then regenerate.
            </p>
          </div>
        </div>
      )}

      {stockUrls.length > 0 && (
        <div className={`flex ${isPortrait ? "justify-center" : ""}`}>
          <div style={playerStyle}>
            {playerReady && durationSecs !== null ? (
              <Player
                component={StoryComposition}
                inputProps={{
                  stockClips: stockUrls,
                  voiceoverUrl: video.output_url ?? "",
                  captionLines,
                  script: video.script_text ?? "",
                  platform: video.platform ?? "tiktok",
                  tone: video.tone_used ?? undefined,
                  editTimings,
                }}
                durationInFrames={Math.max(1, Math.round(FPS * durationSecs))}
                compositionWidth={dims.w}
                compositionHeight={dims.h}
                fps={FPS}
                style={{ width: "100%", height: "100%" }}
                controls
                loop
              />
            ) : (
              <div className="w-full h-full bg-[#0a0a0e] flex items-center justify-center rounded-2xl">
                <Loader2 className="w-6 h-6 text-white/20 animate-spin" />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-[#0e0e12] border border-white/[0.06] rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-[11px] text-white/30 uppercase tracking-wider font-semibold">
          <Quote className="w-3.5 h-3.5" /> Script
        </div>
        <p className="text-sm text-white/80 leading-relaxed">{video.script_text}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          {video.archetype_used && (
            <span className="text-[10px] font-medium px-2 py-1 bg-[#c8ff00]/10 text-[#c8ff00]/70 rounded-full border border-[#c8ff00]/15">
              {video.archetype_used}
            </span>
          )}
          {video.tone_used && (
            <span className="text-[10px] font-medium px-2 py-1 bg-white/[0.05] text-white/40 rounded-full border border-white/[0.07] capitalize">
              {video.tone_used}
            </span>
          )}
          {video.platform && (
            <span className="text-[10px] font-medium px-2 py-1 bg-white/[0.05] text-white/40 rounded-full border border-white/[0.07] capitalize">
              {video.platform.replace(/_/g, " ")}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex-1 flex items-center justify-center gap-2 border border-white/[0.08] text-white/70 hover:text-white hover:border-white/20 text-xs font-medium py-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          {video.final_video_url ? "Download MP4" : video.render_status === "queued" ? "Export Queued" : "Export MP4"}
        </button>
        <button
          disabled
          className="flex-1 flex items-center justify-center gap-2 border border-white/[0.08] text-white/30 text-xs font-medium py-3 rounded-xl cursor-not-allowed"
        >
          <Share2 className="w-3.5 h-3.5" /> Share
        </button>
      </div>

      {exportMessage && (
        <p className="text-xs text-white/40 text-center">{exportMessage}</p>
      )}

      <Link
        to="/dashboard/quick"
        className="flex items-center justify-center gap-2 w-full bg-[#c8ff00]/10 border border-[#c8ff00]/20 text-[#c8ff00] text-sm font-semibold py-3.5 rounded-xl hover:bg-[#c8ff00]/15 transition"
      >
        Create another story <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
