import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "../slideUtils";
import { BadgeCheck, GraduationCap, ShieldAlert, Link2 } from "lucide-react";

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
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-6">
          <motion.div variants={itemVariants} className="slide-tag" style={{ color: "#8B5CF6" }}>CREDENTIALS · TRAINING · SAFETY</motion.div>
          <motion.div variants={itemVariants} className="text-[36px] font-bold text-white">
            Workforce compliance — certifications, training, and incident management.
          </motion.div>
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-4 gap-6 mt-4">
          {CREDENTIAL_FEATURES.map((f) => (
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
            className="flex-1 rounded-2xl bg-[#111E38] border border-white/5 p-8">
            <div className="slide-tag text-[#6B7A99] mb-5">TEAM COMPLIANCE HEALTH</div>
            <div className="flex h-8 rounded-full overflow-hidden gap-1">
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
            <div className="flex gap-8 mt-4">
              {COMPLIANCE_COLORS.map((c) => (
                <div key={c.label} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ background: c.color }} />
                  <span className="text-[16px] text-[#6B7A99]">{c.label} ({c.pct}%)</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div variants={containerVariants} initial="hidden" animate="visible"
            className="w-[500px] rounded-2xl bg-[#111E38] border border-white/5 p-8">
            <div className="slide-tag text-[#F43F5E] mb-5">SAFETY INCIDENT FLOW</div>
            <div className="space-y-3">
              {SAFETY_FLOW.map((s, i) => (
                <motion.div key={s} variants={itemVariants} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#F43F5E]/20 flex items-center justify-center text-[14px] text-[#F43F5E] font-bold flex-shrink-0">
                    {i + 1}
                  </div>
                  <span className="text-[18px] text-white">{s}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
