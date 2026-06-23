import { NavLink, useParams, Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useProject } from "@/hooks/useProjects";
import { ChevronRight, LayoutDashboard } from "lucide-react";

// F0: Overview is the home. Order per the F0 spec; only routes that exist.
const TABS = [
  { label: "Overview",        path: "overview" },
  { label: "Prime Contract",  path: "prime-contract" },
  { label: "Pay Apps",        path: "pay-apps" },
  { label: "Reports",         path: "reports" },
  { label: "Client Updates",  path: "client-updates" },
  { label: "Quantities",      path: "quantities" },
  { label: "Change Orders",   path: "change-orders" },
  { label: "Commitments",     path: "commitments" },
  { label: "Vendor Invoices", path: "invoices" },
  { label: "Lien Releases",   path: "lien-releases" },
  { label: "Vendor Inbox",    path: "vendor-inbox" },
  { label: "Budget",          path: "budget" },
  { label: "Direct Costs",    path: "direct-costs" },
  { label: "Payments",        path: "payments" },
  { label: "Ledger",          path: "ledger" },
];

export function FinancialSubNav() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project } = useProject(projectId ?? null);
  const location = useLocation();

  const activeTab = TABS.find(t => location.pathname.includes(`/financials/${t.path}`));

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

      {/* Tab bar */}
      <nav className="flex gap-1 flex-wrap border-b pb-0 overflow-x-auto">
        {TABS.map((t) => (
          <NavLink
            key={t.path}
            to={`/projects/${projectId}/financials/${t.path}`}
            className={({ isActive }) =>
              cn(
                "px-3 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors whitespace-nowrap",
                isActive
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted",
              )
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
