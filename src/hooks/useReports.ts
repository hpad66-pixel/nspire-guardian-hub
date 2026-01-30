import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { startOfMonth, endOfMonth, subMonths, format, differenceInDays } from 'date-fns';

export interface DateRange {
  from: Date;
  to: Date;
}

// Property Portfolio Report
export function usePropertyPortfolioReport(dateRange?: DateRange) {
  return useQuery({
    queryKey: ['reports', 'property-portfolio', dateRange],
    queryFn: async () => {
      const { data: properties, error: propError } = await supabase
        .from('properties')
        .select('*')
        .order('name');

      if (propError) throw propError;

      const { data: units, error: unitError } = await supabase
        .from('units')
        .select('property_id, status');

      if (unitError) throw unitError;

      const { data: issues, error: issueError } = await supabase
        .from('issues')
        .select('property_id, status, severity');

      if (issueError) throw issueError;

      const propertyStats = properties?.map((property) => {
        const propertyUnits = units?.filter((u) => u.property_id === property.id) || [];
        const propertyIssues = issues?.filter((i) => i.property_id === property.id) || [];
        
        return {
          ...property,
          unitCount: propertyUnits.length,
          occupiedUnits: propertyUnits.filter((u) => u.status === 'occupied').length,
          vacantUnits: propertyUnits.filter((u) => u.status === 'vacant').length,
          openIssues: propertyIssues.filter((i) => i.status === 'open' || i.status === 'in_progress').length,
          severeIssues: propertyIssues.filter((i) => i.severity === 'severe' && i.status !== 'resolved').length,
        };
      });

      return {
        properties: propertyStats || [],
        summary: {
          totalProperties: properties?.length || 0,
          totalUnits: units?.length || 0,
          occupiedUnits: units?.filter((u) => u.status === 'occupied').length || 0,
          vacantUnits: units?.filter((u) => u.status === 'vacant').length || 0,
          totalOpenIssues: issues?.filter((i) => i.status !== 'resolved').length || 0,
        },
      };
    },
  });
}

// Inspection Summary Report
export function useInspectionSummaryReport(dateRange?: DateRange) {
  return useQuery({
    queryKey: ['reports', 'inspection-summary', dateRange],
    queryFn: async () => {
      let query = supabase
        .from('inspections')
        .select(`
          *,
          property:properties(name),
          unit:units(unit_number)
        `)
        .order('inspection_date', { ascending: false });

      if (dateRange) {
        query = query
          .gte('inspection_date', format(dateRange.from, 'yyyy-MM-dd'))
          .lte('inspection_date', format(dateRange.to, 'yyyy-MM-dd'));
      }

      const { data: inspections, error } = await query;
      if (error) throw error;

      const byArea = {
        outside: inspections?.filter((i) => i.area === 'outside').length || 0,
        inside: inspections?.filter((i) => i.area === 'inside').length || 0,
        unit: inspections?.filter((i) => i.area === 'unit').length || 0,
      };

      const byStatus = {
        completed: inspections?.filter((i) => i.status === 'completed').length || 0,
        in_progress: inspections?.filter((i) => i.status === 'in_progress').length || 0,
        scheduled: inspections?.filter((i) => i.status === 'scheduled').length || 0,
      };

      return {
        inspections: inspections || [],
        byArea,
        byStatus,
        total: inspections?.length || 0,
        completionRate: inspections?.length 
          ? Math.round((byStatus.completed / inspections.length) * 100) 
          : 0,
      };
    },
  });
}

// Defects Analysis Report
export function useDefectsAnalysisReport(dateRange?: DateRange) {
  return useQuery({
    queryKey: ['reports', 'defects-analysis', dateRange],
    queryFn: async () => {
      let query = supabase
        .from('defects')
        .select(`
          *,
          inspection:inspections(
            property:properties(name),
            unit:units(unit_number),
            area
          )
        `)
        .order('created_at', { ascending: false });

      if (dateRange) {
        query = query
          .gte('created_at', dateRange.from.toISOString())
          .lte('created_at', dateRange.to.toISOString());
      }

      const { data: defects, error } = await query;
      if (error) throw error;

      const bySeverity = {
        severe: defects?.filter((d) => d.severity === 'severe').length || 0,
        moderate: defects?.filter((d) => d.severity === 'moderate').length || 0,
        low: defects?.filter((d) => d.severity === 'low').length || 0,
      };

      const repaired = defects?.filter((d) => d.repaired_at).length || 0;
      const pending = defects?.filter((d) => !d.repaired_at).length || 0;

      // Group by category
      const byCategory: Record<string, number> = {};
      defects?.forEach((d) => {
        byCategory[d.category] = (byCategory[d.category] || 0) + 1;
      });

      return {
        defects: defects || [],
        bySeverity,
        byCategory,
        total: defects?.length || 0,
        repaired,
        pending,
        resolutionRate: defects?.length 
          ? Math.round((repaired / defects.length) * 100) 
          : 0,
      };
    },
  });
}

// Issues Overview Report
export function useIssuesOverviewReport(dateRange?: DateRange) {
  return useQuery({
    queryKey: ['reports', 'issues-overview', dateRange],
    queryFn: async () => {
      let query = supabase
        .from('issues')
        .select(`
          *,
          property:properties(name),
          unit:units(unit_number)
        `)
        .order('created_at', { ascending: false });

      if (dateRange) {
        query = query
          .gte('created_at', dateRange.from.toISOString())
          .lte('created_at', dateRange.to.toISOString());
      }

      const { data: issues, error } = await query;
      if (error) throw error;

      const byStatus = {
        open: issues?.filter((i) => i.status === 'open').length || 0,
        in_progress: issues?.filter((i) => i.status === 'in_progress').length || 0,
        resolved: issues?.filter((i) => i.status === 'resolved').length || 0,
      };

      const bySeverity = {
        severe: issues?.filter((i) => i.severity === 'severe').length || 0,
        moderate: issues?.filter((i) => i.severity === 'moderate').length || 0,
        low: issues?.filter((i) => i.severity === 'low').length || 0,
      };

      const bySource = {
        core: issues?.filter((i) => i.source_module === 'core').length || 0,
        nspire: issues?.filter((i) => i.source_module === 'nspire').length || 0,
        projects: issues?.filter((i) => i.source_module === 'projects').length || 0,
      };

      // Overdue issues
      const today = new Date();
      const overdue = issues?.filter((i) => 
        i.deadline && new Date(i.deadline) < today && i.status !== 'resolved'
      ).length || 0;

      return {
        issues: issues || [],
        byStatus,
        bySeverity,
        bySource,
        total: issues?.length || 0,
        overdue,
        resolutionRate: issues?.length 
          ? Math.round((byStatus.resolved / issues.length) * 100) 
          : 0,
      };
    },
  });
}

// Work Orders Performance Report
export function useWorkOrdersPerformanceReport(dateRange?: DateRange) {
  return useQuery({
    queryKey: ['reports', 'work-orders-performance', dateRange],
    queryFn: async () => {
      let query = supabase
        .from('work_orders')
        .select(`
          *,
          property:properties(name),
          unit:units(unit_number)
        `)
        .order('created_at', { ascending: false });

      if (dateRange) {
        query = query
          .gte('created_at', dateRange.from.toISOString())
          .lte('created_at', dateRange.to.toISOString());
      }

      const { data: workOrders, error } = await query;
      if (error) throw error;

      const byStatus = {
        pending: workOrders?.filter((w) => w.status === 'pending').length || 0,
        assigned: workOrders?.filter((w) => w.status === 'assigned').length || 0,
        in_progress: workOrders?.filter((w) => w.status === 'in_progress').length || 0,
        completed: workOrders?.filter((w) => w.status === 'completed').length || 0,
        verified: workOrders?.filter((w) => w.status === 'verified').length || 0,
      };

      const byPriority = {
        emergency: workOrders?.filter((w) => w.priority === 'emergency').length || 0,
        routine: workOrders?.filter((w) => w.priority === 'routine').length || 0,
      };

      // Calculate average resolution time for completed orders
      const completedOrders = workOrders?.filter((w) => w.completed_at) || [];
      let avgResolutionDays = 0;
      if (completedOrders.length > 0) {
        const totalDays = completedOrders.reduce((sum, w) => {
          const created = new Date(w.created_at);
          const completed = new Date(w.completed_at!);
          return sum + differenceInDays(completed, created);
        }, 0);
        avgResolutionDays = Math.round(totalDays / completedOrders.length);
      }

      const today = new Date();
      const overdue = workOrders?.filter((w) => 
        new Date(w.due_date) < today && !['completed', 'verified'].includes(w.status)
      ).length || 0;

      return {
        workOrders: workOrders || [],
        byStatus,
        byPriority,
        total: workOrders?.length || 0,
        overdue,
        avgResolutionDays,
        completionRate: workOrders?.length 
          ? Math.round(((byStatus.completed + byStatus.verified) / workOrders.length) * 100) 
          : 0,
      };
    },
  });
}

// Project Status Report
export function useProjectStatusReport(dateRange?: DateRange) {
  return useQuery({
    queryKey: ['reports', 'project-status', dateRange],
    queryFn: async () => {
      const { data: projects, error: projError } = await supabase
        .from('projects')
        .select(`
          *,
          property:properties(name)
        `)
        .order('created_at', { ascending: false });

      if (projError) throw projError;

      const { data: changeOrders, error: coError } = await supabase
        .from('change_orders')
        .select('project_id, amount, status');

      if (coError) throw coError;

      const { data: milestones, error: msError } = await supabase
        .from('project_milestones')
        .select('project_id, status');

      if (msError) throw msError;

      const byStatus = {
        planning: projects?.filter((p) => p.status === 'planning').length || 0,
        active: projects?.filter((p) => p.status === 'active').length || 0,
        on_hold: projects?.filter((p) => p.status === 'on_hold').length || 0,
        completed: projects?.filter((p) => p.status === 'completed').length || 0,
        closed: projects?.filter((p) => p.status === 'closed').length || 0,
      };

      // Calculate financials
      const totalBudget = projects?.reduce((sum, p) => sum + (Number(p.budget) || 0), 0) || 0;
      const totalSpent = projects?.reduce((sum, p) => sum + (Number(p.spent) || 0), 0) || 0;
      const approvedCOs = changeOrders?.filter((co) => co.status === 'approved') || [];
      const totalCOAmount = approvedCOs.reduce((sum, co) => sum + (Number(co.amount) || 0), 0);

      // Project details with CO info
      const projectDetails = projects?.map((project) => {
        const projectCOs = changeOrders?.filter((co) => co.project_id === project.id) || [];
        const projectMilestones = milestones?.filter((m) => m.project_id === project.id) || [];
        const approvedCOAmount = projectCOs
          .filter((co) => co.status === 'approved')
          .reduce((sum, co) => sum + (Number(co.amount) || 0), 0);

        return {
          ...project,
          changeOrderCount: projectCOs.length,
          approvedCOAmount,
          adjustedBudget: (Number(project.budget) || 0) + approvedCOAmount,
          milestoneCount: projectMilestones.length,
          completedMilestones: projectMilestones.filter((m) => m.status === 'completed').length,
        };
      });

      return {
        projects: projectDetails || [],
        byStatus,
        financials: {
          totalBudget,
          totalSpent,
          totalCOAmount,
          adjustedBudget: totalBudget + totalCOAmount,
          remaining: totalBudget + totalCOAmount - totalSpent,
        },
        total: projects?.length || 0,
      };
    },
  });
}

// User's Assigned Items Report
export function useMyAssignedItemsReport() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['reports', 'my-assigned-items', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const [issuesResult, workOrdersResult, mentionsResult] = await Promise.all([
        supabase
          .from('issues')
          .select(`
            *,
            property:properties(name),
            unit:units(unit_number)
          `)
          .eq('assigned_to', user.id)
          .neq('status', 'resolved')
          .order('deadline', { ascending: true }),
        
        supabase
          .from('work_orders')
          .select(`
            *,
            property:properties(name),
            unit:units(unit_number)
          `)
          .eq('assigned_to', user.id)
          .not('status', 'in', '(completed,verified)')
          .order('due_date', { ascending: true }),

        supabase
          .from('issue_mentions')
          .select('issue_id')
          .eq('mentioned_user_id', user.id),
      ]);

      if (issuesResult.error) throw issuesResult.error;
      if (workOrdersResult.error) throw workOrdersResult.error;
      if (mentionsResult.error) throw mentionsResult.error;

      const today = new Date();

      return {
        assignedIssues: issuesResult.data || [],
        assignedWorkOrders: workOrdersResult.data || [],
        mentionedIssueIds: mentionsResult.data?.map((m) => m.issue_id) || [],
        overdueIssues: issuesResult.data?.filter((i) => 
          i.deadline && new Date(i.deadline) < today
        ).length || 0,
        overdueWorkOrders: workOrdersResult.data?.filter((w) => 
          new Date(w.due_date) < today
        ).length || 0,
        summary: {
          totalAssignedIssues: issuesResult.data?.length || 0,
          totalAssignedWorkOrders: workOrdersResult.data?.length || 0,
          totalMentions: mentionsResult.data?.length || 0,
        },
      };
    },
    enabled: !!user?.id,
  });
}

// My Inspections Report
export function useMyInspectionsReport(dateRange?: DateRange) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['reports', 'my-inspections', user?.id, dateRange],
    queryFn: async () => {
      if (!user?.id) return null;

      let query = supabase
        .from('inspections')
        .select(`
          *,
          property:properties(name),
          unit:units(unit_number)
        `)
        .eq('inspector_id', user.id)
        .order('inspection_date', { ascending: false });

      if (dateRange) {
        query = query
          .gte('inspection_date', format(dateRange.from, 'yyyy-MM-dd'))
          .lte('inspection_date', format(dateRange.to, 'yyyy-MM-dd'));
      }

      const { data: inspections, error } = await query;
      if (error) throw error;

      // Get defects for these inspections
      const inspectionIds = inspections?.map((i) => i.id) || [];
      const { data: defects, error: defectError } = await supabase
        .from('defects')
        .select('inspection_id, severity')
        .in('inspection_id', inspectionIds.length > 0 ? inspectionIds : ['none']);

      if (defectError) throw defectError;

      return {
        inspections: inspections || [],
        defectsFound: defects?.length || 0,
        severeDefects: defects?.filter((d) => d.severity === 'severe').length || 0,
        completedCount: inspections?.filter((i) => i.status === 'completed').length || 0,
        byArea: {
          outside: inspections?.filter((i) => i.area === 'outside').length || 0,
          inside: inspections?.filter((i) => i.area === 'inside').length || 0,
          unit: inspections?.filter((i) => i.area === 'unit').length || 0,
        },
      };
    },
    enabled: !!user?.id,
  });
}

// My Daily Reports
export function useMyDailyReportsReport(dateRange?: DateRange) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['reports', 'my-daily-reports', user?.id, dateRange],
    queryFn: async () => {
      if (!user?.id) return null;

      let query = supabase
        .from('daily_reports')
        .select(`
          *,
          project:projects(name, property:properties(name))
        `)
        .eq('submitted_by', user.id)
        .order('report_date', { ascending: false });

      if (dateRange) {
        query = query
          .gte('report_date', format(dateRange.from, 'yyyy-MM-dd'))
          .lte('report_date', format(dateRange.to, 'yyyy-MM-dd'));
      }

      const { data: reports, error } = await query;
      if (error) throw error;

      const totalWorkers = reports?.reduce((sum, r) => sum + (r.workers_count || 0), 0) || 0;
      const reportsWithDelays = reports?.filter((r) => r.delays && r.delays.trim().length > 0).length || 0;

      return {
        reports: reports || [],
        totalReports: reports?.length || 0,
        totalWorkers,
        avgWorkersPerDay: reports?.length ? Math.round(totalWorkers / reports.length) : 0,
        reportsWithDelays,
        reportsWithIssues: reports?.filter((r) => r.issues_encountered && r.issues_encountered.trim().length > 0).length || 0,
      };
    },
    enabled: !!user?.id,
  });
}
