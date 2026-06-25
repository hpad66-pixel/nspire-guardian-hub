import { useMemo, useState } from 'react';
import { NavLink } from '@/components/NavLink';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Briefcase, FolderKanban } from 'lucide-react';
import { useActiveClients } from '@/hooks/useClients';
import { useProjects } from '@/hooks/useProjects';
import { cn } from '@/lib/utils';

/**
 * Clients -> Projects tree for the sidebar. Clients own projects, so this IS the
 * actionable client nav: clicking a client name opens its page; the chevron
 * expands its projects so any project is two clicks from here. Only clients that
 * own projects appear (the full client list lives on the Clients page); tenant
 * isolation is enforced by RLS. Hidden when the sidebar is icon-collapsed.
 */
export function OrgProjectTree({ collapsed }: { collapsed: boolean }) {
  const navigate = useNavigate();
  const { data: clients = [] } = useActiveClients();
  const { data: projects = [] } = useProjects();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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

  if (collapsed || orgs.length === 0) return null;

  return (
    <div className="space-y-px">
      {orgs.map((org) => {
        const orgProjects = byClient.get(org.id) ?? [];
        const isOpen = expanded[org.id] ?? false;
        return (
          <div key={org.id}>
            <div
              className={cn(
                'group flex w-full items-center rounded-lg pr-2 text-[13px] font-medium',
                'text-sidebar-foreground/60 transition-all duration-150',
                'hover:bg-sidebar-nav-hover-bg hover:text-sidebar-foreground',
              )}
            >
              <button
                type="button"
                aria-label={isOpen ? 'Collapse projects' : 'Expand projects'}
                onClick={() => setExpanded((s) => ({ ...s, [org.id]: !isOpen }))}
                className="flex shrink-0 items-center py-[7px] pl-2 pr-1 text-sidebar-foreground/50 hover:text-sidebar-foreground"
              >
                <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', isOpen && 'rotate-90')} />
              </button>
              <button
                type="button"
                onClick={() => navigate(`/organizations/${org.id}`)}
                className="flex min-w-0 flex-1 items-center gap-2 py-[7px] text-left"
              >
                <Briefcase className="h-[15px] w-[15px] shrink-0 stroke-[1.6]" />
                <span className="flex-1 truncate">{org.name}</span>
              </button>
              <span className="text-[10px] font-semibold tabular-nums text-sidebar-foreground/40">
                {orgProjects.length}
              </span>
            </div>

            {isOpen && (
              <div className="ml-[18px] mt-px space-y-px border-l border-sidebar-border pl-2">
                {orgProjects.map((p) => (
                  <NavLink
                    key={p.id}
                    to={`/projects/${p.id}`}
                    className={cn(
                      'group flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-[13px]',
                      'text-sidebar-foreground/55 transition-all duration-150',
                      'hover:bg-sidebar-nav-hover-bg hover:text-sidebar-foreground',
                    )}
                    activeClassName="!bg-sidebar-nav-active-bg !text-sidebar-foreground !font-semibold"
                  >
                    <FolderKanban className="h-[14px] w-[14px] shrink-0 stroke-[1.6]" />
                    <span className="flex-1 truncate">{p.name}</span>
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
