import { motion } from "motion/react";
import { Circle } from "lucide-react";

const stats = [
  { v: "2,400+", l: "Businesses creating" },
  { v: "12M+", l: "Story videos generated" },
  { v: "89%", l: "Higher engagement than ads" },
  { v: "10+", l: "Industries supported" },
];

export function Stats() {
  return (
    <section className="bg-[#0a0a0d] border-t border-white/5 py-12">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/5 rounded-xl border border-white/5 overflow-hidden">
          {stats.map((s, i) => (
            <motion.div
              key={s.v}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="bg-[#0a0a0d] p-6 sm:p-8 space-y-3"
            >
              <Circle className="w-2 h-2 fill-[#c8ff00] text-[#c8ff00]" />
              <div className="font-serif font-bold text-3xl sm:text-4xl text-white">{s.v}</div>
              <div className="text-[10px] tracking-[0.15em] text-white/25 uppercase">{s.l}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
