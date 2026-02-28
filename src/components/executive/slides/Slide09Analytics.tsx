import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "../slideUtils";
import { AnimatedNumber } from "../AnimatedNumber";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const SAMPLE_BAR = [
  { month: "Jan", count: 18 },
  { month: "Feb", count: 24 },
  { month: "Mar", count: 31 },
  { month: "Apr", count: 27 },
  { month: "May", count: 35 },
  { month: "Jun", count: 42 },
];

const DONUT = [
  { name: "Compliant", value: 76, color: "#10B981" },
  { name: "Action Required", value: 18, color: "#F59E0B" },
  { name: "Critical", value: 6, color: "#F43F5E" },
];

const KPIS = [
  { n: 94, suffix: "%", label: "NSPIRE Score", color: "#1D6FE8" },
  { n: 2.1, suffix: " days", label: "Avg. Issue Closure", color: "#10B981" },
  { n: 0, suffix: "", label: "Overdue Permits", color: "#F59E0B" },
  { n: 100, suffix: "%", label: "Doc Completeness", color: "#8B5CF6" },
];

export function Slide09Analytics() {
  return (
    <div className="slide-container">
      <div className="slide-accent-bar" style={{ background: "#1D6FE8" }} />
      <div className="slide-content justify-between">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-6">
          <motion.div variants={itemVariants} className="slide-tag" style={{ color: "#1D6FE8" }}>REPORTING & ANALYTICS</motion.div>
          <motion.div variants={itemVariants} className="text-[36px] font-bold text-white">
            From inspection to executive decision — in seconds.
          </motion.div>
        </motion.div>

        <div className="grid grid-cols-2 gap-8 mt-4">
          <motion.div variants={itemVariants} initial="hidden" animate="visible"
            className="rounded-2xl bg-[#111E38] border border-white/5 p-8">
            <div className="slide-tag text-[#6B7A99] mb-5">MONTHLY INSPECTIONS</div>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={SAMPLE_BAR} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "#6B7A99", fontSize: 18 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6B7A99", fontSize: 18 }} axisLine={false} tickLine={false} />
                <Bar dataKey="count" fill="#1D6FE8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div variants={itemVariants} initial="hidden" animate="visible"
            className="rounded-2xl bg-[#111E38] border border-white/5 p-8">
            <div className="slide-tag text-[#6B7A99] mb-5">COMPLIANCE STATUS</div>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie data={DONUT} cx="50%" cy="50%" innerRadius={90} outerRadius={130}
                  paddingAngle={3} dataKey="value"
                  label={({ percent }) => `${Math.round((percent ?? 0) * 100)}%`}
                  labelLine={false}>
                  {DONUT.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: "18px", color: "#6B7A99" }} />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-4 gap-5 mt-2">
          {KPIS.map((k) => (
            <motion.div key={k.label} variants={itemVariants}
              className="rounded-2xl bg-[#111E38] border border-white/5 p-6 text-center">
              <div className="text-[48px] font-bold stat-number" style={{ color: k.color }}>
                <AnimatedNumber value={k.n} suffix={k.suffix} />
              </div>
              <div className="text-[20px] text-[#6B7A99] mt-2">{k.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
