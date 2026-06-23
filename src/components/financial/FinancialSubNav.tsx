import { NavLink, useParams, Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useProject } from "@/hooks/useProjects";
import {
  ChevronRight, LayoutDashboard, FileSignature, GitPullRequest, ReceiptText, Ruler,
  Banknote, Wallet, Handshake, Receipt, Inbox, Coins, ShieldCheck, BookOpen,
  BarChart3, Megaphone, type LucideIcon,
} from "lucide-react";

// Ordered as a construction project's money lifecycle, grouped into stages:
//   Overview → Contract → Bill the owner & get paid → Plan & spend on costs →
//   Compliance & reconciliation → Insights & client comms.
interface Tab { label: string; path: string; icon: LucideIcon }
interface Group { caption?: string; tabs: Tab[] }

const GROUPS: Group[] = [
  { tabs: [{ label: "Overview", path: "overview", icon: LayoutDashboard }] },
  {
    caption: "Contract",
    tabs: [
      { label: "Prime Contract", path: "prime-contract", icon: FileSignature },
      { label: "Change Orders", path: "change-orders", icon: GitPullRequest },
    ],
  },
  {
    caption: "Billing & A/R",
    tabs: [
      { label: "Pay Apps", path: "pay-apps", icon: ReceiptText },
      { label: "Quantities", path: "quantities", icon: Ruler },
      { label: "Payments", path: "payments", icon: Banknote },
    ],
  },
  {
    caption: "Costs & A/P",
    tabs: [
      { label: "Budget", path: "budget", icon: Wallet },
      { label: "Commitments", path: "commitments", icon: Handshake },
      { label: "Vendor Invoices", path: "invoices", icon: Receipt },
      { label: "Vendor Inbox", path: "vendor-inbox", icon: Inbox },
      { label: "Direct Costs", path: "direct-costs", icon: Coins },
    ],
  },
  {
    caption: "Compliance",
    tabs: [
      { label: "Lien Releases", path: "lien-releases", icon: ShieldCheck },
      { label: "Ledger", path: "ledger", icon: BookOpen },
    ],
  },
  {
    caption: "Insights",
    tabs: [
      { label: "Reports", path: "reports", icon: BarChart3 },
      { label: "Client Updates", path: "client-updates", icon: Megaphone },
    ],
  },
];

const ALL_TABS = GROUPS.flatMap((g) => g.tabs);

export function FinancialSubNav() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project } = useProject(projectId ?? null);
  const location = useLocation();

  const activeTab = ALL_TABS.find((t) => location.pathname.includes(`/financials/${t.path}`));

  return (
    <div className="space-y-3 mb-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
        <Link to="/dashboard" className="hover:text-foreground flex items-center gap-1">
          <LayoutDashboard className="h-3.5 w-3.5" />
          Dashboard
        </Link>
        <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
        <Link to={`/projects/${projectId}`} className="hover:text-foreground truncate max-w-[180px]">
          {project?.name ?? "Project"}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
        <Link to={`/projects/${projectId}/financials/overview`} className="hover:text-foreground">
          Financials
        </Link>
        {activeTab && (
          <>
            <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="text-foreground font-medium">{activeTab.label}</span>
          </>
        )}
      </nav>

      {/* Stage-grouped ribbon — segmented controls read left→right as the money lifecycle */}
      <div className="overflow-x-auto -mx-1 px-1 pb-1">
        <nav className="flex items-end gap-2 w-max">
          {GROUPS.map((group, gi) => (
            <div key={gi} className="flex flex-col gap-1">
              <span className="h-3.5 px-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">
                {group.caption ?? ""}
              </span>
              <div className="flex items-center gap-0.5 rounded-xl bg-muted/50 p-1 ring-1 ring-border/50">
                {group.tabs.map((t) => (
                  <NavLink
                    key={t.path}
                    to={`/projects/${projectId}/financials/${t.path}`}
                    title={t.label}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm whitespace-nowrap transition-all",
                        isActive
                          ? "bg-background text-primary font-semibold shadow-sm ring-1 ring-border"
                          : "text-muted-foreground hover:text-foreground hover:bg-background/60",
                      )
                    }
                  >
                    <t.icon className="h-3.5 w-3.5 flex-shrink-0" />
                    {t.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}
