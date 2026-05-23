import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import {
  Film, Wand2, Loader2, Download, RefreshCw, Clock, CheckCircle2, AlertCircle, RotateCcw, Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { EMOTIONAL_ANGLES } from "@/lib/targeting";
import { retryRender } from "@/functions/retry-render";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/videos")({
  component: MyVideos,
});

// ─── Types ────────────────────────────────────────────────────

interface VideoRow {
  id: string;
  video_url: string | null;
  render_status: string;
  render_error: string | null;
  rendered_at: string | null;
  created_at: string;
  generations: {
    selected_angle_id: string | null;
    angles: { id: string; headline: string; hook: string }[] | null;
    script: string | null;
    hook: string | null;
    voice_style: string;
  } | null;
  projects: {
    business_type: string | null;
    persona: string | null;
    content_goal: string | null;
  } | null;
}

// ─── Helpers ──────────────────────────────────────────────────

const STATUS = {
  pending:   { label: "Queued",    color: "text-white/40",   bg: "bg-white/[0.06]",       icon: Clock },
  rendering: { label: "Rendering", color: "text-amber-400",  bg: "bg-amber-500/10",        icon: Loader2 },
  complete:  { label: "Ready",     color: "text-[#c8ff00]",  bg: "bg-[#c8ff00]/10",        icon: CheckCircle2 },
  failed:    { label: "Failed",    color: "text-red-400",    bg: "bg-red-500/10",          icon: AlertCircle },
} as const;

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Video Card ───────────────────────────────────────────────

function VideoCard({ video, onRetry, onDelete }: { video: VideoRow; onRetry: () => void; onDelete: () => void }) {
  const status = STATUS[video.render_status as keyof typeof STATUS] ?? STATUS.pending;
  const StatusIcon = status.icon;

  const selectedAngle = video.generations?.angles?.find(
    (a) => a.id === video.generations?.selected_angle_id
  );
  const angleMeta = EMOTIONAL_ANGLES.find((a) => a.id === selectedAngle?.id);

  const headline = selectedAngle?.headline ?? video.generations?.hook ?? "Ad script";
  const businessType = video.projects?.business_type ?? "Business";

  const [retrying, setRetrying] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Delete this video? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await supabase.from("videos").delete().eq("id", video.id);
      toast.success("Video deleted");
      onDelete();
    } catch {
      toast.error("Failed to delete video");
      setDeleting(false);
    }
  };

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await retryRender({ data: { videoId: video.id } });
      toast.success("Render queued — check back in ~60 seconds");
      onRetry();
    } catch (err) {
      toast.error("Could not reach render service. Is it deployed?");
    } finally {
      setRetrying(false);
    }
  };

  const handleDownload = async () => {
    if (!video.video_url) return;
    const res = await fetch(video.video_url);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${headline.slice(0, 40).replace(/[^a-z0-9]/gi, "-")}.mp4`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[#0e0e12] border border-white/[0.07] rounded-2xl overflow-hidden hover:border-white/15 transition-all">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
        <div className="flex items-center gap-2">
          {angleMeta && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
              style={{ backgroundColor: `${angleMeta.color}18`, color: angleMeta.color }}
            >
              {angleMeta.emoji} {angleMeta.label}
            </span>
          )}
          <span className="text-xs text-white/30">{businessType}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
            <StatusIcon className={`w-3 h-3 ${video.render_status === "rendering" ? "animate-spin" : ""}`} />
            {status.label}
          </span>
          <span className="text-[10px] text-white/25">{timeAgo(video.created_at)}</span>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition disabled:opacity-40"
            title="Delete video"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        <p className="text-sm font-semibold text-white leading-snug mb-1">{headline}</p>
        {video.generations?.hook && (
          <p className="text-xs text-white/40 line-clamp-2 leading-relaxed">{video.generations.hook}</p>
        )}
      </div>

      {/* Video player (when ready) */}
      {video.render_status === "complete" && video.video_url && (
        <div className="px-4 pb-3">
          <video
            src={video.video_url}
            controls
            className="w-full rounded-xl bg-black aspect-video"
          />
        </div>
      )}

      {/* Pending/rendering message */}
      {(video.render_status === "pending" || video.render_status === "rendering") && (() => {
        const minutesOld = (Date.now() - new Date(video.created_at).getTime()) / 60000;
        const isStuck = video.render_status === "rendering" && minutesOld > 10;
        return (
        <div className="px-4 pb-4 space-y-2">
          <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 ${isStuck ? "bg-amber-500/[0.08]" : "bg-white/[0.03]"}`}>
            {isStuck
              ? <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              : <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin flex-shrink-0" />}
            <p className="text-xs text-white/40">
              {isStuck
                ? "Render is taking unusually long. The worker may have timed out — click Retry."
                : "Your video is being rendered. Page updates automatically."}
            </p>
          </div>
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-white/30 hover:text-white/60 py-1.5 rounded-xl border border-white/[0.05] hover:border-white/15 transition disabled:opacity-40"
          >
            <RotateCcw className={`w-3 h-3 ${retrying ? "animate-spin" : ""}`} />
            {retrying ? "Retrying..." : "Retry render"}
          </button>
        </div>
        );
      })()}

      {/* Failed message */}
      {video.render_status === "failed" && (
        <div className="px-4 pb-4 space-y-2">
          <div className="flex items-center gap-2 bg-red-500/[0.06] rounded-xl px-3 py-2.5">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-400/70">Render failed.</p>
          </div>
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-white/40 hover:text-white/70 py-2 rounded-xl border border-white/[0.07] hover:border-white/20 transition disabled:opacity-40"
          >
            <RotateCcw className={`w-3 h-3 ${retrying ? "animate-spin" : ""}`} />
            {retrying ? "Retrying..." : "Retry render"}
          </button>
        </div>
      )}

      {/* Footer actions */}
      {video.render_status === "complete" && video.video_url && (
        <div className="px-4 pb-4">
          <button
            onClick={handleDownload}
            className="w-full flex items-center justify-center gap-1.5 bg-[#c8ff00]/10 hover:bg-[#c8ff00]/15 border border-[#c8ff00]/20 text-[#c8ff00] text-xs font-semibold py-2 rounded-xl transition"
          >
            <Download className="w-3.5 h-3.5" /> Download MP4
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────

function MyVideos() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVideos = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("videos")
      .select(`
        id, video_url, render_status, render_error, rendered_at, created_at,
        generations ( selected_angle_id, angles, script, hook, voice_style ),
        projects ( business_type, persona, content_goal )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    setVideos((data as unknown as VideoRow[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // Auto-refresh every 8s if any videos are still rendering
  useEffect(() => {
    const hasActive = videos.some(
      (v) => v.render_status === "pending" || v.render_status === "rendering"
    );
    if (!hasActive) return;
    const t = setInterval(fetchVideos, 8000);
    return () => clearInterval(t);
  }, [videos, fetchVideos]);

  return (
    <div className="w-full flex justify-center px-4 py-6">
      <div className="w-full max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif font-bold text-2xl text-white">My Videos</h1>
            <p className="text-white/40 text-sm mt-1">
              {loading ? "Loading..." : `${videos.length} video${videos.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <button
            onClick={fetchVideos}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white px-3 py-2 rounded-lg border border-white/[0.06] hover:border-white/20 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-5 h-5 text-white/20 animate-spin" />
          </div>
        ) : videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 bg-[#0e0e12] border border-white/[0.06] rounded-2xl text-center">
            <div className="w-14 h-14 rounded-full bg-white/[0.04] flex items-center justify-center mb-4">
              <Film className="w-6 h-6 text-white/20" />
            </div>
            <p className="text-sm font-medium text-white/50 mb-1">No videos yet</p>
            <p className="text-xs text-white/25 max-w-xs mb-5">
              Upload your business media, choose a persona and emotional angle, and generate your first ad.
            </p>
            <Link
              to="/dashboard/create"
              className="inline-flex items-center gap-1.5 bg-[#c8ff00] text-black text-xs font-bold px-4 py-2.5 rounded-full hover:brightness-110 transition"
            >
              <Wand2 className="w-3.5 h-3.5" /> Create your first ad
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {videos.map((v) => <VideoCard key={v.id} video={v} onRetry={fetchVideos} onDelete={fetchVideos} />)}
          </div>
        )}
      </div>
    </div>
  );
}
