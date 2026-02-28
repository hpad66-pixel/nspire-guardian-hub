import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEscalationRules } from './useEscalationRules';
import { useAuth } from './useAuth';

/**
 * Client-side escalation engine. Runs on dashboard load and polls every 15 minutes.
 * Checks active rules against current entity data and fires notifications.
 */
export function useEscalationEngine() {
  const { user } = useAuth();
  const { data: rules = [] } = useEscalationRules();
  const qc = useQueryClient();

  const activeRules = rules.filter(r => r.is_active);

  const { data: engineResult } = useQuery({
    queryKey: ['escalation-engine-run', activeRules.map(r => r.id).join(',')],
    queryFn: async () => {
      if (!user?.id || activeRules.length === 0) {
        return { checked: 0, fired: 0 };
      }

      let fired = 0;

      for (const rule of activeRules) {
        try {
          // Get matching entities
          const entities = await getMatchingEntities(rule.trigger_entity, rule.trigger_condition, rule.delay_hours);
          
          for (const entity of entities) {
            // Check if already escalated and not resolved
            const { data: existing } = await supabase
              .from('escalation_log')
              .select('id, resolved_at')
              .eq('rule_id', rule.id)
              .eq('entity_id', entity.id)
              .is('resolved_at', null)
              .limit(1);

            if (existing && existing.length > 0) continue; // Already active escalation

            // Fire escalation - insert log and notification
            const wsRes = await supabase.rpc('get_my_workspace_id');
            
            // Get users to notify based on roles
            const notifyUserIds = [...(rule.notify_user_ids || [])];
            if (rule.notify_roles && rule.notify_roles.length > 0) {
              const { data: roleUsers } = await supabase
                .from('user_roles')
                .select('user_id')
                .in('role', rule.notify_roles as any);
              if (roleUsers) {
                for (const ru of roleUsers) {
                  if (!notifyUserIds.includes(ru.user_id)) {
                    notifyUserIds.push(ru.user_id);
                  }
                }
              }
            }

            // Insert escalation log
            await supabase.from('escalation_log').insert({
              workspace_id: wsRes.data,
              rule_id: rule.id,
              rule_name: rule.name,
              entity_type: rule.trigger_entity,
              entity_id: entity.id,
              entity_title: entity.title,
              notified_user_ids: notifyUserIds,
              notification_channels: rule.notification_channel || ['in_app'],
            } as any);

            // Insert notifications for each user
            const message = formatMessage(rule.message_template, entity);
            for (const uid of notifyUserIds) {
              await supabase.from('notifications').insert({
                user_id: uid,
                type: 'escalation',
                title: `Escalation: ${rule.name}`,
                message,
                entity_type: rule.trigger_entity,
                entity_id: entity.id,
              });
            }

            fired++;
          }
        } catch {
          // Silently continue on individual rule failures
        }
      }

      if (fired > 0) {
        qc.invalidateQueries({ queryKey: ['escalation-log'] });
      }

      return { checked: activeRules.length, fired };
    },
    enabled: !!user?.id && activeRules.length > 0,
    refetchInterval: 15 * 60 * 1000, // 15 minutes
    staleTime: 14 * 60 * 1000,
  });

  return engineResult || { checked: 0, fired: 0 };
}

async function getMatchingEntities(
  entityType: string,
  condition: Record<string, any>,
  delayHours: number
): Promise<{ id: string; title: string }[]> {
  const cutoff = new Date(Date.now() - delayHours * 60 * 60 * 1000).toISOString();
  
  let query: any;
  switch (entityType) {
    case 'work_order':
      query = supabase.from('work_orders').select('id, title, created_at, status, priority');
      break;
    case 'issue':
      query = supabase.from('issues').select('id, title, created_at, status, severity');
      break;
    case 'compliance_event':
      query = supabase.from('compliance_events').select('id, title, created_at, status, priority');
      break;
    case 'risk':
      query = supabase.from('risks').select('id, title, created_at, status, probability, impact');
      break;
    case 'regulatory_action_item':
      query = supabase.from('regulatory_action_items').select('id, title, created_at, status, due_date');
      break;
    default:
      return [];
  }

  // Apply condition filter
  if (condition.field && condition.value) {
    if (condition.operator === 'equals') {
      query = query.eq(condition.field, condition.value);
    } else if (condition.operator === 'not_in' && Array.isArray(condition.value)) {
      for (const v of condition.value) {
        query = query.neq(condition.field, v);
      }
    } else if (condition.operator === 'in' && Array.isArray(condition.value)) {
      query = query.in(condition.field, condition.value);
    }
  }

  // Only entities older than delay
  if (delayHours > 0) {
    query = query.lte('created_at', cutoff);
  }

  const { data } = await query.limit(50);
  return (data || []).map((e: any) => ({ id: e.id, title: e.title || 'Untitled' }));
}

function formatMessage(template: string | null, entity: { id: string; title: string }): string {
  if (!template) return `Escalation triggered for: ${entity.title}`;
  return template
    .replace(/{entity_title}/g, entity.title)
    .replace(/{entity_id}/g, entity.id);
}
