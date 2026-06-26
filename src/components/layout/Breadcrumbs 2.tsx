import { useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Home } from 'lucide-react';

/**
 * App-wide wayfinding bar: a prominent Back control plus a breadcrumb trail
 * derived from the current route. Built for touch — the Back target is a full
 * 40px tap area, the trail scrolls horizontally on narrow screens, and raw
 * UUID/numeric id segments are kept in the link path but hidden from the trail
 * so it stays readable (e.g. /projects/<id>/meetings → Home › Projects › Meetings).
 */
const SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  projects: 'Projects',
  organizations: 'Clients',
  clients: 'Clients',
  meetings: 'Meetings',
  templates: 'Templates',
  financials: 'Financials',
  reports: 'Reports',
  'daily-reports': 'Daily Reports',
  daily: 'Daily Reports',
  inspections: 'Inspections',
  compliance: 'Compliance',
  safety: 'Safety',
  schedule: 'Schedule',
  documents: 'Documents',
  rfis: 'RFIs',
  submittals: 'Submittals',
  punch: 'Punch List',
  commitments: 'Commitments',
  budget: 'Budget',
  settings: 'Settings',
  profile: 'Profile',
  admin: 'Admin',
  portal: 'Portal',
  'sub-portal': 'Subcontractor Portal',
  'owner-portal': 'Owner Portal',
  proposals: 'Proposals',
  assets: 'Assets',
  properties: 'Properties',
  units: 'Units',
  people: 'People',
  insights: 'Insights',
};

const isIdSegment = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s) || /^\d{2,}$/.test(s);

const humanize = (s: string) =>
  s.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export function Breadcrumbs() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const crumbs = useMemo(() => {
    const segs = pathname.split('/').filter(Boolean);
    const out: { label: string; href: string }[] = [];
    let acc = '';
    for (const seg of segs) {
      acc += '/' + seg;
      if (isIdSegment(seg)) continue; // keep the path, hide the raw id from the trail
      out.push({ label: SEGMENT_LABELS[seg] ?? humanize(seg), href: acc });
    }
    return out;
  }, [pathname]);

  // Nothing to navigate from the home surfaces.
  if (pathname === '/' || pathname === '/dashboard' || crumbs.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 border-b border-border/60 bg-background/70 px-2 py-1.5 backdrop-blur-sm md:px-5">
      <button
        type="button"
        onClick={() => navigate(-1)}
        aria-label="Go back"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <nav
        aria-label="Breadcrumb"
        className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto whitespace-nowrap text-[13px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <Link
          to="/dashboard"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Dashboard"
        >
          <Home className="h-[15px] w-[15px]" />
        </Link>
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <span key={c.href} className="flex shrink-0 items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
              {last ? (
                <span className="max-w-[60vw] truncate font-semibold text-foreground sm:max-w-[280px]">{c.label}</span>
              ) : (
                <Link
                  to={c.href}
                  className="rounded px-1 py-0.5 font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {c.label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>
    </div>
  );
}
