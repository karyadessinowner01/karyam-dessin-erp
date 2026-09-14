'use client';

import * as React from 'react';
import {
  Plus, Pencil, Trash2, SlidersHorizontal, GitBranch, Type, Hash,
  Calendar, ListChecks, ToggleLeft, ArrowRight, CircleDot, Trophy, XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useERP } from '@/lib/erp/store';
import { LEAD_STAGES } from '@/lib/erp/constants';
import { matchSearch } from '@/lib/erp/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  SectionHeader, TableShell, Th, Td, EmptyState,
  Modal, ConfirmDialog, Field, StatCard,
} from '../ui';
import type { CustomField } from '@/lib/erp/types';

const ENTITIES = ['Lead', 'Customer', 'Project', 'Quotation', 'Ticket'] as const;
type Entity = (typeof ENTITIES)[number];

const FIELD_TYPES: CustomField['type'][] = ['text', 'number', 'date', 'select', 'checkbox'];

const TYPE_META: Record<CustomField['type'], { label: string; icon: React.ReactNode }> = {
  text: { label: 'Text', icon: <Type className="h-3.5 w-3.5" /> },
  number: { label: 'Number', icon: <Hash className="h-3.5 w-3.5" /> },
  date: { label: 'Date', icon: <Calendar className="h-3.5 w-3.5" /> },
  select: { label: 'Select', icon: <ListChecks className="h-3.5 w-3.5" /> },
  checkbox: { label: 'Checkbox', icon: <ToggleLeft className="h-3.5 w-3.5" /> },
};

const ENTITY_BADGE: Record<string, string> = {
  Lead: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  Customer: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  Project: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  Quotation: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  Ticket: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
};

const TYPE_BADGE: Record<CustomField['type'], string> = {
  text: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  number: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
  date: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
  select: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300',
  checkbox: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
};

const STAGE_META: Record<string, { description: string; colour: string; ring: string; icon: React.ReactNode; terminal?: 'won' | 'lost' }> = {
  New: {
    description: 'A fresh lead has entered the system. Awaiting first contact from sales.',
    colour: 'bg-slate-500 text-white',
    ring: 'ring-slate-200 dark:ring-slate-700',
    icon: <CircleDot className="h-4 w-4" />,
  },
  Contacted: {
    description: 'First touch made — call, email, or WhatsApp — but no qualification yet.',
    colour: 'bg-blue-500 text-white',
    ring: 'ring-blue-200 dark:ring-blue-800',
    icon: <ArrowRight className="h-4 w-4" />,
  },
  Qualified: {
    description: 'Confirmed genuine need, budget & decision-making authority. Worth pursuing.',
    colour: 'bg-cyan-500 text-white',
    ring: 'ring-cyan-200 dark:ring-cyan-800',
    icon: <ArrowRight className="h-4 w-4" />,
  },
  Quotation: {
    description: 'A formal quotation has been sent to the lead. Awaiting their response.',
    colour: 'bg-amber-500 text-white',
    ring: 'ring-amber-200 dark:ring-amber-800',
    icon: <ArrowRight className="h-4 w-4" />,
  },
  Negotiation: {
    description: 'Active discussion on price, scope, or terms. Final stage before decision.',
    colour: 'bg-orange-500 text-white',
    ring: 'ring-orange-200 dark:ring-orange-800',
    icon: <ArrowRight className="h-4 w-4" />,
  },
  Won: {
    description: 'Deal closed successfully — lead converted to a project. Win probability 100%.',
    colour: 'bg-emerald-500 text-white',
    ring: 'ring-emerald-200 dark:ring-emerald-800',
    icon: <Trophy className="h-4 w-4" />,
    terminal: 'won',
  },
  Lost: {
    description: 'Deal lost to a competitor, price, or other reason. Lost reason is captured.',
    colour: 'bg-rose-500 text-white',
    ring: 'ring-rose-200 dark:ring-rose-800',
    icon: <XCircle className="h-4 w-4" />,
    terminal: 'lost',
  },
};

export function Customization() {
  const [tab, setTab] = React.useState<'fields' | 'stages'>('fields');

  return (
    <div>
      <SectionHeader
        title="Customization"
        subtitle="Define custom fields for your records & visualise the lead pipeline stages."
        accent="slate"
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'fields' | 'stages')} className="mb-4">
        <TabsList>
          <TabsTrigger value="fields" className="gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5" /> Custom Fields
          </TabsTrigger>
          <TabsTrigger value="stages" className="gap-1.5">
            <GitBranch className="h-3.5 w-3.5" /> Lead Stages
          </TabsTrigger>
        </TabsList>
        <TabsContent value="fields">
          <CustomFieldsTab />
        </TabsContent>
        <TabsContent value="stages">
          <LeadStagesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============ Custom Fields Tab ============
function CustomFieldsTab() {
  const customFields = useERP((s) => s.customFields) ?? [];
  const createCustomField = useERP((s) => s.createCustomField);
  const updateCustomField = useERP((s) => s.updateCustomField);
  const deleteCustomField = useERP((s) => s.deleteCustomField);

  const [search, setSearch] = React.useState('');
  const [entityFilter, setEntityFilter] = React.useState<string>('all');
  const [showNew, setShowNew] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<CustomField | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<CustomField | null>(null);

  const filtered = customFields.filter((f) => {
    if (!matchSearch(`${f.id} ${f.entity} ${f.label} ${f.type} ${f.options || ''} ${f.defaultValue || ''}`, search)) return false;
    if (entityFilter !== 'all' && f.entity !== entityFilter) return false;
    return true;
  });

  const totalFields = customFields.length;
  const byEntity = (e: string) => customFields.filter((f) => f.entity === e).length;
  const requiredCount = customFields.filter((f) => f.required).length;

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Fields" value={totalFields} tone="primary" icon={<SlidersHorizontal className="h-4 w-4" />} />
        <StatCard label="Lead Fields" value={byEntity('Lead')} tone="accent" />
        <StatCard label="Customer Fields" value={byEntity('Customer')} />
        <StatCard label="Required" value={requiredCount} tone="warn" />
      </div>

      {/* Quick entity count row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
        {ENTITIES.map((e) => (
          <div key={e} className="rounded-lg border border-border bg-card p-3 text-center">
            <div className="text-xl font-black">{byEntity(e)}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{e}</div>
          </div>
        ))}
      </div>

      <TableShell
        title="All Custom Fields"
        search={search}
        onSearch={setSearch}
        toolbar={
          <>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {ENTITIES.map((e) => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => setShowNew(true)} className="h-8 bg-slate-900 hover:bg-slate-800">
              <Plus className="h-4 w-4" /> New Field
            </Button>
          </>
        }
      >
        <thead>
          <tr>
            <Th>Entity</Th><Th>Label</Th><Th>Type</Th><Th>Options</Th>
            <Th>Required</Th><Th>Default Value</Th><Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <EmptyState icon={<SlidersHorizontal className="h-8 w-8" />} message="No custom fields yet — create your first one." />
          ) : filtered.map((f) => (
            <tr key={f.id} className="hover:bg-muted/30">
              <Td>
                <Badge className={cn('text-[10px] font-bold', ENTITY_BADGE[f.entity] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300')}>
                  {f.entity}
                </Badge>
              </Td>
              <Td>
                <div className="font-bold">{f.label}</div>
                <div className="text-[10px] text-muted-foreground">{f.id}</div>
              </Td>
              <Td>
                <Badge className={cn('text-[10px] font-bold gap-1', TYPE_BADGE[f.type])}>
                  {TYPE_META[f.type].icon} {TYPE_META[f.type].label}
                </Badge>
              </Td>
              <Td className="max-w-[220px]">
                {f.type === 'select' && f.options ? (
                  <span className="text-xs text-muted-foreground truncate block">{f.options}</span>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </Td>
              <Td>
                {f.required ? (
                  <Badge className="text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">Required</Badge>
                ) : (
                  <span className="text-muted-foreground text-xs">Optional</span>
                )}
              </Td>
              <Td>{f.defaultValue || <span className="text-muted-foreground text-xs">—</span>}</Td>
              <Td>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setEditTarget(f)} title="Edit">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50" onClick={() => setConfirmDelete(f)} title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </TableShell>

      <FieldModal
        open={showNew}
        onOpenChange={setShowNew}
        onSubmit={(data) => {
          createCustomField?.(data);
          toast.success('Custom field created');
          setShowNew(false);
        }}
      />

      {editTarget && (
        <FieldModal
          open
          onOpenChange={(v) => !v && setEditTarget(null)}
          initial={editTarget}
          title={`Edit Field: ${editTarget.label}`}
          onSubmit={(data) => {
            updateCustomField?.(editTarget.id, data);
            toast.success('Custom field updated');
            setEditTarget(null);
          }}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title="Delete Custom Field?"
        message={`"${confirmDelete?.label}" on ${confirmDelete?.entity} records will be permanently removed. Existing values on records are also removed.`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirmDelete) {
            deleteCustomField?.(confirmDelete.id);
            toast.error('Custom field deleted');
          }
        }}
      />
    </div>
  );
}

// ============ New / Edit Custom Field Modal ============
function FieldModal({
  open, onOpenChange, onSubmit, initial, title = 'New Custom Field',
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (data: Omit<CustomField, 'id'>) => void;
  initial?: CustomField;
  title?: string;
}) {
  const [entity, setEntity] = React.useState<Entity>((initial?.entity as Entity) ?? 'Lead');
  const [label, setLabel] = React.useState(initial?.label ?? '');
  const [type, setType] = React.useState<CustomField['type']>(initial?.type ?? 'text');
  const [options, setOptions] = React.useState(initial?.options ?? '');
  const [required, setRequired] = React.useState(initial?.required ?? false);
  const [defaultValue, setDefaultValue] = React.useState(initial?.defaultValue ?? '');

  React.useEffect(() => {
    if (!open) return;
    setEntity((initial?.entity as Entity) ?? 'Lead');
    setLabel(initial?.label ?? '');
    setType(initial?.type ?? 'text');
    setOptions(initial?.options ?? '');
    setRequired(initial?.required ?? false);
    setDefaultValue(initial?.defaultValue ?? '');
  }, [open, initial]);

  const submit = () => {
    if (!label.trim()) { toast.error('Field label is required'); return; }
    if (type === 'select' && !options.trim()) {
      toast.error('Options are required for "select" type — comma-separated values.');
      return;
    }
    onSubmit({
      entity,
      label: label.trim(),
      type,
      options: type === 'select' ? options.trim() : undefined,
      required,
      defaultValue: defaultValue.trim() || undefined,
    });
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-slate-900 hover:bg-slate-800" onClick={submit}>
            {initial ? 'Save Changes' : 'Create Field'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Entity" desc="Which record type this field belongs to.">
          <Select value={entity} onValueChange={(v) => setEntity(v as Entity)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ENTITIES.map((e) => (
                <SelectItem key={e} value={e}>{e}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Field Type" desc="How the value is captured.">
          <Select value={type} onValueChange={(v) => setType(v as CustomField['type'])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {FIELD_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  <span className="inline-flex items-center gap-1.5">
                    {TYPE_META[t].icon} {TYPE_META[t].label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Field Label" className="col-span-2">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. GST Number / Credit Days / Priority" />
        </Field>
        {type === 'select' && (
          <Field label="Options (comma-separated)" className="col-span-2" desc="Each value becomes a dropdown option.">
            <Input value={options} onChange={(e) => setOptions(e.target.value)} placeholder="Low, Medium, High, Urgent" />
          </Field>
        )}
        <Field label="Default Value" className={type === 'checkbox' ? 'col-span-2' : 'col-span-2'} desc="Pre-filled when a new record is created.">
          {type === 'checkbox' ? (
            <Select value={defaultValue || 'false'} onValueChange={setDefaultValue}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Checked (true)</SelectItem>
                <SelectItem value="false">Unchecked (false)</SelectItem>
              </SelectContent>
            </Select>
          ) : type === 'date' ? (
            <Input type="date" value={defaultValue} onChange={(e) => setDefaultValue(e.target.value)} />
          ) : (
            <Input
              type={type === 'number' ? 'number' : 'text'}
              value={defaultValue}
              onChange={(e) => setDefaultValue(e.target.value)}
              placeholder="Optional default"
            />
          )}
        </Field>
        <div className="col-span-2 flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
          <div>
            <Label className="text-xs font-bold">Required Field</Label>
            <p className="text-[10px] text-muted-foreground">Users must fill this field before saving the record.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn('text-[10px] font-bold', required ? 'text-rose-600' : 'text-muted-foreground')}>
              {required ? 'REQUIRED' : 'OPTIONAL'}
            </span>
            <Switch checked={required} onCheckedChange={setRequired} aria-label="Required toggle" />
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ============ Lead Stages Tab (read-only) ============
function LeadStagesTab() {
  // Split into the main pipeline and the two terminal outcomes (Won/Lost).
  const mainStages = LEAD_STAGES.filter((s) => s !== 'Won' && s !== 'Lost');
  const terminalStages = LEAD_STAGES.filter((s) => s === 'Won' || s === 'Lost');

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Stages" value={LEAD_STAGES.length} tone="primary" icon={<GitBranch className="h-4 w-4" />} />
        <StatCard label="Active Stages" value={mainStages.length} />
        <StatCard label="Won (terminal)" value={1} tone="accent" icon={<Trophy className="h-4 w-4" />} />
        <StatCard label="Lost (terminal)" value={1} tone="danger" icon={<XCircle className="h-4 w-4" />} />
      </div>

      {/* Horizontal pipeline flow */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm mb-4">
        <div className="flex items-center gap-2 mb-4">
          <GitBranch className="h-4 w-4 text-slate-600" />
          <h3 className="text-sm font-black tracking-tight">Lead Pipeline Stages</h3>
          <Badge variant="outline" className="text-[10px] font-bold ml-auto">{LEAD_STAGES.length} stages</Badge>
        </div>

        {/* Main horizontal flow */}
        <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
          {mainStages.map((s, idx) => {
            const meta = STAGE_META[s];
            return (
              <React.Fragment key={s}>
                <div className="flex-shrink-0 w-44 rounded-xl border border-border bg-card p-3 ring-2 ring-transparent transition-all hover:shadow-md" style={{ boxShadow: undefined }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', meta.colour)}>
                      {meta.icon}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Stage {idx + 1}</div>
                  </div>
                  <div className="text-sm font-black mb-1">{s}</div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{meta.description}</p>
                </div>
                {idx < mainStages.length - 1 && (
                  <div className="flex items-center justify-center flex-shrink-0">
                    <ArrowRight className="h-5 w-5 text-muted-foreground/60" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
          {/* Arrow to terminal outcomes */}
          <div className="flex items-center justify-center flex-shrink-0">
            <ArrowRight className="h-5 w-5 text-muted-foreground/60" />
          </div>
          {/* Terminal outcomes — Won + Lost */}
          <div className="flex-shrink-0 flex flex-col gap-2">
            {terminalStages.map((s) => {
              const meta = STAGE_META[s];
              return (
                <div key={s} className="w-44 rounded-xl border border-border bg-card p-3 ring-2 ring-transparent transition-all hover:shadow-md">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', meta.colour)}>
                      {meta.icon}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Terminal</div>
                  </div>
                  <div className="text-sm font-black mb-1">{s}</div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{meta.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Note card */}
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 p-3 flex items-start gap-2">
          <span className="text-base">ℹ️</span>
          <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
            <strong>Lead stages are customizable in a future version.</strong> For now, the pipeline uses the default
            7-stage flow ({LEAD_STAGES.join(' → ')}). Soon, owners will be able to add, rename, reorder, or hide
            stages to match their own sales process.
          </p>
        </div>
      </div>

      {/* Stage-by-stage table */}
      <TableShell title="Stage Reference">
        <thead>
          <tr>
            <Th className="w-12">#</Th><Th>Stage</Th><Th>Type</Th><Th>Description</Th>
          </tr>
        </thead>
        <tbody>
          {LEAD_STAGES.map((s, idx) => {
            const meta = STAGE_META[s];
            return (
              <tr key={s} className="hover:bg-muted/30">
                <Td><span className="font-black tabular-nums text-muted-foreground">{String(idx + 1).padStart(2, '0')}</span></Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center', meta.colour)}>
                      {meta.icon}
                    </div>
                    <span className="font-bold">{s}</span>
                  </div>
                </Td>
                <Td>
                  {meta.terminal ? (
                    <Badge className={cn(
                      'text-[10px] font-bold',
                      meta.terminal === 'won'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
                    )}>
                      {meta.terminal === 'won' ? 'Won (terminal)' : 'Lost (terminal)'}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] font-bold">Active</Badge>
                  )}
                </Td>
                <Td className="text-muted-foreground">{meta.description}</Td>
              </tr>
            );
          })}
        </tbody>
      </TableShell>
    </div>
  );
}
