import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import type { DateRange } from './useReports';

export function usePayAppStatusReport(dateRange?: DateRange) {
  return useQuery({
    queryKey: ['reports', 'pay-app-status', dateRange],
    queryFn: async () => {
      let q = supabase
        .from('pay_applications')
        .select('*, project:projects(name, property:properties(name))')
        .order('pay_app_number');

      if (dateRange) {
        q = q
          .gte('period_from', format(dateRange.from, 'yyyy-MM-dd'))
          .lte('period_to', format(dateRange.to, 'yyyy-MM-dd'));
      }

      const { data, error } = await q;
      if (error) throw error;
      const apps = data ?? [];

      return {
        apps,
        summary: {
          total: apps.length,
          draft: apps.filter(a => a.status === 'draft').length,
          submitted: apps.filter(a => a.status === 'submitted').length,
          underReview: apps.filter(a => a.status === 'under_review').length,
          certified: apps.filter(a => a.status === 'certified').length,
          paid: apps.filter(a => a.status === 'paid').length,
          disputed: apps.filter(a => a.status === 'disputed').length,
        },
      };
    },
  });
}

export function useContractorAccountabilityReport() {
  return useQuery({
    queryKey: ['reports', 'contractor-accountability'],
    queryFn: async () => {
      const [contractorsRes, workOrdersRes, payAppsRes] = await Promise.all([
        supabase.from('contractors').select('*').eq('status', 'active'),
        supabase.from('work_orders').select('contractor_id, status, due_date, completed_at'),
        supabase.from('pay_applications').select('contractor_id, status'),
      ]);

      return (contractorsRes.data ?? []).map(c => {
        const wos = (workOrdersRes.data ?? []).filter(wo => wo.contractor_id === c.id);
        const apps = (payAppsRes.data ?? []).filter(p => p.contractor_id === c.id);
        const completed = wos.filter(wo => ['completed', 'verified', 'closed'].includes(wo.status));
        const onTime = completed.filter(wo => wo.completed_at && wo.due_date && new Date(wo.completed_at) <= new Date(wo.due_date));
        const onTimeRate = completed.length > 0 ? Math.round((onTime.length / completed.length) * 100) : 100;
        const disputed = apps.filter(p => p.status === 'disputed').length;
        const payAppScore = apps.length > 0 ? Math.round(((apps.length - disputed) / apps.length) * 100) : 100;
        const score = Math.round(onTimeRate * 0.60 + payAppScore * 0.40);

        return {
          contractor: c,
          onTimeRate,
          payAppScore,
          performanceScore: score,
          openWorkOrders: wos.filter(wo => !['completed', 'verified', 'closed'].includes(wo.status)).length,
          totalPayApps: apps.length,
          disputedPayApps: disputed,
        };
      }).sort((a, b) => b.performanceScore - a.performanceScore);
    },
  });
}

export function useProjectFinancialReport() {
  return useQuery({
    queryKey: ['reports', 'project-financial'],
    queryFn: async () => {
      const { data: projects } = await supabase
        .from('projects')
        .select('*, property:properties(name), change_orders(amount, status)')
        .order('created_at', { ascending: false });

      const rows = (projects ?? []).map(p => {
        const approvedCOs = (p.change_orders ?? [])
          .filter((co: any) => co.status === 'approved')
          .reduce((s: number, co: any) => s + (Number(co.amount) || 0), 0);
        const originalBudget = Number(p.budget) || 0;
        const adjustedBudget = originalBudget + approvedCOs;
        const spent = Number((p as any).spent) || 0;

        return {
          project: p,
          originalBudget,
          approvedCOs,
          adjustedBudget,
          spent,
          remaining: adjustedBudget - spent,
          spentPct: adjustedBudget > 0 ? Math.round((spent / adjustedBudget) * 100) : 0,
        };
      });

      const totals = rows.reduce((acc, r) => ({
        originalBudget: acc.originalBudget + r.originalBudget,
        adjustedBudget: acc.adjustedBudget + r.adjustedBudget,
        spent: acc.spent + r.spent,
        remaining: acc.remaining + r.remaining,
      }), { originalBudget: 0, adjustedBudget: 0, spent: 0, remaining: 0 });

      return { rows, totals };
    },
  });
}

export function useOwnerMonthlySummary(dateRange?: DateRange) {
  return useQuery({
    queryKey: ['reports', 'owner-monthly', dateRange],
    queryFn: async () => {
      const dateFilter = dateRange ? format(dateRange.from, 'yyyy-MM-dd') : '2000-01-01';
      const [properties, projects, inspections, issues, workOrders, payApps, defects] =
        await Promise.all([
          supabase.from('properties').select('id, name, status'),
          supabase.from('projects').select('id, name, status, budget, spent, property:properties(name)'),
          supabase.from('inspections').select('id, status, inspection_date').gte('inspection_date', dateFilter),
          supabase.from('issues').select('id, status, severity, created_at'),
          supabase.from('work_orders').select('id, status, due_date, completed_at'),
          supabase.from('pay_applications').select('id, status, contractor_name'),
          supabase.from('defects').select('id, severity, repair_verified'),
        ]);

      const projs = projects.data ?? [];
      const insps = inspections.data ?? [];
      const isss = issues.data ?? [];
      const wos = workOrders.data ?? [];
      const apps = payApps.data ?? [];
      const defs = defects.data ?? [];

      const totalBudget = projs.reduce((s, p) => s + (Number(p.budget) || 0), 0);
      const totalSpent = projs.reduce((s, p) => s + (Number((p as any).spent) || 0), 0);

      return {
        period: dateRange
          ? `${format(dateRange.from, 'MMM d')} – ${format(dateRange.to, 'MMM d, yyyy')}`
          : 'All time',
        properties: {
          total: (properties.data ?? []).length,
          active: (properties.data ?? []).filter(p => p.status === 'active').length,
        },
        projects: {
          total: projs.length,
          active: projs.filter(p => p.status === 'active').length,
          totalBudget,
          totalSpent,
        },
        inspections: {
          total: insps.length,
          completed: insps.filter(i => i.status === 'completed').length,
          pending: insps.filter(i => i.status !== 'completed').length,
        },
        issues: {
          open: isss.filter(i => ['open', 'in_progress'].includes(i.status)).length,
          critical: isss.filter(i => i.severity === 'severe' && i.status !== 'resolved').length,
          resolved: isss.filter(i => i.status === 'resolved').length,
        },
        workOrders: {
          total: wos.length,
          open: wos.filter(wo => !['completed', 'verified', 'closed'].includes(wo.status)).length,
          overdue: wos.filter(wo =>
            !['completed', 'verified', 'closed'].includes(wo.status) && wo.due_date && new Date(wo.due_date) < new Date()
          ).length,
        },
        payApplications: {
          total: apps.length,
          pending: apps.filter(a => ['submitted', 'under_review'].includes(a.status)).length,
          certified: apps.filter(a => ['certified', 'paid'].includes(a.status)).length,
          disputed: apps.filter(a => a.status === 'disputed').length,
        },
        defects: {
          total: defs.length,
          verified: defs.filter(d => d.repair_verified).length,
          severe: defs.filter(d => d.severity === 'severe').length,
        },
      };
    },
  });
}
