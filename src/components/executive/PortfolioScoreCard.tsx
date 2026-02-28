import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "./AnimatedNumber";

interface PortfolioScoreCardProps {
  score: number;
  trend?: "up" | "down" | "stable";
  breakdown?: { inspections: number; compliance: number; maintenance: number };
  large?: boolean;
}

export function PortfolioScoreCard({ score, trend, breakdown, large = false }: PortfolioScoreCardProps) {
  const color = score >= 80 ? "#10B981" : score >= 60 ? "#F59E0B" : "#F43F5E";
  const label = score >= 80 ? "Excellent" : score >= 60 ? "Needs Attention" : "Critical";

  return (
    <div className={cn(
      "rounded-2xl p-8 flex flex-col gap-4",
      "bg-[#111E38] border border-white/5",
      "shadow-[0_4px_24px_rgba(0,0,0,0.25)]"
    )}>
      <div>
        <div className="eyebrow text-[#6B7A99] mb-2">
          PORTFOLIO HEALTH SCORE
        </div>
        <div className="flex items-end gap-4">
          <motion.div
            className="font-bold leading-none"
            style={{ fontSize: large ? "88px" : "64px", color }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <AnimatedNumber value={score} />
          </motion.div>
          <div className="flex flex-col gap-1 mb-2">
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: `${color}20`, color }}
            >
              {label}
            </span>
            {trend === "up" && <span className="text-[#10B981] text-xs">↑ +2 this week</span>}
            {trend === "down" && <span className="text-[#F43F5E] text-xs">↓ -3 this week</span>}
          </div>
        </div>
      </div>

      {breakdown && (
        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/5">
          {Object.entries(breakdown).map(([key, val]) => (
            <div key={key}>
              <div className="text-[10px] text-[#6B7A99] capitalize mb-1">{key}</div>
              <div className="text-white font-semibold text-sm">{val}%</div>
              <div className="h-1 rounded-full bg-white/5 mt-1">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: val >= 80 ? "#10B981" : val >= 60 ? "#F59E0B" : "#F43F5E" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${val}%` }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
