import { NavLink, useParams, Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useProject } from "@/hooks/useProjects";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  ChevronRight, ChevronDown, LayoutDashboard, FileSignature, GitPullRequest, ReceiptText, Ruler,
  Banknote, Wallet, Handshake, Receipt, Inbox, Coins, ShieldCheck, BookOpen,
  BarChart3, Megaphone, MoreHorizontal, TrendingUp, Users, type LucideIcon,
} from "lucide-react";

interface Tab { label: string; path: string; icon: LucideIcon }
interface Group { caption: string; tabs: Tab[] }

// Money lifecycle, in order. The first seven tabs ride inline; the rest live in
// a single "More" menu so the bar stays one clean row instead of wrapping.
const PRIMARY: Tab[] = [
  { label: "Overview", path: "overview", icon: LayoutDashboard },
  { label: "Prime Contract", path: "prime-contract", icon: FileSignature },
  { label: "Change Orders", path: "change-orders", icon: GitPullRequest },
  { label: "Pay Apps", path: "pay-apps", icon: ReceiptText },
  { label: "Budget", path: "budget", icon: Wallet },
  { label: "Commitments", path: "commitments", icon: Handshake },
  { label: "Vendor Invoices", path: "invoices", icon: Receipt },
];

const MORE_GROUPS: Group[] = [
  { caption: "Billing & A/R", tabs: [
    { label: "Quantities", path: "quantities", icon: Ruler },
    { label: "Payments", path: "payments", icon: Banknote },
  ] },
  { caption: "Costs & A/P", tabs: [
    { label: "Vendor Inbox", path: "vendor-inbox", icon: Inbox },
    { label: "Direct Costs", path: "direct-costs", icon: Coins },
  ] },
  { caption: "Compliance", tabs: [
    { label: "Lien Releases", path: "lien-releases", icon: ShieldCheck },
    { label: "Ledger", path: "ledger", icon: BookOpen },
  ] },
  { caption: "Insights", tabs: [
    { label: "Vendor Dashboards", path: "vendors", icon: Users },
    { label: "Margin", path: "margin", icon: TrendingUp },
    { label: "Reports", path: "reports", icon: BarChart3 },
    { label: "Client Updates", path: "client-updates", icon: Megaphone },
  ] },
];

const MORE_TABS = MORE_GROUPS.flatMap((g) => g.tabs);
const ALL_TABS = [...PRIMARY, ...MORE_TABS];

export function FinancialSubNav() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project } = useProject(projectId ?? null);
  const location = useLocation();

  const activeTab = ALL_TABS.find((t) => location.pathname.includes(`/financials/${t.path}`));
  const moreActive = activeTab != null && MORE_TABS.some((t) => t.path === activeTab.path);

  const tabClass = (isActive: boolean) =>
    cn(
      "relative flex items-center gap-2 whitespace-nowrap px-1 pb-3 pt-1 text-sm font-medium transition-colors",
      "after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:transition-colors",
      isActive
        ? "text-foreground after:bg-accent"
        : "text-muted-foreground hover:text-foreground after:bg-transparent",
    );

  return (
    <div className="mb-6">
      {/* Breadcrumb */}
      <nav className="mb-3 flex items-center gap-1.5 text-[13px] text-muted-foreground">
        <Link to="/dashboard" className="transition-colors hover:text-foreground">Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 opacity-50" />
        <Link to={`/projects/${projectId}`} className="max-w-[200px] truncate transition-colors hover:text-foreground">
          {project?.name ?? "Project"}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 opacity-50" />
        <Link to={`/projects/${projectId}/financials/overview`} className="transition-colors hover:text-foreground">
          Financials
        </Link>
        {activeTab && (
          <>
            <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 opacity-50" />
            <span className="font-medium text-foreground">{activeTab.label}</span>
          </>
        )}
      </nav>

      {/* Single-row underline tab bar — scrolls horizontally on narrow screens */}
      <div className="border-b border-border">
        <nav className="flex items-center gap-6 overflow-x-auto pl-0.5 scrollbar-hide">
          {PRIMARY.map((t) => (
            <NavLink
              key={t.path}
              to={`/projects/${projectId}/financials/${t.path}`}
              className={({ isActive }) => tabClass(isActive)}
            >
              <t.icon className="h-4 w-4 flex-shrink-0" />
              {t.label}
            </NavLink>
          ))}

          {/* More — overflow groups */}
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(tabClass(moreActive), "outline-none focus-visible:text-foreground")}>
              <MoreHorizontal className="h-4 w-4 flex-shrink-0" />
              {moreActive ? activeTab!.label : "More"}
              <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {MORE_GROUPS.map((group, gi) => (
                <div key={group.caption}>
                  {gi > 0 && <DropdownMenuSeparator />}
                  <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
                    {group.caption}
                  </DropdownMenuLabel>
                  {group.tabs.map((t) => (
                    <DropdownMenuItem key={t.path} asChild>
                      <Link
                        to={`/projects/${projectId}/financials/${t.path}`}
                        className={cn(
                          "flex cursor-pointer items-center gap-2",
                          activeTab?.path === t.path && "text-accent font-semibold",
                        )}
                      >
                        <t.icon className="h-4 w-4 flex-shrink-0" />
                        {t.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </div>
  );
}
