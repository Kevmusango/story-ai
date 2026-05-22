import { motion } from "motion/react";
import { ArrowRight, Circle, Play } from "lucide-react";
import { Ticker } from "./Ticker";

const grid = [
  { n: "02", tag: "REAL ESTATE · CAPE TOWN", img: "https://images.unsplash.com/photo-1758523671826-d7f8217ffac3?auto=format&fit=crop&w=900&q=70" },
  { n: "03", tag: "UGC · FITNESS JOHANNESBURG", img: "https://images.unsplash.com/photo-1560381328-696dda198bae?auto=format&fit=crop&w=900&q=70" },
  { n: "04", tag: "REAL ESTATE · INTERIOR", img: "https://images.unsplash.com/photo-1761679296778-7f245d39148d?auto=format&fit=crop&w=900&q=70" },
  { n: "05", tag: "CITY LIFE · NIGHT URBAN", img: "https://images.unsplash.com/photo-1774810305765-52542714e548?auto=format&fit=crop&w=900&q=70" },
];

export function Hero() {
  return (
    <section className="bg-[#070709] pt-14">
      <Ticker />

      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-56px-40px)]">
        {/* LEFT */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="relative lg:w-[55%] min-h-[80vh] lg:min-h-0 overflow-hidden"
        >
          <img
            src="https://images.unsplash.com/photo-1661422586023-681ea60507e2?auto=format&fit=crop&w=1600&q=75"
            alt="Featured story"
            fetchPriority="high"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070709] via-[#070709]/40 to-transparent" />
          <div className="absolute inset-0 hidden lg:block bg-gradient-to-l from-transparent to-[#070709]/60" />

          <div className="absolute top-5 left-5 flex items-center gap-2">
            <Circle className="w-2 h-2 fill-[#c8ff00] text-[#c8ff00]" />
            <span className="text-[10px] tracking-[0.2em] text-white/70 uppercase">Featured story</span>
          </div>
          <div className="absolute top-5 right-5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] tracking-[0.2em] text-white/60 uppercase">REC · 4K</span>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 space-y-5">
            <div className="text-[10px] tracking-[0.2em] text-[#c8ff00] uppercase">
              Restaurant · Johannesburg
            </div>
            <h1 className="font-serif font-bold text-white text-3xl sm:text-4xl lg:text-5xl leading-tight">
              THE DINNER THAT SAVED EVERYTHING
            </h1>
            <div className="text-[10px] tracking-[0.15em] text-white/40 uppercase">
              Story 01 / 05 &nbsp;·&nbsp; Emotional Drama &nbsp;·&nbsp; Viral Engine 4.0
            </div>
            <div className="inline-flex items-center gap-2 border border-white/15 rounded-full px-3 py-1.5">
              <Circle className="w-1.5 h-1.5 fill-[#c8ff00] text-[#c8ff00]" />
              <span className="text-[10px] tracking-[0.15em] text-white/70 uppercase">
                3 worlds · One table · One night
              </span>
            </div>
            <p className="font-serif font-bold text-2xl sm:text-3xl lg:text-4xl text-white leading-tight max-w-xl">
              AI Story Marketing,{" "}
              <span className="text-[#c8ff00] italic font-bold">built for every business.</span>
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <a
                href="#"
                className="group inline-flex items-center gap-2 bg-[#c8ff00] text-black text-[11px] tracking-[0.15em] uppercase font-bold px-5 py-3 rounded-full hover:brightness-110"
              >
                Start creating now
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </a>
              <a href="#" className="inline-flex items-center gap-3 text-white/80 hover:text-white">
                <span className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center">
                  <Play className="w-4 h-4 fill-white" />
                </span>
                <span className="text-[11px] tracking-[0.15em] uppercase">Open AI Studio</span>
              </a>
            </div>
            <div className="text-[10px] tracking-[0.2em] text-white/30 uppercase pt-1">
              00:42 · 4K · Cinematic
            </div>
          </div>
        </motion.div>

        {/* RIGHT */}
        <div className="lg:w-[45%] grid grid-cols-2 grid-rows-2 border-l border-white/5 min-h-[60vh] lg:min-h-0">
          {grid.map((g, i) => (
            <motion.div
              key={g.n}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.5 }}
              className="relative group overflow-hidden border-white/5 border-r border-b last:border-r-0"
            >
              <img
                src={g.img}
                alt={g.tag}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-90 group-hover:scale-105 transition-[transform,opacity] duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#070709]/90 to-transparent" />
              <div className="absolute top-3 left-3 text-[11px] text-white/50 font-serif">{g.n}</div>
              <div className="absolute bottom-3 left-3 right-3 text-[10px] tracking-[0.15em] text-[#c8ff00] uppercase">
                {g.tag}
              </div>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="w-12 h-12 rounded-full bg-[#c8ff00] flex items-center justify-center">
                  <Play className="w-5 h-5 fill-black text-black" />
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
