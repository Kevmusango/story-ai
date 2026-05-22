import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Circle, Heart, MessageCircle, Share2, Eye, Play, ArrowRight } from "lucide-react";

function LazyVideo({ src, poster, className }: { src: string; poster: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!el.src) {
            el.src = src;
            el.load();
          }
          el.play().catch(() => {
            el.addEventListener("canplay", () => el.play().catch(() => {}), { once: true });
          });
        } else {
          el.pause();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px 300px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [src]);

  return (
    <video
      ref={ref}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      className={className}
    />
  );
}

const stories = [
  { n: "01", tag: "Barber Shop", title: "The haircut before the big night", img: "https://images.unsplash.com/photo-1639511177364-0866c0da16fa?auto=format&fit=crop&w=700&q=70", video: "https://videos.pexels.com/video-files/3209828/3209828-uhd_1440_2732_25fps.mp4", likes: "12.4K", views: "89K" },
  { n: "02", tag: "Real Estate", title: "The house viewing that changed everything", img: "https://images.unsplash.com/photo-1758523671826-d7f8217ffac3?auto=format&fit=crop&w=700&q=70", video: "https://videos.pexels.com/video-files/7578541/7578541-uhd_1440_2732_25fps.mp4", likes: "28.7K", views: "214K" },
  { n: "03", tag: "Restaurant", title: "The dinner that saved their relationship", img: "https://images.unsplash.com/photo-1661422586023-681ea60507e2?auto=format&fit=crop&w=700&q=70", video: "https://videos.pexels.com/video-files/4253262/4253262-uhd_1440_2732_25fps.mp4", likes: "19.2K", views: "156K" },
  { n: "04", tag: "Gym & Fitness", title: "Six months. One mirror. New man.", img: "https://images.unsplash.com/photo-1560381328-696dda198bae?auto=format&fit=crop&w=700&q=70", video: "https://videos.pexels.com/video-files/4761426/4761426-uhd_1440_2560_25fps.mp4", likes: "34.1K", views: "302K" },
  { n: "05", tag: "Car Dealership", title: "The first car he saved three years for", img: "https://images.unsplash.com/photo-1698533188601-2432adf826f4?auto=format&fit=crop&w=700&q=70", video: "https://videos.pexels.com/video-files/8088504/8088504-hd_1080_1920_25fps.mp4", likes: "22.9K", views: "178K" },
  { n: "06", tag: "Education", title: "She failed twice. He never stopped", img: "https://images.unsplash.com/photo-1643007993841-72d3c54a911d?auto=format&fit=crop&w=700&q=70", video: "https://videos.pexels.com/video-files/5198159/5198159-uhd_1440_2732_25fps.mp4", likes: "41.3K", views: "389K" },
];

export function StoryFeed() {
  return (
    <section id="stories" className="py-20 bg-[#070709] border-t border-white/5">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-14"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Circle className="w-2 h-2 fill-[#c8ff00] text-[#c8ff00]" />
              <span className="text-[10px] tracking-[0.2em] text-white/50 uppercase">Live Story Feed</span>
            </div>
            <h2 className="font-serif font-bold text-3xl sm:text-4xl text-white">
              Real Stories. Real Results.
            </h2>
            <p className="text-white/40 max-w-xl">
              Watch what 2,400+ businesses are creating right now. Every story crafted by AI, ready in minutes.
            </p>
          </div>
          <a href="#" className="text-[11px] tracking-[0.15em] uppercase text-[#c8ff00] inline-flex items-center gap-2">
            View all stories <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 sm:gap-8">
          {stories.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.5 }}
              className="group flex justify-center"
            >
              {/* Phone frame */}
              <div className="relative w-full max-w-[200px] aspect-[9/19] rounded-[2rem] bg-[#0a0a0d] border border-white/10 p-[6px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.04)_inset] transition-transform duration-500 group-hover:-translate-y-1">
                {/* Side buttons */}
                <span className="absolute left-[-2px] top-[22%] h-8 w-[2px] rounded-l bg-white/10" />
                <span className="absolute left-[-2px] top-[34%] h-12 w-[2px] rounded-l bg-white/10" />
                <span className="absolute right-[-2px] top-[28%] h-14 w-[2px] rounded-r bg-white/10" />

                {/* Screen */}
                <div className="relative w-full h-full rounded-[1.6rem] overflow-hidden bg-black">
                  <LazyVideo
                    src={s.video}
                    poster={s.img}
                    className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-500"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                  {/* Notch */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-black rounded-full px-2.5 py-1">
                    <span className="w-1 h-1 rounded-full bg-white/30" />
                    <span className="w-5 h-1 rounded-full bg-white/10" />
                  </div>

                  {/* Status bar */}
                  <div className="absolute top-3 left-3 right-3 flex justify-between items-center text-[7px] tracking-wider text-white/60 z-10">
                    <span>9:41</span>
                    <span>5G</span>
                  </div>

                  {/* Story number */}
                  <div className="absolute top-9 left-3 text-[10px] text-white/60 font-serif z-10">{s.n}</div>

                  {/* Right-side TikTok-style action rail */}
                  <div className="absolute right-2 bottom-24 z-10 flex flex-col items-center gap-3 text-white/80">
                    <div className="flex flex-col items-center">
                      <Heart className="w-4 h-4 fill-white/80" />
                      <span className="text-[8px] mt-0.5">{s.likes}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <MessageCircle className="w-4 h-4" />
                      <span className="text-[8px] mt-0.5">128</span>
                    </div>
                    <Share2 className="w-4 h-4" />
                  </div>

                  {/* Play overlay on hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <span className="w-10 h-10 rounded-full bg-[#c8ff00] flex items-center justify-center">
                      <Play className="w-4 h-4 fill-black text-black" />
                    </span>
                  </div>

                  {/* Bottom caption */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 pr-10 space-y-1.5 z-10">
                    <div className="text-[8px] tracking-[0.18em] text-[#c8ff00] uppercase font-semibold">{s.tag}</div>
                    <div className="text-white text-[11px] font-semibold leading-snug">{s.title}</div>
                    <div className="flex items-center gap-2 text-[8px] text-white/50 pt-0.5">
                      <span className="flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" />{s.views}</span>
                      <Circle className="w-1 h-1 fill-white/30 text-white/30" />
                      <span>StoryLens AI</span>
                    </div>
                  </div>

                  {/* Home indicator */}
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-12 h-[3px] rounded-full bg-white/40 z-20" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
