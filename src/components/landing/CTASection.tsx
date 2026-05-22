import { motion } from "motion/react";
import { Circle, ArrowRight } from "lucide-react";

const trust = ["First story free", "Cancel anytime", "No experience needed", "Ready in minutes"];

export function CTASection() {
  return (
    <section className="py-20 bg-[#070709] border-t border-white/5">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative bg-[#0a0a0d] border border-white/8 rounded-2xl overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(200,255,0,0.06),transparent)]" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#c8ff00]/30 to-transparent" />

          <div className="relative px-6 sm:px-12 py-16 sm:py-20 text-center max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-center gap-2">
              <Circle className="w-2 h-2 fill-[#c8ff00] text-[#c8ff00]" />
              <span className="text-[10px] tracking-[0.2em] text-white/50 uppercase">Your turn</span>
            </div>
            <h2 className="font-serif font-bold text-3xl sm:text-4xl lg:text-5xl text-white leading-tight">
              Start turning your business into{" "}
              <span className="italic text-[#c8ff00]">stories people actually watch</span>
            </h2>
            <p className="text-white/40 max-w-xl mx-auto">
              Join 2,400+ businesses already creating cinematic story videos with StoryLens AI.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <a
                href="#"
                className="group inline-flex items-center gap-2 bg-[#c8ff00] text-black text-[11px] tracking-[0.15em] uppercase font-bold px-5 py-3 rounded-full hover:brightness-110"
              >
                Create Your First Story Video
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </a>
              <a
                href="#"
                className="inline-flex items-center gap-2 border border-white/15 text-white/80 text-[11px] tracking-[0.15em] uppercase px-5 py-3 rounded-full hover:bg-white/5"
              >
                See Pricing Plans
              </a>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 pt-6">
              {trust.map((t) => (
                <span key={t} className="flex items-center gap-2 text-[10px] tracking-[0.15em] text-white/30 uppercase">
                  <Circle className="w-1.5 h-1.5 fill-[#c8ff00] text-[#c8ff00]" />
                  {t}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
