import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAllWorkspaces, usePlatformStats, usePlatformAuditLog, useCreateWorkspace } from '@/hooks/usePlatformAdmin';
import { WorkspaceDetailSheet } from '@/components/platform/WorkspaceDetailSheet';
import { PlatformProtectedRoute } from '@/components/auth/PlatformProtectedRoute';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LogOut, ArrowLeft, Settings, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
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
  const createWorkspace = useCreateWorkspace();

  const [selectedWs, setSelectedWs] = useState<PlatformWorkspace | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '',
    client_company: '',
    client_contact_name: '',
    billing_contact_email: '',
    plan: 'trial',
    monthly_fee: 0,
    seat_limit: 10,
    billing_cycle: 'monthly',
    notes: '',
  });

  const handleCreateClient = async () => {
    if (!newClient.name) return;
    await createWorkspace.mutateAsync({
      ...newClient,
      client_company: newClient.client_company || undefined,
      client_contact_name: newClient.client_contact_name || undefined,
      billing_contact_email: newClient.billing_contact_email || undefined,
      notes: newClient.notes || undefined,
    });
    setAddDialogOpen(false);
    setNewClient({
      name: '', client_company: '', client_contact_name: '',
      billing_contact_email: '', plan: 'trial', monthly_fee: 0,
      seat_limit: 10, billing_cycle: 'monthly', notes: '',
    });
  };

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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-[#94A3B8]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              Client Workspaces
            </h2>
            <Button
              onClick={() => setAddDialogOpen(true)}
              className="bg-[#C9A84C] hover:bg-[#C9A84C]/80 text-[#090D17] font-semibold text-xs h-8"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Client
            </Button>
          </div>
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

      {/* Add Client Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[520px]" style={{ background: '#0F1923', borderColor: '#1E3A5F', color: '#fff' }}>
          <DialogHeader>
            <DialogTitle className="text-white">Onboard New Client</DialogTitle>
            <DialogDescription className="text-[#94A3B8]">
              Create a new workspace for a paying client. You can configure modules after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[#94A3B8] text-xs">Workspace Name *</Label>
                <Input
                  value={newClient.name}
                  onChange={e => setNewClient(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. R4 Capital"
                  className="bg-[#090D17] border-[#1E3A5F] text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[#94A3B8] text-xs">Client Company</Label>
                <Input
                  value={newClient.client_company}
                  onChange={e => setNewClient(f => ({ ...f, client_company: e.target.value }))}
                  placeholder="Legal entity name"
                  className="bg-[#090D17] border-[#1E3A5F] text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[#94A3B8] text-xs">Contact Name</Label>
                <Input
                  value={newClient.client_contact_name}
                  onChange={e => setNewClient(f => ({ ...f, client_contact_name: e.target.value }))}
                  placeholder="Primary contact"
                  className="bg-[#090D17] border-[#1E3A5F] text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[#94A3B8] text-xs">Billing Email</Label>
                <Input
                  type="email"
                  value={newClient.billing_contact_email}
                  onChange={e => setNewClient(f => ({ ...f, billing_contact_email: e.target.value }))}
                  placeholder="billing@client.com"
                  className="bg-[#090D17] border-[#1E3A5F] text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[#94A3B8] text-xs">Plan</Label>
                <Select value={newClient.plan} onValueChange={v => setNewClient(f => ({ ...f, plan: v }))}>
                  <SelectTrigger className="bg-[#090D17] border-[#1E3A5F] text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[#94A3B8] text-xs">Monthly Fee ($)</Label>
                <Input
                  type="number"
                  value={newClient.monthly_fee}
                  onChange={e => setNewClient(f => ({ ...f, monthly_fee: Number(e.target.value) }))}
                  className="bg-[#090D17] border-[#1E3A5F] text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[#94A3B8] text-xs">Seat Limit</Label>
                <Input
                  type="number"
                  value={newClient.seat_limit}
                  onChange={e => setNewClient(f => ({ ...f, seat_limit: Number(e.target.value) }))}
                  className="bg-[#090D17] border-[#1E3A5F] text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[#94A3B8] text-xs">Billing Cycle</Label>
                <Select value={newClient.billing_cycle} onValueChange={v => setNewClient(f => ({ ...f, billing_cycle: v }))}>
                  <SelectTrigger className="bg-[#090D17] border-[#1E3A5F] text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[#94A3B8] text-xs">Notes</Label>
              <Textarea
                rows={3}
                value={newClient.notes}
                onChange={e => setNewClient(f => ({ ...f, notes: e.target.value }))}
                placeholder="Onboarding notes, special requirements..."
                className="bg-[#090D17] border-[#1E3A5F] text-white resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddDialogOpen(false)} className="text-[#94A3B8] hover:text-white">
              Cancel
            </Button>
            <Button
              onClick={handleCreateClient}
              disabled={!newClient.name || createWorkspace.isPending}
              className="bg-[#C9A84C] hover:bg-[#C9A84C]/80 text-[#090D17] font-semibold"
            >
              {createWorkspace.isPending ? 'Creating...' : 'Create Workspace'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
