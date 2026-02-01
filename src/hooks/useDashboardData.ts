import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type UserRole = 'admin' | 'manager' | 'superintendent' | 'inspector' | 'user' | 'viewer';

export interface DashboardMetrics {
  properties: number;
  totalUnits: number;
  openIssues: number;
  urgentIssues: number;
  openWorkOrders: number;
  pendingApprovals: number;
  activeProjects: number;
  complianceRate: number;
  todayInspections: number;
  myAssignedItems: number;
  completedThisWeek: number;
  pendingReviews: number;
}

export interface ActionItem {
  id: string;
  type: 'work_order_approval' | 'inspection_review' | 'proposal_ready' | 'urgent_defect' | 'overdue_task';
  title: string;
  subtitle: string;
  severity: 'high' | 'medium' | 'low';
  link: string;
  count?: number;
}

export function useUserRole() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return 'user' as UserRole;
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      if (error || !data) return 'user' as UserRole;
      return data.role as UserRole;
    },
    enabled: !!user?.id,
  });
}

export function useDashboardData() {
  const { user } = useAuth();
  const { data: role = 'user' } = useUserRole();
  
  return useQuery({
    queryKey: ['dashboard-data', user?.id, role],
    queryFn: async (): Promise<{ metrics: DashboardMetrics; actionItems: ActionItem[] }> => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      // Fetch all data in parallel
      const [
        propertiesRes,
        unitsRes,
        issuesRes,
        workOrdersRes,
        projectsRes,
        inspectionsRes,
        dailyInspectionsRes,
      ] = await Promise.all([
        supabase.from('properties').select('id', { count: 'exact' }),
        supabase.from('units').select('id', { count: 'exact' }),
        supabase.from('issues').select('id, status, severity'),
        supabase.from('work_orders').select('id, status, priority, assigned_to, due_date'),
        supabase.from('projects').select('id, status'),
        supabase.from('inspections').select('id, inspector_id, inspection_date').eq('inspection_date', today.toISOString().split('T')[0]),
        supabase.from('daily_inspections').select('id, inspector_id, review_status, inspection_date')
          .is('review_status', null),
      ]);
      
      const issues = issuesRes.data || [];
      const workOrders = workOrdersRes.data || [];
      const projects = projectsRes.data || [];
      const dailyInspections = dailyInspectionsRes.data || [];
      
      const openIssues = issues.filter(i => i.status !== 'resolved' && i.status !== 'verified');
      const urgentIssues = openIssues.filter(i => i.severity === 'severe');
      const openWorkOrders = workOrders.filter(wo => wo.status !== 'verified' && wo.status !== 'closed');
      const pendingApprovals = workOrders.filter(wo => wo.status === 'pending_approval');
      const activeProjects = projects.filter(p => p.status === 'active' || p.status === 'planning');
      
      const resolvedIssues = issues.filter(i => i.status === 'resolved' || i.status === 'verified');
      const complianceRate = issues.length > 0 
        ? Math.round((resolvedIssues.length / issues.length) * 100)
        : 100;
      
      const myAssignedItems = user?.id 
        ? workOrders.filter(wo => wo.assigned_to === user.id && wo.status !== 'verified').length
        : 0;
      
      const pendingReviews = dailyInspections.length;
      
      const metrics: DashboardMetrics = {
        properties: propertiesRes.count || 0,
        totalUnits: unitsRes.count || 0,
        openIssues: openIssues.length,
        urgentIssues: urgentIssues.length,
        openWorkOrders: openWorkOrders.length,
        pendingApprovals: pendingApprovals.length,
        activeProjects: activeProjects.length,
        complianceRate,
        todayInspections: inspectionsRes.data?.length || 0,
        myAssignedItems,
        completedThisWeek: workOrders.filter(wo => wo.status === 'completed' || wo.status === 'verified').length,
        pendingReviews,
      };
      
      // Build action items based on role
      const actionItems: ActionItem[] = [];
      
      if (role === 'admin' || role === 'manager') {
        if (pendingApprovals.length > 0) {
          actionItems.push({
            id: 'pending-approvals',
            type: 'work_order_approval',
            title: `${pendingApprovals.length} Work Orders Pending Approval`,
            subtitle: 'Requires your review',
            severity: 'high',
            link: '/work-orders',
            count: pendingApprovals.length,
          });
        }
        
        if (pendingReviews > 0) {
          actionItems.push({
            id: 'pending-reviews',
            type: 'inspection_review',
            title: `${pendingReviews} Inspections Awaiting Review`,
            subtitle: 'Submitted and ready for approval',
            severity: 'medium',
            link: '/inspections/review',
            count: pendingReviews,
          });
        }
      }
      
      if (urgentIssues.length > 0) {
        actionItems.push({
          id: 'urgent-issues',
          type: 'urgent_defect',
          title: `${urgentIssues.length} Urgent Issues`,
          subtitle: 'Require immediate attention',
          severity: 'high',
          link: '/issues',
          count: urgentIssues.length,
        });
      }
      
      // Overdue work orders
      const overdueWOs = workOrders.filter(wo => {
        const dueDate = new Date(wo.due_date);
        return dueDate < today && wo.status !== 'verified' && wo.status !== 'completed';
      });
      
      if (overdueWOs.length > 0) {
        actionItems.push({
          id: 'overdue-work-orders',
          type: 'overdue_task',
          title: `${overdueWOs.length} Overdue Work Orders`,
          subtitle: 'Past due date',
          severity: 'high',
          link: '/work-orders',
          count: overdueWOs.length,
        });
      }
      
      return { metrics, actionItems };
    },
    enabled: !!user?.id,
    refetchInterval: 60000, // Refresh every minute
  });
}
