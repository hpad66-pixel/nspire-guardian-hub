import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "../slideUtils";
import { AlertTriangle, Wrench, ArrowRight, CheckCircle } from "lucide-react";

const LIFECYCLE = [
  { label: "Detected", icon: AlertTriangle, color: "#F43F5E", desc: "Auto-created from inspections, field reports, or manual entry" },
  { label: "Assigned", icon: Wrench, color: "#F59E0B", desc: "Routed to team member with priority, photos & due date" },
  { label: "In Progress", icon: ArrowRight, color: "#1D6FE8", desc: "Real-time status updates, comments & @mentions" },
  { label: "Verified", icon: CheckCircle, color: "#10B981", desc: "Photo proof-of-repair + supervisor sign-off" },
];

const TRIGGERS = [
  "NSPIRE defect (severe) → auto-creates Issue",
  "Daily grounds defect → auto-creates Issue",
  "Safety incident → auto-creates Issue",
  "Overdue credential → auto-creates Issue",
  "Permit expiry warning → auto-creates Issue",
  "Manual entry from any module",
];

export function Slide07IssuesWorkOrders() {
  return (
    <div className="slide-container">
      <div className="slide-accent-bar" style={{ background: "#F43F5E" }} />
      <div className="slide-content justify-between">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-6">
          <motion.div variants={itemVariants} className="slide-tag" style={{ color: "#F43F5E" }}>UNIFIED ISSUES & WORK ORDERS</motion.div>
          <motion.div variants={itemVariants} className="text-[36px] font-bold text-white">
            Every defect, every module — one engine. Detection to verification.
          </motion.div>
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible"
          className="flex items-stretch gap-5 mt-4">
          {LIFECYCLE.map((step, i) => (
            <motion.div key={step.label} variants={itemVariants} className="flex items-center gap-5 flex-1">
              <div className="rounded-2xl bg-[#111E38] border border-white/5 p-8 flex flex-col gap-5 flex-1">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: `${step.color}20` }}>
                  <step.icon className="h-7 w-7" style={{ color: step.color }} />
                </div>
                <div className="text-[24px] font-bold text-white">{step.label}</div>
                <div className="text-[18px] text-[#6B7A99] leading-relaxed">{step.desc}</div>
              </div>
              {i < LIFECYCLE.length - 1 && (
                <motion.div
                  className="text-[#6B7A99] text-3xl flex-shrink-0"
                  animate={{ x: [0, 6, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >→</motion.div>
              )}
            </motion.div>
          ))}
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible"
          className="rounded-2xl bg-[#111E38] border border-white/5 p-8 mt-2">
          <div className="slide-tag text-[#6B7A99] mb-5">AUTO-TRIGGER SOURCES</div>
          <div className="grid grid-cols-3 gap-4">
            {TRIGGERS.map((t) => (
              <motion.div key={t} variants={itemVariants}
                className="flex items-center gap-3 text-[20px] text-white">
                <div className="w-3 h-3 rounded-full bg-[#F43F5E] flex-shrink-0" />
                {t}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
