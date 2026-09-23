import { useMemo, useState } from 'react';
import { NavLink } from '@/components/NavLink';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Briefcase, FolderKanban, Search, ListTree } from 'lucide-react';
import { useActiveClients } from '@/hooks/useClients';
import { useProjects } from '@/hooks/useProjects';
import { cn } from '@/lib/utils';

const CLIENTS_VISIBLE_DEFAULT = 6;
const PROJECTS_VISIBLE_DEFAULT = 4;

/**
 * Clients -> Projects tree for the sidebar. Clients own projects, so this IS the
 * actionable client nav. It is intentionally capped and searchable so the
 * desktop rail stays useful when a client or workspace has many projects.
 */
export function OrgProjectTree({ collapsed }: { collapsed: boolean }) {
  const navigate = useNavigate();
  const { data: clients = [] } = useActiveClients();
  const { data: projects = [] } = useProjects();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [expandedProjectLists, setExpandedProjectLists] = useState<Record<string, boolean>>({});
  const [showAllClients, setShowAllClients] = useState(false);
  const [query, setQuery] = useState('');

  const byClient = useMemo(() => {
    const map = new Map<string, Array<{ id: string; name: string }>>();
    for (const p of projects) {
      const cid = (p as { client_id?: string | null }).client_id;
      if (!cid) continue;
      if (!map.has(cid)) map.set(cid, []);
      map.get(cid)!.push({ id: p.id, name: p.name });
    }
    return map;
  }, [projects]);

  const orgs = useMemo(
    () => clients.filter((c) => (byClient.get(c.id)?.length ?? 0) > 0),
    [clients, byClient],
  );

  const filteredOrgs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orgs;
    return orgs.filter((org) => {
      const orgProjects = byClient.get(org.id) ?? [];
      return (
        org.name.toLowerCase().includes(q) ||
        orgProjects.some((project) => project.name.toLowerCase().includes(q))
      );
    });
  }, [byClient, orgs, query]);

  const visibleOrgs = query.trim() || showAllClients
    ? filteredOrgs
    : filteredOrgs.slice(0, CLIENTS_VISIBLE_DEFAULT);
  const hiddenClientCount = Math.max(filteredOrgs.length - visibleOrgs.length, 0);

  if (collapsed || orgs.length === 0) return null;

  return (
    <div className="space-y-2 rounded-xl border border-sidebar-border/80 bg-black/10 p-2 shadow-inner">
      <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-2 text-sidebar-foreground">
        <Search className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/72" />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setShowAllClients(true);
          }}
          placeholder="Find client or project"
          className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-sidebar-foreground placeholder:text-sidebar-foreground/52 outline-none"
          aria-label="Find client or project"
        />
      </div>

      <div className="max-h-[34vh] space-y-px overflow-y-auto pr-1">
        {visibleOrgs.map((org) => {
          const orgProjects = byClient.get(org.id) ?? [];
          const isOpen = expanded[org.id] ?? false;
          const projectListExpanded = expandedProjectLists[org.id] ?? false;
          const matchingProjects = query.trim()
            ? orgProjects.filter((project) => project.name.toLowerCase().includes(query.trim().toLowerCase()))
            : orgProjects;
          const visibleProjects = projectListExpanded || query.trim()
            ? matchingProjects
            : matchingProjects.slice(0, PROJECTS_VISIBLE_DEFAULT);
          const hiddenProjectCount = Math.max(matchingProjects.length - visibleProjects.length, 0);
          return (
            <div key={org.id}>
              <div
                className={cn(
                  'group flex w-full items-center rounded-lg pr-2 text-[14px] font-semibold leading-5',
                  'text-sidebar-foreground/88 transition-all duration-150',
                  'hover:bg-sidebar-nav-hover-bg hover:text-sidebar-foreground',
                )}
              >
                <button
                  type="button"
                  aria-label={isOpen ? 'Collapse projects' : 'Expand projects'}
                  onClick={() => setExpanded((s) => ({ ...s, [org.id]: !isOpen }))}
                  className="flex shrink-0 items-center py-[7px] pl-2 pr-1 text-sidebar-foreground/72 hover:text-sidebar-foreground"
                >
                  <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', isOpen && 'rotate-90')} />
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/organizations/${org.id}`)}
                  className="flex min-w-0 flex-1 items-center gap-2 py-[7px] text-left"
                >
                  <Briefcase className="h-[15px] w-[15px] shrink-0 stroke-[1.85] text-sidebar-foreground/78 group-hover:text-sidebar-foreground" />
                  <span className="flex-1 truncate">{org.name}</span>
                </button>
                <span className="text-[11px] font-bold tabular-nums text-sidebar-foreground/70">
                  {orgProjects.length}
                </span>
              </div>

              {isOpen && (
                <div className="ml-[18px] mt-px space-y-px border-l border-sidebar-border pl-2">
                  {visibleProjects.map((p) => (
                    <NavLink
                      key={p.id}
                      to={`/projects/${p.id}`}
                      className={cn(
                        'group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[14px] font-medium leading-5',
                        'text-sidebar-foreground/82 transition-all duration-150',
                        'hover:bg-sidebar-nav-hover-bg hover:text-sidebar-foreground',
                      )}
                      activeClassName="!bg-sidebar-nav-active-bg !text-sidebar-foreground !font-semibold"
                    >
                      <FolderKanban className="h-[14px] w-[14px] shrink-0 stroke-[1.8] text-sidebar-foreground/74 group-hover:text-sidebar-foreground" />
                      <span className="flex-1 truncate">{p.name}</span>
                    </NavLink>
                  ))}
                  {hiddenProjectCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setExpandedProjectLists((state) => ({ ...state, [org.id]: true }))}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px] font-semibold text-[#f1d889] transition-colors hover:bg-sidebar-nav-hover-bg"
                    >
                      <ListTree className="h-3.5 w-3.5" />
                      Show {hiddenProjectCount} more
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredOrgs.length === 0 && (
        <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-3 text-[12px] font-medium text-sidebar-foreground/72">
          No matching clients or projects.
        </div>
      )}

      <div className="grid gap-1 border-t border-sidebar-border/80 pt-2">
        {hiddenClientCount > 0 && (
          <button
            type="button"
            onClick={() => setShowAllClients(true)}
            className="flex w-full items-center justify-center rounded-lg bg-white/[0.07] px-3 py-2 text-[12px] font-bold text-sidebar-foreground transition-colors hover:bg-sidebar-nav-hover-bg"
          >
            Show {hiddenClientCount} more clients
          </button>
        )}
        <button
          type="button"
          onClick={() => navigate('/projects')}
          className="flex w-full items-center justify-center rounded-lg border border-white/10 px-3 py-2 text-[12px] font-semibold text-sidebar-foreground/82 transition-colors hover:bg-sidebar-nav-hover-bg hover:text-sidebar-foreground"
        >
          Open full portfolio
        </button>
      </div>
    </div>
  );
}
