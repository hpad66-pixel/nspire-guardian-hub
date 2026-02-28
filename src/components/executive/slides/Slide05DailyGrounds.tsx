import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "../slideUtils";
import { Camera, Mic, Clock, MapPin, CheckCircle2, AlertOctagon } from "lucide-react";

const SECTION_CARDS = [
  "Pool Area", "Parking Lot", "Landscaping", "Building Exterior",
  "Lighting", "Fencing & Gates", "Signage", "Trash / Dumpsters",
  "Playground", "Common Areas", "Retention Ponds", "Lift Stations",
];

const WORKFLOW_STEPS = [
  { icon: Camera, label: "Photo-First Capture", desc: "Rear-camera documentation for every finding", color: "#1D6FE8" },
  { icon: Mic, label: "Voice Dictation", desc: "ElevenLabs-powered voice notes in the field", color: "#8B5CF6" },
  { icon: Clock, label: "Auto-Save (30s)", desc: "Debounced localStorage — never lose work", color: "#10B981" },
  { icon: MapPin, label: "Asset-Linked", desc: "5 assets per property, auto-populated daily", color: "#F59E0B" },
];

export function Slide05DailyGrounds() {
  return (
    <div className="slide-container">
      <div className="slide-accent-bar" style={{ background: "#10B981" }} />
      <div className="slide-content justify-between">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-4">
          <motion.div variants={itemVariants} className="slide-tag" style={{ color: "#10B981" }}>DAILY GROUNDS INSPECTIONS</motion.div>
          <motion.div variants={itemVariants} className="text-[18px] font-bold text-white">
            12 status-aware section cards. Photo-first. Voice-enabled. Zero data loss.
          </motion.div>
        </motion.div>

        <div className="flex gap-6 mt-6 flex-1">
          {/* Left: 12 section grid */}
          <motion.div variants={containerVariants} initial="hidden" animate="visible"
            className="flex-1 rounded-xl bg-[#111E38] border border-white/5 p-5">
            <div className="text-[10px] font-bold text-[#6B7A99] tracking-widest mb-3">INSPECTOR DASHBOARD — 12 SECTIONS</div>
            <div className="grid grid-cols-3 gap-2">
              {SECTION_CARDS.map((s, i) => (
                <motion.div key={s} variants={itemVariants}
                  className="rounded-lg bg-[#0B1629] border border-white/5 px-3 py-2.5 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${i < 8 ? "bg-[#10B981]" : i < 10 ? "bg-[#F59E0B]" : "bg-[#6B7A99]"}`} />
                  <span className="text-[9px] text-white truncate">{s}</span>
                </motion.div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-3 text-[8px] text-[#6B7A99]">
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-[#10B981]" /> OK</span>
              <span className="flex items-center gap-1"><AlertOctagon className="h-3 w-3 text-[#F59E0B]" /> Attention</span>
              <span className="flex items-center gap-1"><AlertOctagon className="h-3 w-3 text-[#F43F5E]" /> Defect → Auto Issue</span>
            </div>
          </motion.div>

          {/* Right: Workflow features */}
          <motion.div variants={containerVariants} initial="hidden" animate="visible"
            className="w-[320px] flex flex-col gap-3">
            {WORKFLOW_STEPS.map((w) => (
              <motion.div key={w.label} variants={itemVariants}
                className="rounded-xl bg-[#111E38] border border-white/5 p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${w.color}20` }}>
                  <w.icon className="h-4 w-4" style={{ color: w.color }} />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-white">{w.label}</div>
                  <div className="text-[9px] text-[#6B7A99]">{w.desc}</div>
                </div>
              </motion.div>
            ))}
            <div className="rounded-xl border border-[#10B981]/30 bg-[#10B981]/10 p-3 text-center">
              <div className="text-[9px] text-[#10B981] font-bold">SUPERVISOR REVIEW → ADDENDUM SYSTEM</div>
              <div className="text-[8px] text-[#6B7A99] mt-1">Locked after submission. Audit-grade integrity.</div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
