import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Film, Loader2, Zap, Play, AlertCircle, Clock, RotateCcw, Download, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/dashboard/videos")({
  component: MyVideos,
});

interface VideoRow {
  id: string;
  opening_line: string | null;
  script_text: string | null;
  status: string | null;
  mode: string | null;
  platform: string | null;
  duration_seconds: number | null;
  thumbnail_url: string | null;
  output_url: string | null;
  final_video_url: string | null;
  render_status: string | null;
  stock_urls: unknown;
  created_at: string | null;
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  complete:   { label: "Ready",      className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  generating: { label: "Generating", className: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  pending:    { label: "Pending",    className: "bg-white/10 text-white/40 border-white/10" },
  failed:     { label: "Failed",     className: "bg-red-500/15 text-red-400 border-red-500/20" },
};

const MODE_COLOR: Record<string, string> = {
  quick:    "#c8ff00",
  advanced: "#a78bfa",
  upload:   "#38bdf8",
};

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function VideoCard({ video, onDelete }: { video: VideoRow; onDelete: (id: string) => void }) {
  const badge = STATUS_BADGE[video.status ?? ""] ?? STATUS_BADGE.pending;
  const modeColor = MODE_COLOR[video.mode ?? ""] ?? "#fff";
  const isClickable = video.status === "complete";
  const [downloading, setDownloading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    setDeleting(true);
    await supabase.from("videos").delete().eq("id", video.id);
    onDelete(video.id);
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const clips = Array.isArray(video.stock_urls) ? (video.stock_urls as string[]) : [];
    const url = video.final_video_url || clips[0];
    if (!url) return;
    setDownloading(true);
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${video.opening_line?.slice(0, 40).replace(/[^a-z0-9]/gi, "-") ?? "story"}.mp4`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      // silently fail
    } finally {
      setDownloading(false);
    }
  };

  const inner = (
    <div className={`group bg-[#0e0e12] border rounded-2xl overflow-hidden transition-all ${
      isClickable
        ? "border-white/[0.07] hover:border-white/20 cursor-pointer"
        : "border-white/[0.04] opacity-70"
    }`}>
      {/* Thumbnail */}
      <div className="relative aspect-video bg-[#111116] overflow-hidden">
        {video.thumbnail_url ? (
          <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="w-8 h-8 text-white/10" />
          </div>
        )}
        {/* Overlay on hover */}
        {isClickable && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
              <Play className="w-4 h-4 text-white ml-0.5" />
            </div>
          </div>
        )}
        {/* Generating spinner */}
        {video.status === "generating" && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
          </div>
        )}
        {/* Failed icon */}
        {video.status === "failed" && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-400" />
          </div>
        )}
        {/* Mode dot */}
        <div
          className="absolute top-2 left-2 w-2 h-2 rounded-full"
          style={{ backgroundColor: modeColor }}
          title={video.mode ?? ""}
        />
        {/* Duration badge */}
        {video.duration_seconds && (
          <span className="absolute bottom-2 right-2 text-[10px] bg-black/60 text-white/70 px-1.5 py-0.5 rounded font-mono">
            {video.duration_seconds}s
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-xs font-semibold text-white leading-snug line-clamp-2 mb-2">
          {video.opening_line ?? video.script_text?.slice(0, 60) ?? "Untitled story"}
        </p>
        <div className="flex items-center justify-between gap-1.5">
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${badge.className}`}>
            {badge.label}
          </span>
          <div className="flex items-center gap-1">
            {isClickable && (
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="w-6 h-6 rounded-lg bg-white/[0.06] hover:bg-white/10 flex items-center justify-center transition text-white/40 hover:text-white disabled:opacity-30"
                title={video.final_video_url ? "Download MP4" : "Final MP4 not exported yet"}
              >
                {downloading
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <Download className="w-3 h-3" />}
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={deleting}
              className={`h-6 rounded-lg flex items-center justify-center transition disabled:opacity-30 ${
                confirmDelete
                  ? "px-2 bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] font-semibold gap-1"
                  : "w-6 bg-white/[0.06] hover:bg-red-500/15 text-white/30 hover:text-red-400"
              }`}
              title={confirmDelete ? "Click again to confirm" : "Delete"}
            >
              {deleting
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : confirmDelete
                  ? <><Trash2 className="w-3 h-3" /> Delete?</>
                  : <Trash2 className="w-3 h-3" />}
            </button>
            <div className="flex items-center gap-0.5 text-[10px] text-white/25">
              <Clock className="w-3 h-3" />
              {relativeTime(video.created_at)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (isClickable) {
    return (
      <Link to="/dashboard/result/$videoId" params={{ videoId: video.id }}>
        {inner}
      </Link>
    );
  }
  return <div>{inner}</div>;
}

function MyVideos() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const fetchVideos = async () => {
    if (!user) {
      setVideos([]);
      setLoading(false);
      setLoadError("You are not signed in.");
      return;
    }
    setLoading(true);
    setLoadError("");
    const { data, error } = await supabase
      .from("videos")
      .select("id,opening_line,script_text,status,mode,platform,duration_seconds,thumbnail_url,output_url,final_video_url,render_status,stock_urls,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      setVideos([]);
      setLoadError(error.message);
      setLoading(false);
      return;
    }
    setVideos((data as VideoRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchVideos();
  }, [user]);

  const handleDelete = (id: string) => setVideos((prev) => prev.filter((v) => v.id !== id));

  const complete  = videos.filter((v) => v.status === "complete");
  const inProgress = videos.filter((v) => v.status === "generating" || v.status === "pending");
  const failed    = videos.filter((v) => v.status === "failed");

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif font-bold text-2xl text-white">My Videos</h1>
          <p className="text-white/40 text-sm mt-1">
            {loading ? "Loading..." : `${videos.length} stor${videos.length === 1 ? "y" : "ies"}`}
          </p>
        </div>
        <button
          onClick={fetchVideos}
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition px-3 py-2 rounded-lg border border-white/[0.06] hover:border-white/20"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-white/20 animate-spin" />
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
          <AlertCircle className="w-7 h-7 text-red-400 mb-3" />
          <p className="text-sm font-medium text-red-300 mb-1">Could not load videos</p>
          <p className="text-xs text-red-300/70 max-w-md mb-4">{loadError}</p>
          <p className="text-[11px] text-white/25 font-mono break-all max-w-md">User: {user?.id ?? "not signed in"}</p>
        </div>
      ) : videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 bg-[#0e0e12] border border-white/[0.06] rounded-2xl text-center">
          <div className="w-14 h-14 rounded-full bg-white/[0.04] flex items-center justify-center mb-4">
            <Film className="w-6 h-6 text-white/20" />
          </div>
          <p className="text-sm font-medium text-white/50 mb-1">No videos yet</p>
          <p className="text-xs text-white/25 max-w-xs mb-5">
            Create your first story using Quick Mode, Advanced Mode, or Upload Mode.
          </p>
          <div className="flex gap-2">
            <Link
              to="/dashboard/quick"
              className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl bg-[#c8ff00]/10 border border-[#c8ff00]/20 text-[#c8ff00] hover:bg-[#c8ff00]/15 transition"
            >
              <Zap className="w-3.5 h-3.5" /> Quick Mode
            </Link>
            <Link
              to="/dashboard/advanced"
              className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl bg-[#a78bfa]/10 border border-[#a78bfa]/20 text-[#a78bfa] hover:bg-[#a78bfa]/15 transition"
            >
              <Zap className="w-3.5 h-3.5" /> Advanced
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {inProgress.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-[0.15em] text-amber-400/60 font-semibold mb-3">In Progress</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {inProgress.map((v) => <VideoCard key={v.id} video={v} onDelete={handleDelete} />)}
              </div>
            </div>
          )}

          {complete.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-[0.15em] text-white/30 font-semibold mb-3">Ready</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {complete.map((v) => <VideoCard key={v.id} video={v} onDelete={handleDelete} />)}
              </div>
            </div>
          )}

          {failed.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-[0.15em] text-red-400/60 font-semibold mb-3">Failed</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {failed.map((v) => <VideoCard key={v.id} video={v} onDelete={handleDelete} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
