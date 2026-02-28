import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "../slideUtils";
import { Globe, Brain, FileSearch, MessageSquare, FolderOpen, Users } from "lucide-react";

const PORTAL_FEATURES = [
  { icon: Globe, label: "Branded Client Portals", desc: "White-label portals with custom branding, shared modules, and welcome messages", color: "#1D6FE8" },
  { icon: MessageSquare, label: "Client Messaging", desc: "Threaded communication with read receipts and action-item resolution", color: "#10B981" },
  { icon: FolderOpen, label: "Shared Documents", desc: "Selective module sharing — photos, reports, permits, change orders", color: "#F59E0B" },
  { icon: Users, label: "Action Items", desc: "Structured requests: approvals, selections, document uploads", color: "#8B5CF6" },
];

const CASEIQ_FEATURES = [
  { icon: Brain, label: "AI Regulatory Review", desc: "Upload consent orders, permits, or compliance docs — get instant AI analysis", color: "#F43F5E" },
  { icon: FileSearch, label: "Risk Identification", desc: "Auto-extracts deadlines, obligations, penalties, and compliance gaps", color: "#1D6FE8" },
];

const HR_FEATURES = [
  "Employee document categories (system + custom)",
  "File upload with expiry tracking",
  "Per-employee document vault",
  "Workspace-scoped organization",
];

export function Slide11ClientPortalsCaseIQ() {
  return (
    <div className="slide-container">
      <div className="slide-accent-bar" style={{ background: "#1D6FE8" }} />
      <div className="slide-content justify-between">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-6">
          <motion.div variants={itemVariants} className="slide-tag" style={{ color: "#1D6FE8" }}>CLIENT PORTALS · CASE IQ · HR VAULT</motion.div>
          <motion.div variants={itemVariants} className="text-[36px] font-bold text-white">
            Stakeholder engagement. AI intelligence. Workforce documentation.
          </motion.div>
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-4 gap-6 mt-4">
          {PORTAL_FEATURES.map((f) => (
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

        <div className="flex gap-6 mt-2">
          <motion.div variants={containerVariants} initial="hidden" animate="visible"
            className="flex-1 rounded-2xl bg-[#111E38] border border-[#F43F5E]/20 p-8">
            <div className="slide-tag text-[#F43F5E] mb-5">CASE IQ — AI REGULATORY REVIEW</div>
            <div className="grid grid-cols-2 gap-6">
              {CASEIQ_FEATURES.map((f) => (
                <motion.div key={f.label} variants={itemVariants} className="flex items-start gap-5">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${f.color}20` }}>
                    <f.icon className="h-6 w-6" style={{ color: f.color }} />
                  </div>
                  <div>
                    <div className="text-[20px] font-bold text-white">{f.label}</div>
                    <div className="text-[16px] text-[#6B7A99] mt-1">{f.desc}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div variants={containerVariants} initial="hidden" animate="visible"
            className="w-[460px] rounded-2xl bg-[#111E38] border border-white/5 p-8">
            <div className="slide-tag text-[#6B7A99] mb-5">HR DOCUMENT VAULT</div>
            <div className="space-y-4">
              {HR_FEATURES.map((f) => (
                <motion.div key={f} variants={itemVariants} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-[#1D6FE8] flex-shrink-0" />
                  <span className="text-[18px] text-white">{f}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
