'use client';

import * as React from 'react';
import {
  Users, FileText, CheckCircle2, Clock, Calendar, TrendingUp, Package,
  User, BarChart3, XCircle, Phone,
} from 'lucide-react';
import { useERP } from '@/lib/erp/store';
import { Rs, fD, today, monthLabel } from '@/lib/erp/utils';
import { DEPT_LABELS } from '@/lib/erp/constants';
import { cn } from '@/lib/utils';
import {
  SectionHeader, TableShell, Th, Td, EmptyState, StatCard, FilterBar, FilterChip,
} from '../ui';

type PeriodKey = 'daily' | 'weekly' | 'monthly' | 'yearly';

export function PerformanceReports() {
  const team = useERP((s) => s.team);
  const projects = useERP((s) => s.projects);
  const designs = useERP((s) => s.designs);
  const leads = useERP((s) => s.leads);
  const quotations = useERP((s) => s.quotations);
  const crmOrders = useERP((s) => s.crmOrders) || [];
  const [tab, setTab] = React.useState<'designer' | 'sales'>('designer');
  const [period, setPeriod] = React.useState<PeriodKey>('monthly');

  const now = new Date();
  const todayStr = today();

  const periodStart = React.useMemo(() => {
    const d = new Date();
    if (period === 'daily') { d.setHours(0, 0, 0, 0); }
    else if (period === 'weekly') { d.setDate(d.getDate() - 7); }
    else if (period === 'monthly') { d.setMonth(d.getMonth() - 1); }
    else if (period === 'yearly') { d.setFullYear(d.getFullYear() - 1); }
    return d.toISOString().split('T')[0];
  }, [period]);

  const isInPeriod = (dateStr: string) => {
    if (!dateStr) return false;
    return dateStr >= periodStart && dateStr <= todayStr;
  };

  // ===== DESIGNER REPORT =====
  const designers = team.filter((m) => m.dept === 'designer' && m.active);

  const designerStats = designers.map((d) => {
    const myProjects = projects.filter((p) => p.designer === d.name && !p.cancelled);
    const myProjectsInPeriod = myProjects.filter((p) => isInPeriod(p.createdAt));
    const completedProjects = myProjects.filter((p) => p.stage === 'completed');
    const completedInPeriod = completedProjects.filter((p) => isInPeriod(p.createdAt));
    const pendingProjects = myProjects.filter((p) => p.stage !== 'completed');
    const myDesigns = designs.filter((dg) => dg.designer === d.name);
    const pendingDesigns = myDesigns.filter((dg) => dg.status !== 'Completed');
    const approvedDesigns = myDesigns.filter((dg) => dg.status === 'Pending Approval' || dg.status === 'Completed');

    // Pages = sum of product qty (proxy for page count)
    const assignedPages = myProjects.reduce((sum, p) => sum + p.products.reduce((s, pr) => s + pr.qty, 0), 0);
    const completedPages = completedProjects.reduce((sum, p) => sum + p.products.reduce((s, pr) => s + pr.qty, 0), 0);
    const pendingPages = pendingProjects.reduce((sum, p) => sum + p.products.reduce((s, pr) => s + pr.qty, 0), 0);
    const approvedPages = approvedDesigns.length > 0 ? completedPages : 0;

    return {
      ...d,
      assignedParties: myProjects.length,
      completedParties: completedProjects.length,
      pendingParties: pendingProjects.length,
      assignedPages,
      completedPages,
      pendingPages,
      approvedPages,
      pendingDesigns: pendingDesigns.length,
      totalDesigns: myDesigns.length,
      periodProjects: myProjectsInPeriod.length,
      periodCompleted: completedInPeriod.length,
    };
  });

  const designerTotals = {
    parties: designerStats.reduce((s, d) => s + d.assignedParties, 0),
    completed: designerStats.reduce((s, d) => s + d.completedParties, 0),
    pending: designerStats.reduce((s, d) => s + d.pendingParties, 0),
    pages: designerStats.reduce((s, d) => s + d.assignedPages, 0),
    completedPages: designerStats.reduce((s, d) => s + d.completedPages, 0),
    pendingPages: designerStats.reduce((s, d) => s + d.pendingPages, 0),
  };

  // ===== SALES/MARKETING REPORT =====
  const salesTeam = team.filter((m) => (m.dept === 'marketing' || m.dept === 'management') && m.active);

  const salesStats = salesTeam.map((s) => {
    const myLeads = leads.filter((l) => l.assignedTo === s.email);
    const myLeadsInPeriod = myLeads.filter((l) => isInPeriod(l.createdAt));
    const handling = myLeads.filter((l) => l.status !== 'Won' && l.status !== 'Lost');
    const won = myLeads.filter((l) => l.status === 'Won' || l.status === 'Order Confirmed');
    const lost = myLeads.filter((l) => l.status === 'Lost');
    const cancelled = myLeads.filter((l) => l.status === 'Lost' && (l.lostReason || '').includes('cancel'));
    const followUp = myLeads.filter((l) => l.status === 'Follow Up');
    const interested = myLeads.filter((l) => l.status === 'Interested');
    const quotationSent = myLeads.filter((l) => l.status === 'Quotation Sent');
    const myQuotations = quotations.filter((q) => q.client === s.name || myLeads.some((l) => l.client === q.client));
    const myOrders = crmOrders.filter((o) => o.leadId && myLeads.some((l) => l.id === o.leadId));
    const totalOrderValue = myOrders.reduce((sum, o) => sum + o.orderAmount, 0);

    return {
      ...s,
      assignedLeads: myLeads.length,
      handling: handling.length,
      won: won.length,
      lost: lost.length,
      cancelled: cancelled.length,
      followUp: followUp.length,
      interested: interested.length,
      quotationSent: quotationSent.length,
      quotations: myQuotations.length,
      orders: myOrders.length,
      totalOrderValue,
      periodLeads: myLeadsInPeriod.length,
    };
  });

  const salesTotals = {
    leads: salesStats.reduce((s, d) => s + d.assignedLeads, 0),
    handling: salesStats.reduce((s, d) => s + d.handling, 0),
    won: salesStats.reduce((s, d) => s + d.won, 0),
    lost: salesStats.reduce((s, d) => s + d.lost, 0),
    orders: salesStats.reduce((s, d) => s + d.orders, 0),
    orderValue: salesStats.reduce((s, d) => s + d.totalOrderValue, 0),
  };

  return (
    <div>
      <SectionHeader
        title="Performance Reports"
        subtitle="Designer & Sales/Marketing team performance — daily, weekly, monthly, yearly."
        accent="blue"
      />

      {/* Period selector */}
      <div className="flex gap-2 mb-5">
        {([
          { k: 'daily', l: 'Daily' },
          { k: 'weekly', l: 'Weekly' },
          { k: 'monthly', l: 'Monthly' },
          { k: 'yearly', l: 'Yearly' },
        ] as { k: PeriodKey; l: string }[]).map((p) => (
          <button
            key={p.k}
            onClick={() => setPeriod(p.k)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-bold transition-all border',
              period === p.k ? 'bg-blue-500 text-white border-blue-500' : 'bg-card text-muted-foreground border-border hover:bg-muted/50',
            )}
          >
            {p.l}
          </button>
        ))}
      </div>

      {/* Tab selector */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setTab('designer')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-bold transition-all border',
            tab === 'designer' ? 'bg-blue-900 text-white border-transparent' : 'bg-card text-muted-foreground border-border',
          )}
        >
          🎨 Designer Report
        </button>
        <button
          onClick={() => setTab('sales')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-bold transition-all border',
            tab === 'sales' ? 'bg-emerald-900 text-white border-transparent' : 'bg-card text-muted-foreground border-border',
          )}
        >
          📈 Sales / Marketing Report
        </button>
      </div>

      {/* ===== DESIGNER REPORT ===== */}
      {tab === 'designer' && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
            <StatCard label="Total Parties" value={designerTotals.parties} tone="primary" icon={<Users className="h-4 w-4" />} />
            <StatCard label="Completed" value={designerTotals.completed} tone="accent" icon={<CheckCircle2 className="h-4 w-4" />} />
            <StatCard label="Pending" value={designerTotals.pending} tone="warn" icon={<Clock className="h-4 w-4" />} />
            <StatCard label="Total Pages" value={designerTotals.pages} tone="primary" icon={<FileText className="h-4 w-4" />} />
            <StatCard label="Completed Pages" value={designerTotals.completedPages} tone="accent" icon={<CheckCircle2 className="h-4 w-4" />} />
            <StatCard label="Pending Pages" value={designerTotals.pendingPages} tone="warn" icon={<Clock className="h-4 w-4" />} />
          </div>

          <TableShell title={`Designer Performance (${period === 'daily' ? 'Today' : period === 'weekly' ? 'Last 7 days' : period === 'monthly' ? 'Last 30 days' : 'Last year'})`}>
            <thead>
              <tr>
                <Th>Designer</Th>
                <Th>Assigned Parties</Th>
                <Th>Completed Parties</Th>
                <Th>Pending Parties</Th>
                <Th>Assigned Pages</Th>
                <Th>Approved/Completed Pages</Th>
                <Th>Pending Pages</Th>
                <Th>Pending Designs</Th>
              </tr>
            </thead>
            <tbody>
              {designerStats.length === 0 ? (
                <EmptyState icon={<Users className="h-8 w-8" />} message="No designers in team" />
              ) : designerStats.map((d) => (
                <tr key={d.id} className="hover:bg-muted/30">
                  <Td>
                    <div className="font-bold text-sm">{d.name}</div>
                    <div className="text-[10px] text-muted-foreground">{d.email}</div>
                  </Td>
                  <Td><span className="font-bold text-blue-600">{d.assignedParties}</span></Td>
                  <Td><span className="font-bold text-emerald-600">{d.completedParties}</span></Td>
                  <Td><span className="font-bold text-amber-600">{d.pendingParties}</span></Td>
                  <Td><span className="font-bold">{d.assignedPages}</span></Td>
                  <Td><span className="font-bold text-emerald-600">{d.completedPages}</span></Td>
                  <Td><span className="font-bold text-amber-600">{d.pendingPages}</span></Td>
                  <Td><span className="font-bold text-red-500">{d.pendingDesigns}</span></Td>
                </tr>
              ))}
            </tbody>
          </TableShell>

          {/* Per-designer detailed cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
            {designerStats.map((d) => (
              <div key={d.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-500 text-white flex items-center justify-center font-bold">
                    {d.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-bold">{d.name}</div>
                    <div className="text-[11px] text-muted-foreground">{d.email}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-2 text-center">
                    <div className="text-lg font-black text-blue-600 dark:text-blue-400">{d.assignedParties}</div>
                    <div className="text-[9px] font-bold uppercase text-muted-foreground">Assigned Parties</div>
                  </div>
                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-2 text-center">
                    <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">{d.completedParties}</div>
                    <div className="text-[9px] font-bold uppercase text-muted-foreground">Completed</div>
                  </div>
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-2 text-center">
                    <div className="text-lg font-black text-amber-600 dark:text-amber-400">{d.pendingParties}</div>
                    <div className="text-[9px] font-bold uppercase text-muted-foreground">Pending</div>
                  </div>
                  <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-2 text-center">
                    <div className="text-lg font-black text-red-600 dark:text-red-400">{d.pendingDesigns}</div>
                    <div className="text-[9px] font-bold uppercase text-muted-foreground">Pending Designs</div>
                  </div>
                  <div className="rounded-lg bg-purple-50 dark:bg-purple-950/30 p-2 text-center">
                    <div className="text-lg font-black text-purple-600 dark:text-purple-400">{d.assignedPages}</div>
                    <div className="text-[9px] font-bold uppercase text-muted-foreground">Assigned Pages</div>
                  </div>
                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-2 text-center">
                    <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">{d.completedPages}</div>
                    <div className="text-[9px] font-bold uppercase text-muted-foreground">Approved Pages</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ===== SALES/MARKETING REPORT ===== */}
      {tab === 'sales' && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
            <StatCard label="Total Leads" value={salesTotals.leads} tone="primary" icon={<User className="h-4 w-4" />} />
            <StatCard label="Handling" value={salesTotals.handling} tone="warn" icon={<Clock className="h-4 w-4" />} />
            <StatCard label="Won/Order" value={salesTotals.won} tone="accent" icon={<CheckCircle2 className="h-4 w-4" />} />
            <StatCard label="Lost" value={salesTotals.lost} tone="danger" icon={<XCircle className="h-4 w-4" />} />
            <StatCard label="Orders" value={salesTotals.orders} tone="accent" icon={<Package className="h-4 w-4" />} />
            <StatCard label="Order Value" value={Rs(salesTotals.orderValue)} tone="primary" icon={<TrendingUp className="h-4 w-4" />} />
          </div>

          <TableShell title={`Sales/Marketing Performance (${period === 'daily' ? 'Today' : period === 'weekly' ? 'Last 7 days' : period === 'monthly' ? 'Last 30 days' : 'Last year'})`}>
            <thead>
              <tr>
                <Th>Person</Th>
                <Th>Assigned Leads</Th>
                <Th>Handling</Th>
                <Th>Interested</Th>
                <Th>Quotation Sent</Th>
                <Th>Won/Order</Th>
                <Th>Lost</Th>
                <Th>Cancelled</Th>
                <Th>Follow Up</Th>
                <Th>Orders</Th>
                <Th>Order Value</Th>
              </tr>
            </thead>
            <tbody>
              {salesStats.length === 0 ? (
                <EmptyState icon={<Users className="h-8 w-8" />} message="No sales/marketing team members" />
              ) : salesStats.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30">
                  <Td>
                    <div className="font-bold text-sm">{s.name}</div>
                    <div className="text-[10px] text-muted-foreground">{DEPT_LABELS[s.dept]}</div>
                  </Td>
                  <Td><span className="font-bold text-blue-600">{s.assignedLeads}</span></Td>
                  <Td><span className="font-bold text-amber-600">{s.handling}</span></Td>
                  <Td><span className="font-bold text-orange-500">{s.interested}</span></Td>
                  <Td><span className="font-bold text-violet-600">{s.quotationSent}</span></Td>
                  <Td><span className="font-bold text-emerald-600">{s.won}</span></Td>
                  <Td><span className="font-bold text-red-500">{s.lost}</span></Td>
                  <Td><span className="font-bold text-red-600">{s.cancelled}</span></Td>
                  <Td><span className="font-bold text-orange-500">{s.followUp}</span></Td>
                  <Td><span className="font-bold text-emerald-600">{s.orders}</span></Td>
                  <Td><span className="font-bold">{Rs(s.totalOrderValue)}</span></Td>
                </tr>
              ))}
            </tbody>
          </TableShell>

          {/* Per-person detailed cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
            {salesStats.map((s) => (
              <div key={s.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold">
                    {s.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-bold">{s.name}</div>
                    <div className="text-[11px] text-muted-foreground">{DEPT_LABELS[s.dept]}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-2 text-center">
                    <div className="text-lg font-black text-blue-600 dark:text-blue-400">{s.assignedLeads}</div>
                    <div className="text-[9px] font-bold uppercase text-muted-foreground">Assigned</div>
                  </div>
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-2 text-center">
                    <div className="text-lg font-black text-amber-600 dark:text-amber-400">{s.handling}</div>
                    <div className="text-[9px] font-bold uppercase text-muted-foreground">Handling</div>
                  </div>
                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-2 text-center">
                    <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">{s.won}</div>
                    <div className="text-[9px] font-bold uppercase text-muted-foreground">Won/Order</div>
                  </div>
                  <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-2 text-center">
                    <div className="text-lg font-black text-red-600 dark:text-red-400">{s.lost}</div>
                    <div className="text-[9px] font-bold uppercase text-muted-foreground">Lost</div>
                  </div>
                  <div className="rounded-lg bg-violet-50 dark:bg-violet-950/30 p-2 text-center">
                    <div className="text-lg font-black text-violet-600 dark:text-violet-400">{s.quotationSent}</div>
                    <div className="text-[9px] font-bold uppercase text-muted-foreground">Quotation</div>
                  </div>
                  <div className="rounded-lg bg-purple-50 dark:bg-purple-950/30 p-2 text-center">
                    <div className="text-lg font-black text-purple-600 dark:text-purple-400">{Rs(s.totalOrderValue)}</div>
                    <div className="text-[9px] font-bold uppercase text-muted-foreground">Order Value</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
