import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "../slideUtils";
import { IPhoneMockup } from "../IPhoneMockup";

export function Slide01Hero() {
  return (
    <div className="slide-container dot-grid-bg">
      <div className="slide-accent-bar" style={{ background: "#1D6FE8" }} />
      <div className="slide-content">
        <div className="flex flex-1 items-center">
          <div className="flex-[50] pr-12">
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-6">
              <motion.div variants={itemVariants} className="text-[44px] font-bold text-white tracking-[0.12em]">
                APAS OS
              </motion.div>
              <motion.div variants={itemVariants} className="text-[16px] italic text-[#3B82F6]">
                Property Intelligence. Everywhere.
              </motion.div>
              <motion.div variants={itemVariants} className="w-[40%] h-[2px] bg-[#1D6FE8]" />
              <motion.div variants={itemVariants} className="text-[36px] font-bold text-white leading-[1.1]">
                One Platform.<br />
                Every Property.<br />
                Complete Control.
              </motion.div>
              <motion.div variants={itemVariants} className="text-[15px] italic text-[#6B7A99]">
                Built for owners who demand<br />answers — not excuses.
              </motion.div>
              <motion.div variants={itemVariants} className="text-[10px] text-[#6B7A99] pt-4">
                Prepared by APAS Consulting LLC
              </motion.div>
            </motion.div>
          </div>
          <div className="flex-[50] flex items-center justify-center">
            <IPhoneMockup scale={1.35} />
          </div>
        </div>
      </div>
    </div>
  );
}
