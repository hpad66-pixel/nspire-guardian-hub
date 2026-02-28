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
  /** Overall scale factor — 1 = default presentation size */
  scale?: number;
}

const DEFAULT_CARDS: MiniCard[] = [
  { n: "12", l: "Active Issues", c: "#1D6FE8" },
  { n: "3", l: "Inspections Today", c: "#10B981" },
  { n: "94%", l: "Compliance Score", c: "#F59E0B" },
];

export function IPhoneMockup({
  title = "Glorieta Gardens",
  cards = DEFAULT_CARDS,
  borderColor = "#1A2E52",
  scale = 1,
}: IPhoneMockupProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotateY: -8 }}
      animate={{ opacity: 1, y: 0, rotateY: 0 }}
      transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="relative mx-auto"
      style={{
        width: `${320 * scale}px`,
        perspective: "1200px",
      }}
    >
      {/* Phone shell */}
      <div
        className="relative rounded-[44px] overflow-hidden"
        style={{
          border: `3px solid ${borderColor}`,
          background: "linear-gradient(145deg, #111E38, #0B1629)",
          boxShadow: `
            0 0 0 1px rgba(255,255,255,0.06),
            0 40px 100px -20px rgba(0,0,0,0.7),
            0 0 60px -10px ${borderColor}40,
            inset 0 1px 0 rgba(255,255,255,0.05)
          `,
          padding: `${28 * scale}px ${20 * scale}px ${24 * scale}px`,
        }}
      >
        {/* Dynamic Island */}
        <div
          className="mx-auto rounded-full bg-black/80 flex items-center justify-center"
          style={{
            width: `${100 * scale}px`,
            height: `${28 * scale}px`,
            marginBottom: `${20 * scale}px`,
            boxShadow: "inset 0 1px 3px rgba(0,0,0,0.5)",
          }}
        >
          {/* Camera dot */}
          <div
            className="rounded-full"
            style={{
              width: `${8 * scale}px`,
              height: `${8 * scale}px`,
              background: "radial-gradient(circle at 30% 30%, #1a2a44, #0a0f1a)",
              boxShadow: "0 0 4px rgba(29,111,232,0.3)",
            }}
          />
        </div>

        {/* Screen content */}
        <div style={{ padding: `0 ${4 * scale}px` }}>
          {/* Status bar */}
          <div className="flex justify-between items-center" style={{ marginBottom: `${14 * scale}px` }}>
            <div className="flex items-center" style={{ gap: `${4 * scale}px` }}>
              <div
                className="rounded-full"
                style={{
                  width: `${6 * scale}px`,
                  height: `${6 * scale}px`,
                  background: "#10B981",
                  boxShadow: "0 0 8px rgba(16,185,129,0.6)",
                }}
              />
              <span
                className="font-semibold"
                style={{ fontSize: `${11 * scale}px`, color: "#10B981" }}
              >
                LIVE
              </span>
            </div>
            <span style={{ fontSize: `${10 * scale}px`, color: "#6B7A99" }}>
              apasos.ai
            </span>
          </div>

          {/* Property title */}
          <div
            className="font-bold text-white"
            style={{
              fontSize: `${15 * scale}px`,
              marginBottom: `${16 * scale}px`,
              letterSpacing: "0.01em",
            }}
          >
            {title}
          </div>

          {/* Stat cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: `${10 * scale}px` }}>
            {cards.map(({ n, l, c }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.12, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-xl"
                style={{
                  background: "linear-gradient(135deg, #1A2E52, #162744)",
                  border: "1px solid rgba(255,255,255,0.04)",
                  padding: `${14 * scale}px ${16 * scale}px`,
                }}
              >
                <div
                  className="font-bold"
                  style={{
                    fontSize: `${22 * scale}px`,
                    color: c,
                    lineHeight: 1.1,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {n}
                </div>
                <div
                  style={{
                    fontSize: `${10 * scale}px`,
                    color: "#6B7A99",
                    marginTop: `${4 * scale}px`,
                    letterSpacing: "0.02em",
                  }}
                >
                  {l}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Home indicator */}
        <div
          className="mx-auto rounded-full"
          style={{
            width: `${80 * scale}px`,
            height: `${4 * scale}px`,
            marginTop: `${20 * scale}px`,
            background: "rgba(255,255,255,0.15)",
          }}
        />
      </div>

      {/* Ambient glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          inset: `-${20 * scale}px`,
          borderRadius: "50%",
          opacity: 0.15,
          background: `radial-gradient(circle, ${borderColor === "#1A2E52" ? "#1D6FE8" : borderColor}, transparent 70%)`,
          filter: `blur(${30 * scale}px)`,
        }}
      />
    </motion.div>
  );
}
