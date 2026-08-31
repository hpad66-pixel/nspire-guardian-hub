import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  BellRing,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  FileBadge2,
  FileText,
  FolderOpen,
  HelpCircle,
  Home,
  LogOut,
  Map,
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
import { portalModulesForProject } from "@/lib/projects/moduleVisibility";
import type { OwnerPortalProjectMeta } from "@/hooks/usePortals";
import "@/pages/portal/client-portal.css";

function portalNav(
  projectId: string | null,
  enabled: Set<string> = new Set(["overview", "updates", "schedule", "documents", "contract", "reports", "permits", "site-map"]),
) {
  const primary = [
    { to: ownerPortalPath(projectId), label: "Overview", icon: Home, exact: true, key: "overview" },
    { to: ownerPortalPath(projectId, "", "#decisions"), label: "Decisions", icon: ClipboardCheck, hash: true, key: "overview" },
    { to: ownerPortalPath(projectId, "/updates"), label: "Updates", icon: BellRing, key: "updates" },
    { to: ownerPortalPath(projectId, "/schedule"), label: "Schedule", icon: CalendarDays, key: "schedule" },
    { to: ownerPortalPath(projectId, "/site-map"), label: "Site map", icon: Map, key: "site-map" },
    { to: ownerPortalPath(projectId, "/permits"), label: "Permits", icon: FileBadge2, key: "permits" },
    { to: ownerPortalPath(projectId, "/documents"), label: "Documents", icon: FolderOpen, key: "documents" },
  ].filter((item) => enabled.has(item.key));

  const secondary = [
    { to: ownerPortalPath(projectId, "/contract"), label: "Contract", icon: FileText, key: "contract" },
    { to: ownerPortalPath(projectId, "/reports"), label: "Reports", icon: BarChart3, key: "reports" },
  ].filter((item) => enabled.has(item.key));

  return { primary, secondary };
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
  // Never silently fall back to projects[0] when a specific project was requested —
  // that made every client/preview see the same first contract.
  const matchedProject = projects.find((project) => project.id === requestedProjectId) ?? null;
  const selectedProject = matchedProject ?? (requestedProjectId ? null : projects[0] ?? null);
  const activeProjectId = selectedProject?.id ?? null;
  const selectedContract = selectedProject?.contract ?? null;
  const selectedContractId = selectedContract?.id ?? null;
  const projectUnavailable = Boolean(requestedProjectId && !ownerLoading && !matchedProject && projects.length > 0);
  const { data: portalContext } = useClientPortalContext(activeProjectId);
  const projectMeta = (ownerData?.projectMeta ?? {}) as Record<string, OwnerPortalProjectMeta>;
  const activeMeta = activeProjectId ? projectMeta[activeProjectId] : null;
  const parentMeta = activeMeta?.parent_project_id
    ? projectMeta[activeMeta.parent_project_id] ?? null
    : null;
  const enabledPortalModules = useMemo(
    () => portalModulesForProject(activeMeta, parentMeta),
    [activeMeta, parentMeta],
  );
  const { primary: primaryNavigation, secondary: secondaryNavigation } = portalNav(
    activeProjectId,
    enabledPortalModules,
  );

  const decisions = (ownerData?.pendingOcos ?? []).filter((item) => item.prime_contract_id === selectedContractId).length
    + (ownerData?.pendingPayApps ?? []).filter((item) => item.prime_contract_id === selectedContractId).length;

  const companyName = portalContext?.client_name || portalContext?.portal_name || "APAS Project Controls";
  const projectName = selectedProject?.name || portalContext?.project_name || "Your project";
  const personName = useMemo(
    () => user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Client",
    [user],
  );

  useEffect(() => {
    // Flat /owner-portal handoff → first accessible project only when nothing was requested.
    if (!ownerLoading && !routeProjectId && !requestedProjectId && projects[0]?.id) {
      navigate(ownerPortalPath(projects[0].id) + location.hash, { replace: true });
    }
  }, [ownerLoading, routeProjectId, requestedProjectId, projects, location.hash, navigate]);

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
        {projectUnavailable ? (
          <div className="client-dashboard-empty" data-testid="owner-portal-project-unavailable">
            <h2>This project is not available in your portal</h2>
            <p>Choose one of your projects below — each client and project has its own portal view.</p>
            <div className="client-portal-project-tabs" style={{ marginTop: 16, justifyContent: "center" }}>
              {projects.map((project) => (
                <Link
                  key={project.id}
                  to={ownerPortalPath(project.id)}
                  className="client-portal-project-tab"
                >
                  {project.name}
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <Outlet />
        )}
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
