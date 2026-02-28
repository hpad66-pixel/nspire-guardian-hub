import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ScaledSlide } from "./ScaledSlide";
import { Slide01Hero } from "./slides/Slide01Hero";
import { Slide02Problem } from "./slides/Slide02Problem";
import { Slide03Solution } from "./slides/Slide03Solution";
import { Slide04NspireInspections } from "./slides/Slide04NspireInspections";
import { Slide05DailyGrounds } from "./slides/Slide05DailyGrounds";
import { Slide06ConstructionProjects } from "./slides/Slide06ConstructionProjects";
import { Slide07IssuesWorkOrders } from "./slides/Slide07IssuesWorkOrders";
import { Slide08EquipmentFleet } from "./slides/Slide08EquipmentFleet";
import { Slide09AssetInventory } from "./slides/Slide09AssetInventory";
import { Slide10CredentialsSafety } from "./slides/Slide10CredentialsSafety";
import { Slide11ClientPortalsCaseIQ } from "./slides/Slide11ClientPortalsCaseIQ";
import { Slide05Mobile } from "./slides/Slide05Mobile";
import { Slide04GlorietaCase } from "./slides/Slide04GlorietaCase";
import { Slide06ValueCase } from "./slides/Slide06ValueCase";
import { Slide07Compliance } from "./slides/Slide07Compliance";
import { Slide08Architecture } from "./slides/Slide08Architecture";
import { Slide09Analytics } from "./slides/Slide09Analytics";
import { Slide10CTA } from "./slides/Slide10CTA";

const SLIDES = [
  { element: <Slide01Hero />, title: "Hero" },
  { element: <Slide02Problem />, title: "Problem" },
  { element: <Slide03Solution />, title: "Platform Overview" },
  { element: <Slide04NspireInspections />, title: "NSPIRE Inspections" },
  { element: <Slide05DailyGrounds />, title: "Daily Grounds" },
  { element: <Slide06ConstructionProjects />, title: "Construction" },
  { element: <Slide07IssuesWorkOrders />, title: "Issues & WOs" },
  { element: <Slide08EquipmentFleet />, title: "Equipment & Fleet" },
  { element: <Slide09AssetInventory />, title: "Asset & Inventory" },
  { element: <Slide10CredentialsSafety />, title: "Credentials & Safety" },
  { element: <Slide11ClientPortalsCaseIQ />, title: "Client Portals & AI" },
  { element: <Slide05Mobile />, title: "Mobile Access" },
  { element: <Slide04GlorietaCase />, title: "Case Study" },
  { element: <Slide06ValueCase />, title: "Value Case" },
  { element: <Slide07Compliance />, title: "Compliance Engine" },
  { element: <Slide08Architecture />, title: "Architecture" },
  { element: <Slide09Analytics />, title: "Analytics" },
  { element: <Slide10CTA />, title: "Call to Action" },
];
const TOTAL = SLIDES.length;

interface Props {
  onExit: () => void;
}

export function ExecutivePresentationMode({ onExit }: Props) {
  const [current, setCurrent] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

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
      if (e.key === "f" || e.key === "F") { e.preventDefault(); toggleFullscreen(); }
      if (e.key === "Escape") {
        if (document.fullscreenElement) { document.exitFullscreen(); }
        else { onExit(); }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onExit, next, prev]);

  return createPortal(
    <div ref={containerRef} className="fixed inset-0 z-[9999] bg-[#0B1629] flex flex-col">
      {/* Controls */}
      <div className="flex items-center justify-between px-8 py-3 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="text-white font-bold text-lg tracking-widest">APAS OS</div>
          <div className="h-4 w-px bg-white/20" />
          <div className="text-[#6B7A99] text-xs truncate max-w-[200px]">{SLIDES[current].title}</div>
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
          <button onClick={toggleFullscreen}
            className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              isFullscreen ? "bg-[#1D6FE8] text-white" : "bg-white/5 text-[#6B7A99] hover:text-white"
            )}>
            {isFullscreen ? "⛶ Exit Full" : "⛶ Fullscreen"}
          </button>
          <button onClick={onExit}
            className="px-4 py-2 rounded-lg text-sm text-[#6B7A99] hover:text-white hover:bg-white/5">✕ Exit</button>
        </div>
      </div>

      {/* Slide area */}
      <div className="flex-1 relative overflow-hidden bg-black">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="absolute inset-0"
          >
            <ScaledSlide>
              {SLIDES[current].element}
            </ScaledSlide>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Indicators */}
      <div className="flex justify-center gap-1.5 py-3 flex-shrink-0">
        {Array.from({ length: TOTAL }).map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)}
            className={cn("h-1.5 rounded-full transition-all duration-300",
              i === current ? "w-6 bg-[#1D6FE8]" : "w-1.5 bg-white/20 hover:bg-white/30"
            )} />
        ))}
      </div>
    </div>,
    document.body
  );
}
