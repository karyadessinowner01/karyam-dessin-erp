'use client';

import * as React from 'react';
import {
  Phone, PhoneCall, PhoneIncoming, PhoneOutgoing, PhoneMissed, Calendar,
  Plus, Trash2, Phone as PhoneIcon, Users, CheckCircle2, XCircle, CalendarCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { useERP } from '@/lib/erp/store';
import { fD, matchSearch } from '@/lib/erp/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { SectionHeader, TableShell, Th, Td, EmptyState, Modal, Field, StatCard } from '../ui';
import type { CallLog } from '@/lib/erp/types';

const CALL_TYPES = ['call', 'meeting'] as const;
const DIRECTIONS = ['outgoing', 'incoming', 'missed'] as const;
const OUTCOMES = ['Connected', 'Busy', 'No Answer', 'Voicemail'] as const;

function fmtDuration(sec?: number): string {
  if (!sec) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function fmtDateTime(iso: string): string {
  if (!iso) return '—';
  const d = iso.split('T')[0];
  const t = iso.split('T')[1] || '';
  return `${fD(d)}${t ? ' ' + t.slice(0, 5) : ''}`;
}

const OUTCOME_BADGE: Record<string, string> = {
  Connected: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  Busy: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  'No Answer': 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  Voicemail: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
};

const DIRECTION_ICON: Record<string, React.ReactNode> = {
  outgoing: <PhoneOutgoing className="h-3.5 w-3.5 text-emerald-500" />,
  incoming: <PhoneIncoming className="h-3.5 w-3.5 text-blue-500" />,
  missed: <PhoneMissed className="h-3.5 w-3.5 text-rose-500" />,
};

export function CallManagement() {
  const callLogs = useERP((s) => s.callLogs || []);
  const currentUser = useERP((s) => s.currentUser);
  const team = useERP((s) => s.team);
  const createCallLog = useERP((s) => s.createCallLog);
  const deleteCallLog = useERP((s) => s.deleteCallLog);

  const [search, setSearch] = React.useState('');
  const [outcomeFilter, setOutcomeFilter] = React.useState<string>('all');
  const [typeFilter, setTypeFilter] = React.useState<string>('all');
  const [showNew, setShowNew] = React.useState(false);

  // Sort by most recent first
  const sorted = [...callLogs].sort((a, b) => (b.at || '').localeCompare(a.at || ''));

  const filtered = sorted.filter((c) => {
    if (!matchSearch(`${c.id} ${c.customerName} ${c.phone} ${c.by} ${c.notes || ''}`, search)) return false;
    if (outcomeFilter !== 'all' && (c.outcome || '') !== outcomeFilter) return false;
    if (typeFilter !== 'all' && c.type !== typeFilter) return false;
    return true;
  });

  // Stats
  const totalCalls = callLogs.length;
  const connected = callLogs.filter((c) => c.outcome === 'Connected').length;
  const noAnswer = callLogs.filter((c) => c.outcome === 'No Answer').length;
  const meetings = callLogs.filter((c) => c.type === 'meeting').length;

  const handleDelete = (id: string) => {
    deleteCallLog(id);
    toast.success('Call log deleted');
  };

  return (
    <div>
      <SectionHeader
        title="Call Management"
        subtitle="Log every call & meeting — click-to-call directly from the list."
        accent="blue"
        actions={
          <Button onClick={() => setShowNew(true)} className="h-9 bg-slate-900 hover:bg-slate-800">
            <Plus className="h-4 w-4" /> Log Call
          </Button>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Calls" value={totalCalls} tone="primary" icon={<PhoneCall className="h-4 w-4" />} />
        <StatCard label="Connected" value={connected} tone="accent" icon={<CheckCircle2 className="h-4 w-4" />} />
        <StatCard label="No Answer" value={noAnswer} tone={noAnswer > 0 ? 'danger' : 'default'} icon={<XCircle className="h-4 w-4" />} />
        <StatCard label="Meetings" value={meetings} tone={meetings > 0 ? 'warn' : 'default'} icon={<Users className="h-4 w-4" />} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-xl border border-border bg-muted/30">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Outcome:</span>
        <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Outcomes</SelectItem>
            {OUTCOMES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-2">Type:</span>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="call">Call</SelectItem>
            <SelectItem value="meeting">Meeting</SelectItem>
          </SelectContent>
        </Select>
        {(outcomeFilter !== 'all' || typeFilter !== 'all' || search) && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setOutcomeFilter('all'); setTypeFilter('all'); setSearch(''); }}>Clear</Button>
        )}
        <span className="text-xs text-muted-foreground ml-auto">Showing {filtered.length} of {callLogs.length}</span>
      </div>

      <TableShell title="Call Logs" search={search} onSearch={setSearch}>
        <thead>
          <tr>
            <Th>Customer</Th>
            <Th>Phone</Th>
            <Th>Type</Th>
            <Th>Direction</Th>
            <Th>Outcome</Th>
            <Th>Duration</Th>
            <Th>By</Th>
            <Th>At</Th>
            <Th>Next Call</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <EmptyState icon={<Phone className="h-8 w-8" />} message="No call logs yet — click 'Log Call' to add one." />
          ) : filtered.map((c) => (
            <tr key={c.id} className="hover:bg-muted/30">
              <Td>
                <div className="font-bold">{c.customerName}</div>
                {c.notes && <div className="text-[10px] text-muted-foreground truncate max-w-[200px]">{c.notes}</div>}
              </Td>
              <Td className="font-mono text-xs">{c.phone || '—'}</Td>
              <Td>
                {c.type === 'meeting' ? (
                  <Badge className="text-[9px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"><Users className="h-2.5 w-2.5 mr-1" />Meeting</Badge>
                ) : (
                  <Badge className="text-[9px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"><PhoneIcon className="h-2.5 w-2.5 mr-1" />Call</Badge>
                )}
              </Td>
              <Td>
                <div className="flex items-center gap-1">
                  {DIRECTION_ICON[c.direction || 'outgoing']}
                  <span className="text-[11px] capitalize">{c.direction || '—'}</span>
                </div>
              </Td>
              <Td>
                {c.outcome ? (
                  <Badge className={cn('text-[9px] font-bold', OUTCOME_BADGE[c.outcome] || 'bg-slate-100 text-slate-700')}>{c.outcome}</Badge>
                ) : <span className="text-muted-foreground text-xs">—</span>}
              </Td>
              <Td className="text-xs">{fmtDuration(c.durationSec)}</Td>
              <Td className="text-xs">{c.by}</Td>
              <Td className="text-xs">{fmtDateTime(c.at)}</Td>
              <Td className="text-xs">
                {c.nextCallDate ? (
                  <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300 font-bold">
                    <CalendarCheck className="h-3 w-3" /> {fD(c.nextCallDate)}
                  </span>
                ) : <span className="text-muted-foreground">—</span>}
              </Td>
              <Td>
                <div className="flex items-center gap-1">
                  {c.phone && (
                    <a href={`tel:${c.phone}`} onClick={() => toast.success(`Calling ${c.phone}...`)}>
                      <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-300 dark:border-emerald-900 dark:hover:bg-emerald-950/30">
                        <Phone className="h-3 w-3" /> Call
                      </Button>
                    </a>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-red-500 hover:bg-red-50"
                    onClick={() => handleDelete(c.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </TableShell>

      <NewCallModal
        open={showNew}
        onOpenChange={setShowNew}
        team={team}
        defaultBy={currentUser?.name || 'Unknown'}
        onCreate={(data) => {
          createCallLog(data);
          toast.success('Call logged!');
          setShowNew(false);
        }}
      />
    </div>
  );
}

function NewCallModal({ open, onOpenChange, onCreate, team, defaultBy }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (data: Omit<CallLog, 'id' | 'at' | 'by'>) => void;
  team: ReturnType<typeof useERP.getState>['team'];
  defaultBy: string;
}) {
  const [customerName, setCustomerName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [type, setType] = React.useState<'call' | 'meeting'>('call');
  const [direction, setDirection] = React.useState<'outgoing' | 'incoming' | 'missed'>('outgoing');
  const [outcome, setOutcome] = React.useState<'Connected' | 'Busy' | 'No Answer' | 'Voicemail'>('Connected');
  const [durationMin, setDurationMin] = React.useState('');
  const [durationSec, setDurationSec] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [nextCallDate, setNextCallDate] = React.useState('');

  // Suggest phone from team when name matches
  React.useEffect(() => {
    if (!open) return;
    setCustomerName(''); setPhone(''); setType('call'); setDirection('outgoing');
    setOutcome('Connected'); setDurationMin(''); setDurationSec(''); setNotes(''); setNextCallDate('');
  }, [open]);

  const submit = () => {
    if (!customerName.trim()) { toast.error('Customer name is required'); return; }
    if (type === 'call' && !phone.trim()) { toast.error('Phone is required for a call'); return; }
    const min = parseInt(durationMin || '0', 10) || 0;
    const sec = parseInt(durationSec || '0', 10) || 0;
    onCreate({
      customerName: customerName.trim(),
      phone: phone.trim(),
      type,
      direction: type === 'meeting' ? undefined : direction,
      outcome: type === 'meeting' ? undefined : outcome,
      durationSec: min * 60 + sec,
      notes: notes.trim() || undefined,
      nextCallDate: nextCallDate || undefined,
    });
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Log Call / Meeting"
      size="lg"
      footer={<>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button className="bg-blue-500 hover:bg-blue-600" onClick={submit}>
          <PhoneCall className="h-4 w-4" /> Log Call
        </Button>
      </>}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Customer Name">
          <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="SunPharma Ltd" list="team-list" />
          <datalist id="team-list">
            {team.map((m) => <option key={m.id} value={m.name} />)}
          </datalist>
        </Field>
        <Field label="Phone" desc="Required for calls.">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" />
        </Field>
        <Field label="Type">
          <Select value={type} onValueChange={(v) => setType(v as 'call' | 'meeting')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="call">Call</SelectItem>
              <SelectItem value="meeting">Meeting</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        {type === 'call' ? (
          <>
            <Field label="Direction">
              <Select value={direction} onValueChange={(v) => setDirection(v as typeof direction)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIRECTIONS.map((d) => <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Outcome">
              <Select value={outcome} onValueChange={(v) => setOutcome(v as typeof outcome)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OUTCOMES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </>
        ) : (
          <Field label="Outcome" desc="Auto-marked as 'Connected' for meetings.">
            <Input value="Connected" disabled />
          </Field>
        )}
        <Field label="Duration (minutes)" className="col-span-2">
          <div className="flex items-center gap-2">
            <Input type="number" min="0" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} placeholder="0" className="w-28" />
            <span className="text-xs font-bold text-muted-foreground">min</span>
            <Input type="number" min="0" max="59" value={durationSec} onChange={(e) => setDurationSec(e.target.value)} placeholder="0" className="w-28" />
            <span className="text-xs font-bold text-muted-foreground">sec</span>
          </div>
        </Field>
        <Field label="Next Call Date" className="col-span-2">
          <Input type="date" value={nextCallDate} onChange={(e) => setNextCallDate(e.target.value)} />
        </Field>
      </div>
      <Field label="Notes">
        <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Call summary, action items..." />
      </Field>
    </Modal>
  );
}
