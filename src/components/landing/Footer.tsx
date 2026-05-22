import { Play } from "lucide-react";

const cols = [
  { title: "Product", links: ["AI Studio", "Industries", "Pricing", "Templates"] },
  { title: "Company", links: ["About", "Blog", "Careers", "Press"] },
  { title: "Support", links: ["Help Center", "Contact", "Status", "Community"] },
];

const socials = ["TikTok", "Instagram", "YouTube", "Facebook"];

export function Footer() {
  return (
    <footer className="bg-[#070709] border-t border-white/5 py-14">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          <div className="col-span-2 space-y-5">
            <a href="/" className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-[#c8ff00] flex items-center justify-center">
                <Play className="w-4 h-4 text-black fill-black" />
              </span>
              <span className="font-serif font-bold text-white text-base">
                StoryLens<span className="text-[#c8ff00]"> AI</span>
              </span>
            </a>
            <p className="text-white/30 text-sm leading-relaxed max-w-sm">
              Turn real life situations into cinematic story videos people actually want to watch — built for every business.
            </p>
            <div className="flex flex-wrap gap-5 pt-2">
              {socials.map((s) => (
                <a
                  key={s}
                  href="#"
                  className="text-[10px] tracking-[0.2em] text-white/20 hover:text-white/60 uppercase"
                >
                  {s}
                </a>
              ))}
            </div>
          </div>

          {cols.map((c) => (
            <div key={c.title} className="space-y-4">
              <div className="text-[10px] tracking-[0.2em] text-white/40 uppercase">{c.title}</div>
              <ul className="space-y-3">
                {c.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-white/50 hover:text-white transition-colors">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[10px] tracking-[0.15em] text-white/25 uppercase">
            © {new Date().getFullYear()} StoryLens AI
          </div>
          <div className="text-[10px] tracking-[0.15em] text-white/25 uppercase">
            Made for storytellers everywhere.
          </div>
        </div>
      </div>
    </footer>
  );
}
