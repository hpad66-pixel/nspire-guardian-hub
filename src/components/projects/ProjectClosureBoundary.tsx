import { type ReactNode, type SyntheticEvent, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useProject } from '@/hooks/useProjects';
import { ProjectClosedBanner } from '@/components/projects/ProjectClosedBanner';
import { projectIdFromPath } from '@/lib/projects/projectRoute';

function shouldAllowInteraction(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return true;
  if (target.closest('[data-project-closed-allowed="true"]')) return true;
  if (target.closest('a[href]')) return true;
  if (target.closest('[role="tab"]')) return true;
  if (target.closest('nav')) return true;
  return false;
}

/**
 * Keeps every internal project route readable after closeout while preventing
 * UI mutations. The database lifecycle triggers are the authoritative backstop;
 * this boundary gives people an immediate, understandable read-only experience.
 */
export function ProjectClosureBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  const projectId = useMemo(() => projectIdFromPath(location.pathname), [location.pathname]);
  const { data: project } = useProject(projectId);
  const lastNoticeAt = useRef(0);
  const isClosed = project?.status === 'closed';

  const stopMutation = (event: SyntheticEvent) => {
    if (!isClosed || shouldAllowInteraction(event.target)) return;
    const target = event.target as Element | null;
    const interactive = target?.closest(
      'button,input,textarea,select,[contenteditable="true"],form,[role="button"],[role="menuitem"],[role="checkbox"],[role="switch"],[role="combobox"]',
    );
    if (!interactive) return;
    event.preventDefault();
    event.stopPropagation();
    const now = Date.now();
    if (now - lastNoticeAt.current > 1800) {
      toast.info('This project is closed and read-only. An administrator must reopen it before changes can be made.');
      lastNoticeAt.current = now;
    }
  };

  return (
    <>
      {isClosed && project && <ProjectClosedBanner project={project} />}
      <div
        data-project-read-only={isClosed ? 'true' : 'false'}
        onClickCapture={stopMutation}
        onChangeCapture={stopMutation}
        onInputCapture={stopMutation}
        onSubmitCapture={stopMutation}
      >
        {children}
      </div>
    </>
  );
}
