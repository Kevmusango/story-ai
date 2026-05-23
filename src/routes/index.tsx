import { createFileRoute, Link } from "@tanstack/react-router";
import { Play, ArrowRight, Target, Wand2, Film } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "AdEngine AI — Emotional Targeting Ad Engine" },
      {
        name: "description",
        content:
          "Turn your business photos and videos into emotionally targeted 30-second marketing videos with AI.",
      },
    ],
  }),
});

function Index() {
  return (
    <main className="bg-[#070709] text-white min-h-screen flex flex-col">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(200,255,0,0.07),transparent)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />

      <nav className="relative max-w-[1200px] mx-auto w-full px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-[#c8ff00] flex items-center justify-center">
            <Play className="w-4 h-4 text-black fill-black" />
          </span>
          <span className="font-serif font-bold text-white text-base">
            AdEngine<span className="text-[#c8ff00]"> AI</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm text-white/60 hover:text-white transition">
            Log in
          </Link>
          <Link
            to="/signup"
            className="inline-flex items-center gap-1.5 bg-[#c8ff00] text-black text-sm font-bold px-4 py-2 rounded-full hover:brightness-110 transition"
          >
            Get started <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      <section className="relative flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
        <div className="inline-flex items-center gap-2 bg-[#c8ff00]/10 border border-[#c8ff00]/20 text-[#c8ff00] text-xs font-semibold px-3 py-1.5 rounded-full mb-8 uppercase tracking-widest">
          <Target className="w-3.5 h-3.5" /> Emotional Targeting Ad Engine
        </div>

        <h1 className="font-serif font-bold text-5xl sm:text-6xl lg:text-7xl leading-[1.05] max-w-4xl mb-6">
          Turn your content into{" "}
          <span className="text-[#c8ff00] italic">persuasive</span>{" "}
          marketing videos
        </h1>

        <p className="text-white/50 text-lg max-w-xl mb-10 leading-relaxed">
          Upload your photos or videos. Choose your customer persona and emotional angle.
          Get a fully rendered 30-second vertical video — ready for TikTok, Reels, and Shorts.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 bg-[#c8ff00] text-black font-bold px-6 py-3.5 rounded-full hover:brightness-110 transition text-sm"
          >
            Start creating free <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 border border-white/15 text-white/70 hover:text-white hover:border-white/30 px-6 py-3.5 rounded-full transition text-sm"
          >
            Log in
          </Link>
        </div>
      </section>

      <section className="relative max-w-[1200px] mx-auto w-full px-6 pb-24 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Target, title: "Emotional Targeting", desc: "AI identifies customer pain points, desires, and psychology from your media." },
          { icon: Wand2, title: "5 Marketing Angles", desc: "Get multiple psychological angles — fear, savings, status, safety, convenience." },
          { icon: Film, title: "Ready-to-Post Video", desc: "30-second vertical MP4 with voiceover, captions, and motion — export instantly." },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="bg-[#0e0e12] border border-white/[0.06] rounded-2xl p-6">
            <div className="w-10 h-10 rounded-xl bg-[#c8ff00]/10 border border-[#c8ff00]/20 flex items-center justify-center mb-4">
              <Icon className="w-5 h-5 text-[#c8ff00]" />
            </div>
            <h3 className="font-semibold text-white text-sm mb-2">{title}</h3>
            <p className="text-white/40 text-xs leading-relaxed">{desc}</p>
          </div>
        ))}
      </section>

      <footer className="relative border-t border-white/[0.06] py-6 text-center text-xs text-white/20">
        © {new Date().getFullYear()} AdEngine AI. All rights reserved.
      </footer>
    </main>
  );
}
