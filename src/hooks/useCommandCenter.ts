import { useMemo } from 'react';
import { differenceInDays, parseISO } from 'date-fns';
import { useModules } from '@/contexts/ModuleContext';
import { useAllCredentials, getCredentialStatus, getDaysUntilExpiry } from '@/hooks/useCredentials';
import { useAllAssignments } from '@/hooks/useTraining';
import { usePendingIncidents } from '@/hooks/useSafety';
import { useExpiringDocuments } from '@/hooks/useEquipment';
import { usePortals } from '@/hooks/usePortal';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface CommandCenterAlert {
  id: string;
  severity: 'critical' | 'warning';
  module: 'credentials' | 'training' | 'safety' | 'equipment' | 'projects' | 'portals' | 'core';
  type: string;
  title: string;
  subtitle: string;
  daysUntil: number | null;
  actionLabel: string;
  actionPath: string;
  personId?: string;
  personName?: string;
  personAvatar?: string;
}

export interface TeamMemberStatus {
  userId: string;
  name: string;
  avatar?: string;
  jobTitle?: string;
  department?: string;
  dot: 'green' | 'amber' | 'red' | 'gray';
  worstReason?: string;
  credentialStatus: 'ok' | 'expiring' | 'expired' | 'none';
  trainingStatus: 'ok' | 'overdue' | 'none';
}

export interface CommandCenterData {
  criticalAlerts: CommandCenterAlert[];
  warningAlerts: CommandCenterAlert[];
  teamStatuses: TeamMemberStatus[];
  isLoading: boolean;
  lastRefreshed: Date;
  counts: {
    critical: number;
    warnings: number;
    teamGreen: number;
    teamAmber: number;
    teamRed: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useCommandCenter(): CommandCenterData {
  const { isModuleEnabled } = useModules();

  // ── Data sources ──────────────────────────────────────────────────────────
  const credentialsEnabled = isModuleEnabled('credentialWalletEnabled');
  const trainingEnabled = isModuleEnabled('trainingHubEnabled');
  const safetyEnabled = isModuleEnabled('safetyModuleEnabled');
  const equipmentEnabled = isModuleEnabled('equipmentTrackerEnabled');
  const portalsEnabled = isModuleEnabled('clientPortalEnabled');

  const { data: credentials = [], isLoading: loadingCreds } = useAllCredentials();
  const { data: assignments = [], isLoading: loadingTraining } = useAllAssignments();
  const { data: incidents = [], isLoading: loadingSafety } = usePendingIncidents();
  const { data: expiringDocs = [], isLoading: loadingEquipment } = useExpiringDocuments(60);
  const { data: portals = [], isLoading: loadingPortals } = usePortals();

  const isLoading = loadingCreds || loadingTraining || loadingSafety || loadingEquipment || loadingPortals;

  // ── Alerts computation ───────────────────────────────────────────────────
  const { criticalAlerts, warningAlerts } = useMemo(() => {
    const critical: CommandCenterAlert[] = [];
    const warning: CommandCenterAlert[] = [];

    // CREDENTIALS
    if (credentialsEnabled) {
      for (const cred of credentials) {
        const status = getCredentialStatus(cred.expiry_date);
        if (status === 'current' || status === 'no_expiry') continue;
        const days = getDaysUntilExpiry(cred.expiry_date);
        const holderName = cred.holder?.full_name ?? 'Unknown';
        const label = cred.custom_type_label ?? cred.credential_type;
        const alert: CommandCenterAlert = {
          id: `cred-${cred.id}`,
          severity: status === 'expired' ? 'critical' : 'warning',
          module: 'credentials',
          type: status === 'expired' ? 'credential_expired' : 'credential_expiring',
          title: `${label} — ${holderName}`,
          subtitle:
            status === 'expired'
              ? `Expired ${Math.abs(days ?? 0)} day${Math.abs(days ?? 0) === 1 ? '' : 's'} ago`
              : `Expires in ${days} day${days === 1 ? '' : 's'}`,
          daysUntil: days,
          actionLabel: 'View Credential',
          actionPath: '/credentials',
          personId: cred.holder?.user_id,
          personName: holderName,
          personAvatar: cred.holder?.avatar_url ?? undefined,
        };
        if (status === 'expired') critical.push(alert);
        else warning.push(alert);
      }
    }

    // TRAINING
    if (trainingEnabled) {
      const now = new Date();
      for (const assignment of assignments) {
        if (assignment.status === 'completed') continue;
        if (!assignment.due_date) continue;
        const dueDate = parseISO(assignment.due_date);
        const days = differenceInDays(dueDate, now);
        const assignee = (assignment as any).assignee;
        const assigneeName = assignee?.full_name ?? 'Unknown';
        const courseId = assignment.lw_course_id ?? '';

        if (days < 0) {
          critical.push({
            id: `training-${assignment.id}`,
            severity: 'critical',
            module: 'training',
            type: 'training_overdue',
            title: `${courseId} — ${assigneeName}`,
            subtitle: `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'}`,
            daysUntil: days,
            actionLabel: 'View Training',
            actionPath: '/training/dashboard',
            personId: assignee?.user_id,
            personName: assigneeName,
            personAvatar: assignee?.avatar_url ?? undefined,
          });
        } else if (days <= 30) {
          warning.push({
            id: `training-${assignment.id}`,
            severity: 'warning',
            module: 'training',
            type: 'training_due_soon',
            title: `${courseId} — ${assigneeName}`,
            subtitle: `Due in ${days} day${days === 1 ? '' : 's'}`,
            daysUntil: days,
            actionLabel: 'View Training',
            actionPath: '/training/dashboard',
            personId: assignee?.user_id,
            personName: assigneeName,
            personAvatar: assignee?.avatar_url ?? undefined,
          });
        }
      }
    }

    // SAFETY
    if (safetyEnabled) {
      const now = new Date();
      for (const incident of incidents) {
        if (incident.status !== 'pending_review' && incident.status !== 'under_review') continue;
        const created = parseISO(incident.created_at);
        const daysOld = differenceInDays(now, created);
        const caseLabel = incident.case_number ? `#${incident.case_number}` : `Incident`;
        const alert: CommandCenterAlert = {
          id: `safety-${incident.id}`,
          severity: daysOld >= 7 ? 'critical' : 'warning',
          module: 'safety',
          type: 'safety_pending',
          title: `${caseLabel} pending classification`,
          subtitle: `Logged ${daysOld} day${daysOld === 1 ? '' : 's'} ago`,
          daysUntil: null,
          actionLabel: 'View Incident',
          actionPath: '/safety',
        };
        if (daysOld >= 7) critical.push(alert);
        else warning.push(alert);
      }
    }

    // EQUIPMENT
    if (equipmentEnabled) {
      for (const doc of expiringDocs) {
        const assetName = (doc as any).asset?.name ?? 'Unknown Asset';
        const days = doc.expiry_date
          ? differenceInDays(parseISO(doc.expiry_date), new Date())
          : null;
        const isCritical = days !== null && days < 0;
        const alert: CommandCenterAlert = {
          id: `equip-${doc.id}`,
          severity: isCritical ? 'critical' : 'warning',
          module: 'equipment',
          type: isCritical ? 'equipment_expired' : 'equipment_expiring',
          title: `${assetName} — ${doc.document_type}`,
          subtitle: isCritical
            ? `Expired ${Math.abs(days ?? 0)} day${Math.abs(days ?? 0) === 1 ? '' : 's'} ago`
            : `Expires in ${days} day${days === 1 ? '' : 's'}`,
          daysUntil: days,
          actionLabel: 'View Equipment',
          actionPath: '/equipment',
        };
        if (isCritical) critical.push(alert);
        else warning.push(alert);
      }
    }

    // PORTALS
    if (portalsEnabled) {
      for (const portal of portals) {
        if ((portal.pending_requests_count ?? 0) === 0) continue;
        const count = portal.pending_requests_count;
        warning.push({
          id: `portal-${portal.id}`,
          severity: 'warning',
          module: 'portals',
          type: 'portal_pending_requests',
          title: `${count} pending request${count === 1 ? '' : 's'} — ${portal.name}`,
          subtitle: 'Client awaiting response',
          daysUntil: null,
          actionLabel: 'View Portal',
          actionPath: `/portals/${portal.id}`,
        });
      }
    }

    // Sort: most urgent first (most negative days first)
    const sortByUrgency = (a: CommandCenterAlert, b: CommandCenterAlert) => {
      if (a.daysUntil === null && b.daysUntil === null) return 0;
      if (a.daysUntil === null) return 1;
      if (b.daysUntil === null) return -1;
      return a.daysUntil - b.daysUntil;
    };

    return {
      criticalAlerts: critical.sort(sortByUrgency),
      warningAlerts: warning.sort(sortByUrgency),
    };
  }, [credentials, assignments, incidents, expiringDocs, portals, credentialsEnabled, trainingEnabled, safetyEnabled, equipmentEnabled, portalsEnabled]);

  // ── Team status computation ───────────────────────────────────────────────
  const teamStatuses = useMemo((): TeamMemberStatus[] => {
    if (!credentialsEnabled && !trainingEnabled) return [];

    // Build a map of userId → credential statuses
    const credByUser = new Map<string, { expired: number; expiring: number }>();
    if (credentialsEnabled) {
      for (const cred of credentials) {
        const status = getCredentialStatus(cred.expiry_date);
        if (status === 'current' || status === 'no_expiry') continue;
        const holderId = cred.holder?.user_id ?? cred.holder_id;
        if (!holderId) continue;
        const existing = credByUser.get(holderId) ?? { expired: 0, expiring: 0 };
        if (status === 'expired') existing.expired++;
        else if (status === 'expiring_soon') existing.expiring++;
        credByUser.set(holderId, existing);
      }
    }

    // Build a map of userId → training status
    const trainingByUser = new Map<string, { overdue: number; dueSoon: number }>();
    if (trainingEnabled) {
      const now = new Date();
      for (const assignment of assignments) {
        if (assignment.status === 'completed') continue;
        if (!assignment.due_date) continue;
        const dueDate = parseISO(assignment.due_date);
        const days = differenceInDays(dueDate, now);
        const assignee = (assignment as any).assignee;
        const userId = assignee?.user_id ?? assignment.assigned_to;
        if (!userId) continue;
        const existing = trainingByUser.get(userId) ?? { overdue: 0, dueSoon: 0 };
        if (days < 0) existing.overdue++;
        else if (days <= 14) existing.dueSoon++;
        trainingByUser.set(userId, existing);
      }
    }

    // Collect all unique people we know about
    const peopleMap = new Map<string, { name: string; avatar?: string; jobTitle?: string; department?: string }>();

    if (credentialsEnabled) {
      for (const cred of credentials) {
        const holder = cred.holder;
        if (!holder?.user_id) continue;
        if (!peopleMap.has(holder.user_id)) {
          peopleMap.set(holder.user_id, {
            name: holder.full_name ?? 'Unknown',
            avatar: holder.avatar_url ?? undefined,
            jobTitle: holder.job_title ?? undefined,
            department: holder.department ?? undefined,
          });
        }
      }
    }

    if (trainingEnabled) {
      for (const assignment of assignments) {
        const assignee = (assignment as any).assignee;
        if (!assignee?.user_id) continue;
        if (!peopleMap.has(assignee.user_id)) {
          peopleMap.set(assignee.user_id, {
            name: assignee.full_name ?? 'Unknown',
            avatar: assignee.avatar_url ?? undefined,
            jobTitle: assignee.job_title ?? undefined,
            department: assignee.department ?? undefined,
          });
        }
      }
    }

    const statuses: TeamMemberStatus[] = [];

    for (const [userId, person] of peopleMap.entries()) {
      const credData = credByUser.get(userId);
      const trainingData = trainingByUser.get(userId);

      const credentialStatus: TeamMemberStatus['credentialStatus'] = !credentialsEnabled
        ? 'none'
        : credData?.expired
        ? 'expired'
        : credData?.expiring
        ? 'expiring'
        : 'ok';

      const trainingStatus: TeamMemberStatus['trainingStatus'] = !trainingEnabled
        ? 'none'
        : trainingData?.overdue
        ? 'overdue'
        : 'ok';

      let dot: TeamMemberStatus['dot'] = 'green';
      let worstReason: string | undefined;

      if (credentialStatus === 'expired' || trainingStatus === 'overdue') {
        dot = 'red';
        const reasons: string[] = [];
        if (credData?.expired) reasons.push(`${credData.expired} expired credential${credData.expired > 1 ? 's' : ''}`);
        if (trainingData?.overdue) reasons.push(`${trainingData.overdue} overdue training${trainingData.overdue > 1 ? 's' : ''}`);
        worstReason = reasons.join(', ');
      } else if (credentialStatus === 'expiring' || trainingData?.dueSoon) {
        dot = 'amber';
        const reasons: string[] = [];
        if (credData?.expiring) reasons.push(`${credData.expiring} credential${credData.expiring > 1 ? 's' : ''} expiring soon`);
        if (trainingData?.dueSoon) reasons.push(`${trainingData.dueSoon} training${trainingData.dueSoon > 1 ? 's' : ''} due soon`);
        worstReason = reasons.join(', ');
      } else if (credentialStatus === 'none' && trainingStatus === 'none') {
        dot = 'gray';
      }

      statuses.push({
        userId,
        name: person.name,
        avatar: person.avatar,
        jobTitle: person.jobTitle,
        department: person.department,
        dot,
        worstReason,
        credentialStatus,
        trainingStatus,
      });
    }

    // Sort: red → amber → green → gray
    const dotOrder = { red: 0, amber: 1, green: 2, gray: 3 };
    return statuses.sort((a, b) => dotOrder[a.dot] - dotOrder[b.dot]);
  }, [credentials, assignments, credentialsEnabled, trainingEnabled]);

  const counts = useMemo(() => ({
    critical: criticalAlerts.length,
    warnings: warningAlerts.length,
    teamGreen: teamStatuses.filter(t => t.dot === 'green').length,
    teamAmber: teamStatuses.filter(t => t.dot === 'amber').length,
    teamRed: teamStatuses.filter(t => t.dot === 'red').length,
  }), [criticalAlerts, warningAlerts, teamStatuses]);

  return {
    criticalAlerts,
    warningAlerts,
    teamStatuses,
    isLoading,
    lastRefreshed: new Date(),
    counts,
  };
}
