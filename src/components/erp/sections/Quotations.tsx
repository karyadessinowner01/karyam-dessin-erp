'use client';

import * as React from 'react';
import { Plus, Eye, Trash2, FileText, Send, Check, X, Pencil, Receipt, IndianRupee, ArrowRight, Printer, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useERP } from '@/lib/erp/store';
import { Rs, fD, today, matchSearch } from '@/lib/erp/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  SectionHeader, TableShell, Th, Td, EmptyState, StatusBadge,
  Modal, ConfirmDialog, Field, StatCard,
} from '../ui';
import { PAYMENT_MODES } from '@/lib/erp/constants';
import type { Quotation, QuotationItem } from '@/lib/erp/types';

const QUOTATION_STATUSES = ['Draft', 'Sent', 'Approved', 'Rejected'];

export function Quotations() {
  const quotations = useERP((s) => s.quotations);
  const items = useERP((s) => s.items);
  const currentUser = useERP((s) => s.currentUser);
  const createQuotation = useERP((s) => s.createQuotation);
  const updateQuotation = useERP((s) => s.updateQuotation);
  const updateQuotationStatus = useERP((s) => s.updateQuotationStatus);
  const deleteQuotation = useERP((s) => s.deleteQuotation);
  const convertQuotationToProject = useERP((s) => s.convertQuotationToProject);
  const sendWhatsAppMessage = useERP((s) => s.sendWhatsAppMessage);

  const isOwner = currentUser?.role === 'owner';
  const canCreate = isOwner || currentUser?.role === 'management' || currentUser?.role === 'finance' || currentUser?.role === 'marketing';

  const [search, setSearch] = React.useState('');
  const [showNew, setShowNew] = React.useState(false);
  const [view, setView] = React.useState<Quotation | null>(null);
  const [editTarget, setEditTarget] = React.useState<Quotation | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<Quotation | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<string>('all');

  // Subscribe to live updates of the viewed quotation
  const viewLive = view ? useERP.getState().quotations.find((q) => q.id === view.id) || view : null;

  const filtered = quotations.filter((q) => {
    if (!matchSearch(`${q.id} ${q.client} ${q.status}`, search)) return false;
    if (statusFilter !== 'all' && q.status !== statusFilter) return false;
    return true;
  });

  const stats: Record<string, number> = { total: quotations.length };
  quotations.forEach((q) => { stats[q.status] = (stats[q.status] || 0) + 1; });

  return (
    <div>
      <SectionHeader
        title="Quotations"
        subtitle="Create quotations with optional GST + advance payment (auto-converts to project)."
        accent="emerald"
        actions={canCreate && (
          <Button onClick={() => setShowNew(true)} className="h-9 bg-slate-900 hover:bg-slate-800">
            <Plus className="h-4 w-4" /> New Quotation
          </Button>
        )}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-5">
        <StatCard label="Total" value={stats.total} tone="primary" />
        <StatCard label="Draft" value={stats.Draft || 0} />
        <StatCard label="Sent" value={stats.Sent || 0} />
        <StatCard label="Approved" value={stats.Approved || 0} tone="accent" />
        {stats.Rejected ? <StatCard label="Rejected" value={stats.Rejected} tone="danger" /> : null}
      </div>

      {/* ===== Status filter ===== */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Filter by Status:</span>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {QUOTATION_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {statusFilter !== 'all' && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setStatusFilter('all')}>Clear</Button>
        )}
        <span className="text-xs text-muted-foreground ml-auto">Showing {filtered.length} of {quotations.length}</span>
      </div>

      <TableShell title="All Quotations" search={search} onSearch={setSearch}>
        <thead>
          <tr><Th>ID</Th><Th>Client</Th><Th>Date</Th><Th>GST</Th><Th>Subtotal</Th><Th>GST</Th><Th>Total</Th><Th>Advance</Th><Th>Status</Th><Th>Actions</Th></tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <EmptyState icon={<FileText className="h-8 w-8" />} message="No quotations" />
          ) : filtered.map((q) => {
            const sub = q.items.reduce((s, i) => s + i.qty * i.rate, 0);
            const gst = q.gstEnabled !== false ? Math.round(sub * 0.18) : 0;
            const tot = sub + gst;
            return (
              <tr key={q.id} className="hover:bg-muted/30">
                <Td><strong>{q.id}</strong></Td>
                <Td className="font-semibold">{q.client}</Td>
                <Td>{fD(q.date)}</Td>
                <Td>
                  {q.gstEnabled !== false ? (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-emerald-500">+GST 18%</span>
                  ) : (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">No GST</span>
                  )}
                </Td>
                <Td>{Rs(sub)}</Td>
                <Td className="text-muted-foreground">{gst ? Rs(gst) : '-'}</Td>
                <Td className="font-bold">{Rs(tot)}</Td>
                <Td>
                  {q.advanceAmount ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs">
                      <IndianRupee className="h-3 w-3" /> {q.advanceAmount.toLocaleString('en-IN')}
                    </span>
                  ) : <span className="text-muted-foreground text-xs">-</span>}
                </Td>
                <Td><StatusBadge status={q.status} /></Td>
                <Td>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setView(q)} title="View"><Eye className="h-3.5 w-3.5" /></Button>
                    {canCreate && q.status === 'Draft' && (
                      <Button size="sm" className="h-7 bg-blue-500 hover:bg-blue-600 text-white px-2 text-xs" onClick={() => { updateQuotationStatus(q.id, 'Sent'); toast.success(`${q.id} marked as Sent`); }} title="Mark as Sent">
                        <Send className="h-3.5 w-3.5" /> Sent
                      </Button>
                    )}
                    {canCreate && !q.projectId && (
                      <Button size="sm" className="h-7 bg-amber-500 hover:bg-amber-600 text-white px-2 text-xs" onClick={() => {
                        const pid = convertQuotationToProject(q.id);
                        if (pid) toast.success(`Project ${pid} created from ${q.id}`);
                      }} title="Create Project">
                        <ArrowRight className="h-3.5 w-3.5" /> Project
                      </Button>
                    )}
                    {q.projectId && (
                      <span className="text-[10px] text-emerald-600 font-bold">{q.projectId}</span>
                    )}
                    {canCreate && (
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditTarget(q)} title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {isOwner && (
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50" onClick={() => setConfirmDelete(q)} title="Delete">
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

      {/* New Quotation Modal */}
      <NewQuotationModal open={showNew} onOpenChange={setShowNew} items={items} onCreate={(data) => {
        createQuotation(data);
        toast.success(data.advanceAmount
          ? `Quotation created + advance ${Rs(data.advanceAmount)} recorded (auto-converted to project)`
          : 'Quotation created!');
        setShowNew(false);
      }} />

      {/* Edit Quotation Modal */}
      {editTarget && (
        <EditQuotationModal
          quotation={editTarget}
          items={items}
          onOpenChange={(v) => !v && setEditTarget(null)}
          onSave={(patch) => {
            updateQuotation(editTarget.id, patch);
            toast.success('Quotation updated');
            setEditTarget(null);
          }}
        />
      )}

      {/* View Modal */}
      {viewLive && (
        <Modal open onOpenChange={() => setView(null)} title={`Quotation: ${viewLive.id}`} size="lg"
          footer={<>
            <Button variant="outline" onClick={() => setView(null)}>Close</Button>
            {/* Share: WhatsApp + PDF/Print */}
            <Button variant="outline" className="border-emerald-400 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30" onClick={() => {
              const sub = viewLive.items.reduce((s, i) => s + i.qty * i.rate, 0);
              const gst = viewLive.gstEnabled !== false ? Math.round(sub * 0.18) : 0;
              const total = sub + gst;
              const msg = `*Karyam Dessin — Quotation ${viewLive.id}*\n\nClient: ${viewLive.client}\nDate: ${fD(viewLive.date)}\n\n${viewLive.items.map(i => `• ${i.name} — ${i.qty} × ${Rs(i.rate)} = ${Rs(i.qty * i.rate)}`).join('\n')}\n\nSubtotal: ${Rs(sub)}\n${viewLive.gstEnabled !== false ? `GST (18%): ${Rs(gst)}\n` : ''}*Total: ${Rs(total)}*\n${viewLive.notes ? `\nTerms: ${viewLive.notes}` : ''}\n\n— Karyam Dessin ERP`;
              sendWhatsAppMessage({ toPhone: '', toName: viewLive.client, body: msg, type: 'quotation', relatedId: viewLive.id });
              toast.success('Opening WhatsApp with quotation…');
            }} title="Share quotation on WhatsApp">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </Button>
            <Button variant="outline" className="border-blue-400 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30" onClick={() => printQuotation(viewLive)} title="Print / Save as PDF">
              <Printer className="h-4 w-4" /> PDF / Print
            </Button>
            <div className="flex-1" />
            {canCreate && (
              <Button variant="outline" onClick={() => { setEditTarget(viewLive); setView(null); }}>
                <Pencil className="h-4 w-4" /> Edit
              </Button>
            )}
            {viewLive.status === 'Draft' && (
              <Button className="bg-slate-900 hover:bg-slate-800" onClick={() => { updateQuotationStatus(viewLive.id, 'Sent'); toast.success('Marked as sent'); }}>
                <Send className="h-4 w-4" /> Mark Sent
              </Button>
            )}
            {viewLive.status === 'Sent' && (
              <>
                <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={() => { updateQuotationStatus(viewLive.id, 'Approved'); toast.success('Approved'); }}>
                  <Check className="h-4 w-4" /> Approve
                </Button>
                <Button variant="destructive" onClick={() => { updateQuotationStatus(viewLive.id, 'Rejected'); toast.error('Rejected'); }}>
                  <X className="h-4 w-4" /> Reject
                </Button>
              </>
            )}
            {canCreate && !viewLive.projectId && viewLive.status !== 'Rejected' && (
              <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={() => {
                const pid = convertQuotationToProject(viewLive.id);
                if (pid) { toast.success(`Converted to project ${pid}`); setView(null); }
              }}>
                <ArrowRight className="h-4 w-4" /> Convert to Project
              </Button>
            )}
            {viewLive.projectId && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-bold">
                <Check className="h-3.5 w-3.5" /> Linked: {viewLive.projectId}
              </span>
            )}
            {isOwner && (
              <Button variant="destructive" onClick={() => { setConfirmDelete(viewLive); setView(null); }}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            )}
          </>}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3.5 rounded-xl border border-border bg-muted/30 mb-3">
            <div><div className="text-[10px] font-bold uppercase text-muted-foreground">Client</div><div className="text-sm font-bold">{viewLive.client}</div></div>
            <div><div className="text-[10px] font-bold uppercase text-muted-foreground">Date</div><div className="text-sm font-bold">{fD(viewLive.date)}</div></div>
            <div><div className="text-[10px] font-bold uppercase text-muted-foreground">Status</div><div><StatusBadge status={viewLive.status} /></div></div>
            <div><div className="text-[10px] font-bold uppercase text-muted-foreground">Project</div><div className="text-sm font-bold">{viewLive.projectId || 'Not linked'}</div></div>
          </div>

          {/* GST badge + notes */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {viewLive.gstEnabled !== false ? (
              <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-emerald-500">+ GST 18% Applied</span>
            ) : (
              <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">Without GST</span>
            )}
            {viewLive.advanceAmount && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-emerald-500">
                <Receipt className="h-3 w-3" /> Advance: {Rs(viewLive.advanceAmount)} ({viewLive.advanceMode})
              </span>
            )}
          </div>

          <table className="w-full text-sm border border-border rounded-lg overflow-hidden mb-3">
            <thead><tr><Th>Item</Th><Th>Qty</Th><Th>Rate</Th><Th>Amount</Th></tr></thead>
            <tbody>
              {viewLive.items.map((i, idx) => (
                <tr key={idx} className="hover:bg-muted/30">
                  <Td>{i.name}</Td><Td>{i.qty}</Td><Td>{Rs(i.rate)}</Td><Td className="font-semibold">{Rs(i.qty * i.rate)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-right p-3 rounded-lg bg-muted/50">
            <div className="text-xs my-1">Subtotal: {Rs(viewLive.items.reduce((s, i) => s + i.qty * i.rate, 0))}</div>
            {viewLive.gstEnabled !== false && (
              <div className="text-xs my-1">GST 18%: {Rs(Math.round(viewLive.items.reduce((s, i) => s + i.qty * i.rate, 0) * 0.18))}</div>
            )}
            <div className="text-lg font-black mt-1">Total: {Rs(
              viewLive.items.reduce((s, i) => s + i.qty * i.rate, 0)
              + (viewLive.gstEnabled !== false ? Math.round(viewLive.items.reduce((s, i) => s + i.qty * i.rate, 0) * 0.18) : 0)
            )}</div>
            {viewLive.advanceAmount && (
              <div className="text-xs text-emerald-600 mt-1">Advance Received: {Rs(viewLive.advanceAmount)}</div>
            )}
          </div>

          {viewLive.notes && (
            <div className="mt-3 p-3 rounded-lg border border-border bg-muted/20">
              <div className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Notes / Terms</div>
              <div className="text-xs">{viewLive.notes}</div>
            </div>
          )}
        </Modal>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title={`Delete ${confirmDelete?.id}?`}
        message="Moved to Recycle Bin — admin can restore."
        confirmLabel="Delete"
        onConfirm={() => { if (confirmDelete) { deleteQuotation(confirmDelete.id); toast.error('Deleted'); } }}
      />
    </div>
  );
}

// ============ New Quotation Modal (with GST toggle + Advance Payment) ============
function NewQuotationModal({ open, onOpenChange, items, onCreate }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  items: { id: string; name: string; rate: number }[];
  onCreate: (data: {
    client: string; date: string; items: QuotationItem[];
    gstEnabled: boolean; notes?: string;
    advanceAmount?: number; advanceMode?: string; advanceReference?: string;
  }) => void;
}) {
  const [client, setClient] = React.useState('');
  const [date, setDate] = React.useState(today());
  const [rows, setRows] = React.useState<QuotationItem[]>([{ name: '', qty: 1, rate: 0 }]);
  const [gstEnabled, setGstEnabled] = React.useState(true);
  const [notes, setNotes] = React.useState('');
  const [advanceOn, setAdvanceOn] = React.useState(false);
  const [advanceAmount, setAdvanceAmount] = React.useState('');
  const [advanceMode, setAdvanceMode] = React.useState('Bank Transfer');
  const [advanceReference, setAdvanceReference] = React.useState('');

  const addRow = () => setRows([...rows, { name: '', qty: 1, rate: 0 }]);
  const updateRow = (i: number, patch: Partial<QuotationItem>) => setRows(rows.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  const removeRow = (i: number) => setRows(rows.filter((_, idx) => idx !== i));

  const sub = rows.reduce((s, r) => s + r.qty * r.rate, 0);
  const gst = gstEnabled ? Math.round(sub * 0.18) : 0;
  const total = sub + gst;

  const submit = () => {
    if (!client.trim()) { toast.error('Client zaroori'); return; }
    const valid = rows.filter((r) => r.name && r.qty && r.rate);
    if (!valid.length) { toast.error('Min 1 item'); return; }
    const amt = advanceOn ? (parseInt(advanceAmount) || 0) : 0;
    if (advanceOn && amt <= 0) { toast.error('Advance amount zaroori'); return; }
    onCreate({
      client: client.trim(), date, items: valid, gstEnabled,
      notes: notes.trim() || undefined,
      advanceAmount: amt > 0 ? amt : undefined,
      advanceMode: advanceOn ? advanceMode : undefined,
      advanceReference: advanceOn ? advanceReference.trim() || undefined : undefined,
    });
    setClient(''); setRows([{ name: '', qty: 1, rate: 0 }]); setGstEnabled(true); setNotes('');
    setAdvanceOn(false); setAdvanceAmount(''); setAdvanceReference('');
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="New Quotation" size="xl"
      footer={<><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={submit}>Create Quotation</Button></>}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Client"><Input value={client} onChange={(e) => setClient(e.target.value)} placeholder="ABC Pharma" /></Field>
        <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      </div>

      {/* Items */}
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-end p-2.5 rounded-lg bg-muted/40">
            <div className="col-span-4">
              <Label className="text-[10px] text-muted-foreground">Item</Label>
              <Select value={r.itemId || ''} onValueChange={(v) => {
                const it = items.find((x) => x.id === v);
                if (it) updateRow(i, { name: it.name, rate: it.rate, itemId: it.id });
              }}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select or type below" /></SelectTrigger>
                <SelectContent>{items.map((it) => <SelectItem key={it.id} value={it.id}>{it.name}</SelectItem>)}</SelectContent>
              </Select>
              <Input value={r.name} onChange={(e) => updateRow(i, { name: e.target.value, itemId: undefined })} placeholder="Custom item name" className="mt-1.5 h-8 text-xs" />
            </div>
            <div className="col-span-1">
              <Label className="text-[10px] text-muted-foreground">Pages</Label>
              <Input type="number" value={r.pages || ''} onChange={(e) => updateRow(i, { pages: parseInt(e.target.value) || undefined })} className="h-9" placeholder="—" />
            </div>
            <div className="col-span-2">
              <Label className="text-[10px] text-muted-foreground">Qty</Label>
              <Input type="number" value={r.qty} onChange={(e) => updateRow(i, { qty: parseInt(e.target.value) || 0 })} className="h-9" />
            </div>
            <div className="col-span-2">
              <Label className="text-[10px] text-muted-foreground">Rate</Label>
              <Input type="number" value={r.rate} onChange={(e) => updateRow(i, { rate: parseFloat(e.target.value) || 0 })} className="h-9" />
            </div>
            <div className="col-span-2 text-right">
              <Label className="text-[10px] text-muted-foreground">Amount</Label>
              <div className="text-sm font-bold pt-1.5">{Rs(r.qty * r.rate)}</div>
            </div>
            <div className="col-span-1">
              {rows.length > 1 && (
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-red-500" onClick={() => removeRow(i)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" onClick={addRow} className="mt-2">
        <Plus className="h-3.5 w-3.5" /> Add Item
      </Button>

      {/* GST toggle */}
      <div className="mt-4 p-3 rounded-xl border border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold">Include GST @ 18%</div>
            <div className="text-[11px] text-muted-foreground">Toggle off for composite supply / unregistered clients.</div>
          </div>
          <Switch checked={gstEnabled} onCheckedChange={setGstEnabled} />
        </div>
        <div className="mt-2 pt-2 border-t border-border flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Subtotal: <strong className="text-foreground">{Rs(sub)}</strong></span>
          <span className="text-muted-foreground">GST: <strong className={gstEnabled ? 'text-foreground' : 'text-muted-foreground/50'}>{gstEnabled ? Rs(gst) : '—'}</strong></span>
          <span className="font-black text-sm">Total: {Rs(total)}</span>
        </div>
      </div>

      {/* Advance Payment toggle */}
      <div className="mt-3 p-3 rounded-xl border border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold flex items-center gap-1.5">
              <Receipt className="h-4 w-4 text-emerald-500" /> Record Advance Payment
            </div>
            <div className="text-[11px] text-muted-foreground">If on, the quotation auto-converts to a project and the advance is recorded against it.</div>
          </div>
          <Switch checked={advanceOn} onCheckedChange={setAdvanceOn} />
        </div>
        {advanceOn && (
          <div className="mt-3 pt-3 border-t border-border grid grid-cols-3 gap-2">
            <Field label="Advance Amount (₹)">
              <Input type="number" value={advanceAmount} onChange={(e) => setAdvanceAmount(e.target.value)} placeholder="25000" />
            </Field>
            <Field label="Mode">
              <Select value={advanceMode} onValueChange={setAdvanceMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Reference (UTR/Cheque)">
              <Input value={advanceReference} onChange={(e) => setAdvanceReference(e.target.value)} placeholder="UTR9821347" className="font-mono" />
            </Field>
            {total > 0 && (
              <div className="col-span-3 text-[11px] text-muted-foreground">
                Balance after advance: <strong className="text-amber-600">{Rs(Math.max(0, total - (parseInt(advanceAmount) || 0)))}</strong>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notes */}
      <Field label="Notes / Terms (optional)" className="mt-3">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Delivery terms, payment schedule, validity..." />
      </Field>
    </Modal>
  );
}

// ============ Edit Quotation Modal ============
function EditQuotationModal({
  quotation, items, onOpenChange, onSave,
}: {
  quotation: Quotation;
  items: { id: string; name: string; rate: number }[];
  onOpenChange: (v: boolean) => void;
  onSave: (patch: Partial<Pick<Quotation, 'client' | 'date' | 'items' | 'status' | 'gstEnabled' | 'notes'>>) => void;
}) {
  const [client, setClient] = React.useState(quotation.client);
  const [date, setDate] = React.useState(quotation.date);
  const [status, setStatus] = React.useState(quotation.status);
  const [rows, setRows] = React.useState<QuotationItem[]>(quotation.items.length ? quotation.items : [{ name: '', qty: 1, rate: 0 }]);
  const [gstEnabled, setGstEnabled] = React.useState(quotation.gstEnabled !== false);
  const [notes, setNotes] = React.useState(quotation.notes || '');

  const addRow = () => setRows([...rows, { name: '', qty: 1, rate: 0 }]);
  const updateRow = (i: number, patch: Partial<QuotationItem>) => setRows(rows.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  const removeRow = (i: number) => setRows(rows.filter((_, idx) => idx !== i));

  const sub = rows.reduce((s, r) => s + r.qty * r.rate, 0);
  const gst = gstEnabled ? Math.round(sub * 0.18) : 0;
  const total = sub + gst;

  const save = () => {
    if (!client.trim()) { toast.error('Client zaroori'); return; }
    const valid = rows.filter((r) => r.name && r.qty && r.rate);
    if (!valid.length) { toast.error('Min 1 item'); return; }
    onSave({ client: client.trim(), date, items: valid, status, gstEnabled, notes: notes.trim() || undefined });
  };

  return (
    <Modal open onOpenChange={onOpenChange} title={`Edit Quotation: ${quotation.id}`} size="xl"
      footer={<><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={save}><Pencil className="h-4 w-4" /> Save Changes</Button></>}
    >
      <div className="grid grid-cols-3 gap-3">
        <Field label="Client"><Input value={client} onChange={(e) => setClient(e.target.value)} /></Field>
        <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Status">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {['Draft', 'Sent', 'Approved', 'Rejected'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-end p-2.5 rounded-lg bg-muted/40">
            <div className="col-span-4">
              <Label className="text-[10px] text-muted-foreground">Item</Label>
              <Select value={r.itemId || ''} onValueChange={(v) => {
                const it = items.find((x) => x.id === v);
                if (it) updateRow(i, { name: it.name, rate: it.rate, itemId: it.id });
              }}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select or type below" /></SelectTrigger>
                <SelectContent>{items.map((it) => <SelectItem key={it.id} value={it.id}>{it.name}</SelectItem>)}</SelectContent>
              </Select>
              <Input value={r.name} onChange={(e) => updateRow(i, { name: e.target.value, itemId: undefined })} placeholder="Custom item name" className="mt-1.5 h-8 text-xs" />
            </div>
            <div className="col-span-1">
              <Label className="text-[10px] text-muted-foreground">Pages</Label>
              <Input type="number" value={r.pages || ''} onChange={(e) => updateRow(i, { pages: parseInt(e.target.value) || undefined })} className="h-9" placeholder="—" />
            </div>
            <div className="col-span-2">
              <Label className="text-[10px] text-muted-foreground">Qty</Label>
              <Input type="number" value={r.qty} onChange={(e) => updateRow(i, { qty: parseInt(e.target.value) || 0 })} className="h-9" />
            </div>
            <div className="col-span-2">
              <Label className="text-[10px] text-muted-foreground">Rate</Label>
              <Input type="number" value={r.rate} onChange={(e) => updateRow(i, { rate: parseFloat(e.target.value) || 0 })} className="h-9" />
            </div>
            <div className="col-span-2 text-right">
              <Label className="text-[10px] text-muted-foreground">Amount</Label>
              <div className="text-sm font-bold pt-1.5">{Rs(r.qty * r.rate)}</div>
            </div>
            <div className="col-span-1">
              {rows.length > 1 && (
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-red-500" onClick={() => removeRow(i)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" onClick={addRow} className="mt-2">
        <Plus className="h-3.5 w-3.5" /> Add Item
      </Button>

      <div className="mt-4 p-3 rounded-xl border border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold">Include GST @ 18%</div>
          <Switch checked={gstEnabled} onCheckedChange={setGstEnabled} />
        </div>
        <div className="mt-2 pt-2 border-t border-border flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Subtotal: <strong className="text-foreground">{Rs(sub)}</strong></span>
          <span className="text-muted-foreground">GST: <strong className={gstEnabled ? 'text-foreground' : 'text-muted-foreground/50'}>{gstEnabled ? Rs(gst) : '—'}</strong></span>
          <span className="font-black text-sm">Total: {Rs(total)}</span>
        </div>
      </div>

      <Field label="Notes / Terms" className="mt-3">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Delivery terms, payment schedule, validity..." />
      </Field>
    </Modal>
  );
}

// ============ Quotation Sharing Helpers (PDF/Print) ============

/** Open a print-friendly window with the quotation and trigger the browser's print dialog
 *  (user can choose "Save as PDF" from the print dialog). */
function printQuotation(q: Quotation) {
  const sub = q.items.reduce((s, i) => s + i.qty * i.rate, 0);
  const gst = q.gstEnabled !== false ? Math.round(sub * 0.18) : 0;
  const total = sub + gst;
  const itemsRows = q.items.map((i, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${i.name}</td>
      <td style="text-align:right">${i.qty}</td>
      <td style="text-align:right">${Rs(i.rate)}</td>
      <td style="text-align:right">${Rs(i.qty * i.rate)}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
  <html><head><title>Quotation ${q.id}</title>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; margin: 0; padding: 32px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #10b981; padding-bottom: 16px; margin-bottom: 24px; }
    .brand { font-size: 28px; font-weight: 900; color: #0f172a; }
    .brand .accent { color: #10b981; }
    .tagline { font-size: 11px; color: #64748b; margin-top: 2px; }
    .doc-title { font-size: 22px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #10b981; text-align: right; }
    .doc-meta { font-size: 11px; color: #64748b; text-align: right; margin-top: 4px; }
    .parties { display: flex; gap: 32px; margin-bottom: 24px; }
    .party { flex: 1; }
    .party-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px; margin-bottom: 4px; }
    .party-name { font-size: 14px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #f1f5f9; padding: 10px 12px; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #475569; text-align: left; border-bottom: 2px solid #e2e8f0; }
    td { padding: 10px 12px; font-size: 12px; border-bottom: 1px solid #e2e8f0; }
    .totals { margin-left: auto; width: 280px; }
    .totals tr td { border: none; padding: 6px 12px; font-size: 12px; }
    .totals tr.grand td { border-top: 2px solid #10b981; font-weight: 900; font-size: 15px; color: #10b981; padding-top: 10px; }
    .notes { margin-top: 24px; padding: 12px 16px; background: #f8fafc; border-left: 3px solid #10b981; font-size: 11px; color: #475569; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 10px; font-weight: 700; background: #fef3c7; color: #92400e; }
    @media print { body { padding: 0; } }
  </style></head>
  <body>
    <div class="header">
      <div>
        <div class="brand">Karyam <span class="accent">Dessin</span></div>
        <div class="tagline">Beyond Design – It's Pure Strategy</div>
      </div>
      <div>
        <div class="doc-title">Quotation</div>
        <div class="doc-meta">${q.id} · ${fD(q.date)}</div>
        <div class="doc-meta" style="margin-top:8px"><span class="badge">${q.status}</span></div>
      </div>
    </div>
    <div class="parties">
      <div class="party">
        <div class="party-label">From</div>
        <div class="party-name">Karyam Dessin</div>
        <div style="font-size:11px;color:#64748b">Lucknow, UP · +91-9452879204</div>
      </div>
      <div class="party">
        <div class="party-label">To (Client)</div>
        <div class="party-name">${q.client}</div>
      </div>
    </div>
    <table>
      <thead><tr><th>#</th><th>Item</th><th style="text-align:right">Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${itemsRows}</tbody>
    </table>
    <table class="totals">
      <tr><td>Subtotal</td><td style="text-align:right">${Rs(sub)}</td></tr>
      <tr><td>${q.gstEnabled !== false ? 'GST (18%)' : 'GST'}</td><td style="text-align:right">${gst ? Rs(gst) : '—'}</td></tr>
      <tr class="grand"><td>Total</td><td style="text-align:right">${Rs(total)}</td></tr>
    </table>
    ${q.notes ? `<div class="notes"><strong>Terms:</strong> ${q.notes}</div>` : ''}
    <div class="footer">This quotation is computer-generated and valid for 30 days from the date of issue. · Karyam Dessin ERP</div>
  </body></html>`;

  const printWin = window.open('', '_blank', 'noopener,noreferrer');
  if (!printWin) {
    toast.error('Pop-up blocked. Please allow pop-ups to print/save the quotation.');
    return;
  }
  printWin.document.open();
  printWin.document.write(html);
  printWin.document.close();
  // Wait for content to render before printing
  printWin.focus();
  setTimeout(() => { printWin.print(); }, 400);
  toast.success('Opening print view — choose "Save as PDF" to download.');
}
