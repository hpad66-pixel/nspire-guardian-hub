import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "../slideUtils";
import { AlertTriangle, Building2, ShieldAlert, DollarSign } from "lucide-react";
import { type LucideIcon } from "lucide-react";

function ProblemCard({ title, body, stat, color, icon: Icon, delay }: { title: string; body: string; stat: string; color: string; icon: LucideIcon; delay: number }) {
  return (
    <motion.div
      variants={itemVariants}
      className="flex-1 rounded-3xl p-10 flex flex-col gap-6 relative overflow-hidden"
      style={{
        background: "#111E38",
        border: `2px solid ${color}30`,
        boxShadow: `0 8px 40px rgba(0,0,0,0.3)`,
      }}
      whileHover={{ borderColor: color, y: -4, transition: { duration: 0.2 } }}
    >
      {/* Ambient glow */}
      <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-10" style={{ background: color, filter: "blur(40px)" }} />
      <div className="flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: `${color}20` }}>
          <Icon className="h-8 w-8" style={{ color }} />
        </div>
        <motion.div
          className="text-[40px] font-bold"
          style={{ color }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: delay + 0.3, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          {stat}
        </motion.div>
      </div>
      <div className="font-bold text-white text-[26px] leading-tight">{title}</div>
      <div className="text-[#6B7A99] text-[20px] leading-relaxed flex-1">{body}</div>
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
          <motion.div variants={itemVariants} className="text-[38px] text-white font-bold max-w-[1400px]">
            Managing hundreds of properties without a single source of truth is a liability.
          </motion.div>
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex gap-8 flex-1 mt-6">
          <ProblemCard
            title="Fragmented Operations"
            body="Inspections, work orders, permits, and projects scattered across emails, spreadsheets, and phone calls. Nothing connects."
            stat="8+"
            color="#F43F5E"
            icon={AlertTriangle}
            delay={0.1}
          />
          <ProblemCard
            title="No Visibility at Scale"
            body="Owning 200+ properties means flying blind. You ask 500 questions to get one answer. That's firefighting — not ownership."
            stat="500+"
            color="#F59E0B"
            icon={Building2}
            delay={0.2}
          />
          <ProblemCard
            title="Compliance Exposure"
            body="DERM consent orders, NSPIRE audits, permit deadlines — a single miss can halt operations. Manual tracking cannot keep pace."
            stat="$$$"
            color="#1D6FE8"
            icon={ShieldAlert}
            delay={0.3}
          />
          <ProblemCard
            title="Cost of Inaction"
            body="Failed inspections, expired permits, untracked change orders — each one is a six-figure risk hiding in a spreadsheet."
            stat="6-fig"
            color="#8B5CF6"
            icon={DollarSign}
            delay={0.4}
          />
        </motion.div>

        <motion.div
          variants={itemVariants} initial="hidden" animate="visible"
          className="text-[22px] italic text-[#6B7A99] pt-4 border-t border-white/5 mt-2"
        >
          "The question is no longer whether you need a platform — it's whether you can afford not to have one."
        </motion.div>
      </div>
    </div>
  );
}
