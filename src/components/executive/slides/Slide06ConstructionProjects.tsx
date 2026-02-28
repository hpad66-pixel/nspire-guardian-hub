import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "../slideUtils";
import { HardHat, FileText, DollarSign, Users, ClipboardList, AlertTriangle } from "lucide-react";

const PROJECT_FEATURES = [
  { icon: HardHat, label: "Full Project Lifecycle", desc: "From RFP to punch-list closeout — milestones, schedules, and budget tracking", color: "#1D6FE8" },
  { icon: DollarSign, label: "Change Orders", desc: "Full audit trail with approval workflows, dollar tracking, and scope documentation", color: "#10B981" },
  { icon: FileText, label: "RFIs & Submittals", desc: "Structured request-for-information workflow with response tracking", color: "#F59E0B" },
  { icon: Users, label: "Subcontractor Logs", desc: "Daily headcount, trade tracking, and subcontractor performance notes", color: "#8B5CF6" },
];

const DAILY_REPORT_SECTIONS = [
  "Manpower", "Work Performed", "Materials", "Equipment",
  "Safety Notes", "Delays", "Weather", "Visitor Log",
  "Subcontractors", "Photos", "Issues", "Signature",
];

export function Slide06ConstructionProjects() {
  return (
    <div className="slide-container">
      <div className="slide-accent-bar" style={{ background: "#F59E0B" }} />
      <div className="slide-content justify-between">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-4">
          <motion.div variants={itemVariants} className="slide-tag" style={{ color: "#F59E0B" }}>CONSTRUCTION PROJECT MANAGEMENT</motion.div>
          <motion.div variants={itemVariants} className="text-[18px] font-bold text-white">
            From groundbreaking to closeout — every dollar, every day, fully documented.
          </motion.div>
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-4 gap-4 mt-6">
          {PROJECT_FEATURES.map((f) => (
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
          className="rounded-xl bg-[#111E38] border border-white/5 p-6 mt-4">
          <div className="flex items-center gap-3 mb-4">
            <ClipboardList className="h-4 w-4 text-[#F59E0B]" />
            <div className="text-[10px] font-bold text-[#6B7A99] tracking-widest">DAILY FIELD REPORT — 12 SECTIONS</div>
            <div className="flex-1" />
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3 text-[#F43F5E]" />
              <span className="text-[9px] text-[#F43F5E] font-bold">Safety FAB — always visible</span>
            </div>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {DAILY_REPORT_SECTIONS.map((s, i) => (
              <motion.div key={s} variants={itemVariants}
                className="rounded-lg bg-[#0B1629] border border-white/5 px-3 py-2 text-center">
                <div className="text-[9px] text-white">{s}</div>
              </motion.div>
            ))}
          </div>
          <div className="text-[8px] text-[#6B7A99] mt-3 italic">
            Project-type aware content (Water/Sewer vs. Building) • Tiptap rich-text editor • Auto-linked to Issues engine
          </div>
        </motion.div>
      </div>
    </div>
  );
}
