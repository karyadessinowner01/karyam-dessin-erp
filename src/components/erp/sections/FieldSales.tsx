'use client';

import * as React from 'react';
import {
  Plus, MapPin, Trash2, Stethoscope, Pill, Building2, User as UserIcon,
  ClipboardList, IndianRupee, Calendar, Trophy, Clock, Package,
} from 'lucide-react';
import { toast } from 'sonner';
import { useERP } from '@/lib/erp/store';
import { Rs, matchSearch } from '@/lib/erp/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  SectionHeader, TableShell, Th, Td, EmptyState, StatusBadge,
  Modal, ConfirmDialog, Field, StatCard, FilterBar, FilterChip,
} from '../ui';
import type { FieldVisit } from '@/lib/erp/types';

const VISIT_TYPES: FieldVisit['visitType'][] = ['Doctor', 'Chemist', 'Customer', 'Stockist'];

const VISIT_ICON: Record<FieldVisit['visitType'], React.ReactNode> = {
  Doctor: <Stethoscope className="h-3.5 w-3.5" />,
  Chemist: <Pill className="h-3.5 w-3.5" />,
  Customer: <UserIcon className="h-3.5 w-3.5" />,
  Stockist: <Building2 className="h-3.5 w-3.5" />,
};

const VISIT_BADGE: Record<FieldVisit['visitType'], string> = {
  Doctor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  Chemist: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  Customer: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  Stockist: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
};

/** Format ISO datetime string → DD-Mon HH:MM */
function fmtDT(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${String(d.getDate()).padStart(2, '0')}-${months[d.getMonth()]} ${hh}:${mm}`;
}

/** ISO date (YYYY-MM-DD) for a Date, in local time (avoid UTC drift). */
function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function FieldSales() {
  const fieldVisits = useERP((s) => s.fieldVisits) ?? [];
  const currentUser = useERP((s) => s.currentUser);
  const team = useERP((s) => s.team);
  const createFieldVisit = useERP((s) => s.createFieldVisit);
  const deleteFieldVisit = useERP((s) => s.deleteFieldVisit);

  const [search, setSearch] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<string>('all');
  const [repFilter, setRepFilter] = React.useState<string>('all');
  const [showNew, setShowNew] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState<FieldVisit | null>(null);

  const activeTeam = team.filter((m) => m.active);
  const repsInVisits = React.useMemo(
    () => Array.from(new Set(fieldVisits.map((v) => v.repEmail).filter(Boolean))),
    [fieldVisits],
  );

  const filtered = fieldVisits.filter((v) => {
    if (!matchSearch(
      `${v.id} ${v.visitType} ${v.visitName} ${v.repName} ${v.location || ''} ${v.productsDetailed || ''} ${v.samplesDistributed || ''} ${v.outcome || ''}`,
      search,
    )) return false;
    if (typeFilter !== 'all' && v.visitType !== typeFilter) return false;
    if (repFilter === 'mine') {
      if (!v.repEmail || v.repEmail.toLowerCase() !== (currentUser?.email || '').toLowerCase()) return false;
    } else if (repFilter === 'unassigned') {
      if (v.repEmail) return false;
    } else if (repFilter !== 'all') {
      if (!v.repEmail || v.repEmail.toLowerCase() !== repFilter.toLowerCase()) return false;
    }
    return true;
  });

  // ===== Stats =====
  const totalVisits = fieldVisits.length;
  const totalOrderValue = fieldVisits.reduce((s, v) => s + (v.orderValue || 0), 0);

  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 6); // last 7 days inclusive
  const weekStartTs = weekAgo.setHours(0, 0, 0, 0);
  const visitsThisWeek = fieldVisits.filter((v) => {
    const t = new Date(v.checkIn).getTime();
    return !isNaN(t) && t >= weekStartTs;
  }).length;

  // Top rep by total order value
  const repTotals: Record<string, { name: string; total: number; count: number }> = {};
  fieldVisits.forEach((v) => {
    const key = v.repEmail || v.repName || 'Unknown';
    if (!repTotals[key]) repTotals[key] = { name: v.repName || 'Unknown', total: 0, count: 0 };
    repTotals[key].total += v.orderValue || 0;
    repTotals[key].count += 1;
  });
  const topRep = Object.values(repTotals).sort((a, b) => b.total - a.total)[0];

  // ===== DCR Summary (today's visits grouped by rep) =====
  const todayStr = isoDay(new Date());
  const todayVisits = fieldVisits.filter((v) => {
    const d = new Date(v.checkIn);
    return !isNaN(d.getTime()) && isoDay(d) === todayStr;
  });
  const dcrByRep: Record<string, { name: string; count: number; orderValue: number; visits: FieldVisit[] }> = {};
  todayVisits.forEach((v) => {
    const key = v.repEmail || v.repName || 'Unknown';
    if (!dcrByRep[key]) dcrByRep[key] = { name: v.repName || 'Unknown', count: 0, orderValue: 0, visits: [] };
    dcrByRep[key].count += 1;
    dcrByRep[key].orderValue += v.orderValue || 0;
    dcrByRep[key].visits.push(v);
  });
  const dcrRows = Object.values(dcrByRep).sort((a, b) => b.count - a.count);

  const typeCount = (t: string) => fieldVisits.filter((v) => v.visitType === t).length;
  const hasFilter = typeFilter !== 'all' || repFilter !== 'all';
  const clearFilters = () => { setTypeFilter('all'); setRepFilter('all'); };

  return (
    <div>
      <SectionHeader
        title="Field Sales"
        subtitle="MR / field visits with Daily Call Report (DCR) summary."
        accent="emerald"
        actions={
          <Button onClick={() => setShowNew(true)} className="h-9 bg-slate-900 hover:bg-slate-800">
            <Plus className="h-4 w-4" /> Log Visit
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Visits" value={totalVisits} tone="primary" icon={<ClipboardList className="h-4 w-4" />} />
        <StatCard label="Total Order Value" value={Rs(totalOrderValue)} tone="accent" icon={<IndianRupee className="h-4 w-4" />} />
        <StatCard label="Visits This Week" value={visitsThisWeek} icon={<Calendar className="h-4 w-4" />} />
        <StatCard
          label="Top Rep"
          value={topRep ? topRep.name : '—'}
          icon={<Trophy className="h-4 w-4" />}
          trend={topRep ? { value: Rs(topRep.total), direction: 'up', label: 'orders' } : undefined}
        />
      </div>

      {/* ===== DCR Summary ===== */}
      <div className="rounded-xl border border-border bg-card shadow-sm mb-5 overflow-hidden">
        <div className="flex items-center gap-2 p-3.5 border-b border-border">
          <ClipboardList className="h-4 w-4 text-emerald-600" />
          <div className="text-sm font-bold">DCR Summary — Today ({todayStr})</div>
          <Badge variant="outline" className="ml-auto text-[10px]">{todayVisits.length} visits</Badge>
        </div>
        {dcrRows.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No visits logged today yet.
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {dcrRows.map((row) => (
              <div key={row.name} className="flex flex-wrap items-center gap-3 p-3.5 hover:bg-muted/30">
                <div className="h-9 w-9 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                  {row.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold">{row.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {row.count} visit{row.count !== 1 ? 's' : ''} · {row.visits.filter((v) => v.visitType === 'Doctor').length} Dr · {row.visits.filter((v) => v.visitType === 'Chemist').length} Ch
                  </div>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-sm font-bold text-emerald-600">{Rs(row.orderValue)}</div>
                  <div className="text-[11px] text-muted-foreground">orders booked</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <FilterBar label="Filters" onClear={clearFilters} showClear={hasFilter}>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Visit Type:</span>
        <FilterChip label="All" active={typeFilter === 'all'} onClick={() => setTypeFilter('all')} count={totalVisits} />
        {VISIT_TYPES.map((t) => (
          <FilterChip key={t} label={t} active={typeFilter === t} onClick={() => setTypeFilter(t)} count={typeCount(t)} />
        ))}
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-2">Rep:</span>
        <Select value={repFilter} onValueChange={setRepFilter}>
          <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reps</SelectItem>
            <SelectItem value="mine">My Visits</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {activeTeam.map((m) => (
              <SelectItem key={m.id} value={m.email}>{m.name}</SelectItem>
            ))}
            {repsInVisits
              .filter((e) => !activeTeam.some((m) => m.email === e))
              .map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterBar>

      <TableShell title="All Field Visits" search={search} onSearch={setSearch}>
        <thead>
          <tr>
            <Th>Type</Th><Th>Visit Name</Th><Th>Rep</Th><Th>Check-In</Th><Th>Check-Out</Th>
            <Th>Location</Th><Th>Products / Samples</Th><Th>Outcome</Th><Th className="text-right">Order Value</Th><Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <EmptyState icon={<MapPin className="h-8 w-8" />} message="No field visits logged yet." />
          ) : filtered.map((v) => (
            <tr key={v.id} className="hover:bg-muted/30">
              <Td>
                <Badge className={cn('text-[10px] font-bold gap-1', VISIT_BADGE[v.visitType])}>
                  {VISIT_ICON[v.visitType]} {v.visitType}
                </Badge>
              </Td>
              <Td><div className="font-bold">{v.visitName}</div><div className="text-[10px] text-muted-foreground">{v.id}</div></Td>
              <Td>
                <div className="text-xs font-semibold">{v.repName}</div>
                {v.repEmail && <div className="text-[10px] text-muted-foreground">{v.repEmail}</div>}
              </Td>
              <Td><div className="flex items-center gap-1 text-xs"><Clock className="h-3 w-3 text-muted-foreground" />{fmtDT(v.checkIn)}</div></Td>
              <Td><div className="text-xs">{fmtDT(v.checkOut)}</div></Td>
              <Td className="max-w-[160px] truncate">{v.location || <span className="text-muted-foreground text-xs">—</span>}</Td>
              <Td className="max-w-[220px]">
                {v.productsDetailed && (
                  <div className="flex items-center gap-1 text-xs"><Package className="h-3 w-3 text-muted-foreground" /><span className="truncate">{v.productsDetailed}</span></div>
                )}
                {v.samplesDistributed && (
                  <div className="text-[10px] text-muted-foreground truncate">Samples: {v.samplesDistributed}</div>
                )}
                {!v.productsDetailed && !v.samplesDistributed && <span className="text-muted-foreground text-xs">—</span>}
              </Td>
              <Td>{v.outcome ? <StatusBadge status={v.outcome} /> : <span className="text-muted-foreground text-xs">—</span>}</Td>
              <Td className="text-right tabular-nums font-bold">{Rs(v.orderValue)}</Td>
              <Td>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50" onClick={() => setConfirmDelete(v)} title="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </Td>
            </tr>
          ))}
        </tbody>
      </TableShell>

      <NewVisitModal
        open={showNew}
        onOpenChange={setShowNew}
        defaultRepName={currentUser?.name || ''}
        defaultRepEmail={currentUser?.email || ''}
        onSubmit={(data) => {
          createFieldVisit?.(data);
          toast.success('Visit logged');
          setShowNew(false);
        }}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title="Delete Visit?"
        message={`"${confirmDelete?.visitName}" visit will be permanently removed.`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirmDelete) {
            deleteFieldVisit?.(confirmDelete.id);
            toast.error('Visit deleted');
          }
        }}
      />
    </div>
  );
}

// ============ New Visit Modal ============
function NewVisitModal({
  open, onOpenChange, onSubmit, defaultRepName, defaultRepEmail,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (data: Omit<FieldVisit, 'id'>) => void;
  defaultRepName: string;
  defaultRepEmail: string;
}) {
  const team = useERP((s) => s.team);
  const activeTeam = team.filter((m) => m.active);

  const [visitType, setVisitType] = React.useState<FieldVisit['visitType']>('Doctor');
  const [visitName, setVisitName] = React.useState('');
  const [repName, setRepName] = React.useState(defaultRepName);
  const [repEmail, setRepEmail] = React.useState(defaultRepEmail);
  const [checkIn, setCheckIn] = React.useState<string>(() => {
    // local-time datetime-local format: YYYY-MM-DDTHH:MM
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [location, setLocation] = React.useState('');
  const [productsDetailed, setProductsDetailed] = React.useState('');
  const [samplesDistributed, setSamplesDistributed] = React.useState('');
  const [outcome, setOutcome] = React.useState('Productive');
  const [orderValue, setOrderValue] = React.useState('');
  const [notes, setNotes] = React.useState('');

  React.useEffect(() => {
    if (!open) return;
    setVisitType('Doctor');
    setVisitName('');
    setRepName(defaultRepName);
    setRepEmail(defaultRepEmail);
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    setCheckIn(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
    setLocation(''); setProductsDetailed(''); setSamplesDistributed('');
    setOutcome('Productive'); setOrderValue(''); setNotes('');
  }, [open, defaultRepName, defaultRepEmail]);

  const submit = () => {
    if (!visitName.trim()) { toast.error('Visit name is required'); return; }
    if (!repName.trim()) { toast.error('Rep name is required'); return; }
    const isoCheckIn = checkIn ? new Date(checkIn).toISOString() : new Date().toISOString();
    onSubmit({
      visitType,
      visitName: visitName.trim(),
      repName: repName.trim(),
      repEmail: repEmail.trim(),
      checkIn: isoCheckIn,
      location: location.trim() || undefined,
      productsDetailed: productsDetailed.trim() || undefined,
      samplesDistributed: samplesDistributed.trim() || undefined,
      outcome: outcome.trim() || undefined,
      orderValue: orderValue ? Number(orderValue) : undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Log Field Visit"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={submit}>Save Visit</Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Visit Type">
          <Select value={visitType} onValueChange={(v) => setVisitType(v as FieldVisit['visitType'])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {VISIT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Visit Name">
          <Input value={visitName} onChange={(e) => setVisitName(e.target.value)} placeholder="Dr. Rajesh Sharma / MedPlus Store" />
        </Field>
        <Field label="Rep (auto from current user)" className="col-span-2">
          <Select
            value={repEmail || 'me'}
            onValueChange={(v) => {
              const m = activeTeam.find((x) => x.email === v);
              if (m) { setRepEmail(m.email); setRepName(m.name); }
              else if (v === 'me') { setRepEmail(defaultRepEmail); setRepName(defaultRepName); }
            }}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="me">Me ({defaultRepName || 'current user'})</SelectItem>
              {activeTeam.filter((m) => m.email !== defaultRepEmail).map((m) => (
                <SelectItem key={m.id} value={m.email}>{m.name} · {m.dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Check-In Date & Time">
          <Input type="datetime-local" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
        </Field>
        <Field label="Location / Area">
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Andheri West, Mumbai" />
        </Field>
        <Field label="Products Detailed" className="col-span-2">
          <Input value={productsDetailed} onChange={(e) => setProductsDetailed(e.target.value)} placeholder="Brand A, Brand B" />
        </Field>
        <Field label="Samples Distributed" className="col-span-2">
          <Input value={samplesDistributed} onChange={(e) => setSamplesDistributed(e.target.value)} placeholder="Visual Aid x5, Cards x10" />
        </Field>
        <Field label="Outcome">
          <Select value={outcome} onValueChange={setOutcome}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {['Productive', 'Order Booked', 'Not Available', 'Follow Up', 'Cold Call'].map((o) => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Order Value (₹)">
          <Input type="number" min="0" value={orderValue} onChange={(e) => setOrderValue(e.target.value)} placeholder="0" />
        </Field>
        <Field label="Notes" className="col-span-2">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Conversation summary, objections, next steps…" rows={3} />
        </Field>
      </div>
    </Modal>
  );
}
