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
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-6">
          <motion.div variants={itemVariants} className="slide-tag" style={{ color: "#F59E0B" }}>CONSTRUCTION PROJECT MANAGEMENT</motion.div>
          <motion.div variants={itemVariants} className="text-[36px] font-bold text-white">
            From groundbreaking to closeout — every dollar, every day, fully documented.
          </motion.div>
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-4 gap-6 mt-4">
          {PROJECT_FEATURES.map((f) => (
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
          <div className="flex items-center gap-4 mb-5">
            <ClipboardList className="h-7 w-7 text-[#F59E0B]" />
            <div className="slide-tag text-[#6B7A99]">DAILY FIELD REPORT — 12 SECTIONS</div>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-[#F43F5E]" />
              <span className="text-[18px] text-[#F43F5E] font-bold">Safety FAB — always visible</span>
            </div>
          </div>
          <div className="grid grid-cols-6 gap-4">
            {DAILY_REPORT_SECTIONS.map((s) => (
              <motion.div key={s} variants={itemVariants}
                className="rounded-xl bg-[#0B1629] border border-white/5 px-4 py-4 text-center">
                <div className="text-[18px] text-white">{s}</div>
              </motion.div>
            ))}
          </div>
          <div className="text-[16px] text-[#6B7A99] mt-4 italic">
            Project-type aware content (Water/Sewer vs. Building) • Tiptap rich-text editor • Auto-linked to Issues engine
          </div>
        </motion.div>
      </div>
    </div>
  );
}
