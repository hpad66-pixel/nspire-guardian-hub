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
import {
  ownerPortalPath,
  ownerPortalProjectSwitchPath,
  uniqueOwnerProjects,
} from "@/lib/portal/ownerPortalPaths";
import "@/pages/portal/client-portal.css";

function portalNav(projectId: string | null) {
  return {
    primary: [
      { to: ownerPortalPath(projectId), label: "Overview", icon: Home, exact: true },
      { to: ownerPortalPath(projectId, "", "#decisions"), label: "Decisions", icon: ClipboardCheck, hash: true },
      { to: ownerPortalPath(projectId, "/updates"), label: "Updates", icon: BellRing },
      { to: ownerPortalPath(projectId, "/schedule"), label: "Schedule", icon: CalendarDays },
      { to: ownerPortalPath(projectId, "/documents"), label: "Documents", icon: FolderOpen },
    ],
    secondary: [
      { to: ownerPortalPath(projectId, "/contract"), label: "Contract", icon: FileText },
      { to: ownerPortalPath(projectId, "/reports"), label: "Reports", icon: BarChart3 },
    ],
  };
}

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
  const routeProjectId = location.pathname.match(/^\/owner-portal\/projects\/([^/]+)/)?.[1];
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const { data: ownerData, isLoading: ownerLoading } = useOwnerPortalData();
  const { data: portalKind } = useMyPortalKind();

  const contracts = ownerData?.primeContracts ?? [];
  const projects = useMemo(() => uniqueOwnerProjects(contracts), [contracts]);
  const requestedProjectId = routeProjectId
    ?? new URLSearchParams(location.search).get("project")
    ?? null;
  const selectedProject = projects.find((project) => project.id === requestedProjectId) ?? projects[0] ?? null;
  const activeProjectId = selectedProject?.id ?? null;
  const selectedContract = selectedProject?.contract ?? contracts[0] ?? null;
  const selectedContractId = selectedContract?.id ?? null;
  const { data: portalContext } = useClientPortalContext(activeProjectId);
  const { primary: primaryNavigation, secondary: secondaryNavigation } = portalNav(activeProjectId);

  const decisions = (ownerData?.pendingOcos ?? []).filter((item) => item.prime_contract_id === selectedContractId).length
    + (ownerData?.pendingPayApps ?? []).filter((item) => item.prime_contract_id === selectedContractId).length;

  const companyName = portalContext?.client_name || portalContext?.portal_name || "APAS Project Controls";
  const projectName = selectedProject?.name || portalContext?.project_name || "Your project";
  const personName = useMemo(
    () => user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Client",
    [user],
  );

  useEffect(() => {
    if (!ownerLoading && routeProjectId && selectedProject && routeProjectId !== selectedProject.id) {
      navigate(ownerPortalProjectSwitchPath(location.pathname, selectedProject.id) + location.hash, { replace: true });
    }
  }, [ownerLoading, routeProjectId, selectedProject, location.pathname, location.hash, navigate]);

  useEffect(() => {
    setMobileOpen(false);
    setAccountOpen(false);
    if (location.hash === "#decisions") {
      window.requestAnimationFrame(() => {
        document.getElementById("decisions")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [location.pathname, location.hash]);

  function setSelectedProjectId(projectId: string) {
    navigate(ownerPortalProjectSwitchPath(location.pathname, projectId) + location.hash);
  }

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
      projects,
      selectedProjectId: activeProjectId,
      selectedContract,
      isLoading: ownerLoading,
      setSelectedProjectId,
    }}>
    <div className="client-portal-app">
      <header className="client-portal-header">
        <div className="client-portal-header__inner">
          <Link to={ownerPortalPath(activeProjectId)} className="client-portal-brand" aria-label="Client portal home">
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
            <div className="client-portal-context__project">
              <span className="client-portal-context__eyebrow">
                {projects.length > 1 ? "Your projects" : "Current project"}
              </span>
              {projects.length > 1 ? (
                <div className="client-portal-project-tabs" data-testid="owner-portal-project-tabs" role="tablist" aria-label="Projects">
                  {projects.map((project) => {
                    const selected = project.id === activeProjectId;
                    return (
                      <Link
                        key={project.id}
                        role="tab"
                        aria-selected={selected}
                        data-testid={`owner-portal-project-tab-${project.id}`}
                        to={ownerPortalProjectSwitchPath(location.pathname, project.id) + location.hash}
                        className={`client-portal-project-tab${selected ? " is-active" : ""}`}
                      >
                        {project.name}
                      </Link>
                    );
                  })}
                </div>
              ) : <strong data-testid="owner-portal-single-project">{projectName}</strong>}
            </div>
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
          const overviewPath = ownerPortalPath(activeProjectId);
          const active = item.hash
            ? location.pathname === overviewPath && location.hash === "#decisions"
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
