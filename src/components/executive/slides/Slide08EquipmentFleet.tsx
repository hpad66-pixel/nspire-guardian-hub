import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "../slideUtils";
import { Truck, FileCheck, ArrowLeftRight, Shield, Wrench, Fuel } from "lucide-react";

const FEATURES = [
  { icon: Truck, label: "Asset Registry", desc: "Vehicles, heavy equipment, tools — full inventory with photos, VIN, serial numbers", color: "#1D6FE8" },
  { icon: FileCheck, label: "Document Compliance", desc: "Registration, insurance, inspections — Green/Amber/Red expiry tracking", color: "#10B981" },
  { icon: ArrowLeftRight, label: "Check-Out / Check-In", desc: "2-tap custody logging with condition notes and return verification", color: "#F59E0B" },
  { icon: Shield, label: "Tiered Limits", desc: "Starter: 50 • Professional: 200 • Enterprise: Unlimited assets", color: "#8B5CF6" },
];

const CATEGORIES = [
  "Vehicles", "Heavy Equipment", "Power Tools", "Hand Tools",
  "Safety Equipment", "Generators", "Pumps", "Trailers",
];

export function Slide08EquipmentFleet() {
  return (
    <div className="slide-container">
      <div className="slide-accent-bar" style={{ background: "#8B5CF6" }} />
      <div className="slide-content justify-between">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-4">
          <motion.div variants={itemVariants} className="slide-tag" style={{ color: "#8B5CF6" }}>EQUIPMENT & FLEET TRACKER</motion.div>
          <motion.div variants={itemVariants} className="text-[18px] font-bold text-white">
            Every tool. Every vehicle. Always accounted for.
          </motion.div>
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-4 gap-4 mt-6">
          {FEATURES.map((f) => (
            <motion.div key={f.label} variants={itemVariants}
              className="rounded-xl bg-[#111E38] border border-white/5 p-5 flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${f.color}20` }}>
                <f.icon className="h-5 w-5" style={{ color: f.color }} />
              </div>
              <div className="text-[12px] font-bold text-white">{f.label}</div>
              <div className="text-[9px] text-[#6B7A99] leading-relaxed">{f.desc}</div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible"
          className="rounded-xl bg-[#111E38] border border-white/5 p-5 mt-4">
          <div className="text-[10px] font-bold text-[#6B7A99] tracking-widest mb-3">EQUIPMENT CATEGORIES (ADMIN-MANAGED)</div>
          <div className="grid grid-cols-4 gap-2">
            {CATEGORIES.map((c) => (
              <motion.div key={c} variants={itemVariants}
                className="rounded-lg bg-[#0B1629] border border-white/5 px-3 py-2.5 text-center">
                <span className="text-[10px] text-white">{c}</span>
              </motion.div>
            ))}
          </div>
          <div className="text-[8px] text-[#6B7A99] mt-3 italic">
            Platform-level master list + organization custom category • Private storage buckets for photos & documents
          </div>
        </motion.div>
      </div>
    </div>
  );
}
