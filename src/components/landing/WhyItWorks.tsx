import { motion } from "motion/react";
import { Circle, Brain, Flame, ShieldCheck, TrendingUp, type LucideIcon } from "lucide-react";

type Card = { Icon: LucideIcon; title: string; desc: string; stat: string; label: string };

const cards: Card[] = [
  { Icon: Brain, title: "People ignore ads. They watch stories.", desc: "Story-driven video keeps viewers watching three times longer than promotional content.", stat: "3×", label: "Longer watch time" },
  { Icon: Flame, title: "Emotion drives buying decisions.", desc: "Almost every purchase is made on feeling first, then justified with logic afterward.", stat: "95%", label: "Of purchases are emotional" },
  { Icon: ShieldCheck, title: "Relatable moments build real trust.", desc: "Real human moments make audiences trust your business far more than slick advertising.", stat: "7×", label: "Higher brand trust" },
  { Icon: TrendingUp, title: "Experiences outperform promotions.", desc: "Story-led content gets shared, saved, and re-watched — the loop ads can never close.", stat: "12×", label: "More shares" },
];

export function WhyItWorks() {
  return (
    <section className="py-20 bg-[#070709] border-t border-white/5">
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
            <span className="text-[10px] tracking-[0.2em] text-white/50 uppercase">Why this works</span>
          </div>
          <h2 className="font-serif font-bold text-3xl sm:text-4xl text-white">The science of why stories sell.</h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/5 rounded-xl border border-white/5 overflow-hidden">
          {cards.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="bg-[#0a0a0d] p-8 sm:p-10 flex flex-col gap-6 hover:bg-[#0e0e12] transition-colors"
            >
              <div className="w-12 h-12 rounded-lg border border-[#c8ff00]/20 bg-[#c8ff00]/5 flex items-center justify-center">
                <c.Icon className="w-5 h-5 text-[#c8ff00]" />
              </div>
              <h3 className="text-white font-semibold text-xl leading-snug max-w-md">{c.title}</h3>
              <p className="text-white/30 text-sm leading-relaxed max-w-md">{c.desc}</p>
              <div className="pt-4 border-t border-white/5">
                <div className="font-serif font-bold text-4xl text-[#c8ff00]">{c.stat}</div>
                <div className="text-[10px] tracking-[0.15em] text-white/25 uppercase mt-1">{c.label}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
