import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "../slideUtils";
import { AnimatedNumber } from "../AnimatedNumber";
import { Shield, AlertTriangle, CheckCircle, FileText } from "lucide-react";

const NSPIRE_FEATURES = [
  { icon: Shield, label: "130+ Defect Library", desc: "Full NSPIRE/REAC item catalog with severity auto-classification", color: "#1D6FE8" },
  { icon: AlertTriangle, label: "Life-Threatening Detection", desc: "LT defects trigger immediate alerts & 24-hour repair deadlines", color: "#F43F5E" },
  { icon: CheckCircle, label: "Automated Scoring", desc: "Real-time NSPIRE score calculation per unit, area, and property", color: "#10B981" },
  { icon: FileText, label: "Proof-of-Repair Workflow", desc: "Photo verification + inspector sign-off before defect closure", color: "#F59E0B" },
];

const SCORE_AREAS = [
  { area: "Unit Interior", score: 28, max: 35, color: "#1D6FE8" },
  { area: "Outside Areas", score: 22, max: 25, color: "#10B981" },
  { area: "Inside Areas", score: 18, max: 20, color: "#F59E0B" },
  { area: "Health & Safety", score: 19, max: 20, color: "#F43F5E" },
];

export function Slide04NspireInspections() {
  return (
    <div className="slide-container">
      <div className="slide-accent-bar" style={{ background: "#1D6FE8" }} />
      <div className="slide-content justify-between">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-4">
          <motion.div variants={itemVariants} className="slide-tag" style={{ color: "#1D6FE8" }}>NSPIRE COMPLIANCE ENGINE</motion.div>
          <motion.div variants={itemVariants} className="text-[18px] font-bold text-white">
            HUD-grade inspection readiness — built into every property.
          </motion.div>
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-4 gap-4 mt-6">
          {NSPIRE_FEATURES.map((f) => (
            <motion.div key={f.label} variants={itemVariants}
              className="rounded-xl bg-[#111E38] border border-white/5 p-5 flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${f.color}20` }}>
                <f.icon className="h-5 w-5" style={{ color: f.color }} />
              </div>
              <div className="text-[12px] font-bold text-white">{f.label}</div>
              <div className="text-[9px] text-[#6B7A99] leading-relaxed">{f.desc}</div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible"
          className="rounded-xl bg-[#111E38] border border-white/5 p-6 mt-4">
          <div className="text-[10px] font-bold text-[#6B7A99] tracking-widest mb-4">NSPIRE SCORE BREAKDOWN</div>
          <div className="grid grid-cols-4 gap-4">
            {SCORE_AREAS.map((s) => (
              <motion.div key={s.area} variants={itemVariants} className="flex flex-col gap-2">
                <div className="flex justify-between text-[10px]">
                  <span className="text-[#6B7A99]">{s.area}</span>
                  <span className="text-white font-bold">{s.score}/{s.max}</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: s.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(s.score / s.max) * 100}%` }}
                    transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
          <div className="flex items-center justify-center mt-4 gap-2">
            <div className="text-[28px] font-bold text-[#10B981]">
              <AnimatedNumber value={87} suffix=" / 100" />
            </div>
            <div className="text-[10px] text-[#6B7A99]">Overall NSPIRE Score</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
