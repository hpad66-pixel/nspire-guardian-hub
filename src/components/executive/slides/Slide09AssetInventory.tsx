import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "../slideUtils";
import { AnimatedNumber } from "../AnimatedNumber";
import { QrCode, Package, TrendingDown, DollarSign } from "lucide-react";

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
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-6">
          <motion.div variants={itemVariants} className="slide-tag" style={{ color: "#10B981" }}>ASSET MANAGEMENT & INVENTORY</motion.div>
          <motion.div variants={itemVariants} className="text-[36px] font-bold text-white">
            Infrastructure assets. Material inventory. Utility intelligence. One view.
          </motion.div>
        </motion.div>

        <div className="flex gap-8 mt-4 flex-1">
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex-1 grid grid-cols-2 gap-5">
            {ASSET_FEATURES.map((f) => (
              <motion.div key={f.label} variants={itemVariants}
                className="rounded-2xl bg-[#111E38] border border-white/5 p-8 flex flex-col gap-4">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: `${f.color}20` }}>
                  <f.icon className="h-7 w-7" style={{ color: f.color }} />
                </div>
                <div className="text-[22px] font-bold text-white">{f.label}</div>
                <div className="text-[18px] text-[#6B7A99] leading-relaxed">{f.desc}</div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div variants={containerVariants} initial="hidden" animate="visible"
            className="w-[500px] rounded-2xl bg-[#111E38] border border-white/5 p-8">
            <div className="slide-tag text-[#6B7A99] mb-5">INFRASTRUCTURE ASSETS</div>
            <div className="space-y-4">
              {ASSET_TYPES.map((a) => (
                <motion.div key={a.type} variants={itemVariants}
                  className="flex items-center gap-4 py-3 border-b border-white/5 last:border-0">
                  <div className={`w-4 h-4 rounded-full flex-shrink-0 ${
                    a.status === "good" ? "bg-[#10B981]" : a.status === "attention" ? "bg-[#F59E0B]" : "bg-[#F43F5E]"
                  }`} />
                  <span className="text-[20px] text-white flex-1">{a.type}</span>
                  <span className="text-[20px] text-[#6B7A99] font-mono">{a.count}</span>
                </motion.div>
              ))}
            </div>
            <div className="mt-4 text-[16px] text-[#6B7A99] italic">Auto-linked to daily grounds inspections</div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
