'use client';

import * as React from 'react';
import {
  Search, Building2, Phone, Mail, MapPin, Hash, CreditCard,
  Wallet, CalendarClock, Tag, Pencil, User, FileText, FolderOpen, Ticket, PhoneCall,
} from 'lucide-react';
import { toast } from 'sonner';
import { useERP } from '@/lib/erp/store';
import { Rs, fD, today, matchSearch } from '@/lib/erp/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { SectionHeader, Modal, Field, StatusBadge } from '../ui';
import type { CustomerGST } from '@/lib/erp/types';

const CUSTOMER_CATEGORIES = ['Pharma', 'Corporate', 'Retail', 'Distributor', 'Hospital', 'Generic', 'Walk-in'];

type DetailTab = 'leads' | 'quotations' | 'projects' | 'tickets' | 'calls';

export function Customer360() {
  const customerGst = useERP((s) => s.customerGst || []);
  const leads = useERP((s) => s.leads);
  const quotations = useERP((s) => s.quotations);
  const projects = useERP((s) => s.projects);
  const tickets = useERP((s) => s.tickets);
  const callLogs = useERP((s) => s.callLogs || []);
  const updateCustomerGst = useERP((s) => s.updateCustomerGst);

  const [search, setSearch] = React.useState('');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<DetailTab>('leads');
  const [editOpen, setEditOpen] = React.useState(false);

  // Pick first customer by default
  React.useEffect(() => {
    if (!selectedId && customerGst.length > 0) setSelectedId(customerGst[0].id);
  }, [customerGst, selectedId]);

  const filtered = customerGst.filter((c) =>
    matchSearch(`${c.id} ${c.name} ${c.companyName} ${c.gstin} ${c.city} ${c.state} ${c.contactPerson} ${c.email} ${c.phone}`, search),
  );

  const selected = customerGst.find((c) => c.id === selectedId) || null;

  // Related entities — match by client/customer name (loose contains)
  const clientName = selected?.name || '';
  const matchClient = (val: string) => {
    if (!clientName) return false;
    const a = clientName.toLowerCase().trim();
    const b = (val || '').toLowerCase().trim();
    if (!a || !b) return false;
    return a === b || a.includes(b) || b.includes(a);
  };

  const custLeads = leads.filter((l) => matchClient(l.client));
  const custQuotes = quotations.filter((q) => matchClient(q.client));
  const custProjects = projects.filter((p) => matchClient(p.client));
  const custTickets = tickets.filter((t) => t.relatedProject && projects.find((p) => p.id === t.relatedProject && matchClient(p.client)));
  const custCalls = callLogs.filter((c) => matchClient(c.customerName));

  const tabs: { k: DetailTab; label: string; count: number; icon: React.ReactNode }[] = [
    { k: 'leads', label: 'Leads', count: custLeads.length, icon: <User className="h-3.5 w-3.5" /> },
    { k: 'quotations', label: 'Quotations', count: custQuotes.length, icon: <FileText className="h-3.5 w-3.5" /> },
    { k: 'projects', label: 'Projects', count: custProjects.length, icon: <FolderOpen className="h-3.5 w-3.5" /> },
    { k: 'tickets', label: 'Tickets', count: custTickets.length, icon: <Ticket className="h-3.5 w-3.5" /> },
    { k: 'calls', label: 'Call Logs', count: custCalls.length, icon: <PhoneCall className="h-3.5 w-3.5" /> },
  ];

  return (
    <div>
      <SectionHeader
        title="Customer 360°"
        subtitle="Full customer profile — company, contact, GST, credit, and all related activity in one view."
        accent="emerald"
      />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        {/* ============ Left: Customer list ============ */}
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customers..."
                className="h-8 pl-8 text-xs"
              />
            </div>
            <div className="text-[10px] text-muted-foreground mt-2 font-semibold uppercase tracking-wider">
              {filtered.length} of {customerGst.length} customers
            </div>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground italic">No customers found</div>
            ) : filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => { setSelectedId(c.id); setTab('leads'); }}
                className={cn(
                  'w-full text-left p-3 border-b border-border/50 hover:bg-muted/40 transition-colors',
                  selectedId === c.id && 'bg-emerald-50 dark:bg-emerald-950/30 border-l-2 border-l-emerald-500',
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-[11px] font-black flex items-center justify-center flex-shrink-0">
                    {c.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-bold truncate">{c.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{c.city}, {c.state}</div>
                  </div>
                </div>
                {c.customerCategory && (
                  <div className="mt-1.5 ml-10">
                    <Badge variant="outline" className="text-[9px] font-bold">{c.customerCategory}</Badge>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ============ Right: Profile + tabs ============ */}
        <div>
          {!selected ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-sm text-muted-foreground">Select a customer to view their 360° profile.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Profile card */}
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-base font-black flex items-center justify-center flex-shrink-0">
                      {selected.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg font-black truncate">{selected.name}</h2>
                      <p className="text-xs text-muted-foreground truncate">{selected.companyName}</p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {selected.customerCategory && <Badge variant="outline" className="text-[9px] font-bold">{selected.customerCategory}</Badge>}
                        <Badge className="text-[9px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">{selected.registrationType}</Badge>
                        {selected.reverseCharge && <Badge className="text-[9px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">RCM</Badge>}
                        {selected.exportOrSez && <Badge className="text-[9px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">Export/SEZ</Badge>}
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="h-8" onClick={() => setEditOpen(true)}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <DetailItem icon={<Building2 className="h-3.5 w-3.5" />} label="Display Name" value={selected.name} />
                  <DetailItem icon={<Building2 className="h-3.5 w-3.5" />} label="Legal Company" value={selected.companyName} />
                  <DetailItem icon={<Hash className="h-3.5 w-3.5" />} label="GSTIN" value={selected.gstin || '—'} mono />
                  <DetailItem icon={<Phone className="h-3.5 w-3.5" />} label="Phone" value={selected.phone || '—'} />
                  <DetailItem icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={selected.email || '—'} />
                  <DetailItem icon={<User className="h-3.5 w-3.5" />} label="Contact Person" value={selected.contactPerson || '—'} />
                  <DetailItem icon={<MapPin className="h-3.5 w-3.5" />} label="Address" value={`${selected.address}${selected.address ? ', ' : ''}${selected.city}, ${selected.state} - ${selected.pincode}`} />
                  <DetailItem icon={<MapPin className="h-3.5 w-3.5" />} label="Place of Supply" value={selected.placeOfSupply || '—'} />
                  <DetailItem icon={<Tag className="h-3.5 w-3.5" />} label="Category" value={selected.customerCategory || '—'} />
                  <DetailItem icon={<CreditCard className="h-3.5 w-3.5" />} label="Credit Limit" value={selected.creditLimit ? Rs(selected.creditLimit) : '—'} />
                  <DetailItem
                    icon={<Wallet className="h-3.5 w-3.5" />}
                    label="Outstanding"
                    value={selected.outstanding ? Rs(selected.outstanding) : '—'}
                    tone={selected.outstanding && selected.creditLimit && selected.outstanding > selected.creditLimit ? 'danger' : 'default'}
                  />
                  <DetailItem icon={<CalendarClock className="h-3.5 w-3.5" />} label="Last Interaction" value={selected.lastInteraction ? fD(selected.lastInteraction) : '—'} />
                </div>

                {selected.customerNotes && (
                  <div className="mt-4 p-3 rounded-lg bg-muted/40 border border-border">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Notes</div>
                    <p className="text-xs text-foreground whitespace-pre-wrap">{selected.customerNotes}</p>
                  </div>
                )}
              </div>

              {/* Tabs */}
              <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="flex flex-wrap gap-1 p-2 border-b border-border bg-muted/30">
                  {tabs.map((t) => (
                    <button
                      key={t.k}
                      onClick={() => setTab(t.k)}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                        tab === t.k
                          ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                      )}
                    >
                      {t.icon} {t.label}
                      <span className={cn(
                        'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black',
                        tab === t.k ? 'bg-white/20' : 'bg-muted',
                      )}>
                        {t.count}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="p-3">
                  {tab === 'leads' && <RelatedLeads items={custLeads} />}
                  {tab === 'quotations' && <RelatedQuotations items={custQuotes} />}
                  {tab === 'projects' && <RelatedProjects items={custProjects} />}
                  {tab === 'tickets' && <RelatedTickets items={custTickets} />}
                  {tab === 'calls' && <RelatedCalls items={custCalls} />}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit modal */}
      {selected && (
        <EditCustomerModal
          open={editOpen}
          onOpenChange={setEditOpen}
          customer={selected}
          onSave={(patch) => {
            updateCustomerGst(selected.id, patch);
            toast.success('Customer updated');
            setEditOpen(false);
          }}
        />
      )}
    </div>
  );
}

function DetailItem({ icon, label, value, mono, tone = 'default' }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  tone?: 'default' | 'danger';
}) {
  return (
    <div className="p-2.5 rounded-lg bg-muted/30 border border-border/60">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
        {icon} {label}
      </div>
      <div className={cn(
        'text-xs font-bold break-words',
        mono && 'font-mono',
        tone === 'danger' && 'text-rose-600 dark:text-rose-400',
      )}>
        {value}
      </div>
    </div>
  );
}

// ============ Related entities tables ============

function EmptyRelated({ message }: { message: string }) {
  return (
    <div className="text-center py-10 text-sm text-muted-foreground italic">{message}</div>
  );
}

function RelatedLeads({ items }: { items: ReturnType<typeof useERP.getState>['leads'] }) {
  if (items.length === 0) return <EmptyRelated message="No leads for this customer." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[10px] font-bold uppercase text-muted-foreground border-b border-border">
            <th className="text-left p-2">ID</th>
            <th className="text-left p-2">Contact</th>
            <th className="text-left p-2">Requirement</th>
            <th className="text-left p-2">Stage</th>
            <th className="text-left p-2">Status</th>
            <th className="text-left p-2">Value</th>
          </tr>
        </thead>
        <tbody>
          {items.map((l) => (
            <tr key={l.id} className="border-b border-border/40 hover:bg-muted/30">
              <td className="p-2 font-bold">{l.id}</td>
              <td className="p-2">{l.contact}</td>
              <td className="p-2 max-w-[200px] truncate">{l.requirement}</td>
              <td className="p-2"><Badge variant="outline" className="text-[9px] font-bold">{l.leadStage || 'New'}</Badge></td>
              <td className="p-2"><StatusBadge status={l.status} /></td>
              <td className="p-2 font-bold text-emerald-700 dark:text-emerald-300">{l.expectedOrderValue ? Rs(l.expectedOrderValue) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RelatedQuotations({ items }: { items: ReturnType<typeof useERP.getState>['quotations'] }) {
  if (items.length === 0) return <EmptyRelated message="No quotations for this customer." />;
  const total = (q: typeof items[number]) => q.items.reduce((s, i) => s + i.qty * i.rate, 0);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[10px] font-bold uppercase text-muted-foreground border-b border-border">
            <th className="text-left p-2">ID</th>
            <th className="text-left p-2">Date</th>
            <th className="text-left p-2">Items</th>
            <th className="text-left p-2">Value</th>
            <th className="text-left p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((q) => (
            <tr key={q.id} className="border-b border-border/40 hover:bg-muted/30">
              <td className="p-2 font-bold">{q.id}</td>
              <td className="p-2">{fD(q.date)}</td>
              <td className="p-2">{q.items.length} item(s)</td>
              <td className="p-2 font-bold">{Rs(total(q))}</td>
              <td className="p-2"><StatusBadge status={q.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RelatedProjects({ items }: { items: ReturnType<typeof useERP.getState>['projects'] }) {
  if (items.length === 0) return <EmptyRelated message="No projects for this customer." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[10px] font-bold uppercase text-muted-foreground border-b border-border">
            <th className="text-left p-2">ID</th>
            <th className="text-left p-2">Title</th>
            <th className="text-left p-2">Stage</th>
            <th className="text-left p-2">Delivery</th>
            <th className="text-left p-2">Value</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.id} className="border-b border-border/40 hover:bg-muted/30">
              <td className="p-2 font-bold">{p.id}</td>
              <td className="p-2">{p.title}</td>
              <td className="p-2"><StatusBadge status={p.stage} /></td>
              <td className="p-2">{fD(p.delivery)}</td>
              <td className="p-2 font-bold">{Rs(p.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RelatedTickets({ items }: { items: ReturnType<typeof useERP.getState>['tickets'] }) {
  if (items.length === 0) return <EmptyRelated message="No tickets for this customer." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[10px] font-bold uppercase text-muted-foreground border-b border-border">
            <th className="text-left p-2">ID</th>
            <th className="text-left p-2">Subject</th>
            <th className="text-left p-2">Priority</th>
            <th className="text-left p-2">Status</th>
            <th className="text-left p-2">Created</th>
          </tr>
        </thead>
        <tbody>
          {items.map((t) => (
            <tr key={t.id} className="border-b border-border/40 hover:bg-muted/30">
              <td className="p-2 font-bold">{t.id}</td>
              <td className="p-2">{t.subject}</td>
              <td className="p-2"><Badge variant="outline" className="text-[9px] font-bold capitalize">{t.priority}</Badge></td>
              <td className="p-2"><StatusBadge status={t.status} /></td>
              <td className="p-2">{fD(t.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RelatedCalls({ items }: { items: NonNullable<ReturnType<typeof useERP.getState>['callLogs']> }) {
  if (items.length === 0) return <EmptyRelated message="No call logs for this customer." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[10px] font-bold uppercase text-muted-foreground border-b border-border">
            <th className="text-left p-2">At</th>
            <th className="text-left p-2">Type</th>
            <th className="text-left p-2">Direction</th>
            <th className="text-left p-2">Outcome</th>
            <th className="text-left p-2">Duration</th>
            <th className="text-left p-2">By</th>
            <th className="text-left p-2">Next</th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.id} className="border-b border-border/40 hover:bg-muted/30">
              <td className="p-2">{fD(c.at.split('T')[0])}</td>
              <td className="p-2 capitalize">{c.type}</td>
              <td className="p-2 capitalize">{c.direction || '—'}</td>
              <td className="p-2">{c.outcome || '—'}</td>
              <td className="p-2">{c.durationSec ? `${Math.floor(c.durationSec / 60)}m ${c.durationSec % 60}s` : '—'}</td>
              <td className="p-2">{c.by}</td>
              <td className="p-2">{c.nextCallDate ? fD(c.nextCallDate) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============ Edit Customer Modal ============

function EditCustomerModal({ open, onOpenChange, customer, onSave }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  customer: CustomerGST;
  onSave: (patch: Partial<CustomerGST>) => void;
}) {
  const [category, setCategory] = React.useState(customer.customerCategory || '');
  const [creditLimit, setCreditLimit] = React.useState<string>(customer.creditLimit?.toString() || '');
  const [notes, setNotes] = React.useState(customer.customerNotes || '');

  React.useEffect(() => {
    if (open) {
      setCategory(customer.customerCategory || '');
      setCreditLimit(customer.creditLimit?.toString() || '');
      setNotes(customer.customerNotes || '');
    }
  }, [open, customer]);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`Edit: ${customer.name}`}
      size="md"
      footer={<>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={() => onSave({
          customerCategory: category || undefined,
          creditLimit: creditLimit ? Number(creditLimit) : undefined,
          customerNotes: notes.trim() || undefined,
          lastInteraction: today(),
        })}>
          <Pencil className="h-4 w-4" /> Save Changes
        </Button>
      </>}
    >
      <Field label="Customer Category" desc="Pharma / Corporate / Retail / Distributor / etc.">
        <Select value={category || 'none'} onValueChange={(v) => setCategory(v === 'none' ? '' : v)}>
          <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— None —</SelectItem>
            {CUSTOMER_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Credit Limit (₹)" desc="Max outstanding allowed for this customer.">
        <Input type="number" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} placeholder="0" />
      </Field>
      <Field label="Customer Notes" desc="Internal notes — sales history, special terms, etc.">
        <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes..." />
      </Field>
    </Modal>
  );
}
