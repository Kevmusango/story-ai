import { createFileRoute, Link } from "@tanstack/react-router";
import { Zap, MessageSquare, Upload, ArrowRight, Film, Clock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardHome,
});

const MODES = [
  {
    icon: Zap,
    label: "Quick Mode",
    description: "Generate instantly from stock media. No content needed.",
    to: "/dashboard/quick",
    accent: "#c8ff00",
    tag: "Fastest",
  },
  {
    icon: MessageSquare,
    label: "Advanced Mode",
    description: "Chat with AI for a richer, more personal story.",
    to: "/dashboard/advanced",
    accent: "#a78bfa",
    tag: "Most Personal",
  },
  {
    icon: Upload,
    label: "Upload Mode",
    description: "Use your own photos and videos for authentic content.",
    to: "/dashboard/upload",
    accent: "#38bdf8",
    tag: "Best Quality",
  },
] as const;

function DashboardHome() {
  const { displayName } = useAuth();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-white/40 mb-1">{greeting}</p>
        <h1 className="font-serif font-bold text-2xl sm:text-3xl text-white leading-tight">
          {displayName}
        </h1>
        <p className="text-white/50 text-sm mt-1">
          Your AI story studio is ready. What are we creating today?
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {MODES.map(({ icon: Icon, label, description, to, accent, tag }) => (
          <Link
            key={to}
            to={to as string}
            className="group flex items-center gap-4 p-4 sm:p-5 bg-[#0e0e12] border border-white/[0.06] rounded-2xl hover:border-white/[0.12] hover:bg-[#111116] transition-all duration-200"
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${accent}18`, border: `1px solid ${accent}25` }}
            >
              <Icon className="w-5 h-5" style={{ color: accent }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-semibold text-white">{label}</span>
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide"
                  style={{ backgroundColor: `${accent}18`, color: accent }}
                >
                  {tag}
                </span>
              </div>
              <p className="text-xs text-white/40 leading-snug">{description}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
          </Link>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Film className="w-4 h-4 text-white/40" />
            Recent Videos
          </h2>
          <Link
            to="/dashboard/videos"
            className="text-[11px] text-white/40 hover:text-[#c8ff00] transition flex items-center gap-1"
          >
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="flex flex-col items-center justify-center py-12 px-4 bg-[#0e0e12] border border-white/[0.06] rounded-2xl text-center">
          <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center mb-3">
            <Clock className="w-5 h-5 text-white/20" />
          </div>
          <p className="text-sm text-white/40">No videos yet</p>
          <p className="text-xs text-white/20 mt-1">Your generated stories will appear here</p>
        </div>
      </div>
    </div>
  );
}
