import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "../slideUtils";
import { Smartphone, Server, BarChart3, Shield, Wifi, Database } from "lucide-react";

const LAYERS = [
  {
    name: "FIELD LAYER",
    color: "#10B981",
    icon: Smartphone,
    items: ["Mobile inspections", "QR asset scan", "Voice dictation", "Photo capture", "Offline-ready PWA"],
  },
  {
    name: "OPERATIONS LAYER",
    color: "#1D6FE8",
    icon: Server,
    items: ["Issues & work orders", "Projects & COs", "Permits & compliance", "Occupancy & tenants", "Documents & CRM"],
  },
  {
    name: "INTELLIGENCE LAYER",
    color: "#F59E0B",
    icon: BarChart3,
    items: ["Executive dashboards", "AI regulatory review", "Portfolio analytics", "Automated alerts", "Audit trails"],
  },
  {
    name: "PLATFORM LAYER",
    color: "#8B5CF6",
    icon: Shield,
    items: ["Multi-tenant isolation", "Role-based access", "Module gating", "Workspace provisioning", "Platform admin"],
  },
];

const TECH_STACK = [
  { icon: Database, label: "PostgreSQL + RLS", desc: "Row-level security per workspace" },
  { icon: Wifi, label: "Realtime Sync", desc: "Live updates across all devices" },
  { icon: Shield, label: "Edge Functions", desc: "Serverless backend logic" },
];

export function Slide08Architecture() {
  return (
    <div className="slide-container">
      <div className="slide-accent-bar" style={{ background: "#1D6FE8" }} />
      <div className="slide-content justify-between">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-6">
          <motion.div variants={itemVariants} className="slide-tag" style={{ color: "#1D6FE8" }}>PLATFORM ARCHITECTURE</motion.div>
          <motion.div variants={itemVariants} className="text-[36px] font-bold text-white">
            Enterprise-grade. Cloud-native. Multi-tenant. Built to scale.
          </motion.div>
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-5 flex-1 mt-4 justify-center">
          {LAYERS.map((layer, i) => (
            <motion.div
              key={layer.name}
              className="flex rounded-2xl overflow-hidden bg-[#111E38] border border-white/5"
              initial={{ opacity: 0, x: -60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.15 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ borderColor: `${layer.color}40`, transition: { duration: 0.15 } }}
            >
              <div className="w-72 flex-shrink-0 flex items-center gap-4 px-8 py-7"
                style={{ background: `${layer.color}15` }}>
                <layer.icon className="h-7 w-7" style={{ color: layer.color }} />
                <div className="text-[20px] font-bold tracking-widest" style={{ color: layer.color }}>{layer.name}</div>
              </div>
              <div className="flex-1 flex items-center gap-px p-2">
                {layer.items.map((item) => (
                  <div key={item} className="flex-1 flex items-center justify-center px-4 py-5 text-[18px] text-[#6B7A99] text-center">
                    {item}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible"
          className="flex items-center justify-between gap-6 pt-2">
          {TECH_STACK.map((t) => (
            <motion.div key={t.label} variants={itemVariants} className="flex items-center gap-3">
              <t.icon className="h-5 w-5 text-[#3B82F6]" />
              <span className="text-[16px] text-white font-semibold">{t.label}</span>
              <span className="text-[14px] text-[#6B7A99]">— {t.desc}</span>
            </motion.div>
          ))}
          <div className="text-[16px] text-[#6B7A99]">Live at <span className="text-[#3B82F6] font-bold">apasos.ai</span></div>
        </motion.div>
      </div>
    </div>
  );
}
