'use client';

import * as React from 'react';
import {
  Brain, Sparkles, TrendingUp, Target, HeartPulse, PhoneCall,
  RefreshCw, Loader2, AlertCircle, Zap, ArrowRight,
} from 'lucide-react';
import { useERP } from '@/lib/erp/store';
import { Rs } from '@/lib/erp/utils';
import { SectionHeader } from '../ui';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ============ Types (mirror of /api/ai-insights/route.ts) ============

interface InsightCard {
  title: string;
  headline: string;
  body: string;
  bullets?: string[];
  tag?: string;
  tone?: 'emerald' | 'amber' | 'rose' | 'blue' | 'purple';
}

interface ERPSummary {
  leadCountsByStage: Record<string, number>;
  totalLeads: number;
  wonLeads: number;
  lostLeads: number;
  openLeads: number;
  conversionRate: number;
  totalPipelineValue: number;
  weightedPipeline: number;
  recentActivities: { time: string; activity: string; user: string; project: string }[];
  overdueFollowups: { id: string; client: string; contact: string; phone: string; followup: string; priority?: string }[];
  topSalesperson: { name: string; wonCount: number; pipelineValue: number } | null;
  lostReasons: { reason: string; count: number }[];
  payments: { totalReceived: number; outstanding: number; recentCount: number };
  projects: { active: number; cancelled: number; totalValue: number };
  tickets: { open: number; total: number };
  generatedAt: string;
}

interface AiInsightsResponse {
  ok: boolean;
  source: 'ai' | 'fallback';
  generatedAt: string;
  insights: {
    leadConversionPrediction: InsightCard;
    nextBestActions: InsightCard;
    salesForecast: InsightCard;
    sentimentSummary: InsightCard;
    smartFollowUps: InsightCard;
  };
  rawSummary: ERPSummary;
}

// ============ Build the ERP summary on the client ============

const TERMINAL_STAGES = new Set(['Won', 'Lost']);

function buildSummary(
  leads: ReturnType<typeof useERP.getState>['leads'],
  projects: ReturnType<typeof useERP.getState>['projects'],
  payments: ReturnType<typeof useERP.getState>['payments'],
  activities: ReturnType<typeof useERP.getState>['activities'],
  tickets: ReturnType<typeof useERP.getState>['tickets'],
  team: ReturnType<typeof useERP.getState>['team'],
): ERPSummary {
  const todayStr = new Date().toISOString().split('T')[0];

  const totalLeads = leads.length;
  const wonLeads = leads.filter((l) => l.leadStage === 'Won' || l.status === 'Won').length;
  const lostLeads = leads.filter((l) => l.leadStage === 'Lost' || l.status === 'Lost').length;
  const openLeads = leads.filter((l) => !TERMINAL_STAGES.has(l.leadStage || '') && l.status !== 'Won' && l.status !== 'Lost').length;
  const decided = wonLeads + lostLeads;
  const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

  const leadCountsByStage: Record<string, number> = {};
  leads.forEach((l) => {
    const stage = l.leadStage || 'New';
    leadCountsByStage[stage] = (leadCountsByStage[stage] || 0) + 1;
  });

  // Pipeline value — sum of expectedOrderValue for open (non-terminal) leads
  const openLeadsList = leads.filter((l) => !TERMINAL_STAGES.has(l.leadStage || '') && l.status !== 'Won' && l.status !== 'Lost');
  const totalPipelineValue = openLeadsList.reduce((s, l) => s + (l.expectedOrderValue || 0), 0);
  const weightedPipeline = openLeadsList.reduce(
    (s, l) => s + ((l.expectedOrderValue || 0) * (l.winProbability || 0)) / 100,
    0,
  );

  // Recent activities (last 10)
  const recentActivities = activities.slice(0, 10).map((a) => ({
    time: a.time, activity: a.activity, user: a.user, project: a.project,
  }));

  // Overdue follow-ups (followup date < today, not Won/Lost)
  const overdueFollowups = leads
    .filter((l) => l.followup < todayStr && l.status !== 'Won' && l.status !== 'Lost')
    .sort((a, b) => {
      const pr: Record<string, number> = { Hot: 0, Warm: 1, Cold: 2 };
      const pd = (pr[a.priority || ''] ?? 3) - (pr[b.priority || ''] ?? 3);
      if (pd !== 0) return pd;
      return a.followup.localeCompare(b.followup);
    })
    .slice(0, 10)
    .map((l) => ({
      id: l.id, client: l.client, contact: l.contact, phone: l.phone,
      followup: l.followup, priority: l.priority,
    }));

  // Top salesperson — most wins, then highest pipeline value
  const repStats = new Map<string, { name: string; wonCount: number; pipelineValue: number }>();
  leads.forEach((l) => {
    const email = l.assignedTo || '';
    if (!email) return;
    const name = l.assignedToName || email;
    const cur = repStats.get(email) || { name, wonCount: 0, pipelineValue: 0 };
    if (l.leadStage === 'Won' || l.status === 'Won') cur.wonCount += 1;
    if (!TERMINAL_STAGES.has(l.leadStage || '') && l.status !== 'Won' && l.status !== 'Lost') {
      cur.pipelineValue += l.expectedOrderValue || 0;
    }
    repStats.set(email, cur);
  });
  let topSalesperson: ERPSummary['topSalesperson'] = null;
  for (const v of repStats.values()) {
    if (!topSalesperson || v.wonCount > topSalesperson.wonCount ||
        (v.wonCount === topSalesperson.wonCount && v.pipelineValue > topSalesperson.pipelineValue)) {
      topSalesperson = v;
    }
  }
  // Suppress when team is empty / no real rep data
  if (repStats.size === 0) topSalesperson = null;

  // Lost-reason breakdown
  const lostMap = new Map<string, number>();
  leads.forEach((l) => {
    if ((l.leadStage === 'Lost' || l.status === 'Lost') && l.lostReason) {
      lostMap.set(l.lostReason, (lostMap.get(l.lostReason) || 0) + 1);
    }
  });
  const lostReasons = Array.from(lostMap.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);

  // Payments
  const totalReceived = payments.reduce((s, p) => s + p.amount, 0);
  const activeProjectValue = projects.filter((p) => !p.cancelled).reduce((s, p) => s + p.value, 0);
  const receivedForActive = payments
    .filter((p) => projects.some((pr) => pr.id === p.projectId && !pr.cancelled))
    .reduce((s, p) => s + p.amount, 0);
  const outstanding = Math.max(0, activeProjectValue - receivedForActive);
  const recentPaymentsCount = payments.length;

  // Projects
  const projectsSummary = {
    active: projects.filter((p) => !p.cancelled && p.stage !== 'completed').length,
    cancelled: projects.filter((p) => p.cancelled).length,
    totalValue: activeProjectValue,
  };

  // Tickets
  const ticketsSummary = {
    open: tickets.filter((t) => t.status === 'open' || t.status === 'in_progress').length,
    total: tickets.length,
  };

  // Silence unused-team warning while keeping the dependency explicit for future use.
  void team;

  return {
    leadCountsByStage,
    totalLeads,
    wonLeads,
    lostLeads,
    openLeads,
    conversionRate,
    totalPipelineValue,
    weightedPipeline,
    recentActivities,
    overdueFollowups,
    topSalesperson,
    lostReasons,
    payments: { totalReceived, outstanding, recentCount: recentPaymentsCount },
    projects: projectsSummary,
    tickets: ticketsSummary,
    generatedAt: new Date().toISOString(),
  };
}

// ============ Insight card visual config ============

const TONE_STYLES: Record<NonNullable<InsightCard['tone']>, { border: string; chip: string; iconWrap: string }> = {
  emerald: { border: 'border-emerald-300 dark:border-emerald-800', chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300', iconWrap: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400' },
  amber:   { border: 'border-amber-300 dark:border-amber-800',     chip: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',     iconWrap: 'bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400' },
  rose:    { border: 'border-rose-300 dark:border-rose-800',       chip: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',         iconWrap: 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400' },
  blue:    { border: 'border-blue-300 dark:border-blue-800',       chip: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',         iconWrap: 'bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400' },
  purple:  { border: 'border-purple-300 dark:border-purple-800',   chip: 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300', iconWrap: 'bg-purple-100 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400' },
};

const CARD_META: Record<keyof AiInsightsResponse['insights'], { icon: React.ReactNode; gradient: string }> = {
  leadConversionPrediction: { icon: <TrendingUp className="h-4 w-4" />, gradient: 'from-emerald-500/10 to-emerald-500/0' },
  nextBestActions:          { icon: <Target className="h-4 w-4" />,     gradient: 'from-blue-500/10 to-blue-500/0' },
  salesForecast:            { icon: <Zap className="h-4 w-4" />,        gradient: 'from-purple-500/10 to-purple-500/0' },
  sentimentSummary:         { icon: <HeartPulse className="h-4 w-4" />, gradient: 'from-rose-500/10 to-rose-500/0' },
  smartFollowUps:           { icon: <PhoneCall className="h-4 w-4" />,  gradient: 'from-amber-500/10 to-amber-500/0' },
};

function InsightCardView({ card, meta }: { card: InsightCard; meta: { icon: React.ReactNode; gradient: string } }) {
  const tone = card.tone || 'blue';
  const styles = TONE_STYLES[tone] || TONE_STYLES.blue;
  return (
    <div className={cn(
      'relative rounded-xl border bg-card p-4 shadow-sm overflow-hidden flex flex-col',
      styles.border,
    )}>
      <div className={cn('absolute inset-0 bg-gradient-to-br pointer-events-none', meta.gradient)} />
      <div className="relative">
        <div className="flex items-start gap-3 mb-2">
          <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0', styles.iconWrap)}>
            {meta.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{card.title}</div>
              {card.tag && (
                <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold', styles.chip)}>
                  {card.tag}
                </span>
              )}
            </div>
            <div className="text-base font-black leading-tight mt-0.5">{card.headline}</div>
          </div>
        </div>
        <p className="text-[12px] text-muted-foreground leading-relaxed mb-2.5 whitespace-pre-line">{card.body}</p>
        {card.bullets && card.bullets.length > 0 && (
          <ul className="space-y-1">
            {card.bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11.5px] leading-snug">
                <ArrowRight className="h-3 w-3 mt-0.5 text-muted-foreground/70 flex-shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ============ Main component ============

export function AiInsights() {
  const leads = useERP((s) => s.leads);
  const projects = useERP((s) => s.projects);
  const payments = useERP((s) => s.payments);
  const activities = useERP((s) => s.activities);
  const tickets = useERP((s) => s.tickets);
  const team = useERP((s) => s.team);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<AiInsightsResponse | null>(null);

  const generate = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const summary = buildSummary(leads, projects, payments, activities, tickets, team);
      const res = await fetch('/api/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(summary),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} — ${txt.slice(0, 200) || 'request failed'}`);
      }
      const json = (await res.json()) as AiInsightsResponse;
      setData(json);
      if (json.source === 'fallback') {
        toast.info('AI service unavailable — showing rule-based insights instead.');
      } else {
        toast.success('AI insights generated.');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      toast.error('Failed to generate AI insights.');
    } finally {
      setLoading(false);
    }
  }, [leads, projects, payments, activities, tickets, team]);

  // Auto-generate once on first mount so the panel isn't empty.
  const didMount = React.useRef(false);
  React.useEffect(() => {
    if (didMount.current) return;
    didMount.current = true;
    void generate();
  }, [generate]);

  const generatedLabel = data
    ? new Date(data.generatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : null;

  return (
    <div>
      <SectionHeader
        title="AI Insights"
        subtitle="CRM intelligence powered by Karyam AI — conversion prediction, next-best-actions, forecast, sentiment & smart follow-ups."
        accent="purple"
        actions={
          <>
            {data && (
              <span className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold',
                data.source === 'ai'
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
              )}>
                <Sparkles className="h-3 w-3" />
                {data.source === 'ai' ? 'AI-generated' : 'Rule-based fallback'}
              </span>
            )}
            <Button
              size="sm"
              onClick={() => void generate()}
              disabled={loading}
              className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {loading ? 'Generating…' : data ? 'Refresh' : 'Generate AI Insights'}
            </Button>
          </>
        }
      />

      {/* Banner — only shown before the first generation completes (no data, no error). */}
      {!data && !error && loading && (
        <div className="rounded-xl border border-purple-200 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-950/20 p-5 mb-4 flex items-center gap-4">
          <div className="h-11 w-11 rounded-xl bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center flex-shrink-0">
            <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-purple-800 dark:text-purple-300">Analyzing your CRM data…</div>
            <div className="text-[12px] text-muted-foreground mt-0.5">
              Reading {leads.length} leads, {projects.length} projects, {payments.length} payments to produce 5 insight cards.
            </div>
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-purple-500 flex-shrink-0" />
        </div>
      )}

      {/* Error banner with retry */}
      {error && !data && (
        <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 p-4 mb-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-red-700 dark:text-red-300">Couldn&apos;t generate insights</div>
            <div className="text-[12px] text-muted-foreground mt-0.5 break-words">{error}</div>
          </div>
          <Button size="sm" variant="outline" onClick={() => void generate()} disabled={loading}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
          </Button>
        </div>
      )}

      {/* Insight cards */}
      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mb-3">
            <InsightCardView card={data.insights.leadConversionPrediction} meta={CARD_META.leadConversionPrediction} />
            <InsightCardView card={data.insights.nextBestActions} meta={CARD_META.nextBestActions} />
            <InsightCardView card={data.insights.salesForecast} meta={CARD_META.salesForecast} />
            <InsightCardView card={data.insights.sentimentSummary} meta={CARD_META.sentimentSummary} />
            <InsightCardView card={data.insights.smartFollowUps} meta={CARD_META.smartFollowUps} />

            {/* Quick stats panel — fills the 6th slot on xl screens */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Snapshot Stats</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                <Stat label="Open Leads" value={String(data.rawSummary.openLeads)} />
                <Stat label="Pipeline Value" value={Rs(data.rawSummary.totalPipelineValue)} />
                <Stat label="Weighted" value={Rs(data.rawSummary.weightedPipeline)} />
                <Stat label="Conversion" value={`${data.rawSummary.conversionRate}%`} />
                <Stat label="Overdue FU" value={String(data.rawSummary.overdueFollowups.length)} />
                <Stat label="Outstanding" value={Rs(data.rawSummary.payments.outstanding)} />
                <Stat label="Active Projects" value={String(data.rawSummary.projects.active)} />
                <Stat label="Open Tickets" value={String(data.rawSummary.tickets.open)} />
              </div>
              {data.rawSummary.topSalesperson && (
                <div className="mt-3 pt-3 border-t border-border text-[11px] text-muted-foreground">
                  Top rep: <span className="font-bold text-foreground">{data.rawSummary.topSalesperson.name}</span> · {data.rawSummary.topSalesperson.wonCount} win(s)
                </div>
              )}
            </div>
          </div>

          {generatedLabel && (
            <div className="text-[10px] text-muted-foreground text-right">
              Generated at {generatedLabel}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 px-2.5 py-1.5">
      <div className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-[13px] font-black leading-tight">{value}</div>
    </div>
  );
}

export default AiInsights;
