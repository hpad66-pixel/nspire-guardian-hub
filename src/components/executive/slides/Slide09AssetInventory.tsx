import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "../slideUtils";
import { AnimatedNumber } from "../AnimatedNumber";
import { QrCode, Package, TrendingDown, Zap, BarChart3, DollarSign } from "lucide-react";

const ASSET_FEATURES = [
  { icon: QrCode, label: "QR-Code Asset Scanning", desc: "Scan to inspect — instant asset history and condition logs", color: "#1D6FE8" },
  { icon: Package, label: "Material Inventory", desc: "Stock levels, reorder points, and transaction audit trails", color: "#10B981" },
  { icon: TrendingDown, label: "Low Stock Alerts", desc: "Dashboard-wide alerts when inventory falls below thresholds", color: "#F59E0B" },
  { icon: DollarSign, label: "Utility Bill Tracking", desc: "Monthly spend analytics, trends, and Cost Per Unit metrics", color: "#F43F5E" },
];

const ASSET_TYPES = [
  { type: "Cleanouts", count: 24, status: "good" },
  { type: "Catch Basins", count: 18, status: "good" },
  { type: "Lift Stations", count: 4, status: "attention" },
  { type: "Retention Ponds", count: 6, status: "good" },
  { type: "Fire Hydrants", count: 12, status: "good" },
  { type: "Backflow Preventers", count: 8, status: "critical" },
];

export function Slide09AssetInventory() {
  return (
    <div className="slide-container">
      <div className="slide-accent-bar" style={{ background: "#10B981" }} />
      <div className="slide-content justify-between">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-4">
          <motion.div variants={itemVariants} className="slide-tag" style={{ color: "#10B981" }}>ASSET MANAGEMENT & INVENTORY</motion.div>
          <motion.div variants={itemVariants} className="text-[18px] font-bold text-white">
            Infrastructure assets. Material inventory. Utility intelligence. One view.
          </motion.div>
        </motion.div>

        <div className="flex gap-6 mt-6 flex-1">
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex-1 grid grid-cols-2 gap-3">
            {ASSET_FEATURES.map((f) => (
              <motion.div key={f.label} variants={itemVariants}
                className="rounded-xl bg-[#111E38] border border-white/5 p-5 flex flex-col gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${f.color}20` }}>
                  <f.icon className="h-4 w-4" style={{ color: f.color }} />
                </div>
                <div className="text-[11px] font-bold text-white">{f.label}</div>
                <div className="text-[9px] text-[#6B7A99] leading-relaxed">{f.desc}</div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div variants={containerVariants} initial="hidden" animate="visible"
            className="w-[280px] rounded-xl bg-[#111E38] border border-white/5 p-5">
            <div className="text-[10px] font-bold text-[#6B7A99] tracking-widest mb-3">INFRASTRUCTURE ASSETS</div>
            <div className="space-y-2">
              {ASSET_TYPES.map((a) => (
                <motion.div key={a.type} variants={itemVariants}
                  className="flex items-center gap-3 py-1.5 border-b border-white/5 last:border-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    a.status === "good" ? "bg-[#10B981]" : a.status === "attention" ? "bg-[#F59E0B]" : "bg-[#F43F5E]"
                  }`} />
                  <span className="text-[10px] text-white flex-1">{a.type}</span>
                  <span className="text-[10px] text-[#6B7A99] font-mono">{a.count}</span>
                </motion.div>
              ))}
            </div>
            <div className="mt-3 text-[8px] text-[#6B7A99] italic">Auto-linked to daily grounds inspections</div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
