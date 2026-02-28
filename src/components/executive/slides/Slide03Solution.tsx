import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "../slideUtils";

const MODULES = [
  { name: "Inspections", sub: "NSPIRE + Daily Grounds", color: "#1D6FE8" },
  { name: "Projects", sub: "Milestones, COs, RFIs", color: "#10B981" },
  { name: "Permits", sub: "Lifecycle & Compliance", color: "#F59E0B" },
  { name: "Issues & Work Orders", sub: "Assignment to Closure", color: "#F43F5E" },
  { name: "Documents", sub: "Centralized Records", color: "#1D6FE8" },
  { name: "Reports", sub: "Executive Dashboards", color: "#10B981" },
];

export function Slide03Solution() {
  return (
    <div className="slide-container">
      <div className="slide-accent-bar" style={{ background: "#1D6FE8" }} />
      <div className="slide-content justify-between">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-4">
          <motion.div variants={itemVariants} className="slide-tag" style={{ color: "#3B82F6" }}>THE SOLUTION</motion.div>
          <motion.div variants={itemVariants} className="text-[18px] font-bold text-white">
            APAS OS — Purpose-built for complex property portfolios.
          </motion.div>
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-3 gap-4 flex-1 mt-8">
          {MODULES.map((m) => (
            <motion.div key={m.name} variants={itemVariants} className="flex rounded-xl overflow-hidden bg-[#111E38] border border-white/5">
              <div className="w-1.5 flex-shrink-0" style={{ background: m.color }} />
              <div className="p-5 flex flex-col gap-1">
                <div className="text-[13px] font-bold text-white">{m.name}</div>
                <div className="text-[10px] text-[#6B7A99]">{m.sub}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div variants={itemVariants} initial="hidden" animate="visible" className="text-[11px] font-bold italic text-[#3B82F6] pt-4">
          All modules. One login. Every property.
        </motion.div>
      </div>
    </div>
  );
}
