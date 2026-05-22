import { motion } from "motion/react";
import {
  Circle, Home, UtensilsCrossed, Dumbbell, Car,
  GraduationCap, Hotel, Scissors, Wrench, ShoppingBag,
  type LucideIcon,
} from "lucide-react";

type Industry = { Icon: LucideIcon; name: string; tag: string; img: string; views: string; quote: string };

const industries: Industry[] = [
  { Icon: Home, name: "Real Estate", tag: "STORY · PROPERTY", img: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=900&q=70", views: "214K", quote: "The first night in a house they thought they'd never afford." },
  { Icon: UtensilsCrossed, name: "Restaurant", tag: "STORY · DINING", img: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=70", views: "156K", quote: "A table for two. A conversation neither would forget." },
  { Icon: Dumbbell, name: "Gym & Fitness", tag: "UGC · FITNESS", img: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=70", views: "302K", quote: "Six months ago he couldn't run a block. Today he ran 10K." },
  { Icon: Car, name: "Car Dealership", tag: "STORY · AUTO", img: "https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=900&q=70", views: "178K", quote: "The keys he held for the first time at twenty-three." },
  { Icon: GraduationCap, name: "Education", tag: "STORY · EDUCATION", img: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=900&q=70", views: "389K", quote: "Two failures. One teacher who refused to give up on her." },
  { Icon: Hotel, name: "Hotels & Tourism", tag: "STORY · TRAVEL", img: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=70", views: "127K", quote: "A weekend away that became the trip they'd talk about forever." },
  { Icon: Scissors, name: "Barber & Salon", tag: "STORY · GROOMING", img: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=900&q=70", views: "89K", quote: "A haircut, a mirror, and the man he'd been hiding all along." },
  { Icon: Wrench, name: "Mechanic & Auto", tag: "STORY · SERVICE", img: "https://images.unsplash.com/photo-1486006920555-c77dcf18193c?auto=format&fit=crop&w=900&q=70", views: "94K", quote: "The car that wouldn't start. And the mechanic who refused to quit." },
  { Icon: ShoppingBag, name: "Retail & Fashion", tag: "UGC · FASHION", img: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=70", views: "201K", quote: "She walked in unsure. She walked out unstoppable." },
];

export function Industries() {
  return (
    <section id="industries" className="py-20 bg-[#070709] border-t border-white/5">
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
            <span className="text-[10px] tracking-[0.2em] text-white/50 uppercase">Industries</span>
          </div>
          <h2 className="font-serif font-bold text-3xl sm:text-4xl text-white">Built for every kind of business.</h2>
          <p className="text-white/40 max-w-xl">From local barbershops to luxury hotels — if you serve real people, you have real stories worth telling.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/5 rounded-xl border border-white/5 overflow-hidden">
          {industries.map((ind, i) => (
            <motion.div
              key={ind.name}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className="bg-[#0a0a0d] hover:bg-[#0e0e12] transition-colors group"
            >
              <div className="relative h-36 overflow-hidden">
                <img
                  src={ind.img}
                  alt={ind.name}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0d] to-transparent" />
              </div>
              <div className="p-6 space-y-3 relative">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-lg border border-[#c8ff00]/20 bg-[#c8ff00]/5 flex items-center justify-center -mt-12 backdrop-blur">
                    <ind.Icon className="w-4 h-4 text-[#c8ff00]" />
                  </div>
                  <span className="text-[10px] tracking-[0.15em] text-white/30 uppercase">{ind.views} views</span>
                </div>
                <div className="text-[10px] tracking-[0.2em] text-[#c8ff00] uppercase">{ind.tag}</div>
                <h3 className="text-white font-semibold text-lg">{ind.name}</h3>
                <p className="italic text-white/30 text-sm leading-relaxed">"{ind.quote}"</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
