'use client';

import * as React from 'react';
import {
  AlertTriangle, CalendarClock, Clock, CheckCircle2, Plus,
  Megaphone, ArrowRight, User, ListChecks, Phone,
} from 'lucide-react';
import { toast } from 'sonner';
import { useERP } from '@/lib/erp/store';
import { fD, today, matchSearch } from '@/lib/erp/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { SectionHeader, StatCard, EmptyState } from '../ui';
import { LeadDetailPanel } from './LeadDetailPanel';

// ============================================================================
// Local FollowupItem type — defensive. Task ID 1 adds this to types.ts +
// store.ts. Until then we cast via `(s as any)` so this file lints cleanly.
// ============================================================================

interface FollowupItem {
  id: string;
  leadId: string;
  followupDate: string; // YYYY-MM-DD
  followupTime?: string; // HH:MM
  note?: string;
  status: 'PENDING' | 'COMPLETED';
  createdAt: string;
}

// ============================================================================
// Helpers
// ============================================================================

/** Start of today (00:00 local) as YYYY-MM-DD. */
function isToday(d: string): boolean {
  return d === today();
}
function isOverdue(d: string): boolean {
  return d < today();
}
function isUpcoming(d: string): boolean {
  return d > today();
}

/** ISO week range — returns [mondayISO, sundayISO] for the week containing `dateStr`. */
function weekRange(dateStr: string): [string, string] {
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return ['', ''];
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  const monday = new Date(d);
  monday.setDate(d.getDate() - day);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return [monday.toISOString().split('T')[0], sunday.toISOString().split('T')[0]];
}

function startOfWeek(): string {
  return weekRange(today())[0];
}

// ============================================================================
// Main view
// ============================================================================

export function FollowupsView() {
  const leads = useERP((s) => s.leads);
  const followupItems = useERP((s) => s.followupItems) || [];
  const completeFollowupItem = useERP((s) => s.completeFollowupItem);

  const [search, setSearch] = React.useState('');
  const [openLeadId, setOpenLeadId] = React.useState<string | null>(null);

  // Map leadId -> lead for display
  const leadMap = React.useMemo(() => {
    const m = new Map<string, typeof leads[number]>();
    leads.forEach((l) => m.set(l.id, l));
    return m;
  }, [leads]);

  // Filter only pending follow-ups that match the search
  const filtered = followupItems.filter((f) => {
    if (f.status !== 'PENDING') return false;
    if (!search) return true;
    const lead = leadMap.get(f.leadId);
    const text = `${lead?.client || ''} ${lead?.contact || ''} ${lead?.phone || ''} ${f.note || ''} ${f.leadId}`;
    return matchSearch(text, search);
  });

  // Group by date bucket
  const overdue = filtered
    .filter((f) => f.followupDate && isOverdue(f.followupDate))
    .sort((a, b) => (a.followupDate || '').localeCompare(b.followupDate || ''));
  const todayList = filtered
    .filter((f) => f.followupDate && isToday(f.followupDate))
    .sort((a, b) => (a.followupTime || '').localeCompare(b.followupTime || ''));
  const upcoming = filtered
    .filter((f) => f.followupDate && isUpcoming(f.followupDate))
    .sort((a, b) => (a.followupDate || '').localeCompare(b.followupDate || ''));

  // Stats — completed this week (Mon → Sun)
  const weekStart = startOfWeek();
  const weekEnd = weekRange(today())[1];
  const completedThisWeek = followupItems.filter(
    (f) =>
      f.status === 'COMPLETED' &&
      f.followupDate >= weekStart &&
      f.followupDate <= weekEnd,
  ).length;

  const handleComplete = (id: string) => {
    if (!completeFollowupItem) {
      toast.error('Complete action not ready (store action missing)');
      return;
    }
    completeFollowupItem(id);
    toast.success('Follow-up completed');
  };

  return (
    <div>
      <SectionHeader
        title="Follow-ups"
        subtitle="Stay on top of every scheduled follow-up — overdue, today, and upcoming."
        accent="amber"
        actions={
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by lead, phone, note…"
            className="h-9 w-64 text-sm"
          />
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard
          label="Overdue"
          value={overdue.length}
          tone={overdue.length > 0 ? 'danger' : 'default'}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <StatCard
          label="Today"
          value={todayList.length}
          tone={todayList.length > 0 ? 'warn' : 'default'}
          icon={<CalendarClock className="h-4 w-4" />}
        />
        <StatCard
          label="Upcoming"
          value={upcoming.length}
          tone="primary"
          icon={<Clock className="h-4 w-4" />}
        />
        <StatCard
          label="Completed This Week"
          value={completedThisWeek}
          tone="accent"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
      </div>

      {/* Sections */}
      <div className="space-y-5">
        <FollowupSection
          title="Overdue Follow-ups"
          subtitle={`${overdue.length} ${overdue.length === 1 ? 'lead' : 'leads'} need attention`}
          icon={AlertTriangle}
          tone="rose"
          items={overdue}
          leadMap={leadMap}
          onComplete={handleComplete}
          onOpenLead={setOpenLeadId}
          emptyText="No overdue follow-ups 🎉"
          highlight
        />

        <FollowupSection
          title="Today's Follow-ups"
          subtitle={`${todayList.length} scheduled for today`}
          icon={CalendarClock}
          tone="amber"
          items={todayList}
          leadMap={leadMap}
          onComplete={handleComplete}
          onOpenLead={setOpenLeadId}
          emptyText="Nothing scheduled for today."
          highlight
        />

        <FollowupSection
          title="Upcoming Follow-ups"
          subtitle={`${upcoming.length} scheduled in the future`}
          icon={Clock}
          tone="blue"
          items={upcoming}
          leadMap={leadMap}
          onComplete={handleComplete}
          onOpenLead={setOpenLeadId}
          emptyText="No upcoming follow-ups."
        />
      </div>

      {/* Slide-out lead detail panel */}
      <LeadDetailPanel leadId={openLeadId} onClose={() => setOpenLeadId(null)} />
    </div>
  );
}

// ============================================================================
// Section
// ============================================================================

interface SectionProps {
  title: string;
  subtitle: string;
  icon: any;
  tone: 'rose' | 'amber' | 'blue';
  items: FollowupItem[];
  leadMap: Map<string, any>;
  onComplete: (id: string) => void;
  onOpenLead: (id: string) => void;
  emptyText: string;
  highlight?: boolean;
}

function FollowupSection({
  title, subtitle, icon: Icon, tone, items, leadMap,
  onComplete, onOpenLead, emptyText, highlight,
}: SectionProps) {
  const toneMap = {
    rose: {
      header: 'bg-rose-500 text-white',
      headerBg: 'bg-rose-50 dark:bg-rose-950/30',
      border: 'border-rose-200 dark:border-rose-900',
      accent: 'text-rose-600 dark:text-rose-300',
      chip: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
      leftBorder: 'border-l-rose-400',
    },
    amber: {
      header: 'bg-amber-500 text-white',
      headerBg: 'bg-amber-50 dark:bg-amber-950/30',
      border: 'border-amber-200 dark:border-amber-900',
      accent: 'text-amber-600 dark:text-amber-300',
      chip: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
      leftBorder: 'border-l-amber-400',
    },
    blue: {
      header: 'bg-blue-500 text-white',
      headerBg: 'bg-blue-50 dark:bg-blue-950/30',
      border: 'border-blue-200 dark:border-blue-900',
      accent: 'text-blue-600 dark:text-blue-300',
      chip: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
      leftBorder: 'border-l-blue-400',
    },
  } as const;
  const t = toneMap[tone];

  return (
    <div
      className={cn(
        'rounded-xl border bg-card overflow-hidden shadow-sm',
        t.border,
        highlight && items.length > 0 && 'border-l-4',
        highlight && items.length > 0 && t.leftBorder,
      )}
    >
      {/* Header */}
      <div className={cn('flex items-center gap-3 px-4 py-3 border-b', t.border, t.headerBg)}>
        <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', t.header)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black tracking-tight">{title}</h3>
            <Badge className={cn('text-[10px] font-bold border-transparent', t.chip)}>
              {items.length}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      {/* Items */}
      <ScrollArea className={cn(items.length > 6 ? 'max-h-[420px]' : '')}>
        {items.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">{emptyText}</div>
        ) : (
          <ul className="divide-y divide-border/60">
            {items.map((f) => {
              const lead = leadMap.get(f.leadId);
              const name = lead?.client || lead?.contact || f.leadId;
              const phone = lead?.phone || '';
              const source = lead?.source || '';
              return (
                <li
                  key={f.id}
                  className="flex items-center gap-3 p-3 hover:bg-muted/40 transition-colors"
                >
                  {/* Avatar */}
                  <div
                    className={cn(
                      'h-10 w-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0',
                      tone === 'rose' ? 'bg-rose-400' : tone === 'amber' ? 'bg-amber-400' : 'bg-blue-400',
                    )}
                  >
                    {name?.[0]?.toUpperCase() || '?'}
                  </div>

                  {/* Lead info + note */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold truncate">{name}</span>
                      {source === 'Meta WhatsApp Ad' && (
                        <Megaphone className="h-3 w-3 text-amber-500 shrink-0" />
                      )}
                      {phone && (
                        <a
                          href={`tel:${phone}`}
                          className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone className="h-3 w-3" /> {phone}
                        </a>
                      )}
                    </div>
                    {f.note ? (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{f.note}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground/60 italic mt-0.5">No note</p>
                    )}
                  </div>

                  {/* Date / time */}
                  <div className="text-right shrink-0">
                    <div className={cn('text-xs font-bold', t.accent)}>{fD(f.followupDate)}</div>
                    <div className="text-[10px] text-muted-foreground">
                      <Clock className="h-2.5 w-2.5 inline mr-0.5" />
                      {f.followupTime || '10:00'}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-[11px] text-emerald-700 hover:text-emerald-800 hover:border-emerald-400"
                      onClick={() => onComplete(f.id)}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Complete
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => onOpenLead(f.leadId)}
                    >
                      Open Lead <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}
