import { createFileRoute, Link } from "@tanstack/react-router";
import { Wand2, Film, ArrowRight, Clock, Target } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardHome,
});

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
          Ready to create your next emotionally targeted ad?
        </p>
      </div>

      <Link
        to="/dashboard/create"
        className="group flex items-center gap-4 p-5 bg-[#c8ff00]/[0.06] border border-[#c8ff00]/20 rounded-2xl hover:bg-[#c8ff00]/[0.1] hover:border-[#c8ff00]/40 transition-all duration-200"
      >
        <div className="w-12 h-12 rounded-xl bg-[#c8ff00]/15 border border-[#c8ff00]/25 flex items-center justify-center flex-shrink-0">
          <Wand2 className="w-5 h-5 text-[#c8ff00]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold text-white">Create New Ad</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide bg-[#c8ff00]/15 text-[#c8ff00]">
              New
            </span>
          </div>
          <p className="text-xs text-white/40 leading-snug">
            Upload your media, choose a persona &amp; emotional angle, generate your video.
          </p>
        </div>
        <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-[#c8ff00] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
      </Link>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#0e0e12] border border-white/[0.06] rounded-2xl p-4 flex flex-col gap-1">
          <span className="text-2xl font-bold text-white">0</span>
          <span className="text-xs text-white/40 flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5" /> Videos created
          </span>
        </div>
        <div className="bg-[#0e0e12] border border-white/[0.06] rounded-2xl p-4 flex flex-col gap-1">
          <span className="text-2xl font-bold text-white">0</span>
          <span className="text-xs text-white/40 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5" /> Credits remaining
          </span>
        </div>
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
          <p className="text-xs text-white/20 mt-1">Your generated ads will appear here</p>
          <Link
            to="/dashboard/create"
            className="mt-4 inline-flex items-center gap-1.5 bg-[#c8ff00] text-black text-xs font-bold px-4 py-2 rounded-full hover:brightness-110 transition"
          >
            Create your first ad <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
