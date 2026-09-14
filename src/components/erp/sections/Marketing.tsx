'use client';

import * as React from 'react';
import {
  Plus, Megaphone, Pencil, Trash2, Mail, MessageSquare, Smartphone, Layers,
  TrendingUp, Send, Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { useERP } from '@/lib/erp/store';
import { fD, today, matchSearch } from '@/lib/erp/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  SectionHeader, TableShell, Th, Td, EmptyState, StatusBadge,
  Modal, ConfirmDialog, Field, StatCard, FilterBar, FilterChip,
} from '../ui';
import type { Campaign } from '@/lib/erp/types';

const CHANNELS: Campaign['channel'][] = ['Email', 'SMS', 'WhatsApp', 'Mixed'];
const STATUSES: Campaign['status'][] = ['Draft', 'Active', 'Completed', 'Paused'];

const CHANNEL_ICON: Record<Campaign['channel'], React.ReactNode> = {
  Email: <Mail className="h-3.5 w-3.5" />,
  SMS: <MessageSquare className="h-3.5 w-3.5" />,
  WhatsApp: <Smartphone className="h-3.5 w-3.5" />,
  Mixed: <Layers className="h-3.5 w-3.5" />,
};

const CHANNEL_BADGE: Record<Campaign['channel'], string> = {
  Email: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  SMS: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  WhatsApp: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  Mixed: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
};

export function Marketing() {
  const campaigns = useERP((s) => s.campaigns) ?? [];
  const createCampaign = useERP((s) => s.createCampaign);
  const updateCampaign = useERP((s) => s.updateCampaign);
  const deleteCampaign = useERP((s) => s.deleteCampaign);

  const [search, setSearch] = React.useState('');
  const [channelFilter, setChannelFilter] = React.useState<string>('all');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [showNew, setShowNew] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<Campaign | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<Campaign | null>(null);

  const filtered = campaigns.filter((c) => {
    if (!matchSearch(
      `${c.id} ${c.name} ${c.channel} ${c.status} ${c.segment || ''} ${c.notes || ''}`,
      search,
    )) return false;
    if (channelFilter !== 'all' && c.channel !== channelFilter) return false;
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    return true;
  });

  const totalCampaigns = campaigns.length;
  const activeCount = campaigns.filter((c) => c.status === 'Active').length;
  const totalSent = campaigns.reduce((s, c) => s + (c.sentCount || 0), 0);
  const totalOpens = campaigns.reduce((s, c) => s + (c.openCount || 0), 0);
  const avgOpenRate = totalSent > 0 ? (totalOpens / totalSent) * 100 : 0;

  const openRate = (c: Campaign) => {
    if (!c.sentCount || c.sentCount === 0) return 0;
    return ((c.openCount || 0) / c.sentCount) * 100;
  };

  const channelCount = (ch: string) => campaigns.filter((c) => c.channel === ch).length;
  const statusCount = (st: string) => campaigns.filter((c) => c.status === st).length;

  const hasFilter = channelFilter !== 'all' || statusFilter !== 'all';
  const clearFilters = () => { setChannelFilter('all'); setStatusFilter('all'); };

  return (
    <div>
      <SectionHeader
        title="Marketing"
        subtitle="Campaigns across Email, SMS & WhatsApp — track reach, opens and ROI."
        accent="purple"
        actions={
          <Button onClick={() => setShowNew(true)} className="h-9 bg-slate-900 hover:bg-slate-800">
            <Plus className="h-4 w-4" /> New Campaign
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Campaigns" value={totalCampaigns} tone="primary" icon={<Megaphone className="h-4 w-4" />} />
        <StatCard label="Active" value={activeCount} tone="accent" icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Total Sent" value={totalSent.toLocaleString('en-IN')} icon={<Send className="h-4 w-4" />} />
        <StatCard
          label="Avg Open Rate"
          value={`${avgOpenRate.toFixed(1)}%`}
          tone={avgOpenRate >= 20 ? 'accent' : 'warn'}
          icon={<Eye className="h-4 w-4" />}
        />
      </div>

      <FilterBar label="Filters" onClear={clearFilters} showClear={hasFilter}>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Channel:</span>
        <FilterChip label="All" active={channelFilter === 'all'} onClick={() => setChannelFilter('all')} count={totalCampaigns} />
        {CHANNELS.map((ch) => (
          <FilterChip
            key={ch}
            label={ch}
            active={channelFilter === ch}
            onClick={() => setChannelFilter(ch)}
            count={channelCount(ch)}
          />
        ))}
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-2">Status:</span>
        <FilterChip label="All" active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
        {STATUSES.map((st) => (
          <FilterChip
            key={st}
            label={st}
            active={statusFilter === st}
            onClick={() => setStatusFilter(st)}
            count={statusCount(st)}
          />
        ))}
      </FilterBar>

      <TableShell title="All Campaigns" search={search} onSearch={setSearch}>
        <thead>
          <tr>
            <Th>Name</Th><Th>Channel</Th><Th>Status</Th><Th>Segment</Th>
            <Th className="text-right">Audience</Th><Th className="text-right">Sent</Th>
            <Th className="text-right">Opens</Th><Th className="text-right">Clicks</Th>
            <Th className="text-right">Open Rate</Th><Th className="text-right">ROI</Th>
            <Th>Start</Th><Th>End</Th><Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <EmptyState icon={<Megaphone className="h-8 w-8" />} message="No campaigns yet — create your first one." />
          ) : filtered.map((c) => {
            const rate = openRate(c);
            return (
              <tr key={c.id} className="hover:bg-muted/30">
                <Td>
                  <div className="font-bold">{c.name}</div>
                  <div className="text-[10px] text-muted-foreground">{c.id}</div>
                </Td>
                <Td>
                  <Badge className={cn('text-[10px] font-bold gap-1', CHANNEL_BADGE[c.channel])}>
                    {CHANNEL_ICON[c.channel]} {c.channel}
                  </Badge>
                </Td>
                <Td><StatusBadge status={c.status} /></Td>
                <Td>{c.segment || <span className="text-muted-foreground text-xs">—</span>}</Td>
                <Td className="text-right tabular-nums">{(c.audienceCount || 0).toLocaleString('en-IN')}</Td>
                <Td className="text-right tabular-nums">{(c.sentCount || 0).toLocaleString('en-IN')}</Td>
                <Td className="text-right tabular-nums">{(c.openCount || 0).toLocaleString('en-IN')}</Td>
                <Td className="text-right tabular-nums">{(c.clickCount || 0).toLocaleString('en-IN')}</Td>
                <Td className="text-right">
                  <span className={cn('text-xs font-bold tabular-nums', rate >= 25 ? 'text-emerald-600' : rate >= 10 ? 'text-amber-600' : 'text-muted-foreground')}>
                    {rate.toFixed(1)}%
                  </span>
                </Td>
                <Td className="text-right tabular-nums">{c.roi != null ? `${c.roi.toFixed(1)}x` : '—'}</Td>
                <Td>{fD(c.startDate)}</Td>
                <Td>{fD(c.endDate)}</Td>
                <Td>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setEditTarget(c)} title="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50" onClick={() => setConfirmDelete(c)} title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </TableShell>

      <CampaignModal
        open={showNew}
        onOpenChange={setShowNew}
        onSubmit={(data) => {
          createCampaign?.(data);
          toast.success('Campaign created');
          setShowNew(false);
        }}
      />

      {editTarget && (
        <CampaignModal
          open
          onOpenChange={(v) => !v && setEditTarget(null)}
          initial={editTarget}
          title={`Edit Campaign: ${editTarget.name}`}
          onSubmit={(data) => {
            updateCampaign?.(editTarget.id, data);
            toast.success('Campaign updated');
            setEditTarget(null);
          }}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title="Delete Campaign?"
        message={`"${confirmDelete?.name}" will be permanently removed.`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirmDelete) {
            deleteCampaign?.(confirmDelete.id);
            toast.error('Campaign deleted');
          }
        }}
      />
    </div>
  );
}

// ============ New / Edit Campaign Modal ============
function CampaignModal({
  open, onOpenChange, onSubmit, initial, title = 'New Campaign',
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (data: Omit<Campaign, 'id'>) => void;
  initial?: Campaign;
  title?: string;
}) {
  const [name, setName] = React.useState(initial?.name ?? '');
  const [channel, setChannel] = React.useState<Campaign['channel']>(initial?.channel ?? 'Email');
  const [status, setStatus] = React.useState<Campaign['status']>(initial?.status ?? 'Draft');
  const [segment, setSegment] = React.useState(initial?.segment ?? '');
  const [audienceCount, setAudienceCount] = React.useState<string>(initial?.audienceCount != null ? String(initial.audienceCount) : '');
  const [sentCount, setSentCount] = React.useState<string>(initial?.sentCount != null ? String(initial.sentCount) : '');
  const [openCount, setOpenCount] = React.useState<string>(initial?.openCount != null ? String(initial.openCount) : '');
  const [clickCount, setClickCount] = React.useState<string>(initial?.clickCount != null ? String(initial.clickCount) : '');
  const [roi, setRoi] = React.useState<string>(initial?.roi != null ? String(initial.roi) : '');
  const [startDate, setStartDate] = React.useState(initial?.startDate ?? today());
  const [endDate, setEndDate] = React.useState(initial?.endDate ?? '');
  const [notes, setNotes] = React.useState(initial?.notes ?? '');

  // Reset when modal reopens for a different target
  React.useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? '');
    setChannel(initial?.channel ?? 'Email');
    setStatus(initial?.status ?? 'Draft');
    setSegment(initial?.segment ?? '');
    setAudienceCount(initial?.audienceCount != null ? String(initial.audienceCount) : '');
    setSentCount(initial?.sentCount != null ? String(initial.sentCount) : '');
    setOpenCount(initial?.openCount != null ? String(initial.openCount) : '');
    setClickCount(initial?.clickCount != null ? String(initial.clickCount) : '');
    setRoi(initial?.roi != null ? String(initial.roi) : '');
    setStartDate(initial?.startDate ?? today());
    setEndDate(initial?.endDate ?? '');
    setNotes(initial?.notes ?? '');
  }, [open, initial]);

  const submit = () => {
    if (!name.trim()) { toast.error('Campaign name is required'); return; }
    onSubmit({
      name: name.trim(),
      channel,
      status,
      segment: segment.trim() || undefined,
      audienceCount: audienceCount ? Number(audienceCount) : undefined,
      sentCount: sentCount ? Number(sentCount) : undefined,
      openCount: openCount ? Number(openCount) : undefined,
      clickCount: clickCount ? Number(clickCount) : undefined,
      roi: roi ? Number(roi) : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-slate-900 hover:bg-slate-800" onClick={submit}>
            {initial ? 'Save Changes' : 'Create Campaign'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Campaign Name" className="col-span-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Diwali Blast 2025" />
        </Field>
        <Field label="Channel">
          <Select value={channel} onValueChange={(v) => setChannel(v as Campaign['channel'])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CHANNELS.map((ch) => <SelectItem key={ch} value={ch}>{ch}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Status">
          <Select value={status} onValueChange={(v) => setStatus(v as Campaign['status'])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map((st) => <SelectItem key={st} value={st}>{st}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Segment">
          <Input value={segment} onChange={(e) => setSegment(e.target.value)} placeholder="A-category doctors / Mumbai" />
        </Field>
        <Field label="Audience Count">
          <Input type="number" min="0" value={audienceCount} onChange={(e) => setAudienceCount(e.target.value)} placeholder="0" />
        </Field>
        <Field label="Sent Count">
          <Input type="number" min="0" value={sentCount} onChange={(e) => setSentCount(e.target.value)} placeholder="0" />
        </Field>
        <Field label="Open Count">
          <Input type="number" min="0" value={openCount} onChange={(e) => setOpenCount(e.target.value)} placeholder="0" />
        </Field>
        <Field label="Click Count">
          <Input type="number" min="0" value={clickCount} onChange={(e) => setClickCount(e.target.value)} placeholder="0" />
        </Field>
        <Field label="ROI (multiple, e.g. 2.5x)">
          <Input type="number" step="0.1" min="0" value={roi} onChange={(e) => setRoi(e.target.value)} placeholder="2.5" />
        </Field>
        <Field label="Start Date">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Field>
        <Field label="End Date">
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </Field>
      </div>
      <Field label="Notes">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Objective, creative brief, learnings…" rows={3} />
      </Field>
    </Modal>
  );
}
