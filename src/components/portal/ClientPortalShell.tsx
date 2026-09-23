import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  BellRing,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Edit3,
  ExternalLink,
  FileBadge2,
  FileText,
  FolderOpen,
  HelpCircle,
  Home,
  LogOut,
  Map,
  Menu,
  Package,
  PencilLine,
  ScanEye,
  ShieldCheck,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useModules } from "@/contexts/ModuleContext";
import { useClientPortalContext, useHasMainPortalMembership, useMyPortalKind, useOwnerPortalData } from "@/hooks/usePortals";
import {
  ClientPortalProjectProvider,
} from "./ClientPortalProjectContext";
import {
  buildOwnerProjectTabs,
  filterOwnerProjectsForClient,
  ownerPortalPath,
  readRememberedOwnerPortalClient,
} from "@/lib/portal/ownerPortalPaths";
import { portalModulesForProject } from "@/lib/projects/moduleVisibility";
import type { OwnerPortalProjectMeta } from "@/hooks/usePortals";
import { selectSiteAccountabilityProject } from "@/lib/accountability/accountabilityNavigation";
import { isPlatformSuperAdmin } from "@/lib/auth/platformAdmin";
import "@/pages/portal/client-portal.css";

function portalNav(
  projectId: string | null,
  enabled: Set<string> = new Set(["overview", "updates", "schedule", "documents", "contract", "reports", "permits", "site-map", "operations", "accountability"]),
  hasSiteAccountability = false,
) {
  const primary = [
    { to: ownerPortalPath(projectId), label: "Overview", icon: Home, exact: true, key: "overview" },
    { to: ownerPortalPath(projectId, "", "#decisions"), label: "Decisions", icon: ClipboardCheck, hash: true, key: "overview" },
    { to: ownerPortalPath(projectId, "/accountability"), label: "Site accountability", icon: ScanEye, key: "accountability", force: hasSiteAccountability },
    { to: ownerPortalPath(projectId, "/updates"), label: "Updates", icon: BellRing, key: "updates" },
    { to: ownerPortalPath(projectId, "/schedule"), label: "Schedule", icon: CalendarDays, key: "schedule" },
  ].filter((item) => item.force || enabled.has(item.key));

  const secondary = [
    { to: ownerPortalPath(projectId, "/site-map"), label: "Site map", icon: Map, key: "site-map" },
    { to: ownerPortalPath(projectId, "/permits"), label: "Permits", icon: FileBadge2, key: "permits" },
    { to: ownerPortalPath(projectId, "/operations"), label: "Operations", icon: Package, key: "operations" },
    { to: ownerPortalPath(projectId, "/documents"), label: "Documents", icon: FolderOpen, key: "documents" },
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

type PortalNavEntry = {
  to: string;
  label: string;
  icon: LucideIcon;
  key: string;
  exact?: boolean;
  hash?: boolean;
};

type PortalProjectTab = {
  id: string;
  name: string;
  client_id?: string | null;
  client_name?: string | null;
  status?: string | null;
};

function groupProjectsByClient<T extends PortalProjectTab>(projects: T[]) {
  const groups = new globalThis.Map<string, { key: string; label: string; projects: T[] }>();
  for (const project of projects) {
    const key = project.client_id ?? "unassigned";
    const label = project.client_name
      || (project.client_id ? `Client ${project.client_id.slice(0, 6)}` : "Unassigned client");
    const group = groups.get(key) ?? { key, label, projects: [] };
    group.projects.push(project);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => a.label.localeCompare(b.label));
}

function PortalNavigationLinks({
  items,
  decisions,
  location,
  className,
}: {
  items: PortalNavEntry[];
  decisions: number;
  location: { pathname: string; hash: string };
  className: string;
}) {
  return items.map((item) => {
    const Icon = item.icon;
    const activeHash = item.hash
      && location.pathname === item.to.split("#")[0]
      && location.hash === `#${item.to.split("#")[1]}`;
    if (item.hash) {
      return (
        <Link key={item.to} to={item.to} className={`${className}${activeHash ? " is-active" : ""}`}>
          <span className="client-portal-rail__icon"><Icon aria-hidden /></span>
          <span>{item.label}</span>
          {decisions > 0 && <b className="client-portal-nav__count">{decisions}</b>}
          <ChevronRight className="client-portal-rail__arrow" aria-hidden />
        </Link>
      );
    }
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.exact}
        className={({ isActive }) => `${className}${isActive ? " is-active" : ""}`}
      >
        <span className="client-portal-rail__icon"><Icon aria-hidden /></span>
        <span>{item.label}</span>
        <ChevronRight className="client-portal-rail__arrow" aria-hidden />
      </NavLink>
    );
  });
}

/**
 * Dedicated, client-only shell for the authenticated owner portal.
 * It intentionally does not render AppLayout: clients never see the internal
 * project-controls navigation, administration, or unrelated tenant records.
 */
export function ClientPortalShell() {
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const routeProjectId = location.pathname.match(/^\/owner-portal\/projects\/([^/]+)/)?.[1];
  const portfolioClientId = location.pathname.match(/^\/owner-portal\/clients\/([^/]+)\/meetings/)?.[1];
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const { data: ownerData, isLoading: ownerLoading } = useOwnerPortalData();
  const { data: portalKind } = useMyPortalKind();
  const { isModuleEnabled } = useModules();
  const siteAccountabilityEnabled = isModuleEnabled("siteAccountabilityEnabled");
  const { data: hasMainPortalMembership } = useHasMainPortalMembership(user?.id);
  const isInternalProjectUser = userRole === "admin" || userRole === "administrator" || userRole === "project_manager";
  const isOwnerWorkbench = portalKind === "main" || Boolean(hasMainPortalMembership) || isInternalProjectUser || isPlatformSuperAdmin(user);

  const contracts = useMemo(() => ownerData?.primeContracts ?? [], [ownerData?.primeContracts]);
  const catalog = useMemo(() => ownerData?.projects ?? [], [ownerData?.projects]);
  const requestedProjectId = routeProjectId
    ?? new URLSearchParams(location.search).get("project")
    ?? null;
  const allProjects = useMemo(
    () => buildOwnerProjectTabs(catalog, contracts),
    [catalog, contracts],
  );
  const rememberedClientId = readRememberedOwnerPortalClient();
  const projects = useMemo(() => {
    if (portfolioClientId) return allProjects.filter(project => project.client_id === portfolioClientId);
    if (portalKind === "owner" || isOwnerWorkbench) return allProjects;
    const anchor = requestedProjectId ?? allProjects[0]?.id ?? null;
    return filterOwnerProjectsForClient(allProjects, anchor, portfolioClientId ?? rememberedClientId);
  }, [allProjects, isOwnerWorkbench, portalKind, portfolioClientId, rememberedClientId, requestedProjectId]);
  const projectGroups = useMemo(() => groupProjectsByClient(projects), [projects]);
  // Never silently fall back to projects[0] when a specific project was requested —
  // that made every client/preview see the same first contract.
  const matchedProject = projects.find((project) => project.id === requestedProjectId) ?? null;
  const selectedProject = matchedProject ?? (requestedProjectId ? null : (portfolioClientId ? projects.find(p => p.client_id === portfolioClientId) : projects[0]) ?? null);
  const activeProjectId = selectedProject?.id ?? null;
  const selectedContract = selectedProject?.contract ?? null;
  const selectedContractId = selectedContract?.id ?? null;
  const projectUnavailable = Boolean(requestedProjectId && !ownerLoading && !matchedProject && projects.length > 0);
  const { data: portalContext } = useClientPortalContext(activeProjectId);
  const projectMeta = useMemo(
    () => (ownerData?.projectMeta ?? {}) as Record<string, OwnerPortalProjectMeta>,
    [ownerData?.projectMeta],
  );
  const availableProjectMeta = useMemo(
    () => projects.map((project) => projectMeta[project.id] ?? (ownerData?.projects ?? []).find((row) => row.id === project.id)).filter(Boolean) as OwnerPortalProjectMeta[],
    [ownerData?.projects, projectMeta, projects],
  );
  const activeMeta = activeProjectId ? projectMeta[activeProjectId] : null;
  const parentMeta = activeMeta?.parent_project_id
    ? projectMeta[activeMeta.parent_project_id] ?? null
    : null;
  const enabledPortalModules = useMemo(
    () => portalModulesForProject(activeMeta, parentMeta),
    [activeMeta, parentMeta],
  );
  const effectivePortalModules = useMemo(() => {
    if (siteAccountabilityEnabled) return enabledPortalModules;
    const next = new Set(enabledPortalModules);
    next.delete('accountability');
    return next;
  }, [enabledPortalModules, siteAccountabilityEnabled]);
  const siteAccountabilityProjectId = useMemo(() => {
    if (!siteAccountabilityEnabled) return null;
    const dedicated = selectSiteAccountabilityProject(availableProjectMeta, selectedProject?.client_id ?? null);
    if (dedicated) return dedicated.id;
    return effectivePortalModules.has('accountability') ? activeProjectId : null;
  }, [activeProjectId, availableProjectMeta, effectivePortalModules, selectedProject?.client_id, siteAccountabilityEnabled]);
  const { primary: primaryNavigation, secondary: secondaryNavigation } = portalNav(
    activeProjectId,
    effectivePortalModules,
    Boolean(siteAccountabilityProjectId),
  );
  const meetingsClientId = portfolioClientId ?? selectedProject?.client_id;
  const portfolioNavigation: PortalNavEntry[] = meetingsClientId ? [{
    to: `/owner-portal/clients/${meetingsClientId}/meetings`, label: 'Meetings & Actions', icon: CalendarDays, key: 'client-meetings',
  }] : [];

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
    if (!ownerLoading && !routeProjectId && !portfolioClientId && !requestedProjectId && projects[0]?.id) {
      navigate(ownerPortalPath(projects[0].id) + location.hash, { replace: true });
    }
  }, [ownerLoading, routeProjectId, portfolioClientId, requestedProjectId, projects, location.hash, navigate]);

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
    navigate(ownerPortalPath(projectId));
  }

  function projectTabHref(projectId: string) {
    if (isOwnerWorkbench) return `/projects/${projectId}/client-updates?compose=1`;
    return ownerPortalPath(projectId);
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
      siteAccountabilityProjectId,
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

          <div className="client-portal-header__project">
            <small>{portfolioClientId ? 'Client portfolio' : 'Current project'}</small>
            <strong>{portfolioClientId ? 'Meetings & Actions' : projectName}</strong>
          </div>

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

        {mobileOpen && (
          <div className="client-portal-mobile-menu">
            <div className="client-portal-mobile-menu__projects" data-testid="owner-portal-mobile-projects">
              <p className="client-portal-rail__eyebrow">{isOwnerWorkbench ? "Owner workbench" : `${companyName} portfolio`}</p>
              <div className="client-portal-project-tabs" role="tablist" aria-label="Mobile projects">
                {projectGroups.map((group) => (
                  <div className="client-portal-project-group" key={group.key} data-testid={`owner-portal-client-group-${group.key}`}>
                    <p>{group.label}</p>
                    {group.projects.map((project, index) => {
                      const selected = project.id === activeProjectId;
                      return (
                        <Link
                          key={project.id}
                          role="tab"
                          aria-selected={selected}
                          to={projectTabHref(project.id)}
                          className={`client-portal-project-tab${selected ? " is-active" : ""}`}
                        >
                          <span className="client-portal-project-tab__number">{String(index + 1).padStart(2, "0")}</span>
                          <span className="client-portal-project-tab__copy"><strong>{project.name}</strong>{project.status && <small>{project.status.replace(/_/g, " ")}</small>}</span>
                          <ChevronRight aria-hidden />
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <nav className="client-portal-mobile-menu__nav" aria-label="Mobile client portal">
              {isOwnerWorkbench && activeProjectId && (
                <>
                  <p className="client-portal-rail__eyebrow">Owner actions</p>
                  <Link to={`/projects/${activeProjectId}/client-updates?compose=1`} className="client-portal-mobile-menu__link">
                    <span className="client-portal-rail__icon"><PencilLine aria-hidden /></span>
                    <span>Write update</span>
                    <ChevronRight className="client-portal-rail__arrow" aria-hidden />
                  </Link>
                  <Link to={`/projects/${activeProjectId}?tab=client-portal`} className="client-portal-mobile-menu__link">
                    <span className="client-portal-rail__icon"><Edit3 aria-hidden /></span>
                    <span>Edit portal</span>
                    <ChevronRight className="client-portal-rail__arrow" aria-hidden />
                  </Link>
                  <Link to={ownerPortalPath(activeProjectId)} className="client-portal-mobile-menu__link">
                    <span className="client-portal-rail__icon"><ScanEye aria-hidden /></span>
                    <span>Preview client view</span>
                    <ChevronRight className="client-portal-rail__arrow" aria-hidden />
                  </Link>
                </>
              )}
              <PortalNavigationLinks items={portfolioNavigation} decisions={0} location={location} className="client-portal-mobile-menu__link" />
              <p className="client-portal-rail__eyebrow">Project workspace</p>
              <PortalNavigationLinks items={primaryNavigation} decisions={decisions} location={location} className="client-portal-mobile-menu__link" />
              <p className="client-portal-rail__eyebrow client-portal-rail__eyebrow--spaced">Records &amp; reference</p>
              <PortalNavigationLinks items={secondaryNavigation} decisions={decisions} location={location} className="client-portal-mobile-menu__link" />
            </nav>
          </div>
        )}
      </header>

      <div className="client-portal-workspace">
        <aside className="client-portal-sidebar" aria-label="Client project navigation">
          <div className="client-portal-sidebar__projects">
            <div className="client-portal-rail__heading">
              <div><p className="client-portal-rail__eyebrow">{isOwnerWorkbench ? "Owner workbench" : `${companyName} portfolio`}</p><strong>{isOwnerWorkbench ? "Edit projects" : "Your projects"}</strong></div>
              <span>{projects.length}</span>
            </div>
            {projects.length > 1 ? (
              <div className="client-portal-project-tabs" data-testid="owner-portal-project-tabs" role="tablist" aria-label="Projects">
                {projectGroups.map((group) => (
                  <div className="client-portal-project-group" key={group.key} data-testid={`owner-portal-client-group-${group.key}`}>
                    <p>{group.label}</p>
                    {group.projects.map((project, index) => {
                      const selected = project.id === activeProjectId;
                      return (
                        <Link
                          key={project.id}
                          role="tab"
                          aria-selected={selected}
                          data-testid={`owner-portal-project-tab-${project.id}`}
                          to={projectTabHref(project.id)}
                          className={`client-portal-project-tab${selected ? " is-active" : ""}`}
                        >
                          <span className="client-portal-project-tab__number">{String(index + 1).padStart(2, "0")}</span>
                          <span className="client-portal-project-tab__copy"><strong>{project.name}</strong>{project.status && <small>{project.status.replace(/_/g, " ")}</small>}</span>
                          <ChevronRight aria-hidden />
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </div>
            ) : <strong className="client-portal-sidebar__single" data-testid="owner-portal-single-project">{projectName}</strong>}
          </div>

          {isOwnerWorkbench && activeProjectId && (
            <div className="client-portal-owner-tools" data-testid="owner-portal-workbench-tools">
              <p className="client-portal-rail__eyebrow">Owner actions</p>
              <Link to={`/projects/${activeProjectId}/client-updates?compose=1`} className="client-portal-owner-tool">
                <span><PencilLine aria-hidden /></span>
                <strong>Write update</strong>
                <small>Talk or type, wrangle, preview, publish.</small>
              </Link>
              <Link to={`/projects/${activeProjectId}?tab=client-portal`} className="client-portal-owner-tool">
                <span><Edit3 aria-hidden /></span>
                <strong>Edit portal</strong>
                <small>Portal access, messages, actions, documents.</small>
              </Link>
              <Link to={`/projects/${activeProjectId}`} className="client-portal-owner-tool">
                <span><ExternalLink aria-hidden /></span>
                <strong>Project record</strong>
                <small>Scope, schedule, budget, logs, records.</small>
              </Link>
            </div>
          )}

          <nav className="client-portal-rail" aria-label="Selected project">
            <p className="client-portal-rail__eyebrow">Client portfolio</p>
            <PortalNavigationLinks items={portfolioNavigation} decisions={0} location={location} className="client-portal-rail__link" />
            <p className="client-portal-rail__eyebrow">Project workspace</p>
            <PortalNavigationLinks items={primaryNavigation} decisions={decisions} location={location} className="client-portal-rail__link" />
            <p className="client-portal-rail__eyebrow client-portal-rail__eyebrow--spaced">Records &amp; reference</p>
            <PortalNavigationLinks items={secondaryNavigation} decisions={decisions} location={location} className="client-portal-rail__link" />
          </nav>

          <div className="client-portal-sidebar__secure"><ShieldCheck aria-hidden /><span><strong>{isOwnerWorkbench ? "Admin editing mode" : "Private workspace"}</strong><small>{isOwnerWorkbench ? "Client preview stays separate from drafts" : "Role-restricted to the invited client team"}</small></span></div>
        </aside>

        <div className="client-portal-content">
          {isOwnerWorkbench && activeProjectId && (
            <div className="client-portal-preview">
              <ShieldCheck aria-hidden />
              <span><strong>Admin mode.</strong> This is the client preview. Use the owner actions to edit, write, and publish.</span>
              <Link to={`/projects/${activeProjectId}/client-updates?compose=1`}>Write update</Link>
              <Link to={`/projects/${activeProjectId}?tab=client-portal`}>Edit portal</Link>
            </div>
          )}

          <main className="client-portal-main">
            {projectUnavailable ? (
              <div className="client-dashboard-empty" data-testid="owner-portal-project-unavailable">
                <h2>This project is not available in your portal</h2>
                <p>Choose one of the projects in the navigation.</p>
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
        </div>
      </div>

      <nav className="client-portal-bottom-nav" aria-label="Client portal shortcuts">
        {[...portfolioNavigation, ...primaryNavigation.slice(0, 4)].map((item) => {
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
