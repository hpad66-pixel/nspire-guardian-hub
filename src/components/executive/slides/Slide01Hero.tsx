import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "../slideUtils";
import { IPhoneMockup } from "../IPhoneMockup";

export function Slide01Hero() {
  return (
    <div className="slide-container dot-grid-bg">
      <div className="slide-accent-bar" style={{ background: "#1D6FE8" }} />
      <div className="slide-content">
        <div className="flex flex-1 items-center">
          <div className="flex-[50] pr-16">
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-12">
              <motion.div variants={itemVariants} className="flex items-baseline gap-5">
                <span className="text-[88px] font-bold text-white tracking-[0.12em]">APAS</span>
                <span className="text-[88px] font-bold tracking-[0.12em]" style={{ background: "linear-gradient(135deg, #1D6FE8, #3B82F6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>OS</span>
              </motion.div>
              <motion.div variants={itemVariants} className="text-[30px] italic text-[#3B82F6] tracking-wide">
                Run the Job. Pass the Audit.
              </motion.div>
              <motion.div variants={itemVariants} className="w-[40%] h-[3px]" style={{ background: "linear-gradient(90deg, #1D6FE8, transparent)" }} />
              <motion.div variants={itemVariants} className="text-[60px] font-bold text-white leading-[1.08]">
                One Platform.<br />
                Every Property.<br />
                Complete Control.
              </motion.div>
              <motion.div variants={itemVariants} className="text-[26px] text-[#6B7A99] leading-relaxed">
                18 integrated modules — inspections, compliance,<br />
                projects, equipment, AI, and workforce — unified<br />
                under one login for owners who demand answers.
              </motion.div>
              <motion.div
                variants={itemVariants}
                className="flex items-center gap-6 pt-4"
              >
                <div className="px-8 py-4 rounded-xl text-[20px] font-bold text-white" style={{ background: "linear-gradient(135deg, #1D6FE8, #3B82F6)", boxShadow: "0 8px 32px rgba(29,111,232,0.4)" }}>
                  apasos.ai
                </div>
                <div className="text-[18px] text-[#6B7A99]">
                  Prepared by APAS Consulting LLC
                </div>
              </motion.div>
            </motion.div>
          </div>
          <div className="flex-[50] flex items-center justify-center">
            <motion.div
              animate={{ y: [0, -16, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <IPhoneMockup scale={1.8} />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
