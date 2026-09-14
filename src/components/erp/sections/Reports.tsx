'use client';

import * as React from 'react';
import {
  CalendarDays, CalendarRange, CalendarClock, Package, Users,
  Download, FileText, Receipt, Scale, BookOpen,
  TrendingUp, TrendingDown, IndianRupee,
} from 'lucide-react';
import { toast } from 'sonner';
import { useERP } from '@/lib/erp/store';
import { Rs, fD, monthLabel, yearOf, today, matchSearch } from '@/lib/erp/utils';
import { exportToCSV } from '@/lib/erp/csv';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { SectionHeader, StatCard, TableShell, Th, Td, EmptyState, FilterBar, FilterChip } from '../ui';
import { ChartCard, ERPBarChart, ERPLineChart, ERPDonutChart, CHART_COLORS } from '../charts';
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_COLORS } from '@/lib/erp/constants';

export function Reports() {
  return (
    <div>
      <SectionHeader
        title="Reports"
        subtitle="Daily · Monthly · Annual · Item-wise · Party-wise · GST · P&L · Party Ledger — with charts & CSV export."
        accent="emerald"
      />

      <Tabs defaultValue="daily">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 mb-4 h-auto gap-1">
          <TabsTrigger value="daily" className="text-xs gap-1.5 py-2"><CalendarDays className="h-3.5 w-3.5" /> Daily</TabsTrigger>
          <TabsTrigger value="monthly" className="text-xs gap-1.5 py-2"><CalendarRange className="h-3.5 w-3.5" /> Monthly</TabsTrigger>
          <TabsTrigger value="annual" className="text-xs gap-1.5 py-2"><CalendarClock className="h-3.5 w-3.5" /> Annual</TabsTrigger>
          <TabsTrigger value="itemwise" className="text-xs gap-1.5 py-2"><Package className="h-3.5 w-3.5" /> Item-wise</TabsTrigger>
          <TabsTrigger value="partywise" className="text-xs gap-1.5 py-2"><Users className="h-3.5 w-3.5" /> Party-wise</TabsTrigger>
          <TabsTrigger value="gst" className="text-xs gap-1.5 py-2"><Receipt className="h-3.5 w-3.5" /> GST</TabsTrigger>
          <TabsTrigger value="pl" className="text-xs gap-1.5 py-2"><Scale className="h-3.5 w-3.5" /> P & L</TabsTrigger>
          <TabsTrigger value="ledger" className="text-xs gap-1.5 py-2"><BookOpen className="h-3.5 w-3.5" /> Party Ledger</TabsTrigger>
        </TabsList>

        <TabsContent value="daily"><DailyReport /></TabsContent>
        <TabsContent value="monthly"><MonthlyReport /></TabsContent>
        <TabsContent value="annual"><AnnualReport /></TabsContent>
        <TabsContent value="itemwise"><ItemWiseReport /></TabsContent>
        <TabsContent value="partywise"><PartyWiseReport /></TabsContent>
        <TabsContent value="gst"><GSTReport /></TabsContent>
        <TabsContent value="pl"><PLReport /></TabsContent>
        <TabsContent value="ledger"><PartyLedgerReport /></TabsContent>
      </Tabs>
    </div>
  );
}

// ============ Helper: Export button ============
function ExportButton({ onClick, disabled, label = 'CSV' }: { onClick: () => void; disabled?: boolean; label?: string }) {
  return (
    <Button variant="outline" size="sm" className="h-8" onClick={onClick} disabled={disabled}>
      <Download className="h-3.5 w-3.5" /> {label}
    </Button>
  );
}

// ============ Daily ============
function DailyReport() {
  const payments = useERP((s) => s.payments);
  const expenses = useERP((s) => s.expenses);
  const [date, setDate] = React.useState(today());

  const dayPay = payments.filter((p) => p.date === date);
  const dayExp = expenses.filter((e) => e.date === date);
  const totalPay = dayPay.reduce((s, p) => s + p.amount, 0);
  const totalExp = dayExp.reduce((s, e) => s + e.amount, 0);

  const exportCsv = () => {
    const rows = [
      ...dayPay.map((p) => ({ date: p.date, type: 'Payment', id: p.id, party: p.client, category: p.type, mode: p.mode, reference: p.reference || '', amount: p.amount })),
      ...dayExp.map((e) => ({ date: e.date, type: 'Expense', id: e.id, party: e.vendor || '-', category: e.category, mode: '-', reference: e.reference || '', amount: -e.amount })),
    ];
    exportToCSV(`daily-report-${date}.csv`, rows, [
      { key: 'date', label: 'Date' },
      { key: 'type', label: 'Type' },
      { key: 'id', label: 'ID' },
      { key: 'party', label: 'Party' },
      { key: 'category', label: 'Category' },
      { key: 'mode', label: 'Mode' },
      { key: 'reference', label: 'Reference' },
      { key: 'amount', label: 'Amount (₹)' },
    ]);
    toast.success(`Exported daily report for ${fD(date)}`);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
        <ExportButton onClick={exportCsv} disabled={!dayPay.length && !dayExp.length} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        <StatCard label={`Payments (${dayPay.length})`} value={Rs(totalPay)} tone="accent" icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label={`Expenses (${dayExp.length})`} value={Rs(totalExp)} icon={<TrendingDown className="h-4 w-4" />} />
        <StatCard label="Net" value={Rs(totalPay - totalExp)} tone={totalPay - totalExp >= 0 ? 'accent' : 'danger'} />
      </div>

      <TableShell title={`Payments on ${fD(date)}`}>
        <thead><tr><Th>Date</Th><Th>Project</Th><Th>Client</Th><Th>Type</Th><Th>Mode</Th><Th>Reference</Th><Th>Amount</Th></tr></thead>
        <tbody>
          {dayPay.length === 0 ? <EmptyState message="No payments on this date" /> : dayPay.map((p) => (
            <tr key={p.id} className="hover:bg-muted/30"><Td>{fD(p.date)}</Td><Td>{p.projectId}</Td><Td>{p.client}</Td><Td>{p.type}</Td><Td>{p.mode}</Td><Td className="font-mono text-[11px] text-muted-foreground">{p.reference || '-'}</Td><Td className="font-bold">{Rs(p.amount)}</Td></tr>
          ))}
        </tbody>
      </TableShell>

      <TableShell title={`Expenses on ${fD(date)}`}>
        <thead><tr><Th>Date</Th><Th>Category</Th><Th>Vendor</Th><Th>Description</Th><Th>Reference</Th><Th>Amount</Th></tr></thead>
        <tbody>
          {dayExp.length === 0 ? <EmptyState message="No expenses on this date" /> : dayExp.map((e) => (
            <tr key={e.id} className="hover:bg-muted/30"><Td>{fD(e.date)}</Td><Td>{e.category}</Td><Td>{e.vendor || '-'}</Td><Td>{e.desc}</Td><Td className="font-mono text-[11px] text-muted-foreground">{e.reference || '-'}</Td><Td className="font-bold">{Rs(e.amount)}</Td></tr>
          ))}
        </tbody>
      </TableShell>
    </div>
  );
}

// ============ Monthly ============
function MonthlyReport() {
  const payments = useERP((s) => s.payments);
  const expenses = useERP((s) => s.expenses);

  const groups: Record<string, { pay: number; exp: number; payCount: number; expCount: number }> = {};
  payments.forEach((p) => {
    const k = p.date.slice(0, 7);
    if (!groups[k]) groups[k] = { pay: 0, exp: 0, payCount: 0, expCount: 0 };
    groups[k].pay += p.amount; groups[k].payCount++;
  });
  expenses.forEach((e) => {
    const k = e.date.slice(0, 7);
    if (!groups[k]) groups[k] = { pay: 0, exp: 0, payCount: 0, expCount: 0 };
    groups[k].exp += e.amount; groups[k].expCount++;
  });
  const rows = Object.keys(groups).sort().reverse();
  const totalPay = payments.reduce((s, p) => s + p.amount, 0);
  const totalExp = expenses.reduce((s, e) => s + e.amount, 0);

  // Chart data (chronological order)
  const chartData = rows.slice().reverse().map((k) => ({
    month: monthLabel(k + '-01'),
    Received: groups[k].pay,
    Expenses: groups[k].exp,
    Net: groups[k].pay - groups[k].exp,
  }));

  const exportCsv = () => {
    const csvRows = rows.map((k) => ({
      month: monthLabel(k + '-01'),
      payments: groups[k].pay,
      payCount: groups[k].payCount,
      expenses: groups[k].exp,
      expCount: groups[k].expCount,
      net: groups[k].pay - groups[k].exp,
    }));
    exportToCSV(`monthly-report-${today()}.csv`, csvRows, [
      { key: 'month', label: 'Month' },
      { key: 'payments', label: 'Payments (₹)' },
      { key: 'payCount', label: '# Payments' },
      { key: 'expenses', label: 'Expenses (₹)' },
      { key: 'expCount', label: '# Expenses' },
      { key: 'net', label: 'Net (₹)' },
    ]);
    toast.success('Exported monthly report');
  };

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        <StatCard label="Total Receipts" value={Rs(totalPay)} tone="accent" icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Total Expenses" value={Rs(totalExp)} icon={<TrendingDown className="h-4 w-4" />} />
        <StatCard label="Net Profit" value={Rs(totalPay - totalExp)} tone={totalPay - totalExp >= 0 ? 'accent' : 'danger'} />
      </div>

      {chartData.length > 0 && (
        <ChartCard title="Monthly Trend" subtitle="Received vs Expenses vs Net" className="mb-5">
          <ERPBarChart
            data={chartData}
            xKey="month"
            bars={[
              { key: 'Received', label: 'Received', color: CHART_COLORS.emerald },
              { key: 'Expenses', label: 'Expenses', color: CHART_COLORS.red },
              { key: 'Net', label: 'Net', color: CHART_COLORS.blue },
            ]}
            height={280}
          />
        </ChartCard>
      )}

      <TableShell title="Month-wise Summary" toolbar={<ExportButton onClick={exportCsv} disabled={!rows.length} />}>
        <thead><tr><Th>Month</Th><Th>Payments</Th><Th># Pays</Th><Th>Expenses</Th><Th># Exps</Th><Th>Net</Th></tr></thead>
        <tbody>
          {rows.length === 0 ? <EmptyState message="No data" /> : rows.map((k) => {
            const g = groups[k];
            return (
              <tr key={k} className="hover:bg-muted/30">
                <Td className="font-bold">{monthLabel(k + '-01')}</Td>
                <Td className="font-bold text-emerald-600">{Rs(g.pay)}</Td>
                <Td>{g.payCount}</Td>
                <Td className="font-bold text-red-500">{Rs(g.exp)}</Td>
                <Td>{g.expCount}</Td>
                <Td className={`font-bold ${g.pay - g.exp >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{Rs(g.pay - g.exp)}</Td>
              </tr>
            );
          })}
        </tbody>
      </TableShell>
    </div>
  );
}

// ============ Annual ============
function AnnualReport() {
  const payments = useERP((s) => s.payments);
  const expenses = useERP((s) => s.expenses);

  const groups: Record<string, { pay: number; exp: number; payCount: number; expCount: number }> = {};
  payments.forEach((p) => {
    const k = yearOf(p.date);
    if (!groups[k]) groups[k] = { pay: 0, exp: 0, payCount: 0, expCount: 0 };
    groups[k].pay += p.amount; groups[k].payCount++;
  });
  expenses.forEach((e) => {
    const k = yearOf(e.date);
    if (!groups[k]) groups[k] = { pay: 0, exp: 0, payCount: 0, expCount: 0 };
    groups[k].exp += e.amount; groups[k].expCount++;
  });
  const rows = Object.keys(groups).sort().reverse();
  const chartData = rows.slice().reverse().map((k) => ({
    year: k,
    Received: groups[k].pay,
    Expenses: groups[k].exp,
    Net: groups[k].pay - groups[k].exp,
  }));

  const exportCsv = () => {
    const csvRows = rows.map((k) => ({
      year: k,
      payments: groups[k].pay,
      payCount: groups[k].payCount,
      expenses: groups[k].exp,
      expCount: groups[k].expCount,
      net: groups[k].pay - groups[k].exp,
      avgPerMonth: Math.round((groups[k].pay - groups[k].exp) / 12),
    }));
    exportToCSV(`annual-report-${today()}.csv`, csvRows, [
      { key: 'year', label: 'Year' },
      { key: 'payments', label: 'Payments (₹)' },
      { key: 'payCount', label: '# Payments' },
      { key: 'expenses', label: 'Expenses (₹)' },
      { key: 'expCount', label: '# Expenses' },
      { key: 'net', label: 'Net (₹)' },
      { key: 'avgPerMonth', label: 'Avg / Month (₹)' },
    ]);
    toast.success('Exported annual report');
  };

  return (
    <div>
      {chartData.length > 0 && (
        <ChartCard title="Yearly Comparison" subtitle="Received vs Expenses vs Net" className="mb-5">
          <ERPBarChart
            data={chartData}
            xKey="year"
            bars={[
              { key: 'Received', label: 'Received', color: CHART_COLORS.emerald },
              { key: 'Expenses', label: 'Expenses', color: CHART_COLORS.red },
              { key: 'Net', label: 'Net', color: CHART_COLORS.blue },
            ]}
            height={280}
          />
        </ChartCard>
      )}

      <TableShell title="Annual Summary" toolbar={<ExportButton onClick={exportCsv} disabled={!rows.length} />}>
        <thead><tr><Th>Year</Th><Th>Payments</Th><Th># Pays</Th><Th>Expenses</Th><Th># Exps</Th><Th>Net</Th><Th>Avg / Month</Th></tr></thead>
        <tbody>
          {rows.length === 0 ? <EmptyState message="No data" /> : rows.map((k) => {
            const g = groups[k];
            return (
              <tr key={k} className="hover:bg-muted/30">
                <Td className="font-bold text-base">{k}</Td>
                <Td className="font-bold text-emerald-600">{Rs(g.pay)}</Td>
                <Td>{g.payCount}</Td>
                <Td className="font-bold text-red-500">{Rs(g.exp)}</Td>
                <Td>{g.expCount}</Td>
                <Td className={`font-bold ${g.pay - g.exp >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{Rs(g.pay - g.exp)}</Td>
                <Td className="text-muted-foreground">{Rs(Math.round((g.pay - g.exp) / 12))}</Td>
              </tr>
            );
          })}
        </tbody>
      </TableShell>
    </div>
  );
}

// ============ Item-wise ============
function ItemWiseReport() {
  const projects = useERP((s) => s.projects);
  const quotations = useERP((s) => s.quotations);
  const items = useERP((s) => s.items);
  const [search, setSearch] = React.useState('');

  const agg: Record<string, { name: string; qty: number; revenue: number; sold: number; quoted: number }> = {};

  projects.forEach((p) => {
    if (p.cancelled) return;
    p.products.forEach((pr) => {
      const key = pr.itemId || pr.name;
      if (!agg[key]) agg[key] = { name: pr.name, qty: 0, revenue: 0, sold: 0, quoted: 0 };
      agg[key].qty += pr.qty;
      agg[key].revenue += pr.qty * pr.rate;
      agg[key].sold++;
    });
  });
  quotations.forEach((q) => {
    q.items.forEach((it) => {
      const key = it.itemId || it.name;
      if (!agg[key]) agg[key] = { name: it.name, qty: 0, revenue: 0, sold: 0, quoted: 0 };
      agg[key].quoted += it.qty;
    });
  });

  const rows = Object.entries(agg)
    .map(([k, v]) => ({ id: k, ...v, item: items.find((i) => i.id === k) }))
    .filter((r) => matchSearch(`${r.id} ${r.name}`, search))
    .sort((a, b) => b.revenue - a.revenue);

  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalQty = rows.reduce((s, r) => s + r.qty, 0);

  // Top 5 items chart
  const top5 = rows.slice(0, 5).map((r) => ({ name: r.name, Revenue: r.revenue, Qty: r.qty }));

  const exportCsv = () => {
    exportToCSV(`item-wise-report-${today()}.csv`, rows, [
      { key: 'id', label: 'Item ID' },
      { key: 'name', label: 'Name' },
      { key: 'category' as any, label: 'Category', format: (_: any, r: any) => r.item?.category || '-' },
      { key: 'qty', label: 'Qty Sold' },
      { key: 'sold', label: '# Projects' },
      { key: 'quoted', label: 'Qty Quoted' },
      { key: 'revenue', label: 'Revenue (₹)' },
    ]);
    toast.success('Exported item-wise report');
  };

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        <StatCard label="Total Items Sold" value={totalQty.toLocaleString('en-IN')} tone="primary" icon={<Package className="h-4 w-4" />} />
        <StatCard label="Total Revenue" value={Rs(totalRevenue)} tone="accent" icon={<IndianRupee className="h-4 w-4" />} />
        <StatCard label="Unique Items" value={rows.length} />
      </div>

      {top5.length > 0 && (
        <ChartCard title="Top 5 Items by Revenue" subtitle="Best-selling items" className="mb-5">
          <ERPBarChart
            data={top5}
            xKey="name"
            bars={[{ key: 'Revenue', label: 'Revenue', color: CHART_COLORS.emerald }]}
            height={260}
            showLegend={false}
          />
        </ChartCard>
      )}

      <TableShell
        title="Item-wise Sales & Quotation Report"
        search={search}
        onSearch={setSearch}
        toolbar={<ExportButton onClick={exportCsv} disabled={!rows.length} />}
      >
        <thead>
          <tr><Th>Item ID</Th><Th>Name</Th><Th>Category</Th><Th>Stock</Th><Th>Sold (Projects)</Th><Th>Quoted</Th><Th>Revenue</Th><Th>% of Total</Th></tr>
        </thead>
        <tbody>
          {rows.length === 0 ? <EmptyState icon={<Package className="h-8 w-8" />} message="No items sold yet" /> : rows.map((r) => (
            <tr key={r.id} className="hover:bg-muted/30">
              <Td className="font-mono text-xs text-muted-foreground">{r.id}</Td>
              <Td className="font-bold">{r.name}</Td>
              <Td className="text-muted-foreground">{r.item?.category || '-'}</Td>
              <Td>{r.item ? r.item.stock.toLocaleString('en-IN') : '-'} {r.item?.unit}</Td>
              <Td className="font-bold">{r.qty.toLocaleString('en-IN')}</Td>
              <Td>{r.quoted.toLocaleString('en-IN')}</Td>
              <Td className="font-bold text-emerald-600">{Rs(r.revenue)}</Td>
              <Td className="text-muted-foreground">{totalRevenue ? ((r.revenue / totalRevenue) * 100).toFixed(1) : '0'}%</Td>
            </tr>
          ))}
        </tbody>
      </TableShell>
    </div>
  );
}

// ============ Party-wise ============
function PartyWiseReport() {
  const projects = useERP((s) => s.projects);
  const quotations = useERP((s) => s.quotations);
  const [search, setSearch] = React.useState('');

  const parties: Record<string, {
    name: string; projectValue: number; received: number; due: number; quotes: number; projectCount: number;
  }> = {};

  projects.forEach((p) => {
    if (!parties[p.client]) parties[p.client] = { name: p.client, projectValue: 0, received: 0, due: 0, quotes: 0, projectCount: 0 };
    parties[p.client].projectValue += p.value;
    parties[p.client].received += p.advance;
    parties[p.client].due += Math.max(0, p.value - p.advance);
    parties[p.client].projectCount++;
  });
  quotations.forEach((q) => {
    if (!parties[q.client]) parties[q.client] = { name: q.client, projectValue: 0, received: 0, due: 0, quotes: 0, projectCount: 0 };
    parties[q.client].quotes++;
  });

  const rows = Object.values(parties)
    .filter((r) => matchSearch(r.name, search))
    .sort((a, b) => b.projectValue - a.projectValue);

  const totalValue = rows.reduce((s, r) => s + r.projectValue, 0);
  const totalReceived = rows.reduce((s, r) => s + r.received, 0);
  const totalDue = rows.reduce((s, r) => s + r.due, 0);

  // Top 5 parties chart
  const top5 = rows.slice(0, 5).map((r) => ({
    name: r.name.length > 12 ? r.name.slice(0, 11) + '…' : r.name,
    Received: r.received,
    Due: r.due,
  }));

  const exportCsv = () => {
    exportToCSV(`party-wise-report-${today()}.csv`, rows, [
      { key: 'name', label: 'Party' },
      { key: 'projectCount', label: '# Projects' },
      { key: 'quotes', label: '# Quotations' },
      { key: 'projectValue', label: 'Project Value (₹)' },
      { key: 'received', label: 'Received (₹)' },
      { key: 'due', label: 'Due (₹)' },
    ]);
    toast.success('Exported party-wise report');
  };

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Parties" value={rows.length} tone="primary" icon={<Users className="h-4 w-4" />} />
        <StatCard label="Total Project Value" value={Rs(totalValue)} />
        <StatCard label="Total Received" value={Rs(totalReceived)} tone="accent" />
        <StatCard label="Total Due" value={Rs(totalDue)} tone={totalDue > 0 ? 'warn' : 'default'} />
      </div>

      {top5.length > 0 && (
        <ChartCard title="Top 5 Parties — Received vs Due" subtitle="Outstanding by client" className="mb-5">
          <ERPBarChart
            data={top5}
            xKey="name"
            bars={[
              { key: 'Received', label: 'Received', color: CHART_COLORS.emerald },
              { key: 'Due', label: 'Due', color: CHART_COLORS.red },
            ]}
            height={260}
          />
        </ChartCard>
      )}

      <TableShell title="Party-wise Summary" search={search} onSearch={setSearch} toolbar={<ExportButton onClick={exportCsv} disabled={!rows.length} />}>
        <thead>
          <tr><Th>Party / Client</Th><Th>Projects</Th><Th>Quotations</Th><Th>Project Value</Th><Th>Received</Th><Th>Due</Th><Th>% Received</Th></tr>
        </thead>
        <tbody>
          {rows.length === 0 ? <EmptyState icon={<Users className="h-8 w-8" />} message="No parties yet" /> : rows.map((r) => (
            <tr key={r.name} className="hover:bg-muted/30">
              <Td className="font-bold">{r.name}</Td>
              <Td>{r.projectCount}</Td>
              <Td>{r.quotes}</Td>
              <Td className="font-bold">{Rs(r.projectValue)}</Td>
              <Td className="font-bold text-emerald-600">{Rs(r.received)}</Td>
              <Td className="font-bold text-red-500">{Rs(r.due)}</Td>
              <Td className="text-muted-foreground">{r.projectValue ? ((r.received / r.projectValue) * 100).toFixed(1) : '0'}%</Td>
            </tr>
          ))}
        </tbody>
      </TableShell>
    </div>
  );
}

// ============ NEW: GST Report ============
function GSTReport() {
  const projects = useERP((s) => s.projects);
  const quotations = useERP((s) => s.quotations);
  const [period, setPeriod] = React.useState<string>('all'); // 'all' or 'YYYY-MM'

  // Aggregate GST from project products (output) + expenses (input)
  // Output GST: 18% on project product totals (cancelled excluded)
  // Input GST: assume 18% on Printing/Material expenses (simplified)
  const outputRows = projects
    .filter((p) => !p.cancelled)
    .filter((p) => period === 'all' || p.createdAt.slice(0, 7) === period)
    .flatMap((p) => p.products.map((pr) => ({
      projectId: p.id,
      client: p.client,
      date: p.createdAt,
      item: pr.name,
      qty: pr.qty,
      rate: pr.rate,
      taxable: pr.qty * pr.rate,
      gstRate: 18,
      gstAmount: Math.round(pr.qty * pr.rate * 0.18),
      total: pr.qty * pr.rate + Math.round(pr.qty * pr.rate * 0.18),
    })));

  const expenses = useERP((s) => s.expenses);
  const inputRows = expenses
    .filter((e) => ['Printing', 'Material'].includes(e.category))
    .filter((e) => period === 'all' || e.date.slice(0, 7) === period)
    .map((e) => ({
      id: e.id,
      date: e.date,
      vendor: e.vendor || '-',
      category: e.category,
      desc: e.desc,
      taxable: e.amount,
      gstRate: 18,
      gstAmount: Math.round(e.amount * 0.18 / 1.18), // reverse-calc (amount is GST-inclusive)
      total: e.amount,
    }));

  const totalOutputGST = outputRows.reduce((s, r) => s + r.gstAmount, 0);
  const totalInputGST = inputRows.reduce((s, r) => s + r.gstAmount, 0);
  const netGST = totalOutputGST - totalInputGST;

  // Available months for the period filter
  const allMonths = Array.from(new Set([
    ...projects.map((p) => p.createdAt.slice(0, 7)),
    ...expenses.map((e) => e.date.slice(0, 7)),
  ])).sort().reverse();

  const exportCsv = () => {
    const rows = [
      ...outputRows.map((r) => ({ type: 'Output GST (Sales)', id: r.projectId, date: r.date, party: r.client, description: r.item, taxable: r.taxable, gstRate: r.gstRate, gst: r.gstAmount, total: r.total })),
      ...inputRows.map((r) => ({ type: 'Input GST (Purchases)', id: r.id, date: r.date, party: r.vendor, description: r.desc, taxable: r.taxable, gstRate: r.gstRate, gst: r.gstAmount, total: r.total })),
    ];
    exportToCSV(`gst-report-${period}-${today()}.csv`, rows, [
      { key: 'type', label: 'Type' },
      { key: 'id', label: 'ID' },
      { key: 'date', label: 'Date' },
      { key: 'party', label: 'Party' },
      { key: 'description', label: 'Description' },
      { key: 'taxable', label: 'Taxable (₹)' },
      { key: 'gstRate', label: 'GST Rate (%)' },
      { key: 'gst', label: 'GST Amount (₹)' },
      { key: 'total', label: 'Total (₹)' },
    ]);
    toast.success('Exported GST report');
  };

  return (
    <div>
      <FilterBar label="Period">
        <FilterChip label="All Time" active={period === 'all'} onClick={() => setPeriod('all')} />
        {allMonths.map((m) => (
          <FilterChip key={m} label={monthLabel(m + '-01')} active={period === m} onClick={() => setPeriod(period === m ? 'all' : m)} />
        ))}
      </FilterBar>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <StatCard label="Output GST (Sales @18%)" value={Rs(totalOutputGST)} tone="accent" icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Input GST (Purchases @18%)" value={Rs(totalInputGST)} icon={<TrendingDown className="h-4 w-4" />} />
        <StatCard label={netGST >= 0 ? 'Net GST Payable' : 'Net GST Refund'} value={Rs(Math.abs(netGST))} tone={netGST >= 0 ? 'warn' : 'accent'} />
      </div>

      <TableShell title="Output GST (Sales)" toolbar={<ExportButton onClick={exportCsv} disabled={!outputRows.length && !inputRows.length} />}>
        <thead><tr><Th>Date</Th><Th>Project</Th><Th>Client</Th><Th>Item</Th><Th>Taxable</Th><Th>GST Rate</Th><Th>GST Amount</Th><Th>Total</Th></tr></thead>
        <tbody>
          {outputRows.length === 0 ? <EmptyState message="No sales in this period" /> : outputRows.map((r, i) => (
            <tr key={i} className="hover:bg-muted/30">
              <Td>{fD(r.date)}</Td><Td className="font-mono text-xs">{r.projectId}</Td><Td className="font-semibold">{r.client}</Td><Td>{r.item}</Td>
              <Td>{Rs(r.taxable)}</Td><Td>{r.gstRate}%</Td><Td className="font-bold text-emerald-600">{Rs(r.gstAmount)}</Td><Td className="font-bold">{Rs(r.total)}</Td>
            </tr>
          ))}
        </tbody>
      </TableShell>

      <TableShell title="Input GST (Purchases — Printing & Material)">
        <thead><tr><Th>Date</Th><Th>Vendor</Th><Th>Category</Th><Th>Description</Th><Th>Taxable</Th><Th>GST Rate</Th><Th>GST Amount</Th><Th>Total</Th></tr></thead>
        <tbody>
          {inputRows.length === 0 ? <EmptyState message="No eligible purchases in this period" /> : inputRows.map((r) => (
            <tr key={r.id} className="hover:bg-muted/30">
              <Td>{fD(r.date)}</Td><Td>{r.vendor}</Td><Td>{r.category}</Td><Td>{r.desc}</Td>
              <Td>{Rs(r.taxable)}</Td><Td>{r.gstRate}%</Td><Td className="font-bold text-red-500">{Rs(r.gstAmount)}</Td><Td className="font-bold">{Rs(r.total)}</Td>
            </tr>
          ))}
        </tbody>
      </TableShell>
    </div>
  );
}

// ============ NEW: Profit & Loss Statement ============
function PLReport() {
  const projects = useERP((s) => s.projects);
  const payments = useERP((s) => s.payments);
  const expenses = useERP((s) => s.expenses);
  const refunds = useERP((s) => s.refunds);
  const [year, setYear] = React.useState<string>('all');

  const availableYears = Array.from(new Set([
    ...projects.map((p) => yearOf(p.createdAt)),
    ...payments.map((p) => yearOf(p.date)),
    ...expenses.map((e) => yearOf(e.date)),
  ])).sort().reverse();

  const filter = (date: string) => year === 'all' || yearOf(date) === year;

  // Revenue = project values (non-cancelled), GST-exclusive
  const revenue = projects.filter((p) => !p.cancelled && filter(p.createdAt)).reduce((s, p) => s + p.value, 0);
  const gstCollected = Math.round(revenue * 0.18);
  const totalInvoiced = revenue + gstCollected;

  // COGS = Material + Printing expenses (simplified)
  const cogs = expenses.filter((e) => filter(e.date) && ['Material', 'Printing'].includes(e.category)).reduce((s, e) => s + e.amount, 0);
  const grossProfit = revenue - cogs;

  // Operating expenses = everything else
  const opExpenses = expenses.filter((e) => filter(e.date) && !['Material', 'Printing'].includes(e.category)).reduce((s, e) => s + e.amount, 0);
  const refundsTotal = refunds.filter((r) => filter(r.date)).reduce((s, r) => s + r.amount, 0);
  const netProfit = grossProfit - opExpenses - refundsTotal;

  // Expense breakdown for chart
  const expByCat: Record<string, number> = {};
  expenses.filter((e) => filter(e.date)).forEach((e) => { expByCat[e.category] = (expByCat[e.category] || 0) + e.amount; });
  const donutData = Object.entries(expByCat).map(([name, value]) => ({ name, value, color: EXPENSE_CATEGORY_COLORS[name] }));

  const exportCsv = () => {
    const rows = [
      { item: 'Revenue (Project Sales, ex-GST)', amount: revenue },
      { item: 'GST Collected (18%)', amount: gstCollected },
      { item: 'Total Invoiced (incl. GST)', amount: totalInvoiced },
      { item: '', amount: 0 },
      { item: 'Cost of Goods Sold (Material + Printing)', amount: -cogs },
      { item: 'Gross Profit', amount: grossProfit },
      { item: '', amount: 0 },
      ...Object.entries(expByCat).filter(([k]) => !['Material', 'Printing'].includes(k)).map(([k, v]) => ({ item: `Op Expense: ${k}`, amount: -v })),
      { item: 'Refunds', amount: -refundsTotal },
      { item: '', amount: 0 },
      { item: 'Net Profit', amount: netProfit },
    ];
    exportToCSV(`profit-loss-${year}-${today()}.csv`, rows, [
      { key: 'item', label: 'Line Item' },
      { key: 'amount', label: 'Amount (₹)' },
    ]);
    toast.success('Exported P&L statement');
  };

  return (
    <div>
      <FilterBar label="Financial Year">
        <FilterChip label="All Years" active={year === 'all'} onClick={() => setYear('all')} />
        {availableYears.map((y) => (
          <FilterChip key={y} label={y} active={year === y} onClick={() => setYear(year === y ? 'all' : y)} />
        ))}
      </FilterBar>

      {/* ===== P&L Summary stat cards ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Revenue" value={Rs(revenue)} tone="primary" icon={<IndianRupee className="h-4 w-4" />} />
        <StatCard label="COGS (Material + Printing)" value={Rs(cogs)} tone="danger" icon={<TrendingDown className="h-4 w-4" />} />
        <StatCard label="Gross Profit" value={Rs(grossProfit)} tone={grossProfit >= 0 ? 'accent' : 'danger'} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Net Profit" value={Rs(netProfit)} tone={netProfit >= 0 ? 'accent' : 'danger'} icon={<Scale className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-5">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="p-3.5 border-b border-border text-sm font-bold flex items-center gap-2">
            <Scale className="h-4 w-4 text-emerald-500" /> Profit & Loss Statement {year !== 'all' && `· FY ${year}`}
          </div>
          <div className="p-4 space-y-1 text-sm">
            <PLRow label="Revenue (Project Sales, ex-GST)" value={revenue} bold />
            <PLRow label="GST Collected (18%)" value={gstCollected} muted />
            <PLRow label="Total Invoiced (incl. GST)" value={totalInvoiced} bold border />
            <PLRow label="Cost of Goods Sold (Material + Printing)" value={-cogs} muted />
            <PLRow label="Gross Profit" value={grossProfit} bold border tone={grossProfit >= 0 ? 'accent' : 'danger'} />
            {Object.entries(expByCat).filter(([k]) => !['Material', 'Printing'].includes(k)).map(([k, v]) => (
              <PLRow key={k} label={`  ${k}`} value={-v} muted />
            ))}
            <PLRow label="Refunds" value={-refundsTotal} muted />
            <PLRow label="Net Profit" value={netProfit} bold border tone={netProfit >= 0 ? 'accent' : 'danger'} large />
          </div>
          <div className="p-3.5 border-t border-border flex justify-end">
            <ExportButton onClick={exportCsv} />
          </div>
        </div>
        <ChartCard title="Expense Distribution" subtitle="By category">
          {donutData.length === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-xs text-muted-foreground">No expenses</div>
          ) : (
            <ERPDonutChart data={donutData} height={260} />
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function PLRow({
  label, value, bold, muted, border, tone, large,
}: {
  label: string; value: number; bold?: boolean; muted?: boolean; border?: boolean; tone?: 'accent' | 'danger'; large?: boolean;
}) {
  const toneClass = tone === 'accent' ? 'text-emerald-600' : tone === 'danger' ? 'text-red-500' : value < 0 ? 'text-red-500' : '';
  return (
    <div className={`flex items-center justify-between py-1.5 ${border ? 'border-t border-border mt-1 pt-2' : ''}`}>
      <div className={`${bold ? 'font-bold' : muted ? 'text-muted-foreground' : ''} ${large ? 'text-base' : ''}`}>{label}</div>
      <div className={`font-mono ${bold ? 'font-black' : ''} ${large ? 'text-lg' : ''} ${toneClass}`}>{value < 0 ? '-' : ''}{Rs(Math.abs(value))}</div>
    </div>
  );
}

// ============ NEW: Party Ledger ============
function PartyLedgerReport() {
  const projects = useERP((s) => s.projects);
  const payments = useERP((s) => s.payments);
  const quotations = useERP((s) => s.quotations);
  const refunds = useERP((s) => s.refunds);

  // Build party list
  const partyNames = Array.from(new Set([
    ...projects.map((p) => p.client),
    ...payments.map((p) => p.client),
    ...quotations.map((q) => q.client),
  ])).sort();

  const [selected, setSelected] = React.useState<string>(partyNames[0] || '');

  React.useEffect(() => { if (!selected && partyNames.length) setSelected(partyNames[0]); }, [partyNames, selected]);

  if (!partyNames.length) {
    return <EmptyState icon={<BookOpen className="h-8 w-8" />} message="No parties to show ledger for" />;
  }

  // Build ledger entries for the selected party
  type Entry = { date: string; type: string; ref: string; description: string; debit: number; credit: number };
  const entries: Entry[] = [];

  // Project invoices (debit the party — they owe us)
  projects.filter((p) => p.client === selected && !p.cancelled).forEach((p) => {
    const sub = p.products.reduce((s, pr) => s + pr.qty * pr.rate, 0);
    const gst = Math.round(sub * 0.18);
    entries.push({ date: p.createdAt, type: 'Invoice', ref: p.id, description: `Project: ${p.title}`, debit: sub + gst, credit: 0 });
  });

  // Payments received (credit — reduces what they owe)
  payments.filter((p) => p.client === selected).forEach((p) => {
    entries.push({ date: p.date, type: 'Payment', ref: p.id, description: `${p.type} via ${p.mode}${p.reference ? ` (${p.reference})` : ''}`, debit: 0, credit: p.amount });
  });

  // Refunds (debit — we owe them back)
  refunds.filter((r) => r.client === selected).forEach((r) => {
    entries.push({ date: r.date, type: 'Refund', ref: r.id, description: r.reason, debit: r.amount, credit: 0 });
  });

  entries.sort((a, b) => b.date.localeCompare(a.date));

  // Running balance
  let balance = 0;
  const withBalance = entries.map((e) => {
    balance += e.debit - e.credit;
    return { ...e, balance };
  });

  const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0);
  const closing = totalDebit - totalCredit;

  const exportCsv = () => {
    exportToCSV(`ledger-${selected}-${today()}.csv`, withBalance, [
      { key: 'date', label: 'Date' },
      { key: 'type', label: 'Type' },
      { key: 'ref', label: 'Reference' },
      { key: 'description', label: 'Description' },
      { key: 'debit', label: 'Debit (₹)' },
      { key: 'credit', label: 'Credit (₹)' },
      { key: 'balance', label: 'Balance (₹)' },
    ]);
    toast.success(`Exported ledger for ${selected}`);
  };

  return (
    <div>
      <FilterBar label="Select Party">
        {partyNames.slice(0, 12).map((p) => (
          <FilterChip key={p} label={p} active={selected === p} onClick={() => setSelected(p)} />
        ))}
        {partyNames.length > 12 && (
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="h-8 w-48 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{partyNames.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
        )}
      </FilterBar>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <StatCard label="Total Invoiced (Debit)" value={Rs(totalDebit)} tone="primary" icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Total Received (Credit)" value={Rs(totalCredit)} tone="accent" icon={<TrendingDown className="h-4 w-4" />} />
        <StatCard label={closing >= 0 ? 'Closing Balance (Receivable)' : 'Closing Balance (Payable)'} value={Rs(Math.abs(closing))} tone={closing >= 0 ? 'warn' : 'danger'} />
      </div>

      <TableShell title={`Ledger Statement: ${selected}`} toolbar={<ExportButton onClick={exportCsv} disabled={!entries.length} />}>
        <thead>
          <tr><Th>Date</Th><Th>Type</Th><Th>Ref</Th><Th>Description</Th><Th>Debit</Th><Th>Credit</Th><Th>Balance</Th></tr>
        </thead>
        <tbody>
          {entries.length === 0 ? <EmptyState message="No transactions for this party" /> : withBalance.map((e, i) => (
            <tr key={i} className="hover:bg-muted/30">
              <Td className="whitespace-nowrap">{fD(e.date)}</Td>
              <Td>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  e.type === 'Invoice' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-emerald-500'
                  : e.type === 'Payment' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-emerald-500'
                  : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                }`}>{e.type}</span>
              </Td>
              <Td className="font-mono text-[11px] text-muted-foreground">{e.ref}</Td>
              <Td>{e.description}</Td>
              <Td className="font-bold text-red-500">{e.debit ? Rs(e.debit) : '-'}</Td>
              <Td className="font-bold text-emerald-600">{e.credit ? Rs(e.credit) : '-'}</Td>
              <Td className={`font-bold ${e.balance >= 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{Rs(Math.abs(e.balance))} {e.balance >= 0 ? 'Dr' : 'Cr'}</Td>
            </tr>
          ))}
        </tbody>
        {entries.length > 0 && (
          <tfoot>
            <tr className="border-t-2 border-border bg-muted/30">
              <Td className="font-black" colSpan={4}>Total</Td>
              <Td className="font-black text-red-500">{Rs(totalDebit)}</Td>
              <Td className="font-black text-emerald-600">{Rs(totalCredit)}</Td>
              <Td className={`font-black ${closing >= 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{Rs(Math.abs(closing))} {closing >= 0 ? 'Dr' : 'Cr'}</Td>
            </tr>
          </tfoot>
        )}
      </TableShell>
    </div>
  );
}
