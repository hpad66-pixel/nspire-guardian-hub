import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  BellRing,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  FileText,
  FolderOpen,
  HelpCircle,
  Home,
  LogOut,
  Menu,
  ShieldCheck,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useClientPortalContext, useMyPortalKind, useOwnerPortalData } from "@/hooks/usePortals";
import {
  ClientPortalProjectProvider,
} from "./ClientPortalProjectContext";
import "@/pages/portal/client-portal.css";

const primaryNavigation = [
  { to: "/owner-portal", label: "Overview", icon: Home, exact: true },
  { to: "/owner-portal#decisions", label: "Decisions", icon: ClipboardCheck, hash: true },
  { to: "/owner-portal/updates", label: "Updates", icon: BellRing },
  { to: "/owner-portal/schedule", label: "Schedule", icon: CalendarDays },
  { to: "/owner-portal/documents", label: "Documents", icon: FolderOpen },
];

const secondaryNavigation = [
  { to: "/owner-portal/contract", label: "Contract", icon: FileText },
  { to: "/owner-portal/reports", label: "Reports", icon: BarChart3 },
];

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "AP";
}

/**
 * Dedicated, client-only shell for the authenticated owner portal.
 * It intentionally does not render AppLayout: clients never see the internal
 * project-controls navigation, administration, or unrelated tenant records.
 */
export function ClientPortalShell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const { data: portalContext } = useClientPortalContext();
  const { data: ownerData } = useOwnerPortalData();
  const { data: portalKind } = useMyPortalKind();

  const contracts = ownerData?.primeContracts ?? [];
  const selectedContract = contracts.find((contract) => contract.project_id === selectedProjectId) ?? contracts[0] ?? null;
  const activeProjectId = selectedContract?.project_id ?? null;
  const selectedContractId = selectedContract?.id ?? null;
  const decisions = (ownerData?.pendingOcos ?? []).filter((item) => item.prime_contract_id === selectedContractId).length
    + (ownerData?.pendingPayApps ?? []).filter((item) => item.prime_contract_id === selectedContractId).length;

  const companyName = portalContext?.client_name || portalContext?.portal_name || "APAS Project Controls";
  const projectName = selectedContract?.title || portalContext?.project_name || "Your project";
  const personName = useMemo(
    () => user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Client",
    [user],
  );

  useEffect(() => {
    setMobileOpen(false);
    setAccountOpen(false);
    if (location.hash === "#decisions") {
      window.requestAnimationFrame(() => {
        document.getElementById("decisions")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [location.pathname, location.hash]);

  async function handleSignOut() {
    const returnPath = portalContext?.portal_slug
      ? `/portal/${encodeURIComponent(portalContext.portal_slug)}`
      : "/auth?portal=client";
    await signOut();
    navigate(returnPath, { replace: true });
  }

  return (
    <ClientPortalProjectProvider value={{
      contracts,
      selectedProjectId: activeProjectId,
      selectedContract,
      setSelectedProjectId,
    }}>
    <div className="client-portal-app">
      <header className="client-portal-header">
        <div className="client-portal-header__inner">
          <Link to="/owner-portal" className="client-portal-brand" aria-label="Client portal home">
            {portalContext?.brand_logo_url ? (
              <span className="client-portal-brand__logo-wrap">
                <img src={portalContext.brand_logo_url} alt={`${companyName} logo`} className="client-portal-brand__logo" />
              </span>
            ) : (
              <span className="client-portal-brand__mark">APAS</span>
            )}
            <span className="client-portal-brand__copy">
              <strong>{companyName}</strong>
              <small>Secure client portal</small>
            </span>
          </Link>

          <nav className="client-portal-nav" aria-label="Client portal">
            {primaryNavigation.map((item) => {
              const Icon = item.icon;
              if (item.hash) {
                return (
                  <Link key={item.to} to={item.to} className="client-portal-nav__link">
                    <Icon aria-hidden="true" />
                    <span>{item.label}</span>
                    {decisions > 0 && <b className="client-portal-nav__count">{decisions}</b>}
                  </Link>
                );
              }
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  className={({ isActive }) => `client-portal-nav__link${isActive ? " is-active" : ""}`}
                >
                  <Icon aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="client-portal-actions">
            <button
              type="button"
              className="client-portal-account"
              aria-expanded={accountOpen}
              onClick={() => setAccountOpen((open) => !open)}
            >
              <span className="client-portal-account__avatar">{initials(personName)}</span>
              <span className="client-portal-account__name">{personName}</span>
              <ChevronDown aria-hidden="true" />
            </button>
            {accountOpen && (
              <div className="client-portal-account-menu">
                <div className="client-portal-account-menu__identity">
                  <strong>{personName}</strong>
                  <span>{user?.email}</span>
                </div>
                <a href="mailto:hardeep@apas.ai">
                  <HelpCircle aria-hidden="true" /> Contact project team
                </a>
                <button type="button" onClick={handleSignOut}>
                  <LogOut aria-hidden="true" /> Sign out
                </button>
              </div>
            )}
            <button
              type="button"
              className="client-portal-mobile-toggle"
              aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((open) => !open)}
            >
              {mobileOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        <div className="client-portal-context">
          <div className="client-portal-context__inner">
            <label className="client-portal-context__project">
              <span className="client-portal-context__eyebrow">Current project</span>
              {contracts.length > 1 ? (
                <select value={activeProjectId ?? ""} onChange={(event) => setSelectedProjectId(event.target.value)}>
                  {contracts.map((contract) => (
                    <option key={contract.id} value={contract.project_id}>
                      {contract.contract_no ? `${contract.contract_no} · ` : ""}{contract.title}
                    </option>
                  ))}
                </select>
              ) : <strong>{projectName}</strong>}
            </label>
            <span className="client-portal-context__secure"><ShieldCheck /> Private &amp; role restricted</span>
          </div>
        </div>

        {mobileOpen && (
          <nav className="client-portal-mobile-menu" aria-label="Mobile client portal">
            {[...primaryNavigation, ...secondaryNavigation].map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.to} to={item.to} className="client-portal-mobile-menu__link">
                  <Icon aria-hidden="true" />
                  <span>{item.label}</span>
                  {"hash" in item && item.hash && decisions > 0 && <b>{decisions}</b>}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      {portalKind === "main" && (
        <div className="client-portal-preview">
          <ShieldCheck aria-hidden="true" />
          <span><strong>Client-view preview.</strong> You are signed in as a project administrator.</span>
        </div>
      )}

      <main className="client-portal-main">
        <Outlet />
      </main>

      <footer className="client-portal-footer">
        <div>
          <strong>{companyName}</strong>
          <span>Project clarity, decisions, and documentation in one secure place.</span>
        </div>
        <div className="client-portal-footer__links">
          {secondaryNavigation.map((item) => <Link key={item.to} to={item.to}>{item.label}</Link>)}
          <a href="mailto:hardeep@apas.ai">Support</a>
        </div>
        <small>Powered by projOS</small>
      </footer>

      <nav className="client-portal-bottom-nav" aria-label="Client portal shortcuts">
        {primaryNavigation.map((item) => {
          const Icon = item.icon;
          const active = item.hash
            ? location.pathname === "/owner-portal" && location.hash === "#decisions"
            : location.pathname === item.to;
          return (
            <Link key={item.to} to={item.to} className={active ? "is-active" : ""}>
              <span><Icon aria-hidden="true" />{item.hash && decisions > 0 && <b>{decisions}</b>}</span>
              <small>{item.label === "Documents" ? "Files" : item.label}</small>
            </Link>
          );
        })}
      </nav>
    </div>
    </ClientPortalProjectProvider>
  );
}

export default ClientPortalShell;
