'use client';

import * as React from 'react';
import { Plus, Eye, Trash2, FileText, Download, Printer, ExternalLink, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useERP } from '@/lib/erp/store';
import { Rs, fD, today, matchSearch } from '@/lib/erp/utils';
import { exportToCSV } from '@/lib/erp/csv';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  SectionHeader, TableShell, Th, Td, EmptyState, StatusBadge,
  Modal, ConfirmDialog, Field, StatCard,
} from '../ui';
import type { GSTInvoice, GSTInvoiceItem, GSTSettings } from '@/lib/erp/types';
import { DEFAULT_GST_SETTINGS } from '@/lib/erp/constants';

const INVOICE_STATUSES = ['Draft', 'Pending', 'Approved', 'Sent', 'Paid', 'Partially Paid', 'Overdue', 'Cancelled', 'Returned'];

/** Map each GST-settings invoice-type toggle → human bill-type label + GST behaviour. */
const BILL_TYPE_META: { key: keyof GSTSettings['invoiceTypes']; label: string; gst: 'normal' | 'none' | 'zero' | 'rcm'; desc: string }[] = [
  { key: 'taxInvoice', label: 'Tax Invoice', gst: 'normal', desc: 'Standard GST tax invoice (CGST+SGST / IGST)' },
  { key: 'billOfSupply', label: 'Bill of Supply', gst: 'none', desc: 'Composition / exempt supply — no GST' },
  { key: 'debitNote', label: 'Debit Note', gst: 'normal', desc: 'Debit note for price escalation (GST applicable)' },
  { key: 'creditNote', label: 'Credit Note', gst: 'normal', desc: 'Credit note for returns / adjustments (GST applicable)' },
  { key: 'exportInvoice', label: 'Export Invoice', gst: 'zero', desc: 'Zero-rated export — no GST' },
  { key: 'sezInvoice', label: 'SEZ Invoice', gst: 'zero', desc: 'SEZ supply — zero-rated (LUT / with payment)' },
  { key: 'rcmInvoice', label: 'RCM Invoice', gst: 'rcm', desc: 'Reverse Charge Mechanism invoice' },
];

/** Legacy / other bill types (always available, not gated by GST settings). */
const OTHER_BILL_TYPES = ['Proforma Invoice', 'Estimate', 'Delivery Challan'];

/** Build the list of selectable bill types from the GST settings invoiceTypes toggles + legacy types. */
function buildBillTypes(s: GSTSettings | undefined): typeof BILL_TYPE_META {
  const it = (s?.invoiceTypes || DEFAULT_GST_SETTINGS.invoiceTypes);
  return BILL_TYPE_META.filter((b) => it[b.key]);
}

const GST_CALC_MODES = ['GST Exclusive', 'GST Inclusive', 'Without GST'];

const EXPORT_TYPES = ['Domestic', 'Export', 'SEZ With Payment', 'SEZ Without Payment', 'Deemed Export'];

const PAYMENT_MODES = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Credit', 'Wallet', 'Card', 'NEFT', 'RTGS', 'IMPS'];

/** Coloured badge class per bill type. */
function billTypeBadgeClass(billType?: string): string {
  switch (billType) {
    case 'Tax Invoice': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
    case 'Bill of Supply': return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
    case 'Debit Note': return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300';
    case 'Credit Note': return 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300';
    case 'Export Invoice': return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300';
    case 'SEZ Invoice': return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300';
    case 'RCM Invoice': return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300';
    default: return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
  }
}

export function Invoicing() {
  const invoices = (useERP((s) => s.gstInvoices) || []) as GSTInvoice[];
  const createGSTInvoice = useERP((s) => s.createGSTInvoice);
  const updateGSTInvoice = useERP((s) => s.updateGSTInvoice);
  const deleteGSTInvoice = useERP((s) => s.deleteGSTInvoice);
  const sendWhatsAppMessage = useERP((s) => s.sendWhatsAppMessage);
  const currentUser = useERP((s) => s.currentUser);

  const canManage = currentUser?.role === 'owner' || currentUser?.role === 'management' || currentUser?.role === 'finance' || currentUser?.role === 'marketing';
  const quotations = useERP((s) => s.quotations) || [];
  const companyProfile = useERP((s) => s.companyProfile);
  const [search, setSearch] = React.useState('');
  const [showNew, setShowNew] = React.useState(false);
  const [view, setView] = React.useState<GSTInvoice | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<GSTInvoice | null>(null);
  const [showLinkQuote, setShowLinkQuote] = React.useState<GSTInvoice | null>(null);

  const filtered = invoices.filter((inv) =>
    matchSearch(`${inv.id} ${inv.clientName} ${inv.company} ${inv.gstin} ${inv.status}`, search),
  );

  const totalValue = invoices.reduce((s, inv) => s + inv.grandTotal, 0);
  const paidValue = invoices.filter((i) => i.status === 'Paid').reduce((s, inv) => s + inv.grandTotal, 0);

  const exportCsv = () => {
    exportToCSV(`gst-invoices-${today()}.csv`, invoices, [
      { key: 'id', label: 'Invoice No' }, { key: 'date', label: 'Date' },
      { key: 'clientName', label: 'Client' }, { key: 'gstin', label: 'GSTIN' },
      { key: 'taxableAmount', label: 'Taxable' }, { key: 'cgst', label: 'CGST' },
      { key: 'sgst', label: 'SGST' }, { key: 'igst', label: 'IGST' },
      { key: 'grandTotal', label: 'Total' }, { key: 'status', label: 'Status' },
    ]);
    toast.success(`Exported ${invoices.length} invoices`);
  };

  return (
    <div>
      <SectionHeader title="GST Invoices" subtitle="GST-compliant tax invoices with CGST/SGST/IGST." accent="emerald"
        actions={canManage && (
          <>
            <a href="/invoice.html" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="h-9"><ExternalLink className="h-4 w-4" /> Pro Invoice Tool</Button>
            </a>
            <Button onClick={() => setShowNew(true)} className="h-9 bg-slate-900 hover:bg-slate-800"><Plus className="h-4 w-4" /> New Invoice</Button>
          </>
        )}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Invoices" value={invoices.length} tone="primary" />
        <StatCard label="Total Value" value={Rs(totalValue)} icon={<FileText className="h-4 w-4" />} />
        <StatCard label="Paid" value={Rs(paidValue)} tone="accent" />
        <StatCard label="Pending" value={Rs(totalValue - paidValue)} tone="warn" />
      </div>

      <TableShell title="All GST Invoices" search={search} onSearch={setSearch}
        toolbar={<Button variant="outline" size="sm" className="h-8" onClick={exportCsv} disabled={!invoices.length}><Download className="h-3.5 w-3.5" /> CSV</Button>}>
        <thead><tr><Th>Invoice No</Th><Th>Bill Type</Th><Th>Date</Th><Th>Client</Th><Th>GSTIN</Th><Th>Taxable</Th><Th>GST</Th><Th>Total</Th><Th>Status</Th><Th>Actions</Th></tr></thead>
        <tbody>
          {filtered.length === 0 ? (
            <EmptyState icon={<FileText className="h-8 w-8" />} message="No GST invoices yet." />
          ) : filtered.map((inv) => (
            <tr key={inv.id} className="hover:bg-muted/30">
              <Td><strong>{inv.id}</strong></Td>
              <Td><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold ${billTypeBadgeClass(inv.billType)}`}>{inv.billType || 'Tax Invoice'}</span></Td>
              <Td>{fD(inv.date)}</Td>
              <Td className="font-semibold">{inv.clientName}</Td>
              <Td className="font-mono text-[11px] text-muted-foreground">{inv.gstin || '-'}</Td>
              <Td>{Rs(inv.taxableAmount)}</Td>
              <Td className="text-blue-600">{Rs(inv.cgst + inv.sgst + inv.igst)}</Td>
              <Td className="font-bold">{Rs(inv.grandTotal)}</Td>
              <Td><StatusBadge status={inv.status} /></Td>
              <Td>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setView(inv)}><Eye className="h-3.5 w-3.5" /></Button>
                  {canManage && <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50" onClick={() => setConfirmDelete(inv)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </TableShell>

      <NewInvoiceModal open={showNew} onOpenChange={setShowNew} onCreate={(data) => { createGSTInvoice(data); toast.success('GST Invoice created!'); setShowNew(false); }} />

      {view && (
        <Modal open onOpenChange={() => setView(null)} title={`Invoice: ${view.id}`} size="xl"
          footer={<>
            <Button variant="outline" onClick={() => setView(null)}>Close</Button>
            <div className="flex-1" />
            {canManage && (
              <Button variant="outline" onClick={() => setShowLinkQuote(view)}>
                <FileText className="h-4 w-4" /> Link Quotation
              </Button>
            )}
            <Button variant="outline" className="border-emerald-400 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30" onClick={() => {
              const msg = `✨ *GST Invoice — Karyam Dessin* ✨\n\n📋 *Invoice No:* ${view.id}\n👤 *Client:* ${view.clientName}\n💰 *Grand Total:* ${Rs(view.grandTotal)}\n📞 +91-9452879204`;
              sendWhatsAppMessage({ toPhone: '', toName: view.clientName, body: msg, type: 'invoice', relatedId: view.id });
              toast.success('Opening WhatsApp with invoice…');
            }}><MessageCircle className="h-4 w-4" /> WhatsApp</Button>
            <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button>
            {canManage && INVOICE_STATUSES.map((s) => view.status !== s && (
              <Button key={s} variant="outline" size="sm" className="h-8 text-xs" onClick={() => { updateGSTInvoice(view.id, { status: s }); toast.success(`Status → ${s}`); }}>{s}</Button>
            ))}
          </>}>
          <div className="rounded-xl border-2 border-border overflow-hidden">
            <div className="bg-slate-900 text-white p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-white flex items-center justify-center font-black text-slate-900 text-lg overflow-hidden flex-shrink-0">
                {companyProfile?.logoImage ? (
                  <img src={companyProfile.logoImage} alt="logo" className="h-full w-full object-cover" />
                ) : (
                  companyProfile?.logoText || 'KD'
                )}
              </div>
              <div className="flex-1"><div className="text-xl font-black">{companyProfile?.name || 'Karyam Dessin'}</div><div className="text-[11px] opacity-75">{companyProfile?.tagline || "Beyond Design – It's Pure Strategy"}</div></div>
              <div className="text-right"><div className="text-[10px] opacity-70 uppercase">Tax Invoice</div><div className="text-lg font-black text-amber-400">{view.id}</div></div>
            </div>
            <div className="grid grid-cols-2 border-b border-border">
              <div className="p-4 border-r border-border">
                <div className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Bill To</div>
                <div className="text-sm font-bold">{view.clientName}</div>
                {view.company && <div className="text-xs">{view.company}</div>}
                {view.gstin && <div className="text-xs font-mono mt-1">GSTIN: {view.gstin}</div>}
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-y-1 text-xs">
                  <span className="text-muted-foreground font-bold">Date:</span><span>{fD(view.date)}</span>
                  <span className="text-muted-foreground font-bold">Place:</span><span>{view.placeOfSupply}</span>
                  <span className="text-muted-foreground font-bold">Status:</span><StatusBadge status={view.status} />
                </div>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-100 dark:bg-slate-800"><Th>#</Th><Th>Description</Th><Th>HSN</Th><Th>Qty</Th><Th>Rate</Th><Th>GST%</Th><Th>CGST</Th><Th>SGST</Th><Th>IGST</Th><Th>Total</Th></tr></thead>
              <tbody>
                {view.items.map((it, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <Td>{i + 1}</Td><Td>{it.description}</Td><Td className="font-mono text-xs">{it.hsn}</Td>
                    <Td>{it.qty}</Td><Td>{Rs(it.rate)}</Td>
                    <Td>{it.gstRate === -1 ? 'Non-GST' : `${it.gstRate}%`}</Td>
                    <Td className="text-blue-600">{it.cgst ? Rs(it.cgst) : '-'}</Td>
                    <Td className="text-blue-600">{it.sgst ? Rs(it.sgst) : '-'}</Td>
                    <Td className="text-blue-600">{it.igst ? Rs(it.igst) : '-'}</Td>
                    <Td className="font-bold">{Rs(it.qty * it.rate + (it.cgst || 0) + (it.sgst || 0) + (it.igst || 0))}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end p-4 bg-muted/30">
              <div className="w-64 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Taxable:</span><span className="font-bold">{Rs(view.taxableAmount)}</span></div>
                {view.cgst > 0 && <div className="flex justify-between"><span className="text-muted-foreground">CGST:</span><span className="font-bold text-blue-600">{Rs(view.cgst)}</span></div>}
                {view.sgst > 0 && <div className="flex justify-between"><span className="text-muted-foreground">SGST:</span><span className="font-bold text-blue-600">{Rs(view.sgst)}</span></div>}
                {view.igst > 0 && <div className="flex justify-between"><span className="text-muted-foreground">IGST:</span><span className="font-bold text-blue-600">{Rs(view.igst)}</span></div>}
                <div className="flex justify-between border-t-2 border-slate-900 dark:border-slate-100 pt-2 bg-slate-900 dark:bg-slate-800 text-white px-3 py-2 rounded-lg">
                  <span className="font-black">GRAND TOTAL</span><span className="font-black">{Rs(view.grandTotal)}</span>
                </div>
              </div>
            </div>
            <div className="px-4 pb-3"><div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-500 text-xs font-semibold text-blue-800 dark:text-blue-300">Amount in Words: {view.amountInWords}</div></div>
            <div className="bg-slate-900 text-white/80 text-center p-2 text-[10px]">{(companyProfile?.footerText?.trim()) || [companyProfile?.name, companyProfile?.email, companyProfile?.phone, companyProfile?.address].filter(Boolean).join(' | ') || 'Karyam Dessin | karyam.dessin@gmail.com | +91-9452879204 | Lucknow, UP'}</div>
          </div>
        </Modal>
      )}

      <ConfirmDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)} title={`Delete ${confirmDelete?.id}?`} message="Invoice will be permanently deleted." confirmLabel="Delete" onConfirm={() => { if (confirmDelete) { deleteGSTInvoice(confirmDelete.id); toast.error('Deleted'); } }} />

      {/* Link Quotation Modal */}
      {showLinkQuote && (
        <Modal open onOpenChange={(v) => !v && setShowLinkQuote(null)} title={`Link Quotation to ${showLinkQuote.id}`}>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground mb-3">Select a quotation to link with this invoice. The quotation's items will be copied into the invoice.</p>
            {quotations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No quotations available.</p>
            ) : quotations.map((q) => {
              const sub = q.items.reduce((s, i) => s + i.qty * i.rate, 0);
              return (
                <button
                  key={q.id}
                  onClick={() => {
                    // Copy quotation items into invoice
                    const newItems = q.items.map((it) => {
                      const taxable = it.qty * it.rate;
                      const gstRate = 18;
                      const gst = Math.round(taxable * gstRate / 100);
                      return {
                        description: it.name,
                        hsn: '998361',
                        qty: it.qty,
                        rate: it.rate,
                        gstRate,
                        cgst: showLinkQuote.isInterstate ? 0 : Math.round(gst / 2),
                        sgst: showLinkQuote.isInterstate ? 0 : gst - Math.round(gst / 2),
                        igst: showLinkQuote.isInterstate ? gst : 0,
                      };
                    });
                    const taxableAmount = newItems.reduce((s, i) => s + i.qty * i.rate, 0);
                    const cgst = newItems.reduce((s, i) => s + i.cgst, 0);
                    const sgst = newItems.reduce((s, i) => s + i.sgst, 0);
                    const igst = newItems.reduce((s, i) => s + i.igst, 0);
                    const grandTotal = taxableAmount + cgst + sgst + igst;
                    updateGSTInvoice(showLinkQuote.id, {
                      items: newItems, taxableAmount, cgst, sgst, igst, grandTotal,
                      clientName: showLinkQuote.clientName || q.client,
                    });
                    toast.success(`Linked quotation ${q.id} to invoice ${showLinkQuote.id}`);
                    setShowLinkQuote(null);
                    setView(null);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all text-left"
                >
                  <div>
                    <div className="font-bold text-sm">{q.id}</div>
                    <div className="text-xs text-muted-foreground">{q.client} · {q.items.length} items</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm">{Rs(sub)}</div>
                    <div className="text-xs text-muted-foreground">{q.status}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </Modal>
      )}
    </div>
  );
}

function NewInvoiceModal({ open, onOpenChange, onCreate }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  onCreate: (data: Omit<GSTInvoice, 'id' | 'createdAt'>) => void;
}) {
  const gstSettings = useERP((s) => s.gstSettings);
  // Build the list of enabled bill types from GST settings (Tax Invoice / Bill of Supply / Debit Note / etc.)
  const enabledBillTypes = React.useMemo(() => buildBillTypes(gstSettings as GSTSettings | undefined), [gstSettings]);

  const [clientName, setClientName] = React.useState('');
  const [company, setCompany] = React.useState('');
  const [gstin, setGstin] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [date, setDate] = React.useState(today());
  const [placeOfSupply, setPlaceOfSupply] = React.useState('Uttar Pradesh');
  const [isInterstate, setIsInterstate] = React.useState(false);
  // Bill type — defaults to first enabled type (usually Tax Invoice), or 'Tax Invoice' if none enabled.
  const [billType, setBillType] = React.useState(enabledBillTypes[0]?.label || 'Tax Invoice');
  const [gstCalcMode, setGstCalcMode] = React.useState('GST Exclusive');
  const [reverseCharge, setReverseCharge] = React.useState(false);
  const [exportType, setExportType] = React.useState('Domestic');
  const [discount, setDiscount] = React.useState('');
  const [discountType, setDiscountType] = React.useState('flat');
  const [paymentMode, setPaymentMode] = React.useState('Bank Transfer');
  const [rows, setRows] = React.useState<GSTInvoiceItem[]>([
    { description: '', hsn: '998361', qty: 1, rate: 0, gstRate: 18, cgst: 0, sgst: 0, igst: 0 },
  ]);

  // GST behaviour for the selected bill type: 'normal' | 'none' | 'zero' | 'rcm'
  const billGstBehaviour = React.useMemo(() => {
    const meta = enabledBillTypes.find((b) => b.label === billType);
    return meta?.gst || 'normal';
  }, [billType, enabledBillTypes]);

  // Whether GST should be calculated for the current bill type.
  const gstApplies = billGstBehaviour === 'normal' || billGstBehaviour === 'rcm';

  const addRow = () => setRows([...rows, { description: '', hsn: '998361', qty: 1, rate: 0, gstRate: 18, cgst: 0, sgst: 0, igst: 0 }]);
  const updateRow = (i: number, patch: Partial<GSTInvoiceItem>) => {
    setRows(rows.map((r, idx) => {
      if (idx !== i) return r;
      const updated = { ...r, ...patch };
      const taxable = updated.qty * updated.rate;
      // Bill-of-Supply (none) and Export/SEZ (zero) → no GST calculated on rows.
      if (!gstApplies || updated.gstRate === -1) { updated.cgst = 0; updated.sgst = 0; updated.igst = 0; }
      else if (isInterstate) { updated.igst = Math.round(taxable * updated.gstRate / 100); updated.cgst = 0; updated.sgst = 0; }
      else { const gst = Math.round(taxable * updated.gstRate / 100); updated.cgst = Math.round(gst / 2); updated.sgst = gst - updated.cgst; updated.igst = 0; }
      return updated;
    }));
  };
  const removeRow = (i: number) => setRows(rows.filter((_, idx) => idx !== i));

  const taxableAmount = rows.reduce((s, r) => s + r.qty * r.rate, 0);
  const cgst = rows.reduce((s, r) => s + (r.cgst || 0), 0);
  const sgst = rows.reduce((s, r) => s + (r.sgst || 0), 0);
  const igst = rows.reduce((s, r) => s + (r.igst || 0), 0);
  const grandTotal = taxableAmount + cgst + sgst + igst;

  const toWords = (n: number): string => {
    if (n === 0) return 'Zero Rupees Only';
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const w = (num: number): string => {
      if (num === 0) return '';
      if (num < 20) return ones[num] + ' ';
      if (num < 100) return tens[Math.floor(num / 10)] + ' ' + (num % 10 ? ones[num % 10] + ' ' : '');
      if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred ' + (num % 100 ? w(num % 100) : '');
      if (num < 100000) return w(Math.floor(num / 1000)) + 'Thousand ' + (num % 1000 ? w(num % 1000) : '');
      if (num < 10000000) return w(Math.floor(num / 100000)) + 'Lakh ' + (num % 100000 ? w(num % 100000) : '');
      return w(Math.floor(num / 10000000)) + 'Crore ' + (num % 10000000 ? w(num % 10000000) : '');
    };
    return w(n).trim() + ' Rupees Only';
  };

  const submit = () => {
    if (!clientName.trim()) { toast.error('Client name required'); return; }
    const valid = rows.filter((r) => r.description && r.qty && r.rate);
    if (!valid.length) { toast.error('Min 1 item required'); return; }
    // Calculate discount
    const discVal = parseFloat(discount) || 0;
    const discAmt = discountType === 'percent' ? Math.round(taxableAmount * discVal / 100) : discVal;
    const finalTaxable = Math.max(0, taxableAmount - discAmt);
    // GST only applies to 'normal' (Tax Invoice / Debit Note / Credit Note) and 'rcm' bill types.
    // Bill of Supply (none) and Export / SEZ (zero) → no GST.
    const finalCgst = gstApplies ? cgst : 0;
    const finalSgst = gstApplies ? sgst : 0;
    const finalIgst = gstApplies ? igst : 0;
    const finalGrand = finalTaxable + finalCgst + finalSgst + finalIgst;
    onCreate({
      clientName: clientName.trim(), company: company.trim(), gstin: gstin.trim(), address: address.trim(),
      date, placeOfSupply, isInterstate, items: valid,
      taxableAmount: finalTaxable, cgst: finalCgst, sgst: finalSgst, igst: finalIgst,
      grandTotal: finalGrand, amountInWords: toWords(Math.round(finalGrand)), status: 'Draft',
      billType,
      // Extra fields stored in the invoice
      ...({ gstCalcMode, reverseCharge: reverseCharge || billGstBehaviour === 'rcm', exportType, paymentMode, discount: discAmt } as any),
    });
    setClientName(''); setCompany(''); setGstin(''); setAddress(''); setDiscount('');
    setRows([{ description: '', hsn: '998361', qty: 1, rate: 0, gstRate: 18, cgst: 0, sgst: 0, igst: 0 }]);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="New Bill / Invoice" size="xl"
      footer={<><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button className="bg-emerald-500 hover:bg-emerald-600" onClick={submit}>Create {billType}</Button></>}>
      {/* ============ Bill Type selector (driven by GST Settings → Invoice Types) ============ */}
      <div className="p-3 rounded-xl border border-border bg-muted/30 mb-3">
        <div className="text-sm font-bold mb-2 flex items-center gap-2">Bill Type <span className="text-[10px] font-normal text-muted-foreground">(from GST Settings)</span></div>
        <div className="flex flex-wrap gap-1.5">
          {enabledBillTypes.map((b) => (
            <button
              key={b.label}
              type="button"
              onClick={() => { setBillType(b.label); if (b.gst === 'none' || b.gst === 'zero') setRows(rows.map((r) => ({ ...r, cgst: 0, sgst: 0, igst: 0 }))); }}
              title={b.desc}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${billType === b.label ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-card border-border text-muted-foreground hover:border-emerald-300 hover:text-foreground'}`}
            >
              {b.label}
            </button>
          ))}
          {OTHER_BILL_TYPES.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => { setBillType(label); setRows(rows.map((r) => ({ ...r, cgst: 0, sgst: 0, igst: 0 }))); }}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${billType === label ? 'bg-slate-700 text-white border-slate-700' : 'bg-card border-border text-muted-foreground hover:border-slate-400 hover:text-foreground'}`}
            >
              {label}
            </button>
          ))}
        </div>
        {/* GST behaviour note for the selected bill type */}
        <div className="mt-2 text-[11px] text-muted-foreground">
          {billGstBehaviour === 'none' && '⚠ No GST — Bill of Supply is for composition / exempt supplies.'}
          {billGstBehaviour === 'zero' && '⚠ Zero-rated — no GST charged (Export / SEZ).'}
          {billGstBehaviour === 'rcm' && '⚠ Reverse Charge Mechanism — GST shown but paid by recipient.'}
          {billGstBehaviour === 'normal' && '✓ Standard GST applies (CGST+SGST intrastate / IGST interstate).'}
          {!gstApplies && billGstBehaviour !== 'none' && billGstBehaviour !== 'zero' && '⚠ No GST for this bill type.'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Client Name"><Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Customer name" /></Field>
        <Field label="Company"><Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" /></Field>
        <Field label="GSTIN"><Input value={gstin} onChange={(e) => setGstin(e.target.value)} placeholder="09AAAAA0000A1Z5" className="font-mono" /></Field>
        <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      </div>
      <Field label="Address"><Textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Billing address" /></Field>
      <div className="p-3 rounded-xl border border-border bg-muted/30 mb-3 flex items-center justify-between">
        <div className="text-sm font-bold">Transaction Type</div>
        <Select value={isInterstate ? 'inter' : 'intra'} onValueChange={(v) => {
          const inter = v === 'inter'; setIsInterstate(inter);
          setRows(rows.map((r) => {
            const taxable = r.qty * r.rate;
            if (r.gstRate === -1) return { ...r, cgst: 0, sgst: 0, igst: 0 };
            if (inter) return { ...r, igst: Math.round(taxable * r.gstRate / 100), cgst: 0, sgst: 0 };
            const gst = Math.round(taxable * r.gstRate / 100);
            return { ...r, cgst: Math.round(gst / 2), sgst: gst - Math.round(gst / 2), igst: 0 };
          }));
        }}>
          <SelectTrigger className="w-48 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="intra">Intrastate (CGST+SGST)</SelectItem><SelectItem value="inter">Interstate (IGST)</SelectItem></SelectContent>
        </Select>
      </div>

      {/* GST Configuration Section */}
      <div className="p-3 rounded-xl border border-border bg-muted/30 mb-3">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label="Bill Type (selected)">
            <div className="h-8 flex items-center px-3 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              {billType}
            </div>
          </Field>
          <Field label="GST Calculation">
            <Select value={gstCalcMode} onValueChange={setGstCalcMode}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{GST_CALC_MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Export Type">
            <Select value={exportType} onValueChange={setExportType}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{EXPORT_TYPES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>
        <div className="flex items-center gap-6 mt-3">
          <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
            <input type="checkbox" checked={reverseCharge} onChange={(e) => setReverseCharge(e.target.checked)} className="w-4 h-4 cursor-pointer" />
            Reverse Charge Applicable
          </label>
        </div>
      </div>

      {/* Discount & Payment */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
        <Field label="Discount">
          <div className="flex gap-2">
            <Input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" className="h-8 text-xs" />
            <Select value={discountType} onValueChange={setDiscountType}>
              <SelectTrigger className="h-8 w-16 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="flat">₹</SelectItem><SelectItem value="percent">%</SelectItem></SelectContent>
            </Select>
          </div>
        </Field>
        <Field label="Payment Mode">
          <Select value={paymentMode} onValueChange={setPaymentMode}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{PAYMENT_MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      </div>

      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-end p-2.5 rounded-lg bg-muted/40">
            <div className="col-span-3"><Label className="text-[10px] text-muted-foreground">Description</Label><Input value={r.description} onChange={(e) => updateRow(i, { description: e.target.value })} placeholder="Service" className="h-8 text-xs" /></div>
            <div className="col-span-2"><Label className="text-[10px] text-muted-foreground">HSN/SAC</Label><Input value={r.hsn} onChange={(e) => updateRow(i, { hsn: e.target.value })} className="h-8 text-xs font-mono" /></div>
            <div className="col-span-1"><Label className="text-[10px] text-muted-foreground">Qty</Label><Input type="number" value={r.qty} onChange={(e) => updateRow(i, { qty: parseInt(e.target.value) || 0 })} className="h-8 text-xs" /></div>
            <div className="col-span-2"><Label className="text-[10px] text-muted-foreground">Rate</Label><Input type="number" value={r.rate} onChange={(e) => updateRow(i, { rate: parseFloat(e.target.value) || 0 })} className="h-8 text-xs" /></div>
            <div className="col-span-2"><Label className="text-[10px] text-muted-foreground">GST %</Label><Select value={String(r.gstRate)} onValueChange={(v) => updateRow(i, { gstRate: parseFloat(v) })}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="-1">Non-GST</SelectItem><SelectItem value="0">0%</SelectItem><SelectItem value="5">5%</SelectItem><SelectItem value="12">12%</SelectItem><SelectItem value="18">18%</SelectItem><SelectItem value="28">28%</SelectItem></SelectContent></Select></div>
            <div className="col-span-1 text-right"><Label className="text-[10px] text-muted-foreground">Total</Label><div className="text-sm font-bold pt-1.5">{Rs(r.qty * r.rate + (r.cgst || 0) + (r.sgst || 0) + (r.igst || 0))}</div></div>
            <div className="col-span-1">{rows.length > 1 && <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500" onClick={() => removeRow(i)}><Trash2 className="h-4 w-4" /></Button>}</div>
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" onClick={addRow} className="mt-2"><Plus className="h-3.5 w-3.5" /> Add Item</Button>
      <div className="mt-3 p-3 rounded-xl border border-border bg-muted/30 flex justify-end">
        <div className="w-64 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Taxable:</span><span className="font-bold">{Rs(taxableAmount)}</span></div>
          {!isInterstate && <><div className="flex justify-between"><span className="text-muted-foreground">CGST:</span><span className="font-bold text-blue-600">{Rs(cgst)}</span></div><div className="flex justify-between"><span className="text-muted-foreground">SGST:</span><span className="font-bold text-blue-600">{Rs(sgst)}</span></div></>}
          {isInterstate && <div className="flex justify-between"><span className="text-muted-foreground">IGST:</span><span className="font-bold text-blue-600">{Rs(igst)}</span></div>}
          <div className="flex justify-between bg-slate-900 text-white px-3 py-2 rounded-lg mt-1"><span className="font-black">GRAND TOTAL</span><span className="font-black">{Rs(grandTotal)}</span></div>
        </div>
      </div>
    </Modal>
  );
}
