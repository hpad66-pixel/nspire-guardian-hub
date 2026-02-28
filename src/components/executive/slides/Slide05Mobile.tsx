import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "../slideUtils";
import { IPhoneMockup } from "../IPhoneMockup";

const PHONES = [
  {
    title: "Dashboard",
    borderColor: "#1D6FE8",
    cards: [
      { n: "12", l: "Active Issues", c: "#1D6FE8" },
      { n: "3", l: "Inspections Due", c: "#10B981" },
      { n: "14d", l: "Permit Exp", c: "#F59E0B" },
    ],
  },
  {
    title: "Field Inspector",
    borderColor: "#10B981",
    cards: [
      { n: "▶", l: "Start Inspection", c: "#10B981" },
      { n: "📷", l: "Upload Photo", c: "#1D6FE8" },
      { n: "⚡", l: "Auto-Create Issue", c: "#F59E0B" },
    ],
  },
  {
    title: "Executive",
    borderColor: "#F59E0B",
    cards: [
      { n: "94%", l: "Portfolio Score", c: "#10B981" },
      { n: "-2%", l: "Budget Variance", c: "#1D6FE8" },
      { n: "✓", l: "Compliance: Green", c: "#10B981" },
    ],
  },
];

export function Slide05Mobile() {
  return (
    <div className="slide-container">
      <div className="slide-accent-bar" style={{ background: "#8B5CF6" }} />
      <div className="slide-content">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-4">
          <motion.div variants={itemVariants} className="slide-tag" style={{ color: "#8B5CF6" }}>ANYWHERE ACCESS</motion.div>
          <motion.div variants={itemVariants} className="text-[18px] font-bold text-white">
            Your portfolio travels with you. No calls. No delays. No excuses.
          </motion.div>
        </motion.div>

        <div className="flex gap-8 items-center justify-center flex-1 mt-4">
          {PHONES.map((phone, index) => (
            <motion.div
              key={phone.title}
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: index * 0.4 }}
            >
              <IPhoneMockup title={phone.title} cards={phone.cards} borderColor={phone.borderColor} />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
