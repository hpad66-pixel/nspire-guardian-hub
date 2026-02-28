import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "../slideUtils";
import { BadgeCheck, GraduationCap, ShieldAlert, Link2, AlertTriangle, FileText } from "lucide-react";

const CREDENTIAL_FEATURES = [
  { icon: BadgeCheck, label: "Credential Wallet", desc: "Licenses, certifications, insurance — per team member with expiry tracking", color: "#1D6FE8" },
  { icon: Link2, label: "Secure Share Links", desc: "Generate public verification links for contractors & regulators", color: "#10B981" },
  { icon: GraduationCap, label: "Training Academy", desc: "SCORM/xAPI course hosting, progress tracking, and completion certificates", color: "#8B5CF6" },
  { icon: ShieldAlert, label: "Safety / OSHA", desc: "Mobile incident logging, automated OSHA 300/300A report generation", color: "#F43F5E" },
];

const COMPLIANCE_COLORS = [
  { label: "Valid (>60 days)", color: "#10B981", pct: 72 },
  { label: "Expiring Soon (30-60d)", color: "#F59E0B", pct: 18 },
  { label: "Expired / Critical", color: "#F43F5E", pct: 10 },
];

const SAFETY_FLOW = [
  "Incident occurs in field",
  "Safety FAB → 1-tap log entry",
  "Photos + voice notes captured",
  "Auto-creates Severe Issue",
  "OSHA 300 log auto-updated",
  "300A annual summary generated",
];

export function Slide10CredentialsSafety() {
  return (
    <div className="slide-container">
      <div className="slide-accent-bar" style={{ background: "#8B5CF6" }} />
      <div className="slide-content justify-between">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-4">
          <motion.div variants={itemVariants} className="slide-tag" style={{ color: "#8B5CF6" }}>CREDENTIALS · TRAINING · SAFETY</motion.div>
          <motion.div variants={itemVariants} className="text-[18px] font-bold text-white">
            Workforce compliance — certifications, training, and incident management.
          </motion.div>
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-4 gap-4 mt-6">
          {CREDENTIAL_FEATURES.map((f) => (
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

        <div className="flex gap-4 mt-4">
          {/* Compliance health bar */}
          <motion.div variants={containerVariants} initial="hidden" animate="visible"
            className="flex-1 rounded-xl bg-[#111E38] border border-white/5 p-5">
            <div className="text-[10px] font-bold text-[#6B7A99] tracking-widest mb-3">TEAM COMPLIANCE HEALTH</div>
            <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
              {COMPLIANCE_COLORS.map((c) => (
                <motion.div key={c.label}
                  style={{ background: c.color, width: `${c.pct}%` }}
                  className="h-full rounded-full"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                />
              ))}
            </div>
            <div className="flex gap-4 mt-2">
              {COMPLIANCE_COLORS.map((c) => (
                <div key={c.label} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                  <span className="text-[8px] text-[#6B7A99]">{c.label} ({c.pct}%)</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Safety flow */}
          <motion.div variants={containerVariants} initial="hidden" animate="visible"
            className="w-[280px] rounded-xl bg-[#111E38] border border-white/5 p-5">
            <div className="text-[10px] font-bold text-[#F43F5E] tracking-widest mb-3">SAFETY INCIDENT FLOW</div>
            <div className="space-y-1.5">
              {SAFETY_FLOW.map((s, i) => (
                <motion.div key={s} variants={itemVariants} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#F43F5E]/20 flex items-center justify-center text-[7px] text-[#F43F5E] font-bold flex-shrink-0">
                    {i + 1}
                  </div>
                  <span className="text-[9px] text-white">{s}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
