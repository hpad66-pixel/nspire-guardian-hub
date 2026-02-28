import { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Plus, CheckCircle, Clock, AlertTriangle, ArrowRight, Eye, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  useDefectsNeedingAction, useActiveCorrectiveLoop, useCorrectiveLoopStats,
  useCreateCorrectiveWorkOrder, useVerifyCorrectiveAction, useCloseCorrectiveLoop,
  type CorrectiveIssue,
} from '@/hooks/useCorrectiveLoop';
import { useProperties } from '@/hooks/useProperties';
import { formatDistanceToNow } from 'date-fns';

const STAGES = [
  { key: 'needs_wo', label: 'Needs WO', icon: AlertTriangle, color: 'text-destructive' },
  { key: 'work_order_created', label: 'WO Created', icon: Clock, color: 'text-amber-500' },
  { key: 'work_completed', label: 'Awaiting Verify', icon: Eye, color: 'text-blue-500' },
  { key: 'verified', label: 'Verified', icon: CheckCircle, color: 'text-emerald-500' },
  { key: 'closed', label: 'Closed', icon: FileCheck, color: 'text-muted-foreground' },
];

const SEVERITY_COLORS: Record<string, string> = {
  severe: 'bg-destructive/20 text-destructive',
  moderate: 'bg-amber-500/20 text-amber-600',
  low: 'bg-blue-500/20 text-blue-600',
};

const SOURCE_COLORS: Record<string, string> = {
  nspire: 'bg-cyan-500/20 text-cyan-600',
  daily_grounds: 'bg-blue-500/20 text-blue-600',
  permits: 'bg-amber-500/20 text-amber-600',
  manual: 'bg-muted text-muted-foreground',
};

export default function CorrectiveLoopPage() {
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');
  
  const pid = propertyFilter === 'all' ? undefined : propertyFilter;
  const { data: needsAction = [], isLoading: l1 } = useDefectsNeedingAction(pid);
  const { data: activeLoop = [], isLoading: l2 } = useActiveCorrectiveLoop(pid);
  const { data: stats } = useCorrectiveLoopStats(pid);
  const { data: properties = [] } = useProperties();
  const isLoading = l1 || l2;

  // Combine into groups
  const allItems = [
    ...needsAction.map(i => ({ ...i, stage: 'needs_wo' })),
    ...activeLoop.map(i => ({ ...i, stage: i.corrective_status })),
  ];

  // De-duplicate
  const seen = new Set<string>();
  const unique = allItems.filter(i => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });

  const filtered = stageFilter === 'all' ? unique : unique.filter(i => i.stage === stageFilter);
  const grouped = STAGES.map(s => ({
    ...s,
    items: filtered.filter(i => i.stage === s.key),
  })).filter(g => g.items.length > 0);

  // Sheets
  const [woWizardOpen, setWoWizardOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<CorrectiveIssue | null>(null);

  // WO wizard form
  const [woTitle, setWoTitle] = useState('');
  const [woDescription, setWoDescription] = useState('');
  const [woPriority, setWoPriority] = useState('routine');
  const [woDueDate, setWoDueDate] = useState('');
  const createWO = useCreateCorrectiveWorkOrder();

  // Verify form
  const [verifyNotes, setVerifyNotes] = useState('');
  const [verifyChecks, setVerifyChecks] = useState<boolean[]>([false, false, false, false, false]);
  const verify = useVerifyCorrectiveAction();

  // Close form
  const [closeNotes, setCloseNotes] = useState('');
  const closeMut = useCloseCorrectiveLoop();

  const openWoWizard = (issue: CorrectiveIssue) => {
    setSelectedIssue(issue);
    setWoTitle(`Repair: ${issue.title}`);
    setWoDescription(issue.description || '');
    setWoPriority(issue.severity === 'severe' ? 'emergency' : issue.severity === 'moderate' ? 'high' : 'routine');
    const days = issue.severity === 'severe' ? 3 : issue.severity === 'moderate' ? 7 : 14;
    const due = new Date(); due.setDate(due.getDate() + days);
    setWoDueDate(due.toISOString().split('T')[0]);
    setWoWizardOpen(true);
  };

  const openVerify = (issue: CorrectiveIssue) => {
    setSelectedIssue(issue);
    setVerifyNotes('');
    setVerifyChecks([false, false, false, false, false]);
    setVerifyOpen(true);
  };

  const openClose = (issue: CorrectiveIssue) => {
    setSelectedIssue(issue);
    setCloseNotes('');
    setCloseOpen(true);
  };

  const handleCreateWO = () => {
    if (!selectedIssue) return;
    createWO.mutate({
      issueId: selectedIssue.id,
      workOrderData: {
        property_id: selectedIssue.property_id,
        unit_id: selectedIssue.unit_id,
        title: woTitle,
        description: woDescription,
        priority: woPriority,
        due_date: woDueDate,
      },
    });
    setWoWizardOpen(false);
  };

  const handleVerify = () => {
    if (!selectedIssue?.linked_work_order_id) return;
    verify.mutate({
      workOrderId: selectedIssue.linked_work_order_id,
      issueId: selectedIssue.id,
      verificationNotes: verifyNotes,
    });
    setVerifyOpen(false);
  };

  const handleClose = () => {
    if (!selectedIssue) return;
    closeMut.mutate({ issueId: selectedIssue.id, closureNotes: closeNotes });
    setCloseOpen(false);
  };

  const VERIFY_LABELS = [
    'Work has been physically inspected',
    'Defect condition has been corrected',
    'Surrounding area is in acceptable condition',
    'No additional defects identified',
    'Documentation is complete',
  ];

  return (
    <div className="min-h-full bg-background p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
          CORRECTIVE ACTIONS
        </p>
        <h1 className="text-2xl font-bold text-foreground mt-1">Corrective Action Queue</h1>
        <p className="text-sm text-muted-foreground">From defect to documented closure.</p>
      </motion.div>

      {/* Pipeline Stats */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {STAGES.slice(0, -1).map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <button
              onClick={() => setStageFilter(stageFilter === s.key ? 'all' : s.key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                stageFilter === s.key ? 'border-primary bg-primary/10' : 'border-border bg-card'
              }`}
            >
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <span className="text-sm font-medium text-foreground">
                {s.label}: {stats?.[s.key === 'needs_wo' ? 'needsWorkOrder' : s.key === 'work_order_created' ? 'workOrderCreated' : s.key === 'work_completed' ? 'awaitingVerification' : 'verified'] ?? 0}
              </span>
            </button>
            {i < STAGES.length - 2 && <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={propertyFilter} onValueChange={setPropertyFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Properties" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Properties</SelectItem>
            {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Queue */}
      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : grouped.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-3" />
          <h3 className="font-semibold text-foreground mb-1">All clear</h3>
          <p className="text-sm text-muted-foreground">No items in the corrective action queue.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(group => (
            <div key={group.key}>
              <div className="flex items-center gap-2 mb-3">
                <group.icon className={`h-4 w-4 ${group.color}`} />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label} ({group.items.length})
                </h3>
              </div>
              <div className="space-y-2">
                {group.items.map(item => (
                  <div key={item.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={SOURCE_COLORS[item.source_module || 'manual'] || SOURCE_COLORS.manual}>
                          {item.source_module || 'Manual'}
                        </Badge>
                        <Badge variant="outline" className={SEVERITY_COLORS[item.severity] || SEVERITY_COLORS.low}>
                          {item.severity}
                        </Badge>
                      </div>
                      <div className="text-sm font-medium text-foreground truncate">{item.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.property_name || '—'} · {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </div>
                    </div>
                    {group.key === 'needs_wo' && (
                      <Button size="sm" onClick={() => openWoWizard(item)} className="gap-1">
                        <Plus className="h-3 w-3" /> Create WO
                      </Button>
                    )}
                    {group.key === 'work_completed' && (
                      <Button size="sm" onClick={() => openVerify(item)} className="gap-1">
                        <CheckCircle className="h-3 w-3" /> Verify
                      </Button>
                    )}
                    {group.key === 'verified' && (
                      <Button size="sm" variant="outline" onClick={() => openClose(item)} className="gap-1">
                        <FileCheck className="h-3 w-3" /> Close
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* WO Wizard Sheet */}
      <Sheet open={woWizardOpen} onOpenChange={setWoWizardOpen}>
        <SheetContent className="w-[450px] sm:max-w-[450px]">
          <SheetHeader>
            <SheetTitle>Create Work Order from Defect</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            {selectedIssue && (
              <div className="bg-muted/50 border border-border rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Source Defect</p>
                <p className="text-sm font-medium text-foreground">{selectedIssue.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{selectedIssue.description}</p>
              </div>
            )}
            <div>
              <Label>Title</Label>
              <Input value={woTitle} onChange={e => setWoTitle(e.target.value)} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={woDescription} onChange={e => setWoDescription(e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Priority</Label>
                <Select value={woPriority} onValueChange={setWoPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="routine">Routine</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Due Date</Label>
                <Input type="date" value={woDueDate} onChange={e => setWoDueDate(e.target.value)} />
              </div>
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button onClick={handleCreateWO} disabled={!woTitle} className="w-full gap-2">
              <Plus className="h-4 w-4" /> Create Work Order
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Verify Sheet */}
      <Sheet open={verifyOpen} onOpenChange={setVerifyOpen}>
        <SheetContent className="w-[450px] sm:max-w-[450px]">
          <SheetHeader>
            <SheetTitle>Verify Corrective Action</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            {selectedIssue && (
              <div className="bg-muted/50 border border-border rounded-lg p-3">
                <p className="text-sm font-medium text-foreground">{selectedIssue.title}</p>
              </div>
            )}
            <div className="space-y-3">
              {VERIFY_LABELS.map((label, i) => (
                <label key={i} className="flex items-start gap-2 text-sm">
                  <Checkbox
                    checked={verifyChecks[i]}
                    onCheckedChange={(c) => {
                      const next = [...verifyChecks];
                      next[i] = !!c;
                      setVerifyChecks(next);
                    }}
                  />
                  <span className="text-foreground">{label}</span>
                </label>
              ))}
            </div>
            <div>
              <Label>Verification Notes (required)</Label>
              <Textarea value={verifyNotes} onChange={e => setVerifyNotes(e.target.value)} rows={3} />
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button
              onClick={handleVerify}
              disabled={!verifyNotes || !verifyChecks.every(Boolean)}
              className="w-full gap-2"
            >
              <CheckCircle className="h-4 w-4" /> Mark Verified
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Close Sheet */}
      <Sheet open={closeOpen} onOpenChange={setCloseOpen}>
        <SheetContent className="w-[450px] sm:max-w-[450px]">
          <SheetHeader>
            <SheetTitle>Document & Close</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            {selectedIssue && (
              <div className="bg-muted/50 border border-border rounded-lg p-3">
                <p className="text-sm font-medium text-foreground">{selectedIssue.title}</p>
                <div className="flex gap-2 mt-2">
                  {['Defect Logged', 'Work Order', 'Work Complete', 'Verified', 'Closed'].map((step, i) => (
                    <div key={step} className="flex items-center gap-1">
                      <div className={`h-2 w-2 rounded-full ${i < 4 ? 'bg-primary' : 'bg-muted-foreground'}`} />
                      <span className="text-[10px] text-muted-foreground">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <Label>Closure Notes (required)</Label>
              <Textarea value={closeNotes} onChange={e => setCloseNotes(e.target.value)} rows={4} />
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button onClick={handleClose} disabled={!closeNotes} className="w-full gap-2">
              <FileCheck className="h-4 w-4" /> Document & Close
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
