'use client';

import * as React from 'react';
import {
  Activity, FolderOpen, Megaphone, Palette, Factory, UserCog, Ban,
  IndianRupee, TrendingUp, TrendingDown, Undo2, TicketCheck, Inbox,
  Calendar, ArrowRight, AlertTriangle, Phone, Mail, Target, Clock,
  CheckCircle2, Package, Truck, FileText, Wallet, AlertCircle, UserPlus,
  BellRing, Circle,
} from 'lucide-react';
import { useERP } from '@/lib/erp/store';
import { STAGES, STAGE_LABELS, LEAD_SOURCES } from '@/lib/erp/constants';
import { Rs, fD, monthLabel, today as todayFn } from '@/lib/erp/utils';
import { StatCard, TableShell, Th, Td, EmptyState, SectionHeader, StatusBadge } from '../ui';
import { ChartCard, ERPBarChart, ERPDonutChart, CHART_COLORS, CHART_PALETTE } from '../charts';
import { cn } from '@/lib/utils';
import type { Role, Reminder } from '@/lib/erp/types';
import { AiInsights } from './AiInsights';

export function Dashboard() {
  const currentUser = useERP((s) => s.currentUser);
  const role = currentUser?.role || 'owner';

  // Owner & Management see the full overview dashboard
  if (role === 'owner' || role === 'management') return <OwnerDashboard />;
  if (role === 'finance') return <FinanceDashboard />;
  if (role === 'marketing') return <MarketingDashboard />;
  if (role === 'designer') return <DesignerDashboard />;
  if (role === 'production') return <ProductionDashboard />;
  return <OwnerDashboard />;
}

// ============ Owner / Management Dashboard (full overview) ============
function OwnerDashboard() {
  const projects = useERP((s) => s.projects);
  const payments = useERP((s) => s.payments);
  const expenses = useERP((s) => s.expenses);
  const refunds = useERP((s) => s.refunds);
  const activities = useERP((s) => s.activities);
  const tickets = useERP((s) => s.tickets);
  const currentUser = useERP((s) => s.currentUser);
  const isOwner = currentUser?.role === 'owner';
  const isOM = true; // owner + management both see finance here

  const active = projects.filter((p) => !p.cancelled && p.stage !== 'completed').length;
  const byStage: Record<string, number> = {};
  STAGES.forEach((s) => (byStage[s.key] = 0));
  projects.forEach((p) => {
    if (!p.cancelled && byStage[p.stage] !== undefined) byStage[p.stage]++;
  });
  const cancelled = projects.filter((p) => p.cancelled).length;
  const tRev = projects.filter((p) => !p.cancelled).reduce((s, p) => s + p.value, 0);
  const rec = payments.reduce((s, p) => s + p.amount, 0);
  const tRef = refunds.reduce((s, r) => s + r.amount, 0);
  const tExp = expenses.reduce((s, e) => s + e.amount, 0);
  const cogs = expenses.filter((e) => ['Material', 'Printing'].includes(e.category)).reduce((s, e) => s + e.amount, 0);
  const grossProfit = tRev - cogs;
  const profit = rec - tExp - tRef;
  const openTickets = tickets.filter((t) => t.status === 'open' || t.status === 'in_progress').length;

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

  const stageDonutData = STAGES.map((s, i) => ({
    name: s.label, value: byStage[s.key] || 0, color: CHART_PALETTE[i],
  })).filter((d) => d.value > 0);

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div>
      <SectionHeader
        title={`Welcome back, ${currentUser?.name?.split(' ')[0] || 'Admin'}!`}
        subtitle={`${today} · Here's what's happening across your projects.`}
        accent="emerald"
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        <StatCard label="Active Projects" value={active} tone="primary" icon={<FolderOpen className="h-4 w-4" />} />
        <StatCard label="Marketing" value={byStage.marketing} icon={<Megaphone className="h-4 w-4" />} />
        <StatCard label="Designing" value={byStage.designing} icon={<Palette className="h-4 w-4" />} />
        <StatCard label="Production" value={byStage.production} icon={<Factory className="h-4 w-4" />} />
        <StatCard label="Mgmt Review" value={byStage.management} icon={<UserCog className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        <StatCard label="Revenue" value={Rs(tRev)} tone="primary" icon={<IndianRupee className="h-4 w-4" />} />
        <StatCard label="Received" value={Rs(rec)} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Expenses" value={Rs(tExp)} icon={<TrendingDown className="h-4 w-4" />} />
        <StatCard label="Gross Profit" value={Rs(grossProfit)} tone={grossProfit >= 0 ? 'accent' : 'danger'} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Net Profit" value={Rs(profit)} tone={profit >= 0 ? 'accent' : 'danger'} icon={<TrendingUp className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-5">
        <ChartCard title="Cash Flow — Last 6 Months" subtitle="Received vs Expenses" className="lg:col-span-2">
          <ERPBarChart
            data={cashFlowData}
            xKey="month"
            bars={[
              { key: 'Received', label: 'Received', color: CHART_COLORS.blue },
              { key: 'Expenses', label: 'Expenses', color: CHART_COLORS.red },
            ]}
            height={260}
          />
        </ChartCard>
        <ChartCard title="Projects by Stage" subtitle="Project count per pipeline stage">
          {stageDonutData.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">No active projects</div>
          ) : (
            <ERPDonutChart data={stageDonutData} height={220} />
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2">
          <TableShell title="Recent Activity">
            <thead><tr><Th>Time</Th><Th>Activity</Th><Th>User</Th><Th>Project</Th></tr></thead>
            <tbody>
              {activities.length === 0 ? (
                <EmptyState icon={<Inbox className="h-8 w-8" />} message="No activity yet" />
              ) : (
                activities.slice(0, 10).map((a, i) => (
                  <tr key={i} className="hover:bg-muted/30">
                    <Td className="whitespace-nowrap text-muted-foreground">{a.time}</Td>
                    <Td><Activity className="inline h-3 w-3 mr-1.5 text-emerald-500" />{a.activity}</Td>
                    <Td className="font-semibold">{a.user}</Td>
                    <Td className="text-muted-foreground">{a.project}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </TableShell>
        </div>
        <UpcomingDeliveries />
      </div>

      {(isOwner || openTickets > 0) && (
        <div className="mt-5 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <div className="text-sm font-bold text-amber-800 dark:text-amber-300">Alerts & Issues</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {isOwner && <StatCard label="Cancelled Projects" value={cancelled} tone="danger" icon={<Ban className="h-4 w-4" />} />}
            {isOwner && <StatCard label="Total Refunds" value={Rs(tRef)} tone="danger" icon={<Undo2 className="h-4 w-4" />} />}
            <StatCard label="Open Tickets" value={openTickets} tone="warn" icon={<TicketCheck className="h-4 w-4" />} />
          </div>
        </div>
      )}

      <div className="mt-5">
        <MyRemindersWidget />
      </div>

      {/* AI-powered CRM insights — owner / management only */}
      <div className="mt-5">
        <AiInsights />
      </div>
    </div>
  );
}

// ============ Finance Dashboard ============
function FinanceDashboard() {
  const projects = useERP((s) => s.projects);
  const payments = useERP((s) => s.payments);
  const expenses = useERP((s) => s.expenses);
  const refunds = useERP((s) => s.refunds);
  const activities = useERP((s) => s.activities);
  const currentUser = useERP((s) => s.currentUser);

  const tRev = projects.filter((p) => !p.cancelled).reduce((s, p) => s + p.value, 0);
  const rec = payments.reduce((s, p) => s + p.amount, 0);
  const tExp = expenses.reduce((s, e) => s + e.amount, 0);
  const tRef = refunds.reduce((s, r) => s + r.amount, 0);
  const cogs = expenses.filter((e) => ['Material', 'Printing'].includes(e.category)).reduce((s, e) => s + e.amount, 0);
  const grossProfit = tRev - cogs;
  const netProfit = rec - tExp - tRef;
  const outstanding = tRev - rec - tRef;

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

  const recentTxns = React.useMemo(() => {
    const pays = payments.map((p) => ({ id: p.id, date: p.date, type: 'Payment', desc: `${p.client} (${p.type})`, amount: p.amount, kind: 'in' as const }));
    const exps = expenses.map((e) => ({ id: e.id, date: e.date, type: 'Expense', desc: `${e.category} — ${e.desc}`, amount: e.amount, kind: 'out' as const }));
    const refs = refunds.map((r) => ({ id: r.id, date: r.date, type: 'Refund', desc: `${r.client} (${r.reason})`, amount: r.amount, kind: 'out' as const }));
    return [...pays, ...exps, ...refs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  }, [payments, expenses, refunds]);

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div>
      <SectionHeader
        title={`Welcome back, ${currentUser?.name?.split(' ')[0] || 'Finance'}!`}
        subtitle={`${today} · Your finance workspace — transactions, payments & profit.`}
        accent="emerald"
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        <StatCard label="Total Revenue" value={Rs(tRev)} tone="primary" icon={<IndianRupee className="h-4 w-4" />} />
        <StatCard label="Received" value={Rs(rec)} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Outstanding" value={Rs(outstanding)} tone="warn" icon={<AlertCircle className="h-4 w-4" />} />
        <StatCard label="Gross Profit" value={Rs(grossProfit)} tone={grossProfit >= 0 ? 'accent' : 'danger'} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Net Profit" value={Rs(netProfit)} tone={netProfit >= 0 ? 'accent' : 'danger'} icon={<Wallet className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-5">
        <ChartCard title="Cash Flow — Last 6 Months" subtitle="Received vs Expenses" className="lg:col-span-2">
          <ERPBarChart
            data={cashFlowData}
            xKey="month"
            bars={[
              { key: 'Received', label: 'Received', color: CHART_COLORS.blue },
              { key: 'Expenses', label: 'Expenses', color: CHART_COLORS.red },
            ]}
            height={260}
          />
        </ChartCard>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-sm font-bold mb-3 flex items-center gap-2"><Wallet className="h-4 w-4 text-emerald-500" /> Quick Summary</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Total Expenses</span><span className="font-bold">{Rs(tExp)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Refunds</span><span className="font-bold text-red-500">{Rs(tRef)}</span></div>
            <div className="flex justify-between border-t pt-2"><span className="font-bold">Net Profit</span><span className="font-bold text-emerald-600">{Rs(netProfit)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">COGS (Material+Printing)</span><span className="font-semibold">{Rs(cogs)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Operating Exp.</span><span className="font-semibold">{Rs(tExp - cogs)}</span></div>
          </div>
        </div>
      </div>

      <TableShell title="Recent Transactions">
        <thead><tr><Th>Date</Th><Th>Type</Th><Th>Description</Th><Th>Amount</Th></tr></thead>
        <tbody>
          {recentTxns.length === 0 ? (
            <EmptyState icon={<Inbox className="h-8 w-8" />} message="No transactions yet" />
          ) : recentTxns.map((t, i) => (
            <tr key={i} className="hover:bg-muted/30">
              <Td className="whitespace-nowrap text-muted-foreground">{fD(t.date)}</Td>
              <Td><StatusBadge status={t.type} /></Td>
              <Td>{t.desc}</Td>
              <Td className={`font-bold ${t.kind === 'in' ? 'text-emerald-600' : 'text-red-500'}`}>
                {t.kind === 'in' ? '+' : '-'}{Rs(t.amount)}
              </Td>
            </tr>
          ))}
        </tbody>
      </TableShell>

      <div className="mt-5">
        <MyRemindersWidget />
      </div>
    </div>
  );
}

// ============ Marketing Dashboard ============
function MarketingDashboard() {
  const projects = useERP((s) => s.projects);
  const leads = useERP((s) => s.leads);
  const quotations = useERP((s) => s.quotations);
  const activities = useERP((s) => s.activities);
  const currentUser = useERP((s) => s.currentUser);

  const myLeads = leads;
  const newLeads = leads.filter((l) => l.status === 'New').length;
  const followUpLeads = leads.filter((l) => l.status === 'Follow Up').length;
  const wonLeads = leads.filter((l) => l.status === 'Won').length;
  const quoteSent = leads.filter((l) => l.status === 'Quotation Sent').length;
  const myProjects = projects.filter((p) => p.stage === 'marketing' && !p.cancelled);
  const myQuotations = quotations;
  const today = todayFn();

  const followupsToday = leads.filter((l) => l.followup <= today && l.status !== 'Won' && l.status !== 'Lost');
  const todayDate = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div>
      <SectionHeader
        title={`Welcome back, ${currentUser?.name?.split(' ')[0] || 'Marketing'}!`}
        subtitle={`${todayDate} · Your sales workspace — leads, follow-ups & quotations.`}
        accent="emerald"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Leads" value={myLeads.length} tone="primary" icon={<UserPlus className="h-4 w-4" />} />
        <StatCard label="New Leads" value={newLeads} icon={<Target className="h-4 w-4" />} />
        <StatCard label="Follow-Ups" value={followUpLeads} tone="warn" icon={<Clock className="h-4 w-4" />} />
        <StatCard label="Won Leads" value={wonLeads} tone="accent" icon={<CheckCircle2 className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-5">
        <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-amber-500" />
            <div className="text-sm font-bold text-amber-800 dark:text-amber-300">Follow-Ups Due Today</div>
          </div>
          <div className="divide-y divide-border">
            {followupsToday.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">No follow-ups due. You're all caught up!</div>
            ) : followupsToday.slice(0, 5).map((l) => (
              <div key={l.id} className="py-2 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm">{l.client}</div>
                  <div className="text-[11px] text-muted-foreground">{l.requirement} · {l.contact}</div>
                </div>
                <div className="text-right">
                  <StatusBadge status={l.status} />
                  <div className="text-[10px] text-muted-foreground mt-0.5"><Phone className="inline h-2.5 w-2.5" /> {l.phone}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <TableShell title="My Active Projects (Marketing Stage)">
          <thead><tr><Th>ID</Th><Th>Client</Th><Th>Title</Th><Th>Stage</Th></tr></thead>
          <tbody>
            {myProjects.length === 0 ? (
              <EmptyState icon={<FolderOpen className="h-8 w-8" />} message="No projects in marketing stage" />
            ) : myProjects.map((p) => (
              <tr key={p.id} className="hover:bg-muted/30">
                <Td><strong>{p.id}</strong></Td>
                <Td>{p.client}</Td>
                <Td>{p.title}</Td>
                <Td><StatusBadge status={STAGE_LABELS[p.stage] || p.stage} /></Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </div>

      <TableShell title="Lead Sources Breakdown">
        <thead><tr><Th>Source</Th><Th>Count</Th><Th>Status Summary</Th></tr></thead>
        <tbody>
          {LEAD_SOURCES.map((src) => {
            const srcLeads = myLeads.filter((l) => l.source === src);
            if (srcLeads.length === 0) return null;
            const won = srcLeads.filter((l) => l.status === 'Won').length;
            return (
              <tr key={src} className="hover:bg-muted/30">
                <Td className="font-semibold">{src}</Td>
                <Td>{srcLeads.length}</Td>
                <Td className="text-xs text-muted-foreground">{won} won · {srcLeads.length - won} in progress</Td>
              </tr>
            );
          })}
          {myLeads.length === 0 && <EmptyState icon={<Inbox className="h-8 w-8" />} message="No leads yet" />}
        </tbody>
      </TableShell>

      <div className="mt-5">
        <MyRemindersWidget />
      </div>
    </div>
  );
}

// ============ Designer Dashboard ============
function DesignerDashboard() {
  const projects = useERP((s) => s.projects);
  const designs = useERP((s) => s.designs);
  const tickets = useERP((s) => s.tickets);
  const currentUser = useERP((s) => s.currentUser);

  const myName = currentUser?.name || '';
  // Designer sees projects in designing stage + their design assignments
  const myDesignProjects = projects.filter((p) => p.stage === 'designing' && !p.cancelled);
  const myAssignments = designs.filter((d) => d.designer === myName);
  const pendingApproval = myAssignments.filter((d) => d.status === 'Pending Approval').length;
  const inProgress = myAssignments.filter((d) => d.status === 'In Progress').length;
  const revisions = myAssignments.filter((d) => d.status === 'Revision').length;
  const completed = myAssignments.filter((d) => d.status === 'Completed').length;
  const myTickets = tickets.filter((t) => t.assignedTo.dept === 'designer' && (t.status === 'open' || t.status === 'in_progress'));

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const todayStr = todayFn();
  const dueToday = myAssignments.filter((d) => d.due <= todayStr && d.status !== 'Completed');

  return (
    <div>
      <SectionHeader
        title={`Welcome back, ${currentUser?.name?.split(' ')[0] || 'Designer'}!`}
        subtitle={`${today} · Your design workspace — assignments, approvals & revisions.`}
        accent="emerald"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="My Assignments" value={myAssignments.length} tone="primary" icon={<Palette className="h-4 w-4" />} />
        <StatCard label="In Progress" value={inProgress} icon={<Clock className="h-4 w-4" />} />
        <StatCard label="Pending Approval" value={pendingApproval} tone="warn" icon={<AlertCircle className="h-4 w-4" />} />
        <StatCard label="Revisions" value={revisions} tone="danger" icon={<AlertTriangle className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-5">
        <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-amber-500" />
            <div className="text-sm font-bold text-amber-800 dark:text-amber-300">Due Today / Overdue</div>
          </div>
          <div className="divide-y divide-border">
            {dueToday.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">Nothing due today. Great work!</div>
            ) : dueToday.map((d) => (
              <div key={d.projectId} className="py-2">
                <div className="font-bold text-sm">{d.client} · {d.product}</div>
                <div className="text-[11px] text-muted-foreground">Due: {fD(d.due)} · {d.projectId}</div>
              </div>
            ))}
          </div>
        </div>

        <TableShell title="Projects in Design Stage">
          <thead><tr><Th>ID</Th><Th>Client</Th><Th>Title</Th><Th>Designer</Th></tr></thead>
          <tbody>
            {myDesignProjects.length === 0 ? (
              <EmptyState icon={<FolderOpen className="h-8 w-8" />} message="No projects in design stage" />
            ) : myDesignProjects.map((p) => (
              <tr key={p.id} className="hover:bg-muted/30">
                <Td><strong>{p.id}</strong></Td>
                <Td>{p.client}</Td>
                <Td>{p.title}</Td>
                <Td className="text-xs">{p.designer || '—'}</Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </div>

      <TableShell title="My Design Assignments">
        <thead><tr><Th>Project</Th><Th>Client</Th><Th>Product</Th><Th>Status</Th><Th>Due</Th></tr></thead>
        <tbody>
          {myAssignments.length === 0 ? (
            <EmptyState icon={<Palette className="h-8 w-8" />} message="No design assignments for you yet" />
          ) : myAssignments.map((d, i) => (
            <tr key={i} className="hover:bg-muted/30">
              <Td><strong>{d.projectId}</strong></Td>
              <Td>{d.client}</Td>
              <Td>{d.product}</Td>
              <Td><StatusBadge status={d.status} /></Td>
              <Td className={d.due < todayStr && d.status !== 'Completed' ? 'text-red-500 font-semibold' : ''}>{fD(d.due)}</Td>
            </tr>
          ))}
        </tbody>
      </TableShell>

      {myTickets.length > 0 && (
        <div className="mt-4">
          <TableShell title="Tickets Assigned to Design">
            <thead><tr><Th>Subject</Th><Th>Priority</Th><Th>Status</Th></tr></thead>
            <tbody>
              {myTickets.map((t) => (
                <tr key={t.id} className="hover:bg-muted/30">
                  <Td className="font-semibold">{t.subject}</Td>
                  <Td><StatusBadge status={t.priority} /></Td>
                  <Td><StatusBadge status={t.status} /></Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </div>
      )}

      <div className="mt-5">
        <MyRemindersWidget />
      </div>
    </div>
  );
}

// ============ Production Dashboard ============
function ProductionDashboard() {
  const projects = useERP((s) => s.projects);
  const production = useERP((s) => s.production);
  const dispatches = useERP((s) => s.dispatches);
  const tickets = useERP((s) => s.tickets);
  const currentUser = useERP((s) => s.currentUser);

  const prodProjects = projects.filter((p) => p.stage === 'production' && !p.cancelled);
  const running = production.filter((p) => p.status === 'Running').length;
  const packing = production.filter((p) => p.status === 'Packing').length;
  const completed = production.filter((p) => p.status === 'Completed').length;
  const readyToDispatch = dispatches.filter((d) => d.status === 'Ready').length;
  const inTransit = dispatches.filter((d) => d.status === 'In Transit' || d.status === 'Packing').length;
  const myTickets = tickets.filter((t) => t.assignedTo.dept === 'production' && (t.status === 'open' || t.status === 'in_progress'));

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div>
      <SectionHeader
        title={`Welcome back, ${currentUser?.name?.split(' ')[0] || 'Production'}!`}
        subtitle={`${today} · Your production workspace — jobs, packing & dispatch.`}
        accent="emerald"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Production Queue" value={prodProjects.length} tone="primary" icon={<Factory className="h-4 w-4" />} />
        <StatCard label="Running Jobs" value={running} icon={<Clock className="h-4 w-4" />} />
        <StatCard label="Packing" value={packing} tone="warn" icon={<Package className="h-4 w-4" />} />
        <StatCard label="Ready to Dispatch" value={readyToDispatch} tone="accent" icon={<Truck className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-5">
        <TableShell title="Projects in Production">
          <thead><tr><Th>ID</Th><Th>Client</Th><Th>Title</Th><Th>Delivery</Th></tr></thead>
          <tbody>
            {prodProjects.length === 0 ? (
              <EmptyState icon={<Factory className="h-8 w-8" />} message="No projects in production" />
            ) : prodProjects.map((p) => {
              const daysLeft = Math.ceil((new Date(p.delivery).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              return (
                <tr key={p.id} className="hover:bg-muted/30">
                  <Td><strong>{p.id}</strong></Td>
                  <Td>{p.client}</Td>
                  <Td>{p.title}</Td>
                  <Td className={daysLeft <= 3 ? 'text-red-500 font-semibold' : ''}>{fD(p.delivery)} <span className="text-[10px] text-muted-foreground">({daysLeft}d)</span></Td>
                </tr>
              );
            })}
          </tbody>
        </TableShell>

        <TableShell title="Dispatch Queue">
          <thead><tr><Th>ID</Th><Th>Client</Th><Th>Status</Th><Th>Courier</Th></tr></thead>
          <tbody>
            {dispatches.length === 0 ? (
              <EmptyState icon={<Truck className="h-8 w-8" />} message="No dispatches queued" />
            ) : dispatches.slice(0, 6).map((d) => (
              <tr key={d.id} className="hover:bg-muted/30">
                <Td><strong>{d.id}</strong></Td>
                <Td>{d.client}</Td>
                <Td><StatusBadge status={d.status} /></Td>
                <Td className="text-xs">{d.courier || '—'}</Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </div>

      <TableShell title="Production Jobs">
        <thead><tr><Th>Project</Th><Th>Client</Th><Th>Product</Th><Th>Status</Th><Th>Completion</Th></tr></thead>
        <tbody>
          {production.length === 0 ? (
            <EmptyState icon={<Factory className="h-8 w-8" />} message="No production jobs yet" />
          ) : production.map((p, i) => (
            <tr key={i} className="hover:bg-muted/30">
              <Td><strong>{p.projectId}</strong></Td>
              <Td>{p.client}</Td>
              <Td>{p.product}</Td>
              <Td><StatusBadge status={p.status} /></Td>
              <Td className="text-xs">{p.completion ? fD(p.completion) : '—'}</Td>
            </tr>
          ))}
        </tbody>
      </TableShell>

      {myTickets.length > 0 && (
        <div className="mt-4">
          <TableShell title="Tickets Assigned to Production">
            <thead><tr><Th>Subject</Th><Th>Priority</Th><Th>Status</Th></tr></thead>
            <tbody>
              {myTickets.map((t) => (
                <tr key={t.id} className="hover:bg-muted/30">
                  <Td className="font-semibold">{t.subject}</Td>
                  <Td><StatusBadge status={t.priority} /></Td>
                  <Td><StatusBadge status={t.status} /></Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </div>
      )}

      <div className="mt-5">
        <MyRemindersWidget />
      </div>
    </div>
  );
}

function UpcomingDeliveries() {
  const projects = useERP((s) => s.projects);
  const upcoming = projects
    .filter((p) => !p.cancelled && p.stage !== 'completed' && p.delivery >= todayFn())
    .sort((a, b) => a.delivery.localeCompare(b.delivery))
    .slice(0, 5);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      <div className="p-3.5 border-b border-border text-sm font-bold flex items-center gap-2">
        <Calendar className="h-4 w-4 text-amber-500" /> Upcoming Deliveries
      </div>
      <div className="divide-y divide-border">
        {upcoming.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">No upcoming deliveries</div>
        ) : upcoming.map((p) => {
          const daysLeft = Math.ceil((new Date(p.delivery).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          const urgent = daysLeft <= 3;
          return (
            <div key={p.id} className="p-3 hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-sm truncate">{p.title}</div>
                  <div className="text-[11px] text-muted-foreground">{p.client} · {p.id}</div>
                </div>
                <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${urgent ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'}`}>
                  {daysLeft === 0 ? 'Today' : daysLeft === 1 ? '1 day' : `${daysLeft} days`}
                </div>
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <StatusBadge status={STAGE_LABELS[p.stage] || p.stage} />
                <span className="text-[11px] text-muted-foreground">{fD(p.delivery)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============ My Reminders Widget (shown on every dashboard) ============
const REMINDER_PRIORITY_DOT: Record<string, string> = {
  low: 'bg-slate-400', medium: 'bg-blue-500', high: 'bg-orange-500', urgent: 'bg-red-500',
};

function MyRemindersWidget() {
  const reminders = useERP((s) => s.reminders || []);
  const currentUser = useERP((s) => s.currentUser);
  const toggleReminderDone = useERP((s) => s.toggleReminderDone);

  const canSeeAll = currentUser?.role === 'owner' || currentUser?.role === 'management';
  const todayStr = new Date().toISOString().split('T')[0];

  const mine = canSeeAll
    ? reminders
    : reminders.filter((r) => r.assignedTo.toLowerCase() === (currentUser?.email || '').toLowerCase());

  // Show due-today + overdue (not done, not snoozed) — most urgent first.
  const urgent = mine
    .filter((r) => r.status !== 'done' && r.status !== 'snoozed' && r.dueDate <= todayStr)
    .sort((a, b) => {
      const pr = { urgent: 0, high: 1, medium: 2, low: 3 } as Record<string, number>;
      const pd = (pr[a.priority] ?? 4) - (pr[b.priority] ?? 4);
      if (pd !== 0) return pd;
      return a.dueDate.localeCompare(b.dueDate);
    })
    .slice(0, 5);

  const overdueCount = mine.filter((r) => r.status !== 'done' && r.dueDate < todayStr && r.status !== 'snoozed').length;
  const todayCount = mine.filter((r) => r.status !== 'done' && r.dueDate === todayStr && r.status !== 'snoozed').length;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <BellRing className="h-4 w-4 text-amber-500" />
            {urgent.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-full bg-amber-500 text-white text-[8px] font-black flex items-center justify-center">
                {urgent.length}
              </span>
            )}
          </div>
          <div className="text-sm font-bold">{canSeeAll ? 'Team Reminders' : 'My Reminders'}</div>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold">
          {todayCount > 0 && <span className="text-amber-600">Due today: {todayCount}</span>}
          {overdueCount > 0 && <span className="text-red-500">Overdue: {overdueCount}</span>}
          {todayCount === 0 && overdueCount === 0 && <span className="text-emerald-600">All clear</span>}
        </div>
      </div>

      {urgent.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <CheckCircle2 className="h-7 w-7 text-emerald-400 mb-1.5" />
          <p className="text-xs text-muted-foreground">No reminders due. You&apos;re all caught up!</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Open Reminders from the sidebar to add new ones.</p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {urgent.map((r) => {
            const overdue = r.dueDate < todayStr;
            return (
              <div key={r.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/40 transition-colors group">
                <button
                  onClick={() => toggleReminderDone(r.id)}
                  title="Mark as done"
                  className="text-muted-foreground hover:text-emerald-500 transition-colors flex-shrink-0"
                >
                  <Circle className="h-4 w-4" />
                </button>
                <span className={cn('h-2 w-2 rounded-full flex-shrink-0', REMINDER_PRIORITY_DOT[r.priority])} />
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-semibold truncate">{r.title}</div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                    <span className={cn('font-bold', overdue ? 'text-red-500' : 'text-amber-600')}>
                      {overdue ? 'Overdue · ' : 'Today · '}{fD(r.dueDate)}
                    </span>
                    {r.dueTime && <span>· {r.dueTime}</span>}
                    {canSeeAll && <span className="truncate">· {r.assignedToName}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="mt-2 pt-2 border-t border-border text-[10px] text-muted-foreground text-center">
        Open <span className="font-bold text-foreground">Reminders</span> from the sidebar to manage all tasks.
      </div>
    </div>
  );
}
