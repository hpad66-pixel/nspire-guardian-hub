import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Plus, Zap, Clock, Shield, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  useEscalationRules, useEscalationLog, useCreateEscalationRule,
  useUpdateEscalationRule, useDeleteEscalationRule,
  type EscalationRule,
} from '@/hooks/useEscalationRules';
import { formatDistanceToNow } from 'date-fns';

const ENTITY_OPTIONS = [
  { value: 'work_order', label: 'Work Order' },
  { value: 'issue', label: 'Issue' },
  { value: 'compliance_event', label: 'Compliance Event' },
  { value: 'risk', label: 'Risk' },
  { value: 'regulatory_action_item', label: 'Regulatory Action Item' },
];

const ROLE_OPTIONS = ['admin', 'owner', 'manager', 'superintendent', 'inspector'];

const CONDITION_PRESETS: Record<string, { label: string; condition: Record<string, any> }[]> = {
  work_order: [
    { label: 'Priority = Emergency', condition: { field: 'priority', operator: 'equals', value: 'emergency' } },
    { label: 'Priority = Urgent', condition: { field: 'priority', operator: 'equals', value: 'urgent' } },
    { label: 'Status = Open', condition: { field: 'status', operator: 'equals', value: 'open' } },
  ],
  issue: [
    { label: 'Severity = Severe', condition: { field: 'severity', operator: 'equals', value: 'severe' } },
    { label: 'Severity = Moderate', condition: { field: 'severity', operator: 'equals', value: 'moderate' } },
    { label: 'Status = Open', condition: { field: 'status', operator: 'equals', value: 'open' } },
  ],
  compliance_event: [
    { label: 'Status = Upcoming', condition: { field: 'status', operator: 'equals', value: 'upcoming' } },
    { label: 'Status = Overdue', condition: { field: 'status', operator: 'equals', value: 'overdue' } },
  ],
  risk: [
    { label: 'Status = Open', condition: { field: 'status', operator: 'equals', value: 'open' } },
    { label: 'Status = Identified', condition: { field: 'status', operator: 'equals', value: 'identified' } },
  ],
  regulatory_action_item: [
    { label: 'Status = Open', condition: { field: 'status', operator: 'equals', value: 'open' } },
    { label: 'Status = In Progress', condition: { field: 'status', operator: 'equals', value: 'in_progress' } },
  ],
};

const DEFAULT_RULES: Partial<EscalationRule>[] = [
  {
    name: 'Emergency Work Order — 2 Hour Response',
    description: 'Escalate emergency work orders not acknowledged within 2 hours',
    trigger_entity: 'work_order',
    trigger_condition: { field: 'priority', operator: 'equals', value: 'emergency' },
    delay_hours: 2,
    notify_roles: ['admin', 'owner', 'manager'],
    notification_channel: ['in_app'],
    message_template: "Emergency work order '{entity_title}' has been open for {hours_elapsed} hours without acknowledgment.",
  },
  {
    name: 'Severe NSPIRE Defect — 48 Hour Assignment',
    description: 'Escalate severe defects unassigned for 48 hours',
    trigger_entity: 'issue',
    trigger_condition: { field: 'severity', operator: 'equals', value: 'severe' },
    delay_hours: 48,
    notify_roles: ['admin', 'owner'],
    notification_channel: ['in_app'],
    message_template: "Severe defect '{entity_title}' has been unassigned for {hours_elapsed} hours.",
  },
  {
    name: 'Critical Risk No Mitigation — 7 Days',
    description: 'Escalate critical risks open for 7+ days without mitigation',
    trigger_entity: 'risk',
    trigger_condition: { field: 'status', operator: 'equals', value: 'open' },
    delay_hours: 168,
    notify_roles: ['admin', 'owner'],
    notification_channel: ['in_app'],
    message_template: "Critical risk '{entity_title}' has been open for {hours_elapsed} hours with no mitigation actions.",
  },
  {
    name: 'Overdue Regulatory Action Item',
    description: 'Immediately escalate overdue regulatory action items',
    trigger_entity: 'regulatory_action_item',
    trigger_condition: { field: 'status', operator: 'equals', value: 'open' },
    delay_hours: 0,
    notify_roles: ['admin', 'owner'],
    notification_channel: ['in_app'],
    message_template: "Regulatory action item '{entity_title}' is now overdue.",
  },
];

export default function EscalationRulesPage() {
  const { data: rules = [], isLoading } = useEscalationRules();
  const { data: logs = [] } = useEscalationLog();
  const createRule = useCreateEscalationRule();
  const updateRule = useUpdateEscalationRule();
  const deleteRule = useDeleteEscalationRule();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<EscalationRule | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerEntity, setTriggerEntity] = useState('work_order');
  const [conditionIdx, setConditionIdx] = useState(0);
  const [delayHours, setDelayHours] = useState(2);
  const [notifyRoles, setNotifyRoles] = useState<string[]>(['admin']);
  const [messageTemplate, setMessageTemplate] = useState('');

  const openCreate = () => {
    setEditingRule(null);
    setName(''); setDescription(''); setTriggerEntity('work_order');
    setConditionIdx(0); setDelayHours(2); setNotifyRoles(['admin']); setMessageTemplate('');
    setDialogOpen(true);
  };

  const openEdit = (rule: EscalationRule) => {
    setEditingRule(rule);
    setName(rule.name);
    setDescription(rule.description || '');
    setTriggerEntity(rule.trigger_entity);
    setDelayHours(rule.delay_hours);
    setNotifyRoles(rule.notify_roles || []);
    setMessageTemplate(rule.message_template || '');
    setDialogOpen(true);
  };

  const handleSave = () => {
    const presets = CONDITION_PRESETS[triggerEntity] || [];
    const condition = presets[conditionIdx]?.condition || { field: 'status', operator: 'equals', value: 'open' };
    
    const payload = {
      name, description, trigger_entity: triggerEntity,
      trigger_condition: condition, delay_hours: delayHours,
      notify_roles: notifyRoles, notification_channel: ['in_app'],
      message_template: messageTemplate,
    };

    if (editingRule) {
      updateRule.mutate({ id: editingRule.id, ...payload });
    } else {
      createRule.mutate(payload);
    }
    setDialogOpen(false);
  };

  const seedDefaults = () => {
    for (const rule of DEFAULT_RULES) {
      createRule.mutate(rule);
    }
  };

  const activeCount = rules.filter(r => r.is_active).length;
  const todayLogs = logs.filter(l => {
    const d = new Date(l.fired_at);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });

  return (
    <div className="min-h-full bg-background p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
          AUTOMATION
        </p>
        <div className="flex items-center justify-between mt-1">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Escalation Rules</h1>
            <p className="text-sm text-muted-foreground">The system that ensures nothing stays ignored.</p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> New Rule
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Active Rules', value: activeCount, icon: Shield },
          { label: 'Escalations Today', value: todayLogs.length, icon: Zap },
          { label: 'Total Log Entries', value: logs.length, icon: Clock },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <s.icon className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-2xl font-bold text-foreground">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Seed defaults */}
      {!isLoading && rules.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-6 text-center">
          <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-foreground mb-1">No escalation rules yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Start with our recommended default rules.</p>
          <Button onClick={seedDefaults} variant="outline" className="gap-2">
            <Zap className="h-4 w-4" /> Load Default Rules
          </Button>
        </div>
      )}

      {/* Rule Cards */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => (
            <div key={rule.id} className="bg-card border border-border rounded-xl p-4 flex items-start gap-4">
              <Switch
                checked={rule.is_active}
                onCheckedChange={(checked) => updateRule.mutate({ id: rule.id, is_active: checked })}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-foreground">{rule.name}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {ENTITY_OPTIONS.find(e => e.value === rule.trigger_entity)?.label}
                  </Badge>
                </div>
                {rule.description && (
                  <p className="text-xs text-muted-foreground mb-1">{rule.description}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Delay: {rule.delay_hours}h</span>
                  <span>Notify: {(rule.notify_roles || []).join(', ')}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => openEdit(rule)}>Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => deleteRule.mutate(rule.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Escalation History */}
      {logs.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-3" style={{ fontFamily: 'var(--font-mono)' }}>
            ESCALATION HISTORY
          </h3>
          <div className="space-y-2">
            {logs.slice(0, 20).map(log => (
              <div key={log.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <div className={`h-2 w-2 rounded-full ${log.resolved_at ? 'bg-amber-500' : 'bg-destructive'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-foreground truncate">{log.entity_title || log.entity_type}</div>
                  <div className="text-xs text-muted-foreground">{log.rule_name}</div>
                </div>
                <span className="text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                  {formatDistanceToNow(new Date(log.fired_at), { addSuffix: true })}
                </span>
                <Badge variant={log.resolved_at ? 'secondary' : 'destructive'} className="text-[10px]">
                  {log.resolved_at ? 'Resolved' : 'Active'}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit Rule' : 'New Escalation Rule'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rule Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Emergency WO — 2hr" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Entity Type</Label>
                <Select value={triggerEntity} onValueChange={v => { setTriggerEntity(v); setConditionIdx(0); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ENTITY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Condition</Label>
                <Select value={String(conditionIdx)} onValueChange={v => setConditionIdx(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(CONDITION_PRESETS[triggerEntity] || []).map((p, i) => (
                      <SelectItem key={i} value={String(i)}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Delay (hours)</Label>
              <Input type="number" min={0} value={delayHours} onChange={e => setDelayHours(Number(e.target.value))} />
            </div>
            <div>
              <Label>Notify Roles</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {ROLE_OPTIONS.map(role => (
                  <label key={role} className="flex items-center gap-1.5 text-sm">
                    <Checkbox
                      checked={notifyRoles.includes(role)}
                      onCheckedChange={(checked) => {
                        setNotifyRoles(prev =>
                          checked ? [...prev, role] : prev.filter(r => r !== role)
                        );
                      }}
                    />
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>Message Template</Label>
              <Textarea
                value={messageTemplate}
                onChange={e => setMessageTemplate(e.target.value)}
                placeholder="Use {entity_title}, {hours_elapsed}, {property}"
                rows={3}
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Tokens: {'{entity_title}'}, {'{hours_elapsed}'}, {'{property}'}, {'{assigned_to}'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!name || !triggerEntity}>
              {editingRule ? 'Update' : 'Create'} Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
