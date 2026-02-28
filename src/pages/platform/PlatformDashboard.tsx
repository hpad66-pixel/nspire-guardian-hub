import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAllWorkspaces, usePlatformStats, usePlatformAuditLog } from '@/hooks/usePlatformAdmin';
import { WorkspaceDetailSheet } from '@/components/platform/WorkspaceDetailSheet';
import { PlatformProtectedRoute } from '@/components/auth/PlatformProtectedRoute';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LogOut, ArrowLeft, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, isPast, parseISO } from 'date-fns';
import type { PlatformWorkspace } from '@/hooks/usePlatformAdmin';

// ─── Animated counter ─────────────────────────────────────────────
function AnimatedNumber({ value, prefix = '', format: fmt }: { value: number; prefix?: string; format?: (n: number) => string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);

  useEffect(() => {
    const start = ref.current;
    const diff = value - start;
    if (diff === 0) return;
    const duration = 800;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + diff * eased);
      setDisplay(current);
      ref.current = current;
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);

  const formatted = fmt ? fmt(display) : display.toLocaleString();
  return <span>{prefix}{formatted}</span>;
}

// ─── Plan badge ───────────────────────────────────────────────────
function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, string> = {
    trial: 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/30',
    active: 'bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/30',
    starter: 'bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/30',
    professional: 'bg-[#1E5FB3]/20 text-[#6B9FE8] border-[#1E5FB3]/30',
    enterprise: 'bg-[#C9A84C]/20 text-[#C9A84C] border-[#C9A84C]/30',
    suspended: 'bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/30',
    churned: 'bg-[#94A3B8]/20 text-[#94A3B8] border-[#94A3B8]/30',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide border ${colors[plan] || colors.trial}`}>
      {plan}
    </span>
  );
}

// ─── Workspace card ───────────────────────────────────────────────
function WorkspaceCard({ ws, onManage }: { ws: PlatformWorkspace; onManage: () => void }) {
  const seatRatio = ws.seat_limit > 0 ? ws.seats_used / ws.seat_limit : 0;
  const seatColor = seatRatio >= 1 ? '#EF4444' : seatRatio >= 0.8 ? '#F59E0B' : '#22C55E';
  const moduleCount = ws.modules ? Object.values(ws.modules).filter(Boolean).length : 0;
  const billingPast = ws.next_billing_date && isPast(parseISO(ws.next_billing_date));

  return (
    <div className="rounded-xl border border-[#1E3A5F] bg-[#0F1923] p-5 space-y-4 hover:border-[#1E5FB3]/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <h3 className="text-[16px] font-bold text-white truncate">{ws.client_company || ws.name}</h3>
          <p className="text-[13px] text-[#94A3B8] truncate">{ws.name}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <PlanBadge plan={ws.status === 'suspended' ? 'suspended' : ws.plan} />
        </div>
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-[24px] font-bold text-[#C9A84C]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          ${(ws.monthly_fee || 0).toLocaleString()}
        </span>
        <span className="text-[11px] text-[#94A3B8]">/{ws.billing_cycle === 'annual' ? 'yr' : 'mo'}</span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-[#94A3B8]">{ws.seats_used} of {ws.seat_limit} seats</span>
          <span className="text-[#94A3B8]">{moduleCount} modules active</span>
        </div>
        <div className="h-1.5 rounded-full bg-[#1E3A5F] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(seatRatio * 100, 100)}%`, background: seatColor }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className={`text-[11px] ${billingPast ? 'text-[#EF4444] font-semibold' : 'text-[#94A3B8]'}`}>
          {ws.next_billing_date
            ? `Next billing: ${format(parseISO(ws.next_billing_date), 'MMM d, yyyy')}`
            : 'No billing date set'}
        </span>
        <Button
          size="sm"
          onClick={onManage}
          className="bg-[#1E5FB3]/20 text-[#6B9FE8] hover:bg-[#1E5FB3]/30 border border-[#1E5FB3]/30 text-xs h-7"
        >
          <Settings className="h-3 w-3 mr-1" /> Manage
        </Button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────
function PlatformDashboardContent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const stats = usePlatformStats();
  const { data: workspaces = [], isLoading } = useAllWorkspaces();
  const { data: auditLog = [] } = usePlatformAuditLog();

  const [selectedWs, setSelectedWs] = useState<PlatformWorkspace | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Admin';

  const statCards = [
    { label: 'Total Clients', value: stats.totalClients },
    { label: 'Monthly ARR', value: stats.monthlyARR, prefix: '$', format: (n: number) => n.toLocaleString() },
    { label: 'Total Seats', value: stats.totalSeats },
    { label: 'Active Users', value: stats.totalActiveUsers },
  ];

  return (
    <div className="min-h-screen" style={{ background: '#090D17' }}>
      {/* TOP BAR */}
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b px-6" style={{ borderColor: '#C9A84C', background: '#090D17' }}>
        <div className="flex items-center gap-3">
          <span className="text-[20px] font-bold text-white">APAS OS</span>
          <div className="h-6 w-px bg-[#1E3A5F]" />
          <span className="text-[14px] text-[#C9A84C] font-semibold tracking-wide" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            PLATFORM COMMAND
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-[#94A3B8]">{userName}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="text-[#94A3B8] hover:text-white hover:bg-white/5"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to App
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => supabase.auth.signOut()}
            className="text-[#94A3B8] hover:text-[#EF4444] hover:bg-white/5"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        {/* STATS BAR */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map(card => (
            <div key={card.label} className="rounded-xl border border-[#1E3A5F] bg-[#0F1923] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#94A3B8]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {card.label}
              </p>
              <p className="mt-2 text-[36px] font-bold text-white leading-none" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                <AnimatedNumber value={card.value} prefix={card.prefix} format={card.format} />
              </p>
            </div>
          ))}
        </div>

        {/* WORKSPACE GRID */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-[#94A3B8] mb-4" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            Client Workspaces
          </h2>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-48 rounded-xl bg-[#0F1923] animate-pulse border border-[#1E3A5F]" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workspaces.map(ws => (
                <WorkspaceCard
                  key={ws.id}
                  ws={ws}
                  onManage={() => { setSelectedWs(ws); setSheetOpen(true); }}
                />
              ))}
            </div>
          )}
        </section>

        {/* AUDIT LOG */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-[#94A3B8] mb-4" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            Platform Audit Log
          </h2>
          <div className="rounded-xl border border-[#1E3A5F] bg-[#0F1923] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1E3A5F]">
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Timestamp</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Action</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Workspace</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLog.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-[#94A3B8]">No audit events yet</td>
                  </tr>
                ) : (
                  auditLog.map((log: any) => (
                    <tr key={log.id} className="border-b border-[#1E3A5F]/50 hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5 text-[#94A3B8] whitespace-nowrap" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px' }}>
                        {format(parseISO(log.created_at), 'MMM d, HH:mm')}
                      </td>
                      <td className="px-4 py-2.5 text-white text-[13px]">{log.action}</td>
                      <td className="px-4 py-2.5 text-[#94A3B8] text-[12px] truncate max-w-[200px]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {log.target_workspace_id?.slice(0, 8) || '—'}
                      </td>
                      <td className="px-4 py-2.5 text-[#94A3B8] text-[12px] truncate max-w-[300px]">
                        {log.details ? JSON.stringify(log.details).slice(0, 80) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <WorkspaceDetailSheet
        workspace={selectedWs}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}

export default function PlatformDashboard() {
  return (
    <PlatformProtectedRoute>
      <PlatformDashboardContent />
    </PlatformProtectedRoute>
  );
}
