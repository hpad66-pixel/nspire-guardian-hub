import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "../slideUtils";

const DELIVERABLES = [
  "Full portfolio visibility — every property, instantly",
  "Inspections, work orders, permits, projects — one system",
  "Regulatory compliance engine with automated alerts",
  "Executive dashboards you can read in 60 seconds",
  "Field-to-boardroom accountability — fully documented",
  "Live at apasos.ai — no installation required",
];

export function Slide10CTA() {
  return (
    <div className="slide-container">
      <div className="slide-content items-center justify-center text-center">
        {/* Hero header band */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full rounded-2xl py-8 px-12 mb-8"
          style={{ background: "linear-gradient(135deg, #1D6FE8, #3B82F6)" }}
        >
          <div className="text-[36px] font-bold text-white tracking-[0.18em]">APAS OS</div>
          <div className="text-[12px] italic text-[#CADCFC] mt-2">
            The intelligent OS for serious property owners.
          </div>
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="w-full max-w-2xl mx-auto">
          <motion.div variants={itemVariants} className="text-[13px] font-bold text-[#CBD5E1] mb-4">
            What you get on day one:
          </motion.div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-left">
            {DELIVERABLES.map((d) => (
              <motion.div key={d} variants={itemVariants} className="flex items-start gap-2 text-[11px] text-white">
                <span className="text-[#1D6FE8] mt-0.5">●</span> {d}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CTA box */}
        <motion.div
          variants={itemVariants} initial="hidden" animate="visible"
          className="mt-10 rounded-xl px-10 py-4"
          style={{ background: "#1D6FE8" }}
        >
          <div className="text-[13px] font-bold text-white">
            apasos.ai &nbsp;|&nbsp; hardeep@apas.ai &nbsp;|&nbsp; APAS Consulting LLC
          </div>
        </motion.div>

        <motion.div variants={itemVariants} initial="hidden" animate="visible"
          className="text-[9px] text-[#6B7A99] mt-8">
          Press SPACE to advance &nbsp;•&nbsp; ESC to exit
        </motion.div>
      </div>
    </div>
  );
}
