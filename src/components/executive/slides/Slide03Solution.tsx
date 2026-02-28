import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "../slideUtils";

const MODULES = [
  { name: "NSPIRE Inspections", sub: "130+ defects, REAC scoring", color: "#1D6FE8" },
  { name: "Daily Grounds", sub: "12-section photo-first inspections", color: "#10B981" },
  { name: "Construction Projects", sub: "Milestones, COs, RFIs, daily reports", color: "#F59E0B" },
  { name: "Issues & Work Orders", sub: "Unified detection to verification", color: "#F43F5E" },
  { name: "Permits & Compliance", sub: "Lifecycle tracking, deadline alerts", color: "#F59E0B" },
  { name: "Equipment & Fleet", sub: "Assets, check-out/in, doc compliance", color: "#8B5CF6" },
  { name: "Asset Management", sub: "QR-code scanning, condition logs", color: "#1D6FE8" },
  { name: "Material Inventory", sub: "Stock levels, low-stock alerts, audits", color: "#10B981" },
  { name: "Credentials Wallet", sub: "Certifications, insurance, share links", color: "#1D6FE8" },
  { name: "Training Academy", sub: "SCORM courses, progress, certificates", color: "#8B5CF6" },
  { name: "Safety / OSHA", sub: "Incident logging, 300/300A reports", color: "#F43F5E" },
  { name: "Client Portals", sub: "Branded portals, messaging, actions", color: "#10B981" },
  { name: "CaseIQ (AI)", sub: "Regulatory doc AI review & extraction", color: "#F43F5E" },
  { name: "HR Document Vault", sub: "Employee files, expiry tracking", color: "#F59E0B" },
  { name: "Utility Tracking", sub: "Bills, trends, cost-per-unit analytics", color: "#1D6FE8" },
  { name: "Executive Suite", sub: "Portfolio dashboards & presentations", color: "#10B981" },
  { name: "Documents & CRM", sub: "Centralized records & contact management", color: "#6B7A99" },
  { name: "Command Center", sub: "Unified dashboard — all modules", color: "#1D6FE8" },
];

export function Slide03Solution() {
  return (
    <div className="slide-container">
      <div className="slide-accent-bar" style={{ background: "#1D6FE8" }} />
      <div className="slide-content justify-between">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-4">
          <motion.div variants={itemVariants} className="slide-tag" style={{ color: "#3B82F6" }}>THE PLATFORM</motion.div>
          <motion.div variants={itemVariants} className="text-[18px] font-bold text-white">
            18 integrated modules — one login, every property.
          </motion.div>
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-6 gap-2 flex-1 mt-6 content-start">
          {MODULES.map((m) => (
            <motion.div key={m.name} variants={itemVariants} className="flex rounded-lg overflow-hidden bg-[#111E38] border border-white/5 hover:border-[rgba(29,111,232,0.3)] transition-colors">
              <div className="w-1 flex-shrink-0" style={{ background: m.color }} />
              <div className="p-3 flex flex-col gap-0.5">
                <div className="text-[10px] font-bold text-white leading-tight">{m.name}</div>
                <div className="text-[8px] text-[#6B7A99] leading-tight">{m.sub}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div variants={itemVariants} initial="hidden" animate="visible" className="text-[11px] font-bold italic text-[#3B82F6] pt-3">
          Dual-lock activation: Platform Gate + Workspace Toggle. Enable per property or workspace.
        </motion.div>
      </div>
    </div>
  );
}
