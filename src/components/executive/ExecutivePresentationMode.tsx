import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Slide01Hero } from "./slides/Slide01Hero";
import { Slide02Problem } from "./slides/Slide02Problem";
import { Slide03Solution } from "./slides/Slide03Solution";
import { Slide04GlorietaCase } from "./slides/Slide04GlorietaCase";
import { Slide05Mobile } from "./slides/Slide05Mobile";
import { Slide06ValueCase } from "./slides/Slide06ValueCase";
import { Slide07Compliance } from "./slides/Slide07Compliance";
import { Slide08Architecture } from "./slides/Slide08Architecture";
import { Slide09Analytics } from "./slides/Slide09Analytics";
import { Slide10CTA } from "./slides/Slide10CTA";

const SLIDES = [
  <Slide01Hero />,
  <Slide02Problem />,
  <Slide03Solution />,
  <Slide04GlorietaCase />,
  <Slide05Mobile />,
  <Slide06ValueCase />,
  <Slide07Compliance />,
  <Slide08Architecture />,
  <Slide09Analytics />,
  <Slide10CTA />,
];
const TOTAL = SLIDES.length;

interface Props {
  onExit: () => void;
}

export function ExecutivePresentationMode({ onExit }: Props) {
  const [current, setCurrent] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(false);

  const prev = useCallback(() => setCurrent((c) => Math.max(0, c - 1)), []);
  const next = useCallback(() => setCurrent((c) => Math.min(TOTAL - 1, c + 1)), []);

  // Auto-advance
  useEffect(() => {
    if (!isAutoPlay) return;
    const timer = setInterval(() => setCurrent((c) => (c + 1) % TOTAL), 30000);
    return () => clearInterval(timer);
  }, [isAutoPlay]);

  // Keyboard
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "ArrowRight") { e.preventDefault(); next(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onExit, next, prev]);

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-[#0B1629] flex flex-col">
      {/* Controls */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="text-white font-bold text-lg tracking-widest">APAS OS</div>
          <div className="h-4 w-px bg-white/20" />
          <div className="text-[#6B7A99] text-sm">Executive Presentation</div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={prev} disabled={current === 0}
            className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-30 text-white text-sm">← Prev</button>
          <span className="text-[#6B7A99] text-sm tabular-nums">{current + 1} / {TOTAL}</span>
          <button onClick={next} disabled={current === TOTAL - 1}
            className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-30 text-white text-sm">Next →</button>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsAutoPlay(!isAutoPlay)}
            className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              isAutoPlay ? "bg-[#1D6FE8] text-white" : "bg-white/5 text-[#6B7A99] hover:text-white"
            )}>
            {isAutoPlay ? "⏸ Pause" : "▶ Auto-Play"}
          </button>
          <button onClick={onExit}
            className="px-4 py-2 rounded-lg text-sm text-[#6B7A99] hover:text-white hover:bg-white/5">✕ Exit</button>
        </div>
      </div>

      {/* Slide area */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="absolute inset-0"
          >
            {SLIDES[current]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Indicators */}
      <div className="flex justify-center gap-2 py-4 flex-shrink-0">
        {Array.from({ length: TOTAL }).map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)}
            className={cn("h-1.5 rounded-full transition-all duration-300",
              i === current ? "w-8 bg-[#1D6FE8]" : "w-1.5 bg-white/20"
            )} />
        ))}
      </div>
    </div>,
    document.body
  );
}
