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
  'site-accountability': 'Site Accountability',
  organizations: 'Clients',
  clients: 'Clients',
  contacts: 'CRM Contacts',
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
  'product-ideas': 'Product Ideas',
  'card-payoffs': 'Card Payoffs',
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

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/dashboard');
  };

  // Nothing to navigate from the home surfaces.
  if (pathname === '/' || pathname === '/dashboard' || crumbs.length === 0) return null;

  return (
    <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top,0px))] z-[9] flex items-center gap-2 border-b border-[rgba(37,44,57,0.12)] bg-[rgba(248,245,238,0.94)] px-2 py-2 shadow-[0_10px_26px_rgba(37,44,57,0.05)] backdrop-blur-xl md:px-5">
      <button
        type="button"
        onClick={goBack}
        aria-label="Go back"
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-[var(--ow-taupe-2)] bg-white/80 px-2.5 text-sm font-semibold text-[var(--ow-ink)] shadow-sm transition-colors hover:bg-white hover:text-[var(--ow-navy)] active:scale-95"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Back</span>
      </button>

      <nav
        aria-label="Breadcrumb"
        className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto whitespace-nowrap text-[14px] leading-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <Link
          to="/dashboard"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-transparent text-[var(--ow-muted)] hover:border-[var(--ow-taupe-2)] hover:bg-white hover:text-[var(--ow-ink)]"
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
                <span className="max-w-[60vw] truncate rounded-lg bg-white/70 px-2 py-1 font-semibold text-[var(--ow-ink)] shadow-sm sm:max-w-[280px]">{c.label}</span>
              ) : (
                <Link
                  to={c.href}
                  className="rounded-lg px-2 py-1 font-semibold text-[var(--ow-muted)] transition-colors hover:bg-white hover:text-[var(--ow-ink)]"
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
