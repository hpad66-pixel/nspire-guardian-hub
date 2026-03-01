import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "../slideUtils";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useProjects } from "@/hooks/useProjects";
import { useIssues } from "@/hooks/useIssues";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedNumber } from "../AnimatedNumber";
import { MapPin, Building2, Users, Shield } from "lucide-react";

export function Slide04GlorietaCase() {
  const { data: dashboardData, isLoading: dashLoading } = useDashboardData();
  const { data: projects = [], isLoading: projLoading } = useProjects();
  const { data: issues = [], isLoading: issLoading } = useIssues();

  const activeProjects = projects.filter((p) => p.status === "active");
  const severeOpen = issues.filter((i) => i.status === "open" && i.severity === "severe");
  const isLoading = dashLoading || projLoading || issLoading;

  const metrics = [
    { n: activeProjects.length, label: "Active Projects", sub: "tracked simultaneously", color: "#1D6FE8", icon: Building2 },
    { n: 100, label: "CO Audit Trail", sub: "$118K documented", color: "#10B981", icon: Shield, suffix: "%" },
    { n: 3, label: "Regulatory Bodies", sub: "coordinated in real-time", color: "#F59E0B", icon: Users },
    { n: severeOpen.length, label: "Missed Deadlines", sub: "zero tolerance policy", color: "#F43F5E", icon: Shield },
  ];

  const PROPERTY_INFO = [
    { icon: MapPin, k: "Location", v: "13210 Alexandria Dr, Opa-locka, FL 33054" },
    { icon: Building2, k: "Owner", v: "Glorieta Partners Ltd / R4 Capital LLC" },
    { icon: Users, k: "Owner's Rep", v: "APAS Consulting LLC" },
    { icon: Building2, k: "Contractor", v: "Elementz Reconstruction" },
    { icon: Shield, k: "Regulators", v: "DERM · City of Opa-locka · FDEP" },
    { icon: Shield, k: "Compliance", v: "Active consent order — live tracking" },
  ];

  return (
    <div className="slide-container">
      <div className="slide-accent-bar" style={{ background: "#10B981" }} />
      <div className="slide-content">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <motion.div variants={itemVariants} className="slide-tag" style={{ color: "#10B981" }}>LIVE DATA · CASE STUDY</motion.div>
            <motion.div
              variants={itemVariants}
              className="px-3 py-1 rounded-full text-[14px] font-bold"
              style={{ background: "#10B98120", color: "#10B981" }}
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              ● LIVE
            </motion.div>
          </div>
          <motion.div variants={itemVariants} className="text-[36px] font-bold text-white">
            Glorieta Gardens — Real-Time Property Intelligence
          </motion.div>
        </motion.div>

        <div className="flex gap-10 flex-1 mt-4">
          {/* Left: Property snapshot */}
          <motion.div variants={containerVariants} initial="hidden" animate="visible"
            className="flex-1 rounded-2xl bg-[#111E38] border border-white/5 p-10 flex flex-col gap-5">
            <motion.div variants={itemVariants} className="slide-tag text-[#10B981]">PROPERTY SNAPSHOT</motion.div>
            {PROPERTY_INFO.map(({ icon: Icon, k, v }) => (
              <motion.div key={k} variants={itemVariants} className="flex items-center gap-4">
                <Icon className="h-5 w-5 text-[#6B7A99] flex-shrink-0" />
                <span className="text-[18px] text-[#6B7A99] w-40 flex-shrink-0">{k}</span>
                <span className="text-[18px] text-white">{v}</span>
              </motion.div>
            ))}
            <motion.div variants={itemVariants} className="mt-auto pt-4 border-t border-white/5 text-[16px] text-[#6B7A99] italic">
              Active projects: {isLoading ? "..." : `${activeProjects.length} concurrent scopes`}
            </motion.div>
          </motion.div>

          {/* Right: Value delivered */}
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex-1 grid grid-cols-2 gap-6">
            {metrics.map((m) => (
              <motion.div key={m.label} variants={itemVariants}
                className="rounded-2xl bg-[#111E38] border border-white/5 p-8 flex flex-col gap-2 relative overflow-hidden"
                whileHover={{ borderColor: `${m.color}40` }}
              >
                <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full opacity-10" style={{ background: m.color, filter: "blur(20px)" }} />
                {isLoading ? (
                  <Skeleton className="h-16 w-24 bg-white/5" />
                ) : (
                  <div className="text-[52px] font-bold" style={{ color: m.color }}>
                    <AnimatedNumber value={m.n} suffix={m.suffix || ""} />
                  </div>
                )}
                <div className="text-[20px] font-semibold text-white">{m.label}</div>
                <div className="text-[16px] text-[#6B7A99]">{m.sub}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
