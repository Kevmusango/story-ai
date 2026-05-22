import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "@tanstack/react-router";
import { Play, Menu, X } from "lucide-react";

const links = ["Stories", "Industries", "AI Studio", "Pricing"];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 h-14 transition-colors ${
        scrolled
          ? "bg-[#070709]/90 backdrop-blur-xl border-b border-white/5"
          : "bg-[#070709]/60 backdrop-blur-sm"
      }`}
    >
      <div className="h-full max-w-[1400px] mx-auto px-5 sm:px-8 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-[#c8ff00] flex items-center justify-center">
            <Play className="w-4 h-4 text-black fill-black" />
          </span>
          <span className="font-serif font-bold text-white text-base">
            StoryLens<span className="text-[#c8ff00]"> AI</span>
          </span>
        </a>

        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l}
              href={`#${l.toLowerCase().replace(/\s+/g, "-")}`}
              className="text-[11px] tracking-[0.15em] uppercase text-white/40 hover:text-white transition-colors"
            >
              {l}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-5">
          <Link to="/login" className="text-[11px] tracking-[0.12em] uppercase text-white/40 hover:text-white">
            Log in
          </Link>
          <Link
            to="/signup"
            className="bg-[#c8ff00] text-black text-[11px] tracking-[0.12em] uppercase font-bold px-4 py-2 rounded-full hover:brightness-110 transition"
          >
            Sign up
          </Link>
        </div>

        <button
          className="md:hidden text-white/70"
          onClick={() => setOpen((o) => !o)}
          aria-label="Menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="md:hidden bg-[#070709]/95 backdrop-blur-xl border-b border-white/5 px-5 py-5 space-y-4"
          >
            {links.map((l) => (
              <a
                key={l}
                href={`#${l.toLowerCase().replace(/\s+/g, "-")}`}
                className="block text-[11px] tracking-[0.15em] uppercase text-white/60"
                onClick={() => setOpen(false)}
              >
                {l}
              </a>
            ))}
            <Link
              to="/signup"
              className="block text-center bg-[#c8ff00] text-black text-[11px] tracking-[0.12em] uppercase font-bold px-4 py-3 rounded-full"
              onClick={() => setOpen(false)}
            >
              Sign up
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
