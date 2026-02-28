import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "../slideUtils";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useProjects } from "@/hooks/useProjects";
import { useIssues } from "@/hooks/useIssues";
import { Skeleton } from "@/components/ui/skeleton";

export function Slide04GlorietaCase() {
  const { data: dashboardData, isLoading: dashLoading } = useDashboardData();
  const { data: projects = [], isLoading: projLoading } = useProjects();
  const { data: issues = [], isLoading: issLoading } = useIssues();

  const activeProjects = projects.filter((p) => p.status === "active");
  const severeOpen = issues.filter((i) => i.status === "open" && i.severity === "severe");
  const isLoading = dashLoading || projLoading || issLoading;

  const metrics = [
    { n: String(activeProjects.length), label: "Active Projects", sub: "tracked simultaneously", color: "#1D6FE8" },
    { n: "100%", label: "Change Order Audit Trail", sub: "$118K CO documented", color: "#10B981" },
    { n: "3", label: "Regulatory Bodies", sub: "coordinated in real-time", color: "#F59E0B" },
    { n: String(severeOpen.length), label: "Missed Critical Deadlines", sub: "zero tolerance policy", color: "#F43F5E" },
  ];

  return (
    <div className="slide-container">
      <div className="slide-accent-bar" style={{ background: "#10B981" }} />
      <div className="slide-content">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-6">
          <motion.div variants={itemVariants} className="slide-tag" style={{ color: "#10B981" }}>LIVE DATA · CASE STUDY</motion.div>
          <motion.div variants={itemVariants} className="text-[36px] font-bold text-white">
            Glorieta Gardens — Real-Time Property Intelligence
          </motion.div>
        </motion.div>

        <div className="flex gap-10 flex-1 mt-4">
          {/* Left: Property snapshot */}
          <motion.div variants={containerVariants} initial="hidden" animate="visible"
            className="flex-1 rounded-2xl bg-[#111E38] border border-white/5 p-10 flex flex-col gap-5">
            <motion.div variants={itemVariants} className="slide-tag text-[#10B981]">PROPERTY SNAPSHOT</motion.div>
            {[
              ["Location", "13210 Alexandria Dr, Opa-locka, FL 33054"],
              ["Owner", "Glorieta Partners Ltd / R4 Capital LLC"],
              ["Owner's Rep", "APAS Consulting LLC"],
              ["Contractor", "Elementz Reconstruction"],
              ["Active Projects", isLoading ? "..." : `${activeProjects.length} concurrent scopes`],
              ["Regulators", "DERM, City of Opa-locka, FDEP"],
              ["Compliance", "Active consent order — live tracking"],
            ].map(([k, v]) => (
              <motion.div key={k} variants={itemVariants} className="flex gap-6">
                <span className="text-[20px] text-[#6B7A99] w-52 flex-shrink-0">{k}:</span>
                <span className="text-[20px] text-white">{v}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Right: Value delivered */}
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex-1 grid grid-cols-2 gap-6">
            {metrics.map((m) => (
              <motion.div key={m.label} variants={itemVariants}
                className="rounded-2xl bg-[#111E38] border border-white/5 p-8 flex flex-col gap-2">
                {isLoading ? (
                  <Skeleton className="h-16 w-24 bg-white/5" />
                ) : (
                  <div className="text-[56px] font-bold" style={{ color: m.color }}>{m.n}</div>
                )}
                <div className="text-[22px] font-semibold text-white">{m.label}</div>
                <div className="text-[18px] text-[#6B7A99]">{m.sub}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
