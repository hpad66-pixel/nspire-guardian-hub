/** Time-aware greeting for the Command Center hero. */
export function dashboardGreeting(fullName: string | null | undefined, now: Date = new Date()): string {
  const hour = now.getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const first = fullName?.trim().split(/\s+/)[0];
  return first ? `${greet}, ${first}` : greet;
}

export type DashboardHeroTone = 'critical' | 'attention' | 'clear';
export type DashboardHeroCta =
  | 'critical'
  | 'my-day'
  | 'projects'
  | 'work-orders'
  | 'issues';

export interface DashboardHeroCopy {
  headline: string;
  subline: string;
  statusLine: string;
  ctaLabel: string;
  ctaTarget: DashboardHeroCta;
  tone: DashboardHeroTone;
}

/** Invite-to-act copy for the Dashboard / Command Center hero. */
export function dashboardHeroCopy(input: {
  fullName?: string | null;
  workspaceName?: string | null;
  criticalCount: number;
  warningCount: number;
  activeProjects: number;
  openWOs: number;
  openIssues: number;
  now?: Date;
}): DashboardHeroCopy {
  const {
    fullName,
    workspaceName,
    criticalCount,
    warningCount,
    activeProjects,
    openWOs,
    openIssues,
    now = new Date(),
  } = input;

  const greet = dashboardGreeting(fullName, now);
  const workspace = workspaceName?.trim() || 'your workspace';
  const statusLine = [
    criticalCount > 0 ? `${criticalCount} critical` : null,
    warningCount > 0 ? `${warningCount} warning${warningCount === 1 ? '' : 's'}` : null,
    `${activeProjects} active project${activeProjects === 1 ? '' : 's'}`,
  ]
    .filter(Boolean)
    .join(' · ');

  if (criticalCount > 0) {
    return {
      headline: `${greet} — ${criticalCount} need attention now.`,
      subline: `Start with the critical items in ${workspace}, then clear the rest of your plate.`,
      statusLine,
      ctaLabel: 'Start with critical',
      ctaTarget: 'critical',
      tone: 'critical',
    };
  }

  if (warningCount > 0 || openIssues > 0 || openWOs > 0) {
    const focus =
      openIssues > 0
        ? `${openIssues} open issue${openIssues === 1 ? '' : 's'}`
        : openWOs > 0
          ? `${openWOs} work order${openWOs === 1 ? '' : 's'} in flight`
          : `${warningCount} warning${warningCount === 1 ? '' : 's'}`;
    return {
      headline: `${greet} — here's your command center.`,
      subline: `${focus} waiting. Use the map below to jump straight into Work, Field, Money, or People.`,
      statusLine,
      ctaLabel: openIssues > 0 ? 'Work open issues' : openWOs > 0 ? 'Advance work orders' : 'Open My Day',
      ctaTarget: openIssues > 0 ? 'issues' : openWOs > 0 ? 'work-orders' : 'my-day',
      tone: 'attention',
    };
  }

  return {
    headline: `${greet} — you're clear.`,
    subline: `${workspace} looks calm. Review projects, file today's work, or explore the map below.`,
    statusLine: statusLine || 'All clear',
    ctaLabel: activeProjects > 0 ? 'Review projects' : 'Open My Day',
    ctaTarget: activeProjects > 0 ? 'projects' : 'my-day',
    tone: 'clear',
  };
}
