import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "../slideUtils";

const MODULES = [
  { name: "NSPIRE Inspections", sub: "130+ defects, REAC scoring", color: "#1D6FE8", icon: "🛡" },
  { name: "Daily Grounds", sub: "12-section photo-first inspections", color: "#10B981", icon: "📷" },
  { name: "Construction Projects", sub: "Milestones, COs, RFIs, daily reports", color: "#F59E0B", icon: "🏗" },
  { name: "Issues & Work Orders", sub: "Unified detection → verification", color: "#F43F5E", icon: "⚡" },
  { name: "Permits & Compliance", sub: "Lifecycle tracking, deadline alerts", color: "#F59E0B", icon: "📋" },
  { name: "Equipment & Fleet", sub: "Assets, check-out/in, doc compliance", color: "#8B5CF6", icon: "🚛" },
  { name: "Asset Management", sub: "QR-code scanning, condition logs", color: "#1D6FE8", icon: "📍" },
  { name: "Material Inventory", sub: "Stock levels, low-stock alerts, audits", color: "#10B981", icon: "📦" },
  { name: "Credentials Wallet", sub: "Certifications, insurance, share links", color: "#1D6FE8", icon: "🪪" },
  { name: "Training Academy", sub: "SCORM courses, progress, certificates", color: "#8B5CF6", icon: "🎓" },
  { name: "Safety / OSHA", sub: "Incident logging, 300/300A reports", color: "#F43F5E", icon: "🦺" },
  { name: "Client Portals", sub: "White-label portals, messaging, actions", color: "#10B981", icon: "🌐" },
  { name: "CaseIQ (AI)", sub: "Regulatory doc AI review & extraction", color: "#F43F5E", icon: "🧠" },
  { name: "HR Document Vault", sub: "Employee files, expiry tracking", color: "#F59E0B", icon: "📁" },
  { name: "Occupancy & Tenants", sub: "Lease tracking, unit management, status", color: "#10B981", icon: "🏠" },
  { name: "Executive Suite", sub: "Portfolio dashboards & presentations", color: "#1D6FE8", icon: "📊" },
  { name: "Documents & CRM", sub: "Centralized records & contact mgmt", color: "#6B7A99", icon: "📇" },
  { name: "Command Center", sub: "Unified dashboard — all modules", color: "#1D6FE8", icon: "🎯" },
];

export function Slide03Solution() {
  return (
    <div className="slide-container">
      <div className="slide-accent-bar" style={{ background: "#1D6FE8" }} />
      <div className="slide-content justify-between">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-5">
          <motion.div variants={itemVariants} className="slide-tag" style={{ color: "#3B82F6" }}>THE PLATFORM</motion.div>
          <motion.div variants={itemVariants} className="text-[36px] font-bold text-white">
            18 integrated modules — one login, every property, complete control.
          </motion.div>
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-6 gap-4 flex-1 mt-4 content-start">
          {MODULES.map((m, i) => (
            <motion.div
              key={m.name}
              variants={itemVariants}
              className="flex rounded-xl overflow-hidden bg-[#111E38] border border-white/5 transition-all duration-200"
              whileHover={{ borderColor: `${m.color}60`, scale: 1.02, transition: { duration: 0.15 } }}
            >
              <div className="w-[6px] flex-shrink-0" style={{ background: m.color }} />
              <div className="p-4 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-[14px]">{m.icon}</span>
                  <span className="text-[16px] font-bold text-white leading-tight">{m.name}</span>
                </div>
                <div className="text-[13px] text-[#6B7A99] leading-tight">{m.sub}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div variants={itemVariants} initial="hidden" animate="visible"
          className="flex items-center gap-6 pt-3">
          <div className="text-[20px] font-bold italic text-[#3B82F6]">
            Dual-lock activation: Platform Gate + Workspace Toggle
          </div>
          <div className="h-px flex-1 bg-white/5" />
          <div className="text-[16px] text-[#6B7A99]">Enable per property or workspace</div>
        </motion.div>
      </div>
    </div>
  );
}
