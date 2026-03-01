import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "../slideUtils";
import { ArrowRight, Check } from "lucide-react";

const DELIVERABLES = [
  "Full portfolio visibility — every property, instantly",
  "18 integrated modules — one login, zero silos",
  "NSPIRE-grade inspection & compliance engine",
  "AI-powered regulatory document review (CaseIQ)",
  "Field-to-boardroom accountability — fully documented",
  "Multi-tenant architecture with workspace isolation",
  "Executive dashboards you can read in 60 seconds",
  "Live at apasos.ai — no installation required",
];

export function Slide10CTA() {
  return (
    <div className="slide-container">
      <div className="slide-content items-center justify-center text-center relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse at 50% 30%, rgba(29,111,232,0.08) 0%, transparent 70%)",
        }} />

        {/* Hero header band */}
        <motion.div
          initial={{ opacity: 0, y: -30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full rounded-3xl py-14 px-16 mb-8 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #1D6FE8, #3B82F6, #1D6FE8)", backgroundSize: "200% 200%" }}
        >
          {/* Animated shimmer */}
          <motion.div
            className="absolute inset-0 opacity-20"
            style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)" }}
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
          <div className="flex items-baseline justify-center gap-4">
            <span className="text-[72px] font-bold text-white tracking-[0.18em]">APAS</span>
            <span className="text-[72px] font-bold text-white/80 tracking-[0.18em]">OS</span>
          </div>
          <div className="text-[24px] italic text-[#CADCFC] mt-3">
            The intelligent operating system for serious property owners.
          </div>
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="w-full max-w-[1200px] mx-auto">
          <motion.div variants={itemVariants} className="text-[26px] font-bold text-[#CBD5E1] mb-8">
            What you get on day one:
          </motion.div>

          <div className="grid grid-cols-2 gap-x-14 gap-y-5 text-left">
            {DELIVERABLES.map((d) => (
              <motion.div key={d} variants={itemVariants} className="flex items-start gap-4 text-[22px] text-white">
                <Check className="h-6 w-6 text-[#10B981] flex-shrink-0 mt-0.5" /> {d}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CTA box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="mt-12 flex items-center gap-8"
        >
          <div className="rounded-2xl px-14 py-6 flex items-center gap-4"
            style={{ background: "linear-gradient(135deg, #1D6FE8, #3B82F6)", boxShadow: "0 12px 40px rgba(29,111,232,0.4)" }}>
            <span className="text-[26px] font-bold text-white">Get Started</span>
            <ArrowRight className="h-7 w-7 text-white" />
          </div>
          <div className="text-left">
            <div className="text-[22px] font-bold text-white">apasos.ai</div>
            <div className="text-[18px] text-[#6B7A99]">hardeep@apas.ai · APAS Consulting LLC</div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} initial="hidden" animate="visible"
          className="text-[16px] text-[#6B7A99] mt-10">
          Press SPACE to advance · F for fullscreen · ESC to exit
        </motion.div>
      </div>
    </div>
  );
}
