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
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-4">
          <motion.div variants={itemVariants} className="slide-tag" style={{ color: "#F59E0B" }}>COMPLIANCE ENGINE</motion.div>
          <motion.div variants={itemVariants} className="text-[15px] font-bold text-white max-w-2xl">
            When regulatory agencies control your timeline — you need a system that never sleeps.
          </motion.div>
        </motion.div>

        {/* Flow nodes */}
        <motion.div variants={containerVariants} initial="hidden" animate="visible"
          className="flex items-center justify-between gap-2 mt-8 px-4">
          {FLOW_NODES.map((node, i) => (
            <motion.div key={node.label} variants={itemVariants} className="flex items-center gap-2">
              <div className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full flex items-center justify-center border-2"
                  style={{ borderColor: node.color, background: `${node.color}15` }}>
                  <div className="w-3 h-3 rounded-full" style={{ background: node.color }} />
                </div>
                <div className="text-[9px] text-center text-[#6B7A99] whitespace-pre-line leading-tight">{node.label}</div>
              </div>
              {i < FLOW_NODES.length - 1 && (
                <motion.div
                  className="h-[2px] flex-1 min-w-[30px]"
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
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-2 gap-3 mt-8">
          {AGENCIES.map((a) => (
            <motion.div key={a.name} variants={itemVariants}
              className="rounded-xl bg-[#111E38] border border-white/5 p-4">
              <div className="text-[12px] font-bold text-white mb-1">{a.name}</div>
              <div className="text-[10px] text-[#6B7A99]">{a.desc}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
