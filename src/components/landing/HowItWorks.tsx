import { motion } from "motion/react";
import { Circle, MessageSquare, Wand2, Film } from "lucide-react";

const steps = [
  { n: "01", Icon: MessageSquare, title: "Describe your business or situation", desc: "Tell our AI about your shop, service, or moment. A few sentences is enough." },
  { n: "02", Icon: Wand2, title: "AI crafts an emotional story", desc: "Our story engine writes a cinematic narrative people actually want to watch." },
  { n: "03", Icon: Film, title: "Get a cinematic video ready to share", desc: "Receive a polished 4K story video, optimized for every social platform." },
];

const platforms = ["TikTok", "Instagram Reels", "Facebook", "YouTube Shorts", "WhatsApp Status"];

export function HowItWorks() {
  return (
    <section id="features" className="py-20 bg-[#070709] border-t border-white/5">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="space-y-3 mb-10"
        >
          <div className="flex items-center gap-2">
            <Circle className="w-2 h-2 fill-[#c8ff00] text-[#c8ff00]" />
            <span className="text-[10px] tracking-[0.2em] text-white/50 uppercase">How It Works</span>
          </div>
          <h2 className="font-serif font-bold text-3xl sm:text-4xl text-white">From idea to cinematic video in 3 steps.</h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/5 rounded-xl border border-white/5 overflow-hidden">
          {steps.map(({ n, Icon, title, desc }, i) => (
            <motion.div
              key={n}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="relative bg-[#0a0a0d] p-8 hover:bg-[#0e0e12] transition-colors min-h-[280px]"
            >
              <div className="absolute top-6 right-6 font-serif font-bold text-5xl text-white/[0.08]">{n}</div>
              <div className="w-12 h-12 rounded-lg border border-[#c8ff00]/20 bg-[#c8ff00]/5 flex items-center justify-center mb-6">
                <Icon className="w-5 h-5 text-[#c8ff00]" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-3 max-w-xs">{title}</h3>
              <p className="text-white/35 text-sm leading-relaxed max-w-xs">{desc}</p>
            </motion.div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 mt-10 justify-center">
          {platforms.map((p) => (
            <span
              key={p}
              className="border border-white/8 rounded-full text-[10px] text-white/25 uppercase tracking-[0.15em] px-4 py-2"
            >
              {p}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
