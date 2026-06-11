import { NavLink, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Prime Contract", path: "prime-contract" },
  { label: "Commitments",   path: "commitments" },
  { label: "Invoices",      path: "invoices" },
  { label: "Change Events", path: "change-events" },
  { label: "Change Orders", path: "change-orders" },
  { label: "Direct Costs",  path: "direct-costs" },
  { label: "Budget",        path: "budget" },
];

export function FinancialSubNav() {
  const { projectId } = useParams<{ projectId: string }>();

  return (
    <nav className="flex gap-1 flex-wrap border-b mb-6 pb-0">
      {TABS.map((t) => (
        <NavLink
          key={t.path}
          to={`/projects/${projectId}/financials/${t.path}`}
          className={({ isActive }) =>
            cn(
              "px-3 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors",
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
  );
}
