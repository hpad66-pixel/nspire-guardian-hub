import { useState, useMemo } from 'react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, subDays, subWeeks } from 'date-fns';
import {
  CheckSquare, FileText, Calendar, User, Filter, Check, Mail, Download,
  ChevronDown, Loader2, X, AlertCircle, Flag, Circle, Clock,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useActionItemsReport, type ActionItemReportFilters } from '@/hooks/useActionItemsReport';
import { useProfiles } from '@/hooks/useProfiles';
import { useSendEmail } from '@/hooks/useSendEmail';
import { useCompanyBranding } from '@/hooks/useCompanyBranding';
import type { ActionItem } from '@/hooks/useActionItems';
import type { DateRange } from 'react-day-picker';

// ── Design tokens ──────────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
  urgent: { label: 'Urgent', dot: 'bg-red-500', color: '#EF4444', icon: AlertCircle },
  high: { label: 'High', dot: 'bg-orange-500', color: '#F97316', icon: Flag },
  medium: { label: 'Medium', dot: 'bg-blue-500', color: '#3B82F6', icon: Circle },
  low: { label: 'Low', dot: 'bg-slate-400', color: '#94A3B8', icon: Circle },
} as const;

const STATUS_CONFIG = {
  todo: { label: 'To Do', color: '#6B7280' },
  in_progress: { label: 'In Progress', color: '#3B82F6' },
  in_review: { label: 'In Review', color: '#F59E0B' },
  done: { label: 'Done', color: '#10B981' },
  cancelled: { label: 'Cancelled', color: '#9CA3AF' },
} as const;

const RANGE_PRESETS = [
  { label: 'Today', from: startOfDay(new Date()), to: endOfDay(new Date()) },
  { label: 'This Week', from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) },
  { label: 'Last 7 Days', from: subDays(new Date(), 7), to: new Date() },
  { label: 'Last 30 Days', from: subDays(new Date(), 30), to: new Date() },
  { label: 'All Time', from: undefined as unknown as Date, to: undefined as unknown as Date },
] as const;

interface ActionItemReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProjectId?: string;
  defaultProjectName?: string;
}

export function ActionItemReportDialog({
  open,
  onOpenChange,
  defaultProjectId,
  defaultProjectName,
}: ActionItemReportDialogProps) {
  const { data: profiles = [] } = useProfiles();
  const { data: branding } = useCompanyBranding();
  const sendEmail = useSendEmail();

  // Filters
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [selectedPreset, setSelectedPreset] = useState<string>('This Week');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfWeek(new Date(), { weekStartsOn: 1 }),
    to: endOfWeek(new Date(), { weekStartsOn: 1 }),
  });
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [scopeProject, setScopeProject] = useState<boolean>(!!defaultProjectId);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailTo, setEmailTo] = useState('');

  const filters: ActionItemReportFilters = {
    userId: selectedUserId !== 'all' ? selectedUserId : null,
    dateFrom: dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : null,
    dateTo: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : null,
    status: filterStatus,
    priority: filterPriority,
    projectId: scopeProject ? defaultProjectId : null,
  };

  const { data: items = [], isLoading } = useActionItemsReport(filters, open);

  const selectAll = () => setSelectedIds(new Set(items.map(i => i.id)));
  const deselectAll = () => setSelectedIds(new Set());
  const toggleItem = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const selectedItems = useMemo(() =>
    items.filter(i => selectedIds.has(i.id)),
    [items, selectedIds]
  );

  const handlePreset = (label: string) => {
    setSelectedPreset(label);
    const preset = RANGE_PRESETS.find(p => p.label === label);
    if (preset) {
      setDateRange({
        from: preset.from || undefined,
        to: preset.to || undefined,
      });
    }
  };

  // ── Email HTML Builder ────────────────────────────────────────────────────
  const buildReportHtml = (itemsToSend: ActionItem[]) => {
    const companyName = branding?.company_name || 'APAS';
    const primaryColor = branding?.primary_color || '#1e293b';
    const userName = selectedUserId !== 'all'
      ? profiles.find(p => p.user_id === selectedUserId)?.full_name || 'Team Member'
      : 'All Team Members';
    const dateLabel = dateRange.from && dateRange.to
      ? `${format(dateRange.from, 'MMM d')} – ${format(dateRange.to, 'MMM d, yyyy')}`
      : 'All Time';

    const byPriority = ['urgent', 'high', 'medium', 'low'] as const;
    const grouped = byPriority.map(p => ({
      priority: p,
      items: itemsToSend.filter(i => i.priority === p),
    })).filter(g => g.items.length > 0);

    const itemRows = grouped.map(g => {
      const pc = PRIORITY_CONFIG[g.priority];
      return `
        <tr><td colspan="5" style="padding:14px 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${pc.color};border-bottom:2px solid ${pc.color}20;">${pc.label} Priority (${g.items.length})</td></tr>
        ${g.items.map(item => {
          const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG.todo;
          return `
            <tr style="border-bottom:1px solid #F1F5F9;">
              <td style="padding:10px 8px;font-size:13px;font-weight:600;color:#1E293B;max-width:200px;">${item.title}</td>
              <td style="padding:10px 8px;font-size:12px;color:#64748B;">${item.project?.name || '—'}</td>
              <td style="padding:10px 8px;"><span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;background:${sc.color}15;color:${sc.color};">${sc.label}</span></td>
              <td style="padding:10px 8px;font-size:12px;color:#64748B;">${item.assignee?.full_name || '—'}</td>
              <td style="padding:10px 8px;font-size:12px;color:${item.due_date && new Date(item.due_date + 'T00:00:00') < new Date() ? '#EF4444' : '#64748B'};">${item.due_date ? format(new Date(item.due_date + 'T00:00:00'), 'MMM d, yyyy') : '—'}</td>
            </tr>`;
        }).join('')}
      `;
    }).join('');

    const stats = {
      total: itemsToSend.length,
      overdue: itemsToSend.filter(i => i.due_date && new Date(i.due_date + 'T00:00:00') < new Date() && i.status !== 'done').length,
      done: itemsToSend.filter(i => i.status === 'done').length,
      urgent: itemsToSend.filter(i => i.priority === 'urgent').length,
    };

    return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:700px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E2E8F0;">
  <div style="background:linear-gradient(135deg,${primaryColor} 0%,${primaryColor}dd 100%);padding:32px;">
    <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#94A3B8;">Action Items Report</p>
    <h1 style="margin:0;font-size:22px;font-weight:700;color:#FFFFFF;line-height:1.3;">${userName}</h1>
    <p style="margin:8px 0 0;font-size:13px;color:#CBD5E1;">${dateLabel}${defaultProjectName ? ` · ${defaultProjectName}` : ''}</p>
  </div>
  <div style="padding:20px 32px;background:#F8FAFC;display:flex;gap:16px;border-bottom:1px solid #E2E8F0;">
    <div style="display:inline-block;text-align:center;padding:0 16px;">
      <div style="font-size:24px;font-weight:800;color:${primaryColor};">${stats.total}</div>
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#64748B;">Total</div>
    </div>
    <div style="display:inline-block;text-align:center;padding:0 16px;">
      <div style="font-size:24px;font-weight:800;color:#EF4444;">${stats.overdue}</div>
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#64748B;">Overdue</div>
    </div>
    <div style="display:inline-block;text-align:center;padding:0 16px;">
      <div style="font-size:24px;font-weight:800;color:#10B981;">${stats.done}</div>
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#64748B;">Done</div>
    </div>
    <div style="display:inline-block;text-align:center;padding:0 16px;">
      <div style="font-size:24px;font-weight:800;color:#EF4444;">${stats.urgent}</div>
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#64748B;">Urgent</div>
    </div>
  </div>
  <div style="padding:24px 32px;">
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="border-bottom:2px solid #E2E8F0;">
          <th style="text-align:left;padding:8px;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#94A3B8;font-weight:700;">Task</th>
          <th style="text-align:left;padding:8px;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#94A3B8;font-weight:700;">Project</th>
          <th style="text-align:left;padding:8px;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#94A3B8;font-weight:700;">Status</th>
          <th style="text-align:left;padding:8px;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#94A3B8;font-weight:700;">Assignee</th>
          <th style="text-align:left;padding:8px;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#94A3B8;font-weight:700;">Due</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>
  </div>
  <div style="background:#F8FAFC;padding:16px 32px;border-top:1px solid #E2E8F0;">
    <p style="margin:0;font-size:11px;color:#94A3B8;">
      Generated by ${companyName} · ${format(new Date(), 'MMMM d, yyyy h:mm a')}
    </p>
  </div>
</div>`;
  };

  const handleSendEmail = async () => {
    const emails = emailTo.split(',').map(e => e.trim()).filter(Boolean);
    if (emails.length === 0) { toast.error('Enter at least one email'); return; }
    const itemsToSend = selectedIds.size > 0 ? selectedItems : items;
    if (itemsToSend.length === 0) { toast.error('No items to include'); return; }

    const userName = selectedUserId !== 'all'
      ? profiles.find(p => p.user_id === selectedUserId)?.full_name || 'Team'
      : 'Team';
    const dateLabel = dateRange.from && dateRange.to
      ? `${format(dateRange.from, 'MMM d')} – ${format(dateRange.to, 'MMM d')}`
      : 'All Time';

    await sendEmail.mutateAsync({
      recipients: emails,
      subject: `Action Items Report — ${userName} (${dateLabel})`,
      bodyHtml: buildReportHtml(itemsToSend),
    });

    setShowEmailForm(false);
    setEmailTo('');
    toast.success('Report sent!');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b bg-gradient-to-br from-emerald-500/5 to-background">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-base">Action Items Report</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Generate and share filtered action item reports
              </p>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[calc(90vh-80px)]">
          <div className="px-6 py-5 space-y-5">

            {/* ── Filters ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* User filter */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Assignee</label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="All users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Team Members</SelectItem>
                    {profiles.map(p => (
                      <SelectItem key={p.user_id} value={p.user_id}>
                        {p.full_name || p.email || 'Unknown'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date range preset */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Period</label>
                <Select value={selectedPreset} onValueChange={handlePreset}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RANGE_PRESETS.map(p => (
                      <SelectItem key={p.label} value={p.label}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status filter */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority filter */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Priority</label>
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Scope toggle */}
            {defaultProjectId && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="scope-project"
                  checked={scopeProject}
                  onCheckedChange={(v) => setScopeProject(!!v)}
                />
                <label htmlFor="scope-project" className="text-xs text-muted-foreground cursor-pointer">
                  Only from {defaultProjectName || 'this project'}
                </label>
              </div>
            )}

            <Separator />

            {/* ── Results ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground">
                  {isLoading ? 'Loading...' : `${items.length} items found`}
                  {selectedIds.size > 0 && ` · ${selectedIds.size} selected`}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={selectAll} disabled={items.length === 0}>
                    Select All
                  </Button>
                  {selectedIds.size > 0 && (
                    <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={deselectAll}>
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : items.length === 0 ? (
                <div className="py-12 text-center">
                  <CheckSquare className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No action items match your filters</p>
                </div>
              ) : (
                <div className="space-y-1 max-h-[340px] overflow-y-auto rounded-lg border">
                  {items.map(item => {
                    const pc = PRIORITY_CONFIG[item.priority];
                    const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG.todo;
                    const isOverdue = item.due_date && new Date(item.due_date + 'T00:00:00') < new Date() && item.status !== 'done';
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleItem(item.id)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors border-l-3',
                          selectedIds.has(item.id) ? 'bg-primary/5 border-l-primary' : 'hover:bg-muted/50 border-l-transparent'
                        )}
                      >
                        <Checkbox
                          checked={selectedIds.has(item.id)}
                          onCheckedChange={() => toggleItem(item.id)}
                          className="shrink-0"
                        />
                        <span className={cn('h-2 w-2 rounded-full shrink-0', pc.dot)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {item.project?.name && (
                              <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{item.project.name}</span>
                            )}
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4" style={{ color: sc.color }}>
                              {sc.label}
                            </Badge>
                          </div>
                        </div>
                        {item.assignee?.full_name && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={item.assignee.avatar_url || undefined} />
                              <AvatarFallback className="text-[8px] bg-muted">{item.assignee.full_name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="text-[11px] text-muted-foreground hidden md:block">{item.assignee.full_name.split(' ')[0]}</span>
                          </div>
                        )}
                        {item.due_date && (
                          <span className={cn('text-[11px] shrink-0', isOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground')}>
                            {format(new Date(item.due_date + 'T00:00:00'), 'MMM d')}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Separator />

            {/* ── Actions ── */}
            <div className="space-y-3">
              {showEmailForm ? (
                <div className="space-y-3 p-4 rounded-xl border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold">Email Report</p>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowEmailForm(false)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Recipients (comma-separated)</label>
                    <input
                      type="text"
                      value={emailTo}
                      onChange={e => setEmailTo(e.target.value)}
                      placeholder="owner@example.com, client@example.com"
                      className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                      autoFocus
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {selectedIds.size > 0
                      ? `Sending ${selectedIds.size} selected items`
                      : `Sending all ${items.length} items`}
                  </p>
                  <Button
                    size="sm"
                    className="w-full gap-2"
                    onClick={handleSendEmail}
                    disabled={sendEmail.isPending}
                  >
                    {sendEmail.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                    Send Report
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-2 flex-1"
                    onClick={() => setShowEmailForm(true)}
                    disabled={items.length === 0}
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Email Report
                  </Button>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
