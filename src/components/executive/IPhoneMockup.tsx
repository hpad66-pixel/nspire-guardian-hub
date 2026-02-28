import { motion } from "framer-motion";

interface MiniCard {
  n: string;
  l: string;
  c: string;
}

interface IPhoneMockupProps {
  title?: string;
  cards?: MiniCard[];
  borderColor?: string;
}

const DEFAULT_CARDS: MiniCard[] = [
  { n: "12", l: "Active Issues", c: "#1D6FE8" },
  { n: "3", l: "Inspections Today", c: "#10B981" },
  { n: "94%", l: "Compliance Score", c: "#F59E0B" },
];

export function IPhoneMockup({ title = "Glorieta Gardens", cards = DEFAULT_CARDS, borderColor = "#1A2E52" }: IPhoneMockupProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotateY: -15 }}
      animate={{ opacity: 1, y: 0, rotateY: 0 }}
      transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="relative mx-auto"
      style={{ width: "220px", maxWidth: "90%", perspective: "800px" }}
    >
      <div
        className="relative rounded-[36px] bg-[#111E38] shadow-[0_30px_80px_rgba(0,0,0,0.5),0_0_0_1px_rgba(29,111,232,0.3)]"
        style={{ border: `6px solid ${borderColor}`, paddingTop: "20px", paddingBottom: "20px" }}
      >
        {/* Dynamic Island */}
        <div className="mx-auto mb-2 rounded-full bg-[#0B1629]" style={{ width: "80px", height: "20px" }} />

        <div className="px-4 space-y-2">
          <div className="flex justify-between text-[8px] text-[#10B981]">
            <span>● LIVE</span>
            <span>apasos.ai</span>
          </div>
          <div className="text-white font-semibold text-[10px]">{title}</div>
          {cards.map(({ n, l, c }, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="rounded-lg p-2"
              style={{ background: "#1A2E52" }}
            >
              <div className="font-bold text-[16px]" style={{ color: c }}>{n}</div>
              <div className="text-[8px] text-[#6B7A99]">{l}</div>
            </motion.div>
          ))}
        </div>

        <div className="mx-auto mt-3 rounded-full bg-white/20" style={{ width: "60px", height: "3px" }} />
      </div>

      {/* Glow */}
      <div
        className="absolute -inset-4 rounded-full opacity-20 blur-2xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #1D6FE8, transparent 70%)" }}
      />
    </motion.div>
  );
}
