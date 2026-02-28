import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "../slideUtils";
import { AlertTriangle, Building2, ShieldAlert } from "lucide-react";
import { type LucideIcon } from "lucide-react";

function ProblemCard({ title, body, color, icon: Icon }: { title: string; body: string; color: string; icon: LucideIcon }) {
  return (
    <motion.div
      variants={itemVariants}
      className="flex-1 rounded-2xl p-6 flex flex-col gap-4"
      style={{
        background: "#111E38",
        border: `1.5px solid ${color}`,
        boxShadow: `0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)`,
      }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}20` }}>
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <div className="font-bold text-white text-[13px] leading-tight">{title}</div>
      <div className="text-[#6B7A99] text-[11px] leading-relaxed flex-1">{body}</div>
    </motion.div>
  );
}

export function Slide02Problem() {
  return (
    <div className="slide-container">
      <div className="slide-accent-bar" style={{ background: "#F43F5E" }} />
      <div className="slide-content justify-between">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-6">
          <motion.div variants={itemVariants} className="slide-tag" style={{ color: "#F43F5E" }}>THE PROBLEM</motion.div>
          <motion.div variants={itemVariants} className="text-[17px] text-white max-w-2xl">
            Managing hundreds of properties without a single source of truth...
          </motion.div>
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex gap-5 flex-1 mt-8">
          <ProblemCard
            title="Fragmented Operations"
            body="Inspections, work orders, permits, and projects scattered across emails, spreadsheets, and phone calls. Nothing is connected."
            color="#F43F5E"
            icon={AlertTriangle}
          />
          <ProblemCard
            title="No Visibility at Scale"
            body="Owning 200+ properties means flying blind. You're asking 500 questions to get one answer. That's not ownership — that's firefighting."
            color="#F59E0B"
            icon={Building2}
          />
          <ProblemCard
            title="Compliance Exposure"
            body="DERM consent orders, NSPIRE audits, permit deadlines — a single miss can halt operations. Manual tracking cannot keep pace."
            color="#1D6FE8"
            icon={ShieldAlert}
          />
        </motion.div>

        <motion.div variants={itemVariants} initial="hidden" animate="visible" className="text-[10px] italic text-[#6B7A99] pt-4">
          "The question is no longer whether you need a platform — it's whether you can afford not to have one."
        </motion.div>
      </div>
    </div>
  );
}
