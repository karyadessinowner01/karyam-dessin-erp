'use client';

import * as React from 'react';
import {
  Plus, Trophy, TrendingUp, AlertTriangle, Phone,
} from 'lucide-react';
import { toast } from 'sonner';
import { useERP } from '@/lib/erp/store';
import { Rs, fD, matchSearch } from '@/lib/erp/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { SectionHeader, StatCard } from '../ui';
import type { Lead, LeadStage, LeadPriority } from '@/lib/erp/types';

const STAGES: LeadStage[] = ['New', 'Contacted', 'Qualified', 'Quotation', 'Negotiation', 'Won', 'Lost'];

const STAGE_META: Record<LeadStage, { color: string; bg: string; text: string; bar: string }> = {
  New:         { color: 'bg-slate-400',   bg: 'bg-slate-50 dark:bg-slate-950/40',   text: 'text-slate-700 dark:text-slate-300',   bar: 'bg-slate-400' },
  Contacted:   { color: 'bg-blue-400',    bg: 'bg-blue-50 dark:bg-blue-950/40',     text: 'text-blue-700 dark:text-blue-300',     bar: 'bg-blue-400' },
  Qualified:   { color: 'bg-cyan-400',    bg: 'bg-cyan-50 dark:bg-cyan-950/40',     text: 'text-cyan-700 dark:text-cyan-300',     bar: 'bg-cyan-400' },
  Quotation:   { color: 'bg-amber-400',   bg: 'bg-amber-50 dark:bg-amber-950/40',   text: 'text-amber-700 dark:text-amber-300',   bar: 'bg-amber-400' },
  Negotiation: { color: 'bg-purple-400',  bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-300', bar: 'bg-purple-400' },
  Won:         { color: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', bar: 'bg-emerald-500' },
  Lost:        { color: 'bg-rose-400',    bg: 'bg-rose-50 dark:bg-rose-950/40',     text: 'text-rose-700 dark:text-rose-300',     bar: 'bg-rose-400' },
};

const PRIORITY_DOT: Record<LeadPriority, string> = {
  Hot: 'bg-rose-500',
  Warm: 'bg-amber-500',
  Cold: 'bg-blue-400',
};

const PRIORITY_BADGE: Record<LeadPriority, string> = {
  Hot: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  Warm: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  Cold: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
};

function daysSince(iso: string): number {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 0;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export function SalesPipeline() {
  const leads = useERP((s) => s.leads);
  const team = useERP((s) => s.team);
  const updateLead = useERP((s) => s.updateLead);

  const [search, setSearch] = React.useState('');
  const [priorityFilter, setPriorityFilter] = React.useState<string>('all');
  const [assignFilter, setAssignFilter] = React.useState<string>('all');

  const activeTeam = team.filter((m) => m.active);

  // Normalize: leads without leadStage default to 'New'
  const normalized = leads.map((l) => ({ ...l, leadStage: (l.leadStage || 'New') as LeadStage }));

  const filtered = normalized.filter((l) => {
    if (!matchSearch(`${l.id} ${l.client} ${l.contact} ${l.source} ${l.assignedToName || ''}`, search)) return false;
    if (priorityFilter !== 'all' && (l.priority || 'Warm') !== priorityFilter) return false;
    if (assignFilter === 'unassigned') {
      if (l.assignedTo) return false;
    } else if (assignFilter !== 'all') {
      if (!l.assignedTo || l.assignedTo.toLowerCase() !== assignFilter.toLowerCase()) return false;
    }
    return true;
  });

  // Group by stage
  const columns = STAGES.map((stage) => ({
    stage,
    cards: filtered.filter((l) => l.leadStage === stage),
  }));

  // Stats
  const activeStages = normalized.filter((l) => l.leadStage !== 'Won' && l.leadStage !== 'Lost');
  const wonLeads = normalized.filter((l) => l.leadStage === 'Won');
  const lostLeads = normalized.filter((l) => l.leadStage === 'Lost');
  const totalPipeline = activeStages.reduce((sum, l) => sum + (l.expectedOrderValue || 0), 0);
  const wonValue = wonLeads.reduce((sum, l) => sum + (l.expectedOrderValue || 0), 0);
  const closedCount = wonLeads.length + lostLeads.length;
  const winRate = closedCount > 0 ? Math.round((wonLeads.length / closedCount) * 100) : 0;
  // Stuck deals: leads in a non-terminal stage whose createdAt is older than 14 days
  const stuckDeals = activeStages.filter((l) => daysSince(l.createdAt) > 14);

  const moveStage = (lead: Lead, newStage: LeadStage) => {
    if (lead.leadStage === newStage) return;
    updateLead(lead.id, { leadStage: newStage });
    toast.success(`${lead.client} → ${newStage}`);
  };

  return (
    <div>
      <SectionHeader
        title="Sales Pipeline"
        subtitle="Kanban view of leads across stages — click a card to move it."
        accent="purple"
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Pipeline" value={Rs(totalPipeline)} tone="primary" icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Won Value" value={Rs(wonValue)} tone="accent" icon={<Trophy className="h-4 w-4" />} />
        <StatCard label="Win Rate" value={`${winRate}%`} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Stuck Deals" value={stuckDeals.length} tone={stuckDeals.length > 0 ? 'warn' : 'default'} icon={<AlertTriangle className="h-4 w-4" />} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-xl border border-border bg-muted/30">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Priority:</span>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="Hot">Hot</SelectItem>
            <SelectItem value="Warm">Warm</SelectItem>
            <SelectItem value="Cold">Cold</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-2">Assignee:</span>
        <Select value={assignFilter} onValueChange={setAssignFilter}>
          <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Everyone</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {activeTeam.map((m) => (
              <SelectItem key={m.id} value={m.email}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search leads..."
          className="h-8 w-44 text-xs ml-auto"
        />
        {(priorityFilter !== 'all' || assignFilter !== 'all' || search) && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setPriorityFilter('all'); setAssignFilter('all'); setSearch(''); }}>Clear</Button>
        )}
      </div>

      {/* Kanban board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-3 min-w-max">
          {columns.map((col) => {
            const meta = STAGE_META[col.stage];
            const colTotal = col.cards.reduce((s, l) => s + (l.expectedOrderValue || 0), 0);
            return (
              <div key={col.stage} className={cn('w-72 flex-shrink-0 rounded-xl border border-border overflow-hidden', meta.bg)}>
                {/* Column header */}
                <div className="p-3 border-b border-border/60">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={cn('h-2.5 w-2.5 rounded-full', meta.color)} />
                      <span className={cn('text-sm font-bold', meta.text)}>{col.stage}</span>
                    </div>
                    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black bg-white/70 dark:bg-black/30 text-foreground">
                      {col.cards.length}
                    </span>
                  </div>
                  <div className="text-[10px] font-semibold text-muted-foreground mt-1">{Rs(colTotal)}</div>
                </div>
                {/* Cards */}
                <div className="p-2 space-y-2 max-h-[60vh] overflow-y-auto">
                  {col.cards.length === 0 ? (
                    <div className="text-center py-8 text-xs text-muted-foreground italic">No leads</div>
                  ) : col.cards.map((lead) => (
                    <PipelineCard key={lead.id} lead={lead} onMove={(s) => moveStage(lead, s)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PipelineCard({ lead, onMove }: { lead: Lead; onMove: (stage: LeadStage) => void }) {
  const priority: LeadPriority = lead.priority || 'Warm';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'w-full text-left rounded-lg bg-card border border-border p-2.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all',
            'focus:outline-none focus:ring-2 focus:ring-emerald-400/40 cursor-pointer',
          )}
        >
          <div className="flex items-start justify-between gap-1.5">
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-bold truncate">{lead.client}</div>
              <div className="text-[10px] text-muted-foreground truncate">{lead.contact} · {lead.id}</div>
            </div>
            <span className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0 mt-1', PRIORITY_DOT[priority])} title={`${priority} priority`} />
          </div>
          {lead.expectedOrderValue ? (
            <div className="text-sm font-black mt-1.5 text-emerald-700 dark:text-emerald-300">{Rs(lead.expectedOrderValue)}</div>
          ) : (
            <div className="text-[11px] text-muted-foreground italic mt-1.5">Value not set</div>
          )}
          <div className="flex items-center justify-between gap-1.5 mt-2">
            <Badge className={cn('text-[9px] font-bold px-1.5 py-0', PRIORITY_BADGE[priority])}>{priority}</Badge>
            {lead.assignedToName ? (
              <span className="text-[10px] text-muted-foreground truncate max-w-[110px]">@{lead.assignedToName}</span>
            ) : (
              <span className="text-[10px] text-muted-foreground italic">Unassigned</span>
            )}
          </div>
          {typeof lead.winProbability === 'number' && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-[9px] font-bold text-muted-foreground mb-0.5">
                <span>WIN PROBABILITY</span>
                <span>{lead.winProbability}%</span>
              </div>
              <div className="h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn('h-full rounded-full', lead.winProbability >= 70 ? 'bg-emerald-500' : lead.winProbability >= 40 ? 'bg-amber-500' : 'bg-rose-400')}
                  style={{ width: `${Math.max(2, Math.min(100, lead.winProbability))}%` }}
                />
              </div>
            </div>
          )}
          {lead.expectedCloseDate && (
            <div className="text-[9px] text-muted-foreground mt-1.5">Close: {fD(lead.expectedCloseDate)}</div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-[11px]">Move to stage</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {STAGES.map((s) => (
          <DropdownMenuItem
            key={s}
            disabled={lead.leadStage === s}
            onClick={() => onMove(s)}
            className={cn('gap-2 text-xs', lead.leadStage === s && 'opacity-50')}
          >
            <span className={cn('h-2 w-2 rounded-full', STAGE_META[s].color)} />
            {s}
            {lead.leadStage === s && <span className="ml-auto text-[10px] text-muted-foreground">current</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
