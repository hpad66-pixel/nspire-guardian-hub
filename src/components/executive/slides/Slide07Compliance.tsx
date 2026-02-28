import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "../slideUtils";

const FLOW_NODES = [
  { label: "DERM\nConsent Order", color: "#F43F5E" },
  { label: "Permit\nTracking", color: "#F59E0B" },
  { label: "NSPIRE\nReadiness", color: "#1D6FE8" },
  { label: "Document\nVault", color: "#10B981" },
  { label: "Exec\nReport", color: "#8B5CF6" },
];

const AGENCIES = [
  { name: "Miami-Dade DERM", desc: "Sewer consent order, MS4 stormwater compliance" },
  { name: "City of Opa-locka", desc: "Building permits, ROW coordination" },
  { name: "FDEP", desc: "Wastewater delegated programs, environmental oversight" },
  { name: "HUD / NSPIRE", desc: "Housing quality standards inspection compliance" },
];

export function Slide07Compliance() {
  return (
    <div className="slide-container">
      <div className="slide-accent-bar" style={{ background: "#F59E0B" }} />
      <div className="slide-content justify-between">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-6">
          <motion.div variants={itemVariants} className="slide-tag" style={{ color: "#F59E0B" }}>COMPLIANCE ENGINE</motion.div>
          <motion.div variants={itemVariants} className="text-[32px] font-bold text-white max-w-[1400px]">
            When regulatory agencies control your timeline — you need a system that never sleeps.
          </motion.div>
        </motion.div>

        {/* Flow nodes */}
        <motion.div variants={containerVariants} initial="hidden" animate="visible"
          className="flex items-center justify-between gap-6 mt-6 px-8">
          {FLOW_NODES.map((node, i) => (
            <motion.div key={node.label} variants={itemVariants} className="flex items-center gap-6">
              <div className="flex flex-col items-center gap-4">
                <div className="w-24 h-24 rounded-full flex items-center justify-center border-[3px]"
                  style={{ borderColor: node.color, background: `${node.color}15` }}>
                  <div className="w-6 h-6 rounded-full" style={{ background: node.color }} />
                </div>
                <div className="text-[18px] text-center text-[#6B7A99] whitespace-pre-line leading-tight">{node.label}</div>
              </div>
              {i < FLOW_NODES.length - 1 && (
                <motion.div
                  className="h-[3px] flex-1 min-w-[60px]"
                  style={{ background: `linear-gradient(90deg, ${node.color}, ${FLOW_NODES[i + 1].color})` }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.6, delay: 0.3 + i * 0.15 }}
                />
              )}
            </motion.div>
          ))}
        </motion.div>

        {/* Agency cards */}
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-2 gap-6 mt-6">
          {AGENCIES.map((a) => (
            <motion.div key={a.name} variants={itemVariants}
              className="rounded-2xl bg-[#111E38] border border-white/5 p-8">
              <div className="text-[24px] font-bold text-white mb-2">{a.name}</div>
              <div className="text-[20px] text-[#6B7A99]">{a.desc}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
