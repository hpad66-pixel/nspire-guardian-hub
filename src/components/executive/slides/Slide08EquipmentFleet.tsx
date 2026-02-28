import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "../slideUtils";
import { Truck, FileCheck, ArrowLeftRight, Shield } from "lucide-react";

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
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-6">
          <motion.div variants={itemVariants} className="slide-tag" style={{ color: "#8B5CF6" }}>EQUIPMENT & FLEET TRACKER</motion.div>
          <motion.div variants={itemVariants} className="text-[36px] font-bold text-white">
            Every tool. Every vehicle. Always accounted for.
          </motion.div>
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-4 gap-6 mt-4">
          {FEATURES.map((f) => (
            <motion.div key={f.label} variants={itemVariants}
              className="rounded-2xl bg-[#111E38] border border-white/5 p-8 flex flex-col gap-5">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: `${f.color}20` }}>
                <f.icon className="h-8 w-8" style={{ color: f.color }} />
              </div>
              <div className="text-[24px] font-bold text-white">{f.label}</div>
              <div className="text-[18px] text-[#6B7A99] leading-relaxed">{f.desc}</div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible"
          className="rounded-2xl bg-[#111E38] border border-white/5 p-8 mt-2">
          <div className="slide-tag text-[#6B7A99] mb-5">EQUIPMENT CATEGORIES (ADMIN-MANAGED)</div>
          <div className="grid grid-cols-4 gap-4">
            {CATEGORIES.map((c) => (
              <motion.div key={c} variants={itemVariants}
                className="rounded-xl bg-[#0B1629] border border-white/5 px-5 py-4 text-center">
                <span className="text-[20px] text-white">{c}</span>
              </motion.div>
            ))}
          </div>
          <div className="text-[16px] text-[#6B7A99] mt-4 italic">
            Platform-level master list + organization custom category • Private storage buckets for photos & documents
          </div>
        </motion.div>
      </div>
    </div>
  );
}
