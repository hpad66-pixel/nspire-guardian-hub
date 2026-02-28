import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "../slideUtils";
import { AnimatedNumber } from "../AnimatedNumber";
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
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-4">
          <motion.div variants={itemVariants} className="slide-tag" style={{ color: "#F43F5E" }}>UNIFIED ISSUES & WORK ORDERS</motion.div>
          <motion.div variants={itemVariants} className="text-[18px] font-bold text-white">
            Every defect, every module — one engine. Detection to verification.
          </motion.div>
        </motion.div>

        {/* Lifecycle flow */}
        <motion.div variants={containerVariants} initial="hidden" animate="visible"
          className="flex items-stretch gap-3 mt-6">
          {LIFECYCLE.map((step, i) => (
            <motion.div key={step.label} variants={itemVariants} className="flex items-center gap-3 flex-1">
              <div className="rounded-xl bg-[#111E38] border border-white/5 p-5 flex flex-col gap-3 flex-1">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${step.color}20` }}>
                  <step.icon className="h-5 w-5" style={{ color: step.color }} />
                </div>
                <div className="text-[12px] font-bold text-white">{step.label}</div>
                <div className="text-[9px] text-[#6B7A99] leading-relaxed">{step.desc}</div>
              </div>
              {i < LIFECYCLE.length - 1 && (
                <motion.div
                  className="text-[#6B7A99] text-lg flex-shrink-0"
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >→</motion.div>
              )}
            </motion.div>
          ))}
        </motion.div>

        {/* Auto-trigger sources */}
        <motion.div variants={containerVariants} initial="hidden" animate="visible"
          className="rounded-xl bg-[#111E38] border border-white/5 p-5 mt-4">
          <div className="text-[10px] font-bold text-[#6B7A99] tracking-widest mb-3">AUTO-TRIGGER SOURCES</div>
          <div className="grid grid-cols-3 gap-2">
            {TRIGGERS.map((t) => (
              <motion.div key={t} variants={itemVariants}
                className="flex items-center gap-2 text-[10px] text-white">
                <div className="w-1.5 h-1.5 rounded-full bg-[#F43F5E] flex-shrink-0" />
                {t}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
