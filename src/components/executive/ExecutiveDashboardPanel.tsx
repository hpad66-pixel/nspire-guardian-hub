import { motion } from "framer-motion";
import { Play, Download, AlertTriangle, Building2, FolderKanban, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PortfolioScoreCard } from "./PortfolioScoreCard";
import { computePortfolioScore } from "./slideUtils";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useProperties } from "@/hooks/useProperties";
import { useProjects } from "@/hooks/useProjects";
import { useIssues } from "@/hooks/useIssues";
import { useWorkOrders } from "@/hooks/useWorkOrders";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { formatDistanceToNow } from "date-fns";

interface Props {
  onStartPresentation: () => void;
}

export function ExecutiveDashboardPanel({ onStartPresentation }: Props) {
  const { data: dashData, isLoading: dashLoading } = useDashboardData();
  const { data: properties = [], isLoading: propLoading } = useProperties();
  const { data: projects = [], isLoading: projLoading } = useProjects();
  const { data: issues = [], isLoading: issLoading } = useIssues();
  const { data: workOrders = [], isLoading: woLoading } = useWorkOrders();

  const metrics = dashData?.metrics;
  const isLoading = dashLoading || propLoading || projLoading || issLoading || woLoading;

  const score = metrics ? computePortfolioScore(metrics) : 0;
  const activeProjects = projects.filter((p) => p.status === "active").slice(0, 5);
  const openIssues = issues.filter((i: any) => i.status === "open");

  // Critical alerts
  const severeOpen = openIssues.filter((i: any) => i.severity === "severe");
  const overdueWOs = workOrders.filter((wo: any) => {
    if (!wo.due_date) return false;
    return new Date(wo.due_date) < new Date() && wo.status !== "completed" && wo.status !== "verified";
  });
  const criticalCount = severeOpen.length + overdueWOs.length;

  // Charts
  const issueStatusData = [
    { name: "Open", value: openIssues.length, color: "#F43F5E" },
    { name: "In Progress", value: issues.filter((i: any) => i.status === "in_progress").length, color: "#F59E0B" },
    { name: "Resolved", value: issues.filter((i: any) => i.status === "resolved").length, color: "#10B981" },
    { name: "Verified", value: issues.filter((i: any) => i.status === "verified").length, color: "#1D6FE8" },
  ].filter((d) => d.value > 0);

  // Recent activity
  const recentActivity = [
    ...issues.slice(0, 4).map((i: any) => ({
      id: i.id,
      desc: i.title || "Issue updated",
      time: i.created_at,
      status: i.status,
      severity: i.severity,
    })),
    ...workOrders.slice(0, 4).map((wo: any) => ({
      id: wo.id,
      desc: wo.title || "Work order updated",
      time: wo.created_at,
      status: wo.status,
      severity: wo.priority,
    })),
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 8);

  const KPI_CARDS = [
    { label: "Total Properties", value: metrics?.properties ?? 0, icon: Building2, sub: "in portfolio" },
    { label: "Open Issues", value: metrics?.openIssues ?? 0, icon: AlertTriangle, sub: `${metrics?.urgentIssues ?? 0} urgent` },
    { label: "Active Projects", value: metrics?.activeProjects ?? 0, icon: FolderKanban, sub: "in progress" },
    { label: "Compliance Rate", value: `${metrics?.complianceRate ?? 0}%`, icon: ShieldCheck, sub: "resolved ratio" },
  ];

  return (
    <div className="min-h-full bg-[#0B1629] text-white p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-bold" style={{ fontFamily: "var(--font-display)" }}>Executive Suite</h1>
          <p className="text-[14px] text-[#6B7A99]">Your portfolio — real-time.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="border-white/10 text-[#6B7A99] hover:text-white bg-transparent">
            <Download className="h-4 w-4 mr-2" /> Export PDF
          </Button>
          <Button onClick={onStartPresentation}
            className="bg-[#1D6FE8] hover:bg-[#1D6FE8]/90 text-white gap-2">
            <Play className="h-4 w-4" /> Start Presentation
          </Button>
        </div>
      </motion.div>

      {/* Critical alert banner */}
      {criticalCount > 0 && (
        <div className="w-full bg-red-500/15 border border-red-500/30 rounded-xl px-6 py-3 flex items-center gap-4">
          <AlertTriangle className="text-red-400 h-5 w-5 flex-shrink-0" />
          <span className="text-red-300 font-medium text-sm">{criticalCount} items require immediate attention</span>
        </div>
      )}

      {/* Portfolio Score + KPIs */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-6">
          {isLoading ? <Skeleton className="h-52 bg-white/5 rounded-2xl" /> : (
            <PortfolioScoreCard score={score} trend="up" large
              breakdown={{ inspections: 94, compliance: metrics?.complianceRate ?? 0, maintenance: 91 }} />
          )}
        </div>
        <div className="col-span-6 grid grid-cols-2 gap-4">
          {KPI_CARDS.map((kpi) => (
            <div key={kpi.label} className="bg-[#111E38] border border-white/5 rounded-2xl p-6 flex flex-col gap-2 hover:border-[rgba(29,111,232,0.3)] transition-colors">
              <div className="flex items-center gap-2 text-[#6B7A99] text-sm">
                <kpi.icon className="h-4 w-4" /><span>{kpi.label}</span>
              </div>
              {isLoading ? <Skeleton className="h-10 w-16 bg-white/5" /> : (
                <div className="text-4xl font-bold text-white">{kpi.value}</div>
              )}
              <div className="text-xs text-[#6B7A99]">{kpi.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Two columns: Projects + Activity */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-7 bg-[#111E38] border border-white/5 rounded-2xl p-6">
          <h3 className="eyebrow text-[#6B7A99] mb-4">ACTIVE PROJECTS</h3>
          {isLoading ? <Skeleton className="h-40 bg-white/5" /> : activeProjects.length === 0 ? (
            <p className="text-[#6B7A99] text-sm">No active projects</p>
          ) : (
            <div className="space-y-3">
              {activeProjects.map((p: any) => (
                <div key={p.id} className="flex items-center gap-4 py-2 border-b border-white/5 last:border-0">
                  <div className="h-2 w-2 rounded-full bg-[#10B981]" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{p.name}</div>
                    <div className="text-xs text-[#6B7A99]">{p.property_name || "—"}</div>
                  </div>
                  {p.budget && (
                    <div className="text-xs text-[#6B7A99]">${Number(p.budget).toLocaleString()}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="col-span-5 bg-[#111E38] border border-white/5 rounded-2xl p-6">
          <h3 className="eyebrow text-[#6B7A99] mb-4">RECENT ACTIVITY</h3>
          {isLoading ? <Skeleton className="h-40 bg-white/5" /> : (
            <div className="space-y-3">
              {recentActivity.map((a) => (
                <div key={a.id} className="flex items-start gap-3 py-1.5 border-b border-white/5 last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-white truncate">{a.desc}</div>
                    <div className="text-[10px] text-[#6B7A99]">{formatDistanceToNow(new Date(a.time), { addSuffix: true })}</div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[#6B7A99] whitespace-nowrap">
                    {a.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-[#111E38] border border-white/5 rounded-2xl p-6">
          <h3 className="eyebrow text-[#6B7A99] mb-4">MONTHLY INSPECTIONS</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={[
              { month: "Jan", count: 18 }, { month: "Feb", count: 24 },
              { month: "Mar", count: 31 }, { month: "Apr", count: 27 },
              { month: "May", count: 35 }, { month: "Jun", count: 42 },
            ]} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "#6B7A99", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6B7A99", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Bar dataKey="count" fill="#1D6FE8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-[#111E38] border border-white/5 rounded-2xl p-6">
          <h3 className="eyebrow text-[#6B7A99] mb-4">ISSUE STATUS</h3>
          {issueStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={issueStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                  paddingAngle={3} dataKey="value"
                  label={({ percent }) => `${Math.round((percent ?? 0) * 100)}%`}
                  labelLine={false}>
                  {issueStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: "10px", color: "#6B7A99" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-[#6B7A99] text-sm">No issues data</div>
          )}
        </div>
      </div>
    </div>
  );
}
