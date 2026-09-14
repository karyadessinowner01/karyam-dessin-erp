'use client';

import * as React from 'react';
import { Plus, Eye, Trash2, UserPlus, ArrowRight, Check, Hand as HandIcon, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useERP } from '@/lib/erp/store';
import { LEAD_SOURCES, LEAD_CATEGORIES, LEAD_PRIORITIES, LEAD_STAGES } from '@/lib/erp/constants';
import { fD, today, matchSearch, Rs } from '@/lib/erp/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  SectionHeader, TableShell, Th, Td, EmptyState, StatusBadge,
  Modal, ConfirmDialog, Field, StatCard,
} from '../ui';
import type { Lead } from '@/lib/erp/types';

const LEAD_STATUSES = ['New', 'Follow Up', 'Quotation Sent', 'Won', 'Lost'];

/** Priority colour dots — red=Hot, orange=Warm, blue=Cold. */
const PRIORITY_DOT: Record<string, string> = {
  Hot: 'bg-rose-500',
  Warm: 'bg-amber-500',
  Cold: 'bg-blue-500',
};

const PRIORITY_BADGE: Record<string, string> = {
  Hot: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  Warm: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  Cold: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
};

export function Leads() {
  const leads = useERP((s) => s.leads);
  const currentUser = useERP((s) => s.currentUser);
  const createLead = useERP((s) => s.createLead);
  const updateLeadStatus = useERP((s) => s.updateLeadStatus);
  const convertLead = useERP((s) => s.convertLead);
  const deleteLead = useERP((s) => s.deleteLead);
  const assignLead = useERP((s) => s.assignLead);
  const team = useERP((s) => s.team);

  const isOwner = currentUser?.role === 'owner';
  const canCreate = isOwner || currentUser?.role === 'management' || currentUser?.role === 'marketing';

  const [search, setSearch] = React.useState('');
  const [showNew, setShowNew] = React.useState(false);
  const [view, setView] = React.useState<Lead | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<Lead | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all');
  const [assignFilter, setAssignFilter] = React.useState<string>('all'); // 'all' | 'mine' | 'unassigned' | <email>
  const [priorityFilter, setPriorityFilter] = React.useState<string>('all'); // 'all' | 'Hot' | 'Warm' | 'Cold'
  const csvInputRef = React.useRef<HTMLInputElement>(null);

  const filtered = leads.filter((l) => {
    if (!matchSearch(`${l.id} ${l.client} ${l.contact} ${l.source} ${l.status} ${l.category || ''} ${l.assignedToName || ''}`, search)) return false;
    if (statusFilter !== 'all' && l.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && (l.category || 'Uncategorized') !== categoryFilter) return false;
    if (priorityFilter !== 'all' && l.priority !== priorityFilter) return false;
    if (assignFilter === 'mine') {
      if (!l.assignedTo || l.assignedTo.toLowerCase() !== (currentUser?.email || '').toLowerCase()) return false;
    } else if (assignFilter === 'unassigned') {
      if (l.assignedTo) return false;
    } else if (assignFilter !== 'all') {
      if (!l.assignedTo || l.assignedTo.toLowerCase() !== assignFilter.toLowerCase()) return false;
    }
    return true;
  });

  const stats: Record<string, number> = { total: leads.length };
  leads.forEach((l) => { stats[l.status] = (stats[l.status] || 0) + 1; });
  const myLeadCount = leads.filter((l) => l.assignedTo && l.assignedTo.toLowerCase() === (currentUser?.email || '').toLowerCase()).length;
  const activeTeam = team.filter((m) => m.active);

  /** Returns true if a lead with the same phone (last 10 digits) already exists. */
  const isDuplicatePhone = (phone: string) => {
    const last10 = (phone || '').replace(/\D/g, '').slice(-10);
    if (last10.length !== 10) return false;
    return leads.some((l) => (l.phone || '').replace(/\D/g, '').slice(-10) === last10);
  };

  /** CSV import handler — parses a .csv file (client,contact,phone,email,source,requirement,category) and bulk-creates leads. */
  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length === 0) { toast.error('CSV is empty'); return; }
      // Detect + skip header row if it looks like one
      const header = lines[0].toLowerCase();
      const hasHeader = header.includes('client') && header.includes('contact');
      const rows = hasHeader ? lines.slice(1) : lines;
      let imported = 0;
      let duplicates = 0;
      rows.forEach((line) => {
        const cells = line.split(',').map((c) => c.trim());
        const [client, contact, phone, email, source, requirement, category] = cells;
        if (!client || !contact) return; // skip empty rows
        if (isDuplicatePhone(phone)) duplicates++;
        createLead({
          client, contact, phone: phone || '', email: email || '',
          source: source || 'Referral', category: category || 'General',
          requirement: requirement || '', followup: today(),
          leadStage: 'New',
        });
        imported++;
      });
      if (imported > 0) {
        toast.success(`${imported} lead${imported !== 1 ? 's' : ''} imported`, {
          description: duplicates > 0
            ? `${duplicates} duplicate phone${duplicates !== 1 ? 's' : ''} detected — created anyway.`
            : undefined,
        });
      } else {
        toast.error('No valid rows found in CSV');
      }
      if (csvInputRef.current) csvInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <SectionHeader
        title="Leads"
        accent="emerald"
        actions={canCreate && (
          <>
            <input
              type="file"
              accept=".csv,text/csv"
              ref={csvInputRef}
              className="hidden"
              onChange={handleCsvImport}
            />
            <Button variant="outline" onClick={() => csvInputRef.current?.click()} className="h-9">
              <Upload className="h-4 w-4" /> CSV Import
            </Button>
            <Button onClick={() => setShowNew(true)} className="h-9 bg-slate-900 hover:bg-slate-800">
              <Plus className="h-4 w-4" /> New Lead
            </Button>
          </>
        )}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        <StatCard label="Total" value={stats.total} tone="primary" />
        <StatCard label="New" value={stats.New || 0} />
        <StatCard label="Follow Up" value={stats['Follow Up'] || 0} />
        <StatCard label="Quote Sent" value={stats['Quotation Sent'] || 0} />
        <StatCard label="Won" value={stats.Won || 0} tone="accent" />
        <StatCard label="My Leads" value={myLeadCount} tone={myLeadCount > 0 ? 'accent' : 'default'} />
      </div>

      {/* ===== Status + Category + Assigned filters ===== */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Status:</span>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {LEAD_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-2">Category:</span>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {LEAD_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
            <SelectItem value="Uncategorized">Uncategorized</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-2">Priority:</span>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            {LEAD_PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                <span className="inline-flex items-center gap-1.5">
                  <span className={cn('h-2 w-2 rounded-full', PRIORITY_DOT[p])} /> {p}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-2">Assigned:</span>
        <Select value={assignFilter} onValueChange={setAssignFilter}>
          <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Everyone</SelectItem>
            <SelectItem value="mine">Assigned to me</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {activeTeam.map((m) => (
              <SelectItem key={m.id} value={m.email}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(statusFilter !== 'all' || categoryFilter !== 'all' || assignFilter !== 'all' || priorityFilter !== 'all') && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setStatusFilter('all'); setCategoryFilter('all'); setAssignFilter('all'); setPriorityFilter('all'); }}>Clear</Button>
        )}
        <span className="text-xs text-muted-foreground ml-auto">Showing {filtered.length} of {leads.length}</span>
      </div>

      <TableShell title="All Leads" search={search} onSearch={setSearch}>
        <thead>
          <tr><Th>ID</Th><Th>Client</Th><Th>Contact</Th><Th>Source</Th><Th>Category</Th><Th>Priority</Th><Th>Assigned To</Th><Th className="text-right">Expected Value</Th><Th>Requirement</Th><Th>Status</Th><Th>Followup</Th><Th>Actions</Th></tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <EmptyState icon={<UserPlus className="h-8 w-8" />} message="No leads yet" />
          ) : filtered.map((l) => {
            const isMine = l.assignedTo && l.assignedTo.toLowerCase() === (currentUser?.email || '').toLowerCase();
            const canPick = canCreate && !isMine;
            return (
            <tr key={l.id} className="hover:bg-muted/30">
              <Td><strong>{l.id}</strong></Td>
              <Td>
                <div className="flex items-center gap-1.5">
                  <span>{l.client}</span>
                </div>
              </Td>
              <Td>{l.contact}</Td>
              <Td>{l.source}</Td>
              <Td>{l.category ? <Badge variant="outline" className="text-[10px] font-bold">{l.category}</Badge> : <span className="text-muted-foreground text-xs">—</span>}</Td>
              <Td>
                {l.priority ? (
                  <Badge className={cn('text-[10px] font-bold gap-1', PRIORITY_BADGE[l.priority])}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', PRIORITY_DOT[l.priority])} /> {l.priority}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </Td>
              <Td>
                {l.assignedToName ? (
                  <Badge className={cn('text-[10px] font-bold', isMine ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300')}>
                    {isMine ? 'Me' : l.assignedToName}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-xs italic">Unassigned</span>
                )}
              </Td>
              <Td className="text-right tabular-nums">
                {l.expectedOrderValue != null && l.expectedOrderValue > 0 ? (
                  <span className="text-xs font-bold">{Rs(l.expectedOrderValue)}</span>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </Td>
              <Td className="max-w-[200px] truncate">{l.requirement}</Td>
              <Td><StatusBadge status={l.status} /></Td>
              <Td>{fD(l.followup)}</Td>
              <Td>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setView(l)}><Eye className="h-3.5 w-3.5" /></Button>
                  {canPick && (
                    <Button size="sm" className="h-7 px-2 text-[10px] bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => { assignLead(l.id, currentUser!.email); toast.success(`Lead ${l.id} picked by you`); }} title="Pick this lead (assign to me)">
                      <HandIcon /> Pick
                    </Button>
                  )}
                  {isOwner && (
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50" onClick={() => setConfirmDelete(l)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </Td>
            </tr>
            );
          })}
        </tbody>
      </TableShell>

      {/* New lead modal */}
      <NewLeadModal open={showNew} onOpenChange={setShowNew} onCreate={(data) => {
        // Duplicate detection (last 10 digits of phone) — warn but still create
        if (isDuplicatePhone(data.phone)) {
          toast.warning('Duplicate phone number detected', {
            description: 'A lead with this phone already exists — creating anyway.',
          });
        } else {
          toast.success('Lead added!');
        }
        createLead(data);
        setShowNew(false);
      }} />

      {/* View modal */}
      {view && (
        <Modal open onOpenChange={() => setView(null)} title={`Lead: ${view.id}`} size="lg"
          footer={<>
            <Button variant="outline" onClick={() => setView(null)}>Close</Button>
            <div className="flex-1" />
            {canCreate && view.status !== 'Won' && (
              <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={() => {
                convertLead(view.id);
                toast.success('Converted to project!');
                setView(null);
              }}>
                <ArrowRight className="h-4 w-4" /> Convert to Project
              </Button>
            )}
            {isOwner && (
              <Button variant="destructive" onClick={() => { setConfirmDelete(view); setView(null); }}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            )}
          </>}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3.5 rounded-xl border border-border bg-muted/30 mb-3">
            <div><div className="text-[10px] font-bold uppercase text-muted-foreground">Client</div><div className="text-sm font-bold">{view.client}</div></div>
            <div><div className="text-[10px] font-bold uppercase text-muted-foreground">Contact</div><div className="text-sm font-bold">{view.contact}</div></div>
            <div><div className="text-[10px] font-bold uppercase text-muted-foreground">Phone</div><div className="text-sm font-bold">{view.phone || '-'}</div></div>
            <div><div className="text-[10px] font-bold uppercase text-muted-foreground">Email</div><div className="text-sm font-bold truncate">{view.email || '-'}</div></div>
            <div><div className="text-[10px] font-bold uppercase text-muted-foreground">Source</div><div className="text-sm font-bold">{view.source}</div></div>
            <div><div className="text-[10px] font-bold uppercase text-muted-foreground">Category</div><div className="text-sm font-bold">{view.category || '—'}</div></div>
            <div><div className="text-[10px] font-bold uppercase text-muted-foreground">Assigned To</div><div className="text-sm font-bold">{view.assignedToName ? (view.assignedTo?.toLowerCase() === (currentUser?.email || '').toLowerCase() ? 'Me' : view.assignedToName) : <span className="text-muted-foreground italic">Unassigned</span>}</div></div>
            <div><div className="text-[10px] font-bold uppercase text-muted-foreground">Requirement</div><div className="text-sm font-bold">{view.requirement}</div></div>
            <div><div className="text-[10px] font-bold uppercase text-muted-foreground">Status</div><div><StatusBadge status={view.status} /></div></div>
            <div><div className="text-[10px] font-bold uppercase text-muted-foreground">Follow Up</div><div className="text-sm font-bold">{fD(view.followup)}</div></div>
          </div>
          {/* ===== Pipeline & priority details ===== */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3.5 rounded-xl border border-border bg-muted/30 mb-3">
            <div><div className="text-[10px] font-bold uppercase text-muted-foreground">Priority</div><div className="text-sm font-bold flex items-center gap-1.5">{view.priority ? <><span className={cn('h-2.5 w-2.5 rounded-full', PRIORITY_DOT[view.priority])} />{view.priority}</> : <span className="text-muted-foreground">—</span>}</div></div>
            <div><div className="text-[10px] font-bold uppercase text-muted-foreground">Expected Order Value</div><div className="text-sm font-bold">{view.expectedOrderValue != null && view.expectedOrderValue > 0 ? Rs(view.expectedOrderValue) : <span className="text-muted-foreground">—</span>}</div></div>
            <div><div className="text-[10px] font-bold uppercase text-muted-foreground">Lead Score</div><div className="text-sm font-bold">{view.leadScore != null ? `${view.leadScore}/100` : <span className="text-muted-foreground">—</span>}</div></div>
            <div><div className="text-[10px] font-bold uppercase text-muted-foreground">Win Probability</div><div className="text-sm font-bold">{view.winProbability != null ? `${view.winProbability}%` : <span className="text-muted-foreground">—</span>}</div></div>
            <div><div className="text-[10px] font-bold uppercase text-muted-foreground">Lead Stage</div><div className="text-sm font-bold">{view.leadStage || 'New'}</div></div>
            <div><div className="text-[10px] font-bold uppercase text-muted-foreground">Expected Close Date</div><div className="text-sm font-bold">{view.expectedCloseDate ? fD(view.expectedCloseDate) : <span className="text-muted-foreground">—</span>}</div></div>
            <div><div className="text-[10px] font-bold uppercase text-muted-foreground">City</div><div className="text-sm font-bold">{view.city || <span className="text-muted-foreground">—</span>}</div></div>
            <div><div className="text-[10px] font-bold uppercase text-muted-foreground">State</div><div className="text-sm font-bold">{view.state || <span className="text-muted-foreground">—</span>}</div></div>
            {view.status === 'Lost' && view.lostReason && (
              <div className="col-span-2 md:col-span-4"><div className="text-[10px] font-bold uppercase text-muted-foreground">Lost Reason</div><div className="text-sm font-bold text-rose-600">{view.lostReason}</div></div>
            )}
          </div>
          <Field label="Update Status">
            <Select value={view.status} onValueChange={(v) => { updateLeadStatus(view.id, v); setView({ ...view, status: v }); toast.success('Status updated'); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['New', 'Follow Up', 'Quotation Sent', 'Won', 'Lost'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          {/* Assign To — manual pick / reassign */}
          <Field label="Assign To (Pick Lead)" desc="Pick this lead for yourself or assign it to a team member.">
            <div className="flex items-center gap-2">
              <Select value={view.assignedTo || 'none'} onValueChange={(v) => {
                const email = v === 'none' ? '' : v;
                assignLead(view.id, email);
                setView({ ...view, assignedTo: email || undefined, assignedToName: email ? (team.find((m) => m.email === email)?.name || email) : undefined });
                toast.success(email ? `Lead assigned to ${team.find((m) => m.email === email)?.name || email}` : 'Lead unassigned');
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  <SelectItem value={currentUser?.email || 'me'}>Me ({currentUser?.name || 'me'})</SelectItem>
                  {activeTeam.filter((m) => m.email !== currentUser?.email).map((m) => (
                    <SelectItem key={m.id} value={m.email}>{m.name} · {m.dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {canCreate && view.assignedTo?.toLowerCase() !== (currentUser?.email || '').toLowerCase().toLowerCase() && (
                <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 flex-shrink-0" onClick={() => {
                  assignLead(view.id, currentUser!.email);
                  setView({ ...view, assignedTo: currentUser!.email, assignedToName: currentUser!.name });
                  toast.success('Lead picked by you!');
                }}>
                  <HandIcon className="h-3.5 w-3.5 mr-1" /> Pick for me
                </Button>
              )}
            </div>
          </Field>
          <Field label="Notes">
            <div className="p-2.5 rounded-lg bg-muted/50 text-xs text-muted-foreground">{view.notes || 'No notes'}</div>
          </Field>
        </Modal>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title="Delete Lead?"
        message="Permanent delete hoga. (Moved to Recycle Bin — admin can restore.)"
        confirmLabel="Delete"
        onConfirm={() => { if (confirmDelete) { deleteLead(confirmDelete.id); toast.error('Lead deleted'); } }}
      />
    </div>
  );
}

function NewLeadModal({ open, onOpenChange, onCreate }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (data: Omit<Lead, 'id' | 'createdAt' | 'status'>) => void;
}) {
  const [client, setClient] = React.useState('');
  const [contact, setContact] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [source, setSource] = React.useState('Referral');
  const [category, setCategory] = React.useState('General');
  const [followup, setFollowup] = React.useState(today());
  const [requirement, setRequirement] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [priority, setPriority] = React.useState<Lead['priority']>('Warm');
  const [expectedOrderValue, setExpectedOrderValue] = React.useState('');
  const [city, setCity] = React.useState('');
  const [state, setState] = React.useState('');
  const [leadStage, setLeadStage] = React.useState<Lead['leadStage']>('New');

  const submit = () => {
    if (!client.trim() || !contact.trim()) { toast.error('Client aur Contact zaroori'); return; }
    onCreate({
      client: client.trim(), contact: contact.trim(), phone, email, source, category,
      requirement: requirement.trim(), followup, notes: notes.trim(),
      priority, leadStage, city: city.trim() || undefined, state: state.trim() || undefined,
      expectedOrderValue: expectedOrderValue ? Number(expectedOrderValue) : undefined,
    });
    setClient(''); setContact(''); setPhone(''); setEmail(''); setRequirement(''); setNotes('');
    setExpectedOrderValue(''); setCity(''); setState('');
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="New Lead" size="lg"
      footer={<><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={submit}>Add Lead</Button></>}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Client"><Input value={client} onChange={(e) => setClient(e.target.value)} placeholder="SunPharma" /></Field>
        <Field label="Contact"><Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Rajesh" /></Field>
        <Field label="Phone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" /></Field>
        <Field label="Email"><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="rajesh@sun.com" /></Field>
        <Field label="Source">
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{LEAD_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Category">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{LEAD_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Priority">
          <Select value={priority || 'Warm'} onValueChange={(v) => setPriority(v as Lead['priority'])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LEAD_PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  <span className="inline-flex items-center gap-1.5">
                    <span className={cn('h-2 w-2 rounded-full', PRIORITY_DOT[p])} /> {p}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Lead Stage">
          <Select value={leadStage || 'New'} onValueChange={(v) => setLeadStage(v as Lead['leadStage'])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{LEAD_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Expected Order Value (₹)"><Input type="number" min="0" value={expectedOrderValue} onChange={(e) => setExpectedOrderValue(e.target.value)} placeholder="50000" /></Field>
        <Field label="City"><Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Mumbai" /></Field>
        <Field label="State"><Input value={state} onChange={(e) => setState(e.target.value)} placeholder="Maharashtra" /></Field>
        <Field label="Follow Up"><Input type="date" value={followup} onChange={(e) => setFollowup(e.target.value)} /></Field>
      </div>
      <Field label="Requirement"><Input value={requirement} onChange={(e) => setRequirement(e.target.value)} placeholder="Visual Aid, Cards" /></Field>
      <Field label="Notes"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes..." /></Field>
    </Modal>
  );
}
