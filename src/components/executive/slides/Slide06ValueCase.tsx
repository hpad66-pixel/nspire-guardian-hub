import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "../slideUtils";
import { AnimatedNumber } from "../AnimatedNumber";
import { Check, X } from "lucide-react";

const STATS = [
  { n: 200, suffix: "+", label: "Properties", sub: "Unified under one login", color: "#1D6FE8" },
  { n: 40, suffix: "%", label: "Faster Closure", sub: "Avg. from built inspection flow", color: "#10B981" },
  { n: "∞", suffix: "", label: "Audit Trail", sub: "Every action. Every doc.", color: "#F59E0B" },
  { n: "$0", suffix: "", label: "Travel for Updates", sub: "Real-time from anywhere", color: "#F43F5E" },
];

const COMPARE = [
  ["Phone tag for WO status", "Real-time from any device"],
  ["Missed permit = project halt", "Automated alerts before deadlines"],
  ["500 questions per site visit", "One dashboard — full picture"],
  ["Compliance gaps in audit", "Continuous compliance scoring"],
];

export function Slide06ValueCase() {
  return (
    <div className="slide-container">
      <div className="slide-accent-bar" style={{ background: "#10B981" }} />
      <div className="slide-content justify-between">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-6">
          <motion.div variants={itemVariants} className="slide-tag" style={{ color: "#10B981" }}>THE VALUE CASE</motion.div>
          <motion.div variants={itemVariants} className="text-[36px] font-bold text-white">
            What APAS OS means to an owner with 200+ properties.
          </motion.div>
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-4 gap-6 mt-4">
          {STATS.map((s) => (
            <motion.div key={s.label} variants={itemVariants}
              className="rounded-2xl bg-[#111E38] border border-white/5 p-8 flex flex-col gap-2 text-center">
              <div className="text-[60px] font-bold stat-number" style={{ color: s.color }}>
                {typeof s.n === "number" ? <AnimatedNumber value={s.n} suffix={s.suffix} /> : <span>{s.n}</span>}
              </div>
              <div className="text-[24px] font-semibold text-white">{s.label}</div>
              <div className="text-[18px] text-[#6B7A99]">{s.sub}</div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible"
          className="rounded-2xl bg-[#111E38] border border-white/5 p-8 mt-2">
          <div className="grid grid-cols-2 gap-x-12 gap-y-4">
            <div className="slide-tag text-[#F43F5E] pb-3">WITHOUT APAS OS</div>
            <div className="slide-tag text-[#10B981] pb-3">WITH APAS OS</div>
            {COMPARE.map(([without, withOs], i) => (
              <motion.div key={i} variants={itemVariants} className="contents">
                <div className="flex items-center gap-3 text-[20px] text-[#6B7A99] py-2 border-t border-white/5">
                  <X className="h-5 w-5 text-[#F43F5E] flex-shrink-0" /> {without}
                </div>
                <div className="flex items-center gap-3 text-[20px] text-white py-2 border-t border-white/5">
                  <Check className="h-5 w-5 text-[#10B981] flex-shrink-0" /> {withOs}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
