'use client';

import * as React from 'react';
import {
  Plus, Pencil, Trash2, Zap, Workflow, Power, Bell, Mail, UserPlus,
  CheckCircle2, AlertTriangle, Clock, RefreshCw, ListTodo,
} from 'lucide-react';
import { toast } from 'sonner';
import { useERP } from '@/lib/erp/store';
import { matchSearch } from '@/lib/erp/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  SectionHeader, TableShell, Th, Td, EmptyState,
  Modal, ConfirmDialog, Field, StatCard, FilterBar, FilterChip,
} from '../ui';
import type { WorkflowRule } from '@/lib/erp/types';

const TRIGGERS = [
  { value: 'lead_created', label: 'Lead Created', icon: <UserPlus className="h-3.5 w-3.5" /> },
  { value: 'quotation_created', label: 'Quotation Created', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  { value: 'payment_overdue', label: 'Payment Overdue', icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  { value: 'followup_missed', label: 'Follow-up Missed', icon: <Clock className="h-3.5 w-3.5" /> },
  { value: 'deal_won', label: 'Deal Won', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  { value: 'complaint_received', label: 'Complaint Received', icon: <Bell className="h-3.5 w-3.5" /> },
  { value: 'customer_inactive', label: 'Customer Inactive', icon: <RefreshCw className="h-3.5 w-3.5" /> },
] as const;

const ACTIONS = [
  { value: 'assign_salesperson', label: 'Assign Salesperson', icon: <UserPlus className="h-3.5 w-3.5" /> },
  { value: 'send_email', label: 'Send Email', icon: <Mail className="h-3.5 w-3.5" /> },
  { value: 'alert_manager', label: 'Alert Manager', icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  { value: 'create_task', label: 'Create Task', icon: <ListTodo className="h-3.5 w-3.5" /> },
  { value: 'send_reminder', label: 'Send Reminder', icon: <Bell className="h-3.5 w-3.5" /> },
  { value: 'reactivation_campaign', label: 'Reactivation Campaign', icon: <RefreshCw className="h-3.5 w-3.5" /> },
] as const;

const TRIGGER_LABEL: Record<string, string> = Object.fromEntries(TRIGGERS.map((t) => [t.value, t.label]));
const ACTION_LABEL: Record<string, string> = Object.fromEntries(ACTIONS.map((a) => [a.value, a.label]));
const TRIGGER_ICON: Record<string, React.ReactNode> = Object.fromEntries(TRIGGERS.map((t) => [t.value, t.icon]));
const ACTION_ICON: Record<string, React.ReactNode> = Object.fromEntries(ACTIONS.map((a) => [a.value, a.icon]));

export function Workflows() {
  const rules = useERP((s) => s.workflowRules) ?? [];
  const createWorkflowRule = useERP((s) => s.createWorkflowRule);
  const updateWorkflowRule = useERP((s) => s.updateWorkflowRule);
  const deleteWorkflowRule = useERP((s) => s.deleteWorkflowRule);

  const [search, setSearch] = React.useState('');
  const [triggerFilter, setTriggerFilter] = React.useState<string>('all');
  const [statusFilter, setStatusFilter] = React.useState<string>('all'); // all | active | disabled
  const [showNew, setShowNew] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<WorkflowRule | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<WorkflowRule | null>(null);

  const filtered = rules.filter((r) => {
    if (!matchSearch(
      `${r.id} ${r.name} ${r.trigger} ${r.condition || ''} ${r.action} ${r.target || ''} ${r.notes || ''}`,
      search,
    )) return false;
    if (triggerFilter !== 'all' && r.trigger !== triggerFilter) return false;
    if (statusFilter === 'active' && !r.enabled) return false;
    if (statusFilter === 'disabled' && r.enabled) return false;
    return true;
  });

  // ===== Stats =====
  const totalRules = rules.length;
  const activeRules = rules.filter((r) => r.enabled).length;
  const triggerCounts: Record<string, number> = {};
  rules.forEach((r) => { triggerCounts[r.trigger] = (triggerCounts[r.trigger] || 0) + 1; });
  const topTrigger = Object.entries(triggerCounts).sort((a, b) => b[1] - a[1])[0];

  const triggerCount = (t: string) => rules.filter((r) => r.trigger === t).length;
  const hasFilter = triggerFilter !== 'all' || statusFilter !== 'all';
  const clearFilters = () => { setTriggerFilter('all'); setStatusFilter('all'); };

  const handleToggle = (r: WorkflowRule, enabled: boolean) => {
    updateWorkflowRule?.(r.id, { enabled });
    toast.success(`${r.name} ${enabled ? 'enabled' : 'disabled'}`);
  };

  return (
    <div>
      <SectionHeader
        title="Workflows"
        subtitle="Automation rules — trigger → condition → action. Toggle rules on/off inline."
        accent="amber"
        actions={
          <Button onClick={() => setShowNew(true)} className="h-9 bg-slate-900 hover:bg-slate-800">
            <Plus className="h-4 w-4" /> New Rule
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Rules" value={totalRules} tone="primary" icon={<Workflow className="h-4 w-4" />} />
        <StatCard label="Active Rules" value={activeRules} tone="accent" icon={<Power className="h-4 w-4" />} />
        <StatCard label="Disabled" value={totalRules - activeRules} tone={totalRules - activeRules > 0 ? 'warn' : 'default'} icon={<Power className="h-4 w-4" />} />
        <StatCard
          label="Top Trigger"
          value={topTrigger ? TRIGGER_LABEL[topTrigger[0]] || topTrigger[0] : '—'}
          icon={<Zap className="h-4 w-4" />}
          trend={topTrigger ? { value: String(topTrigger[1]), direction: 'up', label: 'rules' } : undefined}
        />
      </div>

      <FilterBar label="Filters" onClear={clearFilters} showClear={hasFilter}>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Trigger:</span>
        <FilterChip label="All" active={triggerFilter === 'all'} onClick={() => setTriggerFilter('all')} count={totalRules} />
        {TRIGGERS.map((t) => (
          <FilterChip key={t.value} label={t.label} active={triggerFilter === t.value} onClick={() => setTriggerFilter(t.value)} count={triggerCount(t.value)} />
        ))}
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-2">Status:</span>
        <FilterChip label="All" active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
        <FilterChip label="Active" active={statusFilter === 'active'} onClick={() => setStatusFilter('active')} count={activeRules} />
        <FilterChip label="Disabled" active={statusFilter === 'disabled'} onClick={() => setStatusFilter('disabled')} count={totalRules - activeRules} />
      </FilterBar>

      <TableShell title="Automation Rules" search={search} onSearch={setSearch}>
        <thead>
          <tr>
            <Th>Enabled</Th><Th>Rule Name</Th><Th>Trigger</Th><Th>Condition</Th><Th>Action</Th><Th>Target</Th><Th>Notes</Th><Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <EmptyState icon={<Workflow className="h-8 w-8" />} message="No workflow rules yet — create your first automation." />
          ) : filtered.map((r) => (
            <tr key={r.id} className={cn('hover:bg-muted/30', !r.enabled && 'opacity-60')}>
              <Td>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={r.enabled}
                    onCheckedChange={(checked) => handleToggle(r, checked)}
                    aria-label={`Toggle ${r.name}`}
                  />
                  <span className={cn('text-[10px] font-bold', r.enabled ? 'text-emerald-600' : 'text-muted-foreground')}>
                    {r.enabled ? 'ON' : 'OFF'}
                  </span>
                </div>
              </Td>
              <Td>
                <div className="font-bold flex items-center gap-1.5">
                  {r.enabled && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                  {r.name}
                </div>
                <div className="text-[10px] text-muted-foreground">{r.id}</div>
              </Td>
              <Td>
                <Badge variant="outline" className="text-[10px] font-bold gap-1">
                  {TRIGGER_ICON[r.trigger]} {TRIGGER_LABEL[r.trigger] || r.trigger}
                </Badge>
              </Td>
              <Td className="max-w-[200px]">
                <span className="text-xs text-muted-foreground line-clamp-2">{r.condition || <span className="italic">—</span>}</span>
              </Td>
              <Td>
                <Badge className="text-[10px] font-bold gap-1 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  {ACTION_ICON[r.action]} {ACTION_LABEL[r.action] || r.action}
                </Badge>
              </Td>
              <Td className="max-w-[160px] truncate text-xs">{r.target || <span className="text-muted-foreground">—</span>}</Td>
              <Td className="max-w-[180px] truncate text-xs text-muted-foreground">{r.notes || '—'}</Td>
              <Td>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setEditTarget(r)} title="Edit">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50" onClick={() => setConfirmDelete(r)} title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </TableShell>

      <RuleModal
        open={showNew}
        onOpenChange={setShowNew}
        title="New Workflow Rule"
        onSubmit={(data) => {
          createWorkflowRule?.(data);
          toast.success('Rule created');
          setShowNew(false);
        }}
      />

      {editTarget && (
        <RuleModal
          open
          onOpenChange={(v) => !v && setEditTarget(null)}
          title={`Edit Rule: ${editTarget.name}`}
          initial={editTarget}
          onSubmit={(data) => {
            updateWorkflowRule?.(editTarget.id, data);
            toast.success('Rule updated');
            setEditTarget(null);
          }}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title="Delete Rule?"
        message={`"${confirmDelete?.name}" automation will be permanently removed.`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirmDelete) {
            deleteWorkflowRule?.(confirmDelete.id);
            toast.error('Rule deleted');
          }
        }}
      />
    </div>
  );
}

// ============ New / Edit Rule Modal ============
function RuleModal({
  open, onOpenChange, onSubmit, initial, title,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (data: Omit<WorkflowRule, 'id'>) => void;
  initial?: WorkflowRule;
  title: string;
}) {
  const [name, setName] = React.useState('');
  const [enabled, setEnabled] = React.useState(true);
  const [trigger, setTrigger] = React.useState<string>('lead_created');
  const [condition, setCondition] = React.useState('');
  const [action, setAction] = React.useState<string>('assign_salesperson');
  const [target, setTarget] = React.useState('');
  const [notes, setNotes] = React.useState('');

  React.useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? '');
    setEnabled(initial?.enabled ?? true);
    setTrigger(initial?.trigger ?? 'lead_created');
    setCondition(initial?.condition ?? '');
    setAction(initial?.action ?? 'assign_salesperson');
    setTarget(initial?.target ?? '');
    setNotes(initial?.notes ?? '');
  }, [open, initial]);

  const submit = () => {
    if (!name.trim()) { toast.error('Rule name is required'); return; }
    if (!trigger) { toast.error('Trigger is required'); return; }
    if (!action) { toast.error('Action is required'); return; }
    onSubmit({
      name: name.trim(),
      enabled,
      trigger,
      condition: condition.trim() || undefined,
      action,
      target: target.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-slate-900 hover:bg-slate-800" onClick={submit}>
            {initial ? 'Save Changes' : 'Create Rule'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Rule Name" className="col-span-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Auto-assign new leads to sales" />
        </Field>
        <Field label="Enabled" desc="Toggle the rule on/off after creation.">
          <div className="flex items-center gap-3 h-9">
            <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Enabled" />
            <span className={cn('text-xs font-bold', enabled ? 'text-emerald-600' : 'text-muted-foreground')}>
              {enabled ? 'Active' : 'Disabled'}
            </span>
          </div>
        </Field>
        <Field label="Target" desc="Who/what the action targets — email, role, or campaign name.">
          <Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="sales@karyam.com / manager / retention-campaign" />
        </Field>
        <Field label="Trigger" desc="Event that fires this rule.">
          <Select value={trigger} onValueChange={setTrigger}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TRIGGERS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  <span className="flex items-center gap-2">{t.icon} {t.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Action" desc="What should happen when the trigger fires.">
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ACTIONS.map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  <span className="flex items-center gap-2">{a.icon} {a.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Condition" desc="Human-readable condition — e.g. 'value > 50000' or 'city = Mumbai'." className="col-span-2">
          <Textarea value={condition} onChange={(e) => setCondition(e.target.value)} placeholder="value > 50000 AND category = 'A'" rows={2} />
        </Field>
        <Field label="Notes" className="col-span-2">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Why this rule exists, expected outcome…" rows={2} />
        </Field>
      </div>

      {/* Live preview */}
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Preview</div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="outline" className="text-[10px] font-bold gap-1">
            {TRIGGER_ICON[trigger]} {TRIGGER_LABEL[trigger] || trigger}
          </Badge>
          <span className="text-muted-foreground font-bold">→</span>
          {condition.trim() && (
            <>
              <code className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">{condition.trim()}</code>
              <span className="text-muted-foreground font-bold">→</span>
            </>
          )}
          <Badge className="text-[10px] font-bold gap-1 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            {ACTION_ICON[action]} {ACTION_LABEL[action] || action}
          </Badge>
          {target.trim() && <span className="text-muted-foreground">→ {target.trim()}</span>}
        </div>
      </div>
    </Modal>
  );
}
