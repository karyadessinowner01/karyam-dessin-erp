'use client';

import * as React from 'react';
import {
  Plus, Trash2, Coins, TrendingUp, TrendingDown, Undo2, IndianRupee,
  Download, Filter, Receipt, Wallet, Building2, ArrowDownCircle, ArrowUpCircle,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useERP } from '@/lib/erp/store';
import {
  PAYMENT_TYPES, PAYMENT_MODES, EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_COLORS, PAYMENT_MODE_COLORS,
} from '@/lib/erp/constants';
import { Rs, fD, today, matchSearch, monthLabel } from '@/lib/erp/utils';
import { exportToCSV } from '@/lib/erp/csv';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  SectionHeader, TableShell, Th, Td, EmptyState,
  Modal, ConfirmDialog, Field, StatCard, FilterChip, FilterBar,
} from '../ui';
import { ChartCard, ERPBarChart, ERPAreaChart, ERPDonutChart } from '../charts';
import type { Payment, Expense } from '@/lib/erp/types';

export function Finance() {
  const projects = useERP((s) => s.projects);
  const payments = useERP((s) => s.payments);
  const expenses = useERP((s) => s.expenses);
  const refunds = useERP((s) => s.refunds);
  const currentUser = useERP((s) => s.currentUser);
  const createPayment = useERP((s) => s.createPayment);
  const updatePayment = useERP((s) => s.updatePayment);
  const deletePayment = useERP((s) => s.deletePayment);
  const createExpense = useERP((s) => s.createExpense);
  const updateExpense = useERP((s) => s.updateExpense);
  const deleteExpense = useERP((s) => s.deleteExpense);

  const isOwner = currentUser?.role === 'owner';
  const isMgmt = currentUser?.role === 'management';
  const isFinance = currentUser?.role === 'finance';
  const isOM = isOwner || isMgmt || isFinance;

  // ===== Filters =====
  const [search, setSearch] = React.useState('');
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<string>('');
  const [modeFilter, setModeFilter] = React.useState<string>('');
  const [expCatFilter, setExpCatFilter] = React.useState<string>('');

  // ===== Modals =====
  const [showPay, setShowPay] = React.useState(false);
  const [showExp, setShowExp] = React.useState(false);
  const [delPay, setDelPay] = React.useState<string | null>(null);
  const [delExp, setDelExp] = React.useState<string | null>(null);
  const [editPay, setEditPay] = React.useState<Payment | null>(null);
  const [editExp, setEditExp] = React.useState<Expense | null>(null);

  // ===== Derived stats =====
  const tRev = projects.filter((p) => !p.cancelled).reduce((s, p) => s + p.value, 0);
  const rec = payments.reduce((s, p) => s + p.amount, 0);
  const tExp = expenses.reduce((s, e) => s + e.amount, 0);
  const tRef = refunds.reduce((s, r) => s + r.amount, 0);
  // COGS = Material + Printing expenses (direct cost of goods sold)
  const cogs = expenses.filter((e) => ['Material', 'Printing'].includes(e.category)).reduce((s, e) => s + e.amount, 0);
  // Gross Profit = Revenue - COGS (before operating expenses)
  const grossProfit = tRev - cogs;
  const profit = rec - tExp - tRef;

  // Last month vs this month for trend
  const thisMonth = new Date().toISOString().slice(0, 7);
  const lastMonth = (() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7); })();
  const thisMonthRec = payments.filter((p) => p.date.slice(0, 7) === thisMonth).reduce((s, p) => s + p.amount, 0);
  const lastMonthRec = payments.filter((p) => p.date.slice(0, 7) === lastMonth).reduce((s, p) => s + p.amount, 0);
  const recTrendPct = lastMonthRec > 0 ? Math.round(((thisMonthRec - lastMonthRec) / lastMonthRec) * 100) : thisMonthRec > 0 ? 100 : 0;

  const thisMonthExp = expenses.filter((e) => e.date.slice(0, 7) === thisMonth).reduce((s, e) => s + e.amount, 0);
  const lastMonthExp = expenses.filter((e) => e.date.slice(0, 7) === lastMonth).reduce((s, e) => s + e.amount, 0);
  const expTrendPct = lastMonthExp > 0 ? Math.round(((thisMonthExp - lastMonthExp) / lastMonthExp) * 100) : thisMonthExp > 0 ? 100 : 0;

  // ===== Filtered payments =====
  const filteredPays = payments.filter((p) => {
    if (fromDate && p.date < fromDate) return false;
    if (toDate && p.date > toDate) return false;
    if (typeFilter && p.type !== typeFilter) return false;
    if (modeFilter && p.mode !== modeFilter) return false;
    if (!matchSearch(`${p.id} ${p.projectId} ${p.client} ${p.type} ${p.mode} ${p.reference || ''} ${p.note || ''}`, search)) return false;
    return true;
  });

  // ===== Filtered expenses =====
  const filteredExps = expenses.filter((e) => {
    if (fromDate && e.date < fromDate) return false;
    if (toDate && e.date > toDate) return false;
    if (expCatFilter && e.category !== expCatFilter) return false;
    if (!matchSearch(`${e.id} ${e.category} ${e.desc} ${e.vendor || ''} ${e.reference || ''}`, search)) return false;
    return true;
  });

  // ===== Filtered totals (for summary when filters active) =====
  const fRec = filteredPays.reduce((s, p) => s + p.amount, 0);
  const fExp = filteredExps.reduce((s, e) => s + e.amount, 0);
  const hasActiveFilters = !!(fromDate || toDate || typeFilter || modeFilter || expCatFilter);

  // ===== Chart data: monthly cash flow (last 6 months) =====
  const cashFlowData = React.useMemo(() => {
    const months: { label: string; key: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const k = d.toISOString().slice(0, 7);
      months.push({ label: monthLabel(k + '-01'), key: k });
    }
    return months.map((m) => ({
      month: m.label,
      Received: payments.filter((p) => p.date.slice(0, 7) === m.key).reduce((s, p) => s + p.amount, 0),
      Expenses: expenses.filter((e) => e.date.slice(0, 7) === m.key).reduce((s, e) => s + e.amount, 0),
    }));
  }, [payments, expenses]);

  // ===== Chart data: expense by category =====
  const expenseByCategory = React.useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value, color: EXPENSE_CATEGORY_COLORS[name] }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  // ===== Chart data: payment by mode =====
  const paymentByMode = React.useMemo(() => {
    const map: Record<string, number> = {};
    payments.forEach((p) => { map[p.mode] = (map[p.mode] || 0) + p.amount; });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value, color: PAYMENT_MODE_COLORS[name] }))
      .sort((a, b) => b.value - a.value);
  }, [payments]);

  // ===== Clear filters =====
  const clearFilters = () => {
    setFromDate(''); setToDate(''); setTypeFilter(''); setModeFilter(''); setExpCatFilter(''); setSearch('');
  };

  // ===== Export handlers =====
  const exportPayments = () => {
    exportToCSV(`payments-${today()}.csv`, filteredPays, [
      { key: 'id', label: 'Payment ID' },
      { key: 'date', label: 'Date' },
      { key: 'projectId', label: 'Project' },
      { key: 'client', label: 'Client' },
      { key: 'type', label: 'Type' },
      { key: 'mode', label: 'Mode' },
      { key: 'amount', label: 'Amount (₹)' },
      { key: 'reference', label: 'Reference' },
      { key: 'note', label: 'Note' },
    ]);
    toast.success(`Exported ${filteredPays.length} payments to CSV`);
  };

  const exportExpenses = () => {
    exportToCSV(`expenses-${today()}.csv`, filteredExps, [
      { key: 'id', label: 'Expense ID' },
      { key: 'date', label: 'Date' },
      { key: 'category', label: 'Category' },
      { key: 'desc', label: 'Description' },
      { key: 'vendor', label: 'Vendor' },
      { key: 'reference', label: 'Reference' },
      { key: 'amount', label: 'Amount (₹)' },
    ]);
    toast.success(`Exported ${filteredExps.length} expenses to CSV`);
  };

  return (
    <div>
      <SectionHeader
        title="Finance"
        subtitle="Track payments, expenses, refunds — with charts, filters & CSV export."
        accent="emerald"
        actions={
          <>
            <Button onClick={() => setShowPay(true)} className="h-9 bg-emerald-500 hover:bg-emerald-600">
              <Plus className="h-4 w-4" /> Payment
            </Button>
            <Button variant="outline" onClick={() => setShowExp(true)} className="h-9">
              <Plus className="h-4 w-4" /> Expense
            </Button>
          </>
        }
      />

      {/* ===== Summary stat cards with trends ===== */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        <StatCard
          label="Total Revenue" value={Rs(tRev)} tone="primary"
          icon={<IndianRupee className="h-4 w-4" />}
        />
        <StatCard
          label="Received" value={Rs(hasActiveFilters ? fRec : rec)}
          icon={<TrendingUp className="h-4 w-4" />}
          trend={recTrendPct !== 0 ? { value: `${Math.abs(recTrendPct)}%`, direction: recTrendPct > 0 ? 'up' : 'down', label: 'vs last mo' } : undefined}
        />
        <StatCard
          label="Expenses" value={Rs(hasActiveFilters ? fExp : tExp)}
          icon={<TrendingDown className="h-4 w-4" />}
          trend={expTrendPct !== 0 ? { value: `${Math.abs(expTrendPct)}%`, direction: expTrendPct > 0 ? 'down' : 'up', label: 'vs last mo' } : undefined}
        />
        <StatCard
          label="Gross Profit" value={Rs(grossProfit)}
          tone={grossProfit >= 0 ? 'accent' : 'danger'}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          label={hasActiveFilters ? 'Net (filtered)' : 'Net Profit'}
          value={Rs((hasActiveFilters ? fRec : rec) - (hasActiveFilters ? fExp : tExp))}
          tone={(hasActiveFilters ? fRec : rec) - (hasActiveFilters ? fExp : tExp) >= 0 ? 'accent' : 'danger'}
        />
        {isOwner && <StatCard label="Refunds" value={Rs(tRef)} tone="danger" icon={<Undo2 className="h-4 w-4" />} />}
      </div>

      {/* ===== Charts row ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-5">
        <ChartCard
          title="Cash Flow — Last 6 Months"
          subtitle="Received vs Expenses by month"
          className="lg:col-span-2"
        >
          <ERPAreaChart
            data={cashFlowData}
            xKey="month"
            series={[
              { key: 'Received', label: 'Received', color: '#10b981' },
              { key: 'Expenses', label: 'Expenses', color: '#ef4444' },
            ]}
            height={260}
          />
        </ChartCard>
        <ChartCard
          title="Expenses by Category"
          subtitle="Where the money goes"
        >
          {expenseByCategory.length === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-xs text-muted-foreground">No expenses yet</div>
          ) : (
            <ERPDonutChart data={expenseByCategory} height={260} />
          )}
        </ChartCard>
      </div>

      {/* ===== Filters ===== */}
      <FilterBar label="Filters" onClear={clearFilters} showClear={hasActiveFilters || !!search}>
        <div className="flex items-center gap-1.5">
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-8 w-auto text-xs" />
          <span className="text-xs text-muted-foreground">→</span>
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-8 w-auto text-xs" />
        </div>
        <FilterChip label="All Types" active={!typeFilter} onClick={() => setTypeFilter('')} />
        {PAYMENT_TYPES.map((t) => (
          <FilterChip key={t} label={t} active={typeFilter === t} onClick={() => setTypeFilter(typeFilter === t ? '' : t)} />
        ))}
        <span className="text-muted-foreground/40 mx-1">|</span>
        <FilterChip label="All Modes" active={!modeFilter} onClick={() => setModeFilter('')} />
        {PAYMENT_MODES.map((m) => (
          <FilterChip key={m} label={m} active={modeFilter === m} onClick={() => setModeFilter(modeFilter === m ? '' : m)} color={PAYMENT_MODE_COLORS[m]} />
        ))}
      </FilterBar>

      {/* ===== Payments table ===== */}
      <TableShell
        title={`Payments (${filteredPays.length})`}
        search={search}
        onSearch={setSearch}
        toolbar={
          <Button variant="outline" size="sm" className="h-8" onClick={exportPayments} disabled={!filteredPays.length}>
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        }
      >
        <thead>
          <tr>
            <Th>Date</Th><Th>Project</Th><Th>Client</Th><Th>Type</Th>
            <Th>Mode</Th><Th>Reference</Th><Th>Amount</Th><Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {filteredPays.length === 0 ? (
            <EmptyState icon={<Coins className="h-8 w-8" />} message="No payments match the current filters" />
          ) : filteredPays.map((p) => (
            <tr key={p.id} className="hover:bg-muted/30">
              <Td className="whitespace-nowrap">{fD(p.date)}</Td>
              <Td className="font-mono text-xs">{p.projectId}</Td>
              <Td className="font-semibold">{p.client}</Td>
              <Td>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  p.type === 'Advance' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-emerald-500'
                  : p.type === 'Full' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-emerald-500'
                  : p.type === 'Final' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}>
                  {p.type === 'Advance' && <ArrowDownCircle className="h-3 w-3" />}
                  {p.type === 'Full' && <Check className="h-3 w-3" />}
                  {p.type === 'Final' && <ArrowUpCircle className="h-3 w-3" />}
                  {p.type === 'Mid' && <Wallet className="h-3 w-3" />}
                  {p.type}
                </span>
              </Td>
              <Td>
                <span className="inline-flex items-center gap-1.5 text-xs">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PAYMENT_MODE_COLORS[p.mode] || '#94a3b8' }} />
                  {p.mode}
                </span>
              </Td>
              <Td className="font-mono text-[11px] text-muted-foreground">{p.reference || '-'}</Td>
              <Td className="font-bold text-emerald-600">{Rs(p.amount)}</Td>
              <Td>
                <div className="flex items-center gap-1">
                  {p.note && (
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => toast.info(p.note || 'No note')} title={p.note}>
                      <Receipt className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {isOM && (
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditPay(p)} title="Edit payment">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {isOwner && (
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50" onClick={() => setDelPay(p.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </TableShell>

      {/* ===== Expenses table ===== */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm mb-5">
        <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 border-b border-border">
          <div className="text-sm font-bold">Expenses ({filteredExps.length})</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8" onClick={exportExpenses} disabled={!filteredExps.length}>
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
          </div>
        </div>
        {/* Category filter chips for expenses */}
        <div className="flex flex-wrap items-center gap-1.5 p-3 border-b border-border bg-muted/20">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Category:</span>
          <FilterChip label="All" active={!expCatFilter} onClick={() => setExpCatFilter('')} />
          {EXPENSE_CATEGORIES.map((c) => (
            <FilterChip
              key={c}
              label={c}
              active={expCatFilter === c}
              onClick={() => setExpCatFilter(expCatFilter === c ? '' : c)}
              color={EXPENSE_CATEGORY_COLORS[c]}
              count={expenses.filter((e) => e.category === c).length}
            />
          ))}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <Th>Date</Th><Th>Category</Th><Th>Description</Th><Th>Vendor</Th><Th>Reference</Th><Th>Amount</Th><Th></Th>
            </tr>
          </thead>
          <tbody>
            {filteredExps.length === 0 ? (
              <EmptyState message="No expenses match the current filters" />
            ) : filteredExps.map((e) => (
              <tr key={e.id} className="hover:bg-muted/30">
                <Td className="whitespace-nowrap">{fD(e.date)}</Td>
                <Td>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: EXPENSE_CATEGORY_COLORS[e.category] || '#94a3b8' }} />
                    {e.category}
                  </span>
                </Td>
                <Td>{e.desc}</Td>
                <Td className="text-muted-foreground">{e.vendor || '-'}</Td>
                <Td className="font-mono text-[11px] text-muted-foreground">{e.reference || '-'}</Td>
                <Td className="font-bold text-red-500">{Rs(e.amount)}</Td>
                <Td>
                  <div className="flex items-center gap-1">
                    {isOM && (
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditExp(e)} title="Edit expense">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {isOwner && (
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50" onClick={() => setDelExp(e.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ===== Payment mode breakdown (small donut) + Refunds table ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-5">
        {paymentByMode.length > 0 && (
          <ChartCard title="Payments by Mode" subtitle="Distribution of received amounts">
            <ERPDonutChart data={paymentByMode} height={220} />
          </ChartCard>
        )}
        {isOwner && (
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="p-3.5 border-b border-border text-sm font-bold flex items-center gap-2">
              <Undo2 className="h-4 w-4 text-red-500" /> Refund History ({refunds.length})
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr><Th>ID</Th><Th>Date</Th><Th>Project</Th><Th>Client</Th><Th>Amount</Th><Th>Reason</Th></tr>
              </thead>
              <tbody>
                {refunds.length === 0 ? (
                  <EmptyState message="No refunds" />
                ) : refunds.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <Td><strong>{r.id}</strong></Td>
                    <Td>{fD(r.date)}</Td>
                    <Td>{r.projectId}</Td>
                    <Td>{r.client}</Td>
                    <Td className="font-bold text-red-500">{Rs(r.amount)}</Td>
                    <Td className="text-xs text-muted-foreground">{r.reason}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===== Modals ===== */}
      <NewPaymentModal open={showPay} onOpenChange={setShowPay} projects={projects.map((p) => ({ id: p.id, client: p.client }))} onCreate={(data) => {
        createPayment(data);
        toast.success(`Payment ${Rs(data.amount)} recorded!`);
        setShowPay(false);
      }} />

      <NewExpenseModal open={showExp} onOpenChange={setShowExp} onCreate={(cat, amt, desc, vendor, reference) => {
        createExpense(cat, amt, desc, vendor, reference);
        toast.success('Expense added');
        setShowExp(false);
      }} />

      <ConfirmDialog open={!!delPay} onOpenChange={(v) => !v && setDelPay(null)} title={`Delete Payment ${delPay}?`} message="Moved to Recycle Bin." confirmLabel="Delete" onConfirm={() => { if (delPay) { deletePayment(delPay); toast.error('Deleted'); } }} />
      <ConfirmDialog open={!!delExp} onOpenChange={(v) => !v && setDelExp(null)} title="Delete Expense?" message="Moved to Recycle Bin." confirmLabel="Delete" onConfirm={() => { if (delExp) { deleteExpense(delExp); toast.error('Deleted'); } }} />

      {/* Edit Payment Modal */}
      {editPay && (
        <EditPaymentModal
          payment={editPay}
          onOpenChange={(v) => !v && setEditPay(null)}
          onSave={(patch) => {
            updatePayment(editPay.id, patch);
            toast.success('Payment updated');
            setEditPay(null);
          }}
        />
      )}

      {/* Edit Expense Modal */}
      {editExp && (
        <EditExpenseModal
          expense={editExp}
          onOpenChange={(v) => !v && setEditExp(null)}
          onSave={(patch) => {
            updateExpense(editExp.id, patch);
            toast.success('Expense updated');
            setEditExp(null);
          }}
        />
      )}
    </div>
  );
}

// Re-export Check icon used in payment type badge
import { Check } from 'lucide-react';

function NewPaymentModal({ open, onOpenChange, projects, onCreate }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projects: { id: string; client: string }[];
  onCreate: (data: { projectId: string; amount: number; type: string; mode: string; reference?: string; note?: string; date?: string }) => void;
}) {
  const [pid, setPid] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [type, setType] = React.useState('Advance');
  const [mode, setMode] = React.useState('Bank Transfer');
  const [reference, setReference] = React.useState('');
  const [note, setNote] = React.useState('');
  const [date, setDate] = React.useState(today());

  React.useEffect(() => { if (open && projects.length) { setPid(projects[0].id); setDate(today()); } }, [open, projects]);

  const client = projects.find((p) => p.id === pid)?.client || '';

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="New Payment" size="lg"
      footer={<><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={() => {
          const amt = parseInt(amount) || 0;
          if (!amt) { toast.error('Amount zaroori'); return; }
          onCreate({ projectId: pid, amount: amt, type, mode, reference: reference.trim() || undefined, note: note.trim() || undefined, date });
          setAmount(''); setReference(''); setNote('');
        }}>Add</Button></>}
    >
      <Field label="Project">
        <Select value={pid} onValueChange={setPid}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.id} — {p.client}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Client"><Input value={client} readOnly /></Field>
        <Field label="Date (for old/new transactions)"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Amount (₹)"><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="25000" /></Field>
        <Field label="Type">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PAYMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Mode">
          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PAYMENT_MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Reference No. (UTR / Cheque / Transaction ID)">
        <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UTR9821347" className="font-mono" />
      </Field>
      <Field label="Note (optional)">
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="NEFT - HDFC Bank, settled same day" />
      </Field>
    </Modal>
  );
}

function NewExpenseModal({ open, onOpenChange, onCreate }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (cat: string, amt: number, desc: string, vendor?: string, reference?: string, date?: string) => void;
}) {
  const [cat, setCat] = React.useState('Printing');
  const [amount, setAmount] = React.useState('');
  const [desc, setDesc] = React.useState('');
  const [vendor, setVendor] = React.useState('');
  const [reference, setReference] = React.useState('');
  const [date, setDate] = React.useState(today());

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="New Expense" size="lg"
      footer={<><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button className="bg-slate-900 hover:bg-slate-800" onClick={() => {
          const amt = parseInt(amount) || 0;
          if (!amt) { toast.error('Amount zaroori'); return; }
          onCreate(cat, amt, desc.trim(), vendor.trim() || undefined, reference.trim() || undefined, date);
          setAmount(''); setDesc(''); setVendor(''); setReference('');
        }}>Add</Button></>}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Category">
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Date (for old/new transactions)"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Amount (₹)"><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="5000" /></Field>
        <Field label="Vendor / Payee">
          <Input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="PrintMaster India" />
        </Field>
      </div>
      <Field label="Description">
        <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="PrintMaster bill - KD-0002 brochures" />
      </Field>
      <Field label="Bill / Invoice No.">
        <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="INV-PM-2291" className="font-mono" />
      </Field>
    </Modal>
  );
}

// ============ Edit Payment Modal ============
function EditPaymentModal({ payment, onOpenChange, onSave }: {
  payment: Payment;
  onOpenChange: (v: boolean) => void;
  onSave: (patch: Partial<Payment>) => void;
}) {
  const [amount, setAmount] = React.useState(String(payment.amount));
  const [type, setType] = React.useState(payment.type);
  const [mode, setMode] = React.useState(payment.mode);
  const [reference, setReference] = React.useState(payment.reference || '');
  const [note, setNote] = React.useState(payment.note || '');
  const [date, setDate] = React.useState(payment.date);

  return (
    <Modal open onOpenChange={onOpenChange} title={`Edit Payment: ${payment.id}`} size="lg"
      description={`${payment.client} · ${payment.projectId}`}
      footer={<><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={() => {
          const amt = parseInt(amount) || 0;
          if (!amt) { toast.error('Amount zaroori'); return; }
          onSave({ amount: amt, type, mode, reference: reference.trim() || undefined, note: note.trim() || undefined, date });
        }}>Save Changes</Button></>}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Amount (₹)"><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <Field label="Type">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PAYMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Mode">
          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PAYMENT_MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Reference No.">
        <Input value={reference} onChange={(e) => setReference(e.target.value)} className="font-mono" />
      </Field>
      <Field label="Note">
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </Modal>
  );
}

// ============ Edit Expense Modal ============
function EditExpenseModal({ expense, onOpenChange, onSave }: {
  expense: Expense;
  onOpenChange: (v: boolean) => void;
  onSave: (patch: Partial<Expense>) => void;
}) {
  const [cat, setCat] = React.useState(expense.category);
  const [amount, setAmount] = React.useState(String(expense.amount));
  const [desc, setDesc] = React.useState(expense.desc);
  const [vendor, setVendor] = React.useState(expense.vendor || '');
  const [reference, setReference] = React.useState(expense.reference || '');
  const [date, setDate] = React.useState(expense.date);

  return (
    <Modal open onOpenChange={onOpenChange} title={`Edit Expense: ${expense.id}`} size="lg"
      footer={<><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button className="bg-slate-900 hover:bg-slate-800" onClick={() => {
          const amt = parseInt(amount) || 0;
          if (!amt) { toast.error('Amount zaroori'); return; }
          onSave({ category: cat, amount: amt, desc: desc.trim(), vendor: vendor.trim() || undefined, reference: reference.trim() || undefined, date });
        }}>Save Changes</Button></>}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Category">
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Amount (₹)"><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <Field label="Vendor / Payee"><Input value={vendor} onChange={(e) => setVendor(e.target.value)} /></Field>
      </div>
      <Field label="Description"><Input value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
      <Field label="Bill / Invoice No."><Input value={reference} onChange={(e) => setReference(e.target.value)} className="font-mono" /></Field>
    </Modal>
  );
}
