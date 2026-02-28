import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "../slideUtils";

const LAYERS = [
  {
    name: "FIELD LAYER",
    color: "#10B981",
    items: ["Mobile inspections", "QR asset scan", "Voice intake", "Photo capture"],
  },
  {
    name: "OPERATIONS LAYER",
    color: "#1D6FE8",
    items: ["Issues & work orders", "Projects & change orders", "Permits", "Documents"],
  },
  {
    name: "INTELLIGENCE LAYER",
    color: "#F59E0B",
    items: ["Executive dashboards", "Automated alerts", "Audit trails", "Portfolio reports"],
  },
];

export function Slide08Architecture() {
  return (
    <div className="slide-container">
      <div className="slide-accent-bar" style={{ background: "#1D6FE8" }} />
      <div className="slide-content justify-between">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-4">
          <motion.div variants={itemVariants} className="slide-tag" style={{ color: "#1D6FE8" }}>PLATFORM ARCHITECTURE</motion.div>
          <motion.div variants={itemVariants} className="text-[18px] font-bold text-white">
            Enterprise-grade. Cloud-native. Built to scale.
          </motion.div>
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-4 flex-1 mt-8 justify-center">
          {LAYERS.map((layer, i) => (
            <motion.div
              key={layer.name}
              variants={itemVariants}
              className="flex rounded-xl overflow-hidden bg-[#111E38] border border-white/5"
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 + i * 0.15 }}
            >
              <div className="w-48 flex-shrink-0 flex items-center justify-center px-4 py-5"
                style={{ background: `${layer.color}20` }}>
                <div className="text-[11px] font-bold tracking-widest" style={{ color: layer.color }}>{layer.name}</div>
              </div>
              <div className="flex-1 grid grid-cols-4 gap-px p-1">
                {layer.items.map((item) => (
                  <div key={item} className="flex items-center justify-center px-3 py-4 text-[10px] text-[#6B7A99] text-center">
                    {item}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div variants={itemVariants} initial="hidden" animate="visible"
          className="text-[9px] text-[#6B7A99] pt-4 text-center">
          Hosted on Cloudflare &nbsp;|&nbsp; Powered by Supabase &nbsp;|&nbsp; Progressive Web App &nbsp;|&nbsp; Live at apasos.ai
        </motion.div>
      </div>
    </div>
  );
}
