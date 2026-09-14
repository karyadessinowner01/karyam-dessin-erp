'use client';

import * as React from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useERP } from '@/lib/erp/store';
import { Rs, fD, today, now } from '@/lib/erp/utils';
import {
  Phone, PhoneCall, Mail, Building2, MapPin, CalendarClock, StickyNote, Plus,
  Tag, Megaphone, CheckCircle2, Clock3, MessageSquare, Activity as ActivityIcon,
  UserCircle2, X, ArrowRight, Calendar, IndianRupee, Star,
  FileText, PackageCheck,
} from 'lucide-react';
import type { Lead } from '@/lib/erp/types';

// ============================================================================
// Local types — defensive. Task ID 1 (foundation) adds these to the central
// types.ts + store. Until they land, we cast via `(s as any)` so this file
// still lints cleanly. Once Task 1 ships, the casts remain harmless.
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

interface ChatMessage {
  id: string;
  leadId: string;
  direction: 'in' | 'out';
  body: string;
  at: string; // ISO datetime
  by?: string;
}

// Lead status configs (quick-action buttons + status dropdown).
// Defensive: if Task 1 ships LEAD_STATUS_CONFIGS in constants.ts we still
// fall back to this local copy when the import is unavailable.
const LOCAL_LEAD_STATUS_CONFIGS = [
  { id: 'New', label: 'New', color: 'bg-slate-500', isQuickAction: false, emoji: '🆕' },
  { id: 'Interested', label: 'Interested', color: 'bg-blue-500', isQuickAction: true, emoji: '👍' },
  { id: 'Quotation Sent', label: 'Quotation Sent', color: 'bg-amber-500', isQuickAction: true, emoji: '📄' },
  { id: 'Follow Up', label: 'Follow Up', color: 'bg-purple-500', isQuickAction: true, emoji: '🔁' },
  { id: 'Not Interested', label: 'Not Interested', color: 'bg-rose-500', isQuickAction: true, emoji: '✋' },
  { id: 'Order Confirmed', label: 'Order Confirmed', color: 'bg-emerald-500', isQuickAction: true, emoji: '✅' },
  { id: 'Won', label: 'Won', color: 'bg-emerald-600', isQuickAction: false, emoji: '🏆' },
  { id: 'Lost', label: 'Lost', color: 'bg-rose-700', isQuickAction: false, emoji: '❌' },
];

const QUICK_ACTIONS = LOCAL_LEAD_STATUS_CONFIGS.filter((s) => s.isQuickAction);

function statusBadgeClass(status: string): string {
  const cfg = LOCAL_LEAD_STATUS_CONFIGS.find((s) => s.id === status);
  if (!cfg) return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  return cn(cfg.color, 'text-white');
}

// ============================================================================
// Helpers
// ============================================================================

function relativeTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return fD(iso.split('T')[0]);
}

function fmtDateTime(iso: string): string {
  if (!iso) return '—';
  const d = iso.split('T')[0];
  const t = iso.split('T')[1] || '';
  return `${fD(d)}${t ? ' ' + t.slice(0, 5) : ''}`;
}

// ============================================================================
// Main panel
// ============================================================================

export function LeadDetailPanel({ leadId, initialTab, onClose }: { leadId: string | null; initialTab?: string; onClose: () => void }) {
  const leads = useERP((s) => s.leads);
  const team = useERP((s) => s.team);
  const activities = useERP((s) => s.activities);
  const updateLead = useERP((s) => s.updateLead);
  const assignLead = useERP((s) => s.assignLead);

  const chatMessages = useERP((s) => s.chatMessages) || [];
  const followupItems = useERP((s) => s.followupItems) || [];
  const createFollowupItem = useERP((s) => s.createFollowupItem);
  const completeFollowupItem = useERP((s) => s.completeFollowupItem);

  // Quotation + Order + Call selectors
  const quotations = useERP((s) => s.quotations) || [];
  const crmOrders = useERP((s) => s.crmOrders) || [];
  const callLogs = useERP((s) => s.callLogs) || [];
  const createQuotation = useERP((s) => s.createQuotation);
  const createCRMOrder = useERP((s) => s.createCRMOrder);
  const createCallLog = useERP((s) => s.createCallLog);
  const items = useERP((s) => s.items) || [];
  const currentUser = useERP((s) => s.currentUser);

  const lead = React.useMemo<Lead | null>(
    () => leads.find((l) => l.id === leadId) || null,
    [leads, leadId],
  );
  const open = !!leadId && !!lead;

  const [tab, setTab] = React.useState<'profile' | 'messages' | 'notes' | 'followups' | 'activities' | 'quotations' | 'orders' | 'calls'>('profile');
  const [newNote, setNewNote] = React.useState('');
  const [fDate, setFDate] = React.useState('');
  const [fTime, setFTime] = React.useState('10:00');
  const [fNote, setFNote] = React.useState('');
  const [draftMsg, setDraftMsg] = React.useState('');

  // Quotation modal state
  const [showQuotationModal, setShowQuotationModal] = React.useState(false);
  const [qItem, setQItem] = React.useState('');
  const [qQty, setQQty] = React.useState('1');
  const [qRate, setQRate] = React.useState('');

  // Order modal state
  const [showOrderModal, setShowOrderModal] = React.useState(false);
  const [oAmount, setOAmount] = React.useState('');
  const [oAdvance, setOAdvance] = React.useState('');
  const [oNotes, setONotes] = React.useState('');

  // Call log modal state
  const [showCallModal, setShowCallModal] = React.useState(false);
  const [cType, setCType] = React.useState<'call' | 'meeting'>('call');
  const [cOutcome, setCOutcome] = React.useState('Connected');
  const [cDuration, setCDuration] = React.useState('');
  const [cNote, setCNote] = React.useState('');

  // Lead-specific data
  const leadQuotations = React.useMemo(() => quotations.filter(q => q.client === lead?.client), [quotations, lead]);
  const leadOrders = React.useMemo(() => crmOrders.filter(o => o.leadId === lead?.id), [crmOrders, lead]);
  const leadCalls = React.useMemo(() => callLogs.filter(c => c.leadId === lead?.id || c.customerName === lead?.client), [callLogs, lead]);

  // Reset transient state when the panel closes / opens a different lead
  React.useEffect(() => {
    if (!open) {
      setNewNote(''); setFDate(''); setFTime('10:00'); setFNote(''); setDraftMsg(''); setTab('profile');
      setShowQuotationModal(false); setShowOrderModal(false); setShowCallModal(false);
    } else if (initialTab) {
      setTab(initialTab as typeof tab);
    }
  }, [open, leadId, initialTab]);

  // ---- Derived collections for this lead ----
  const leadMessages = React.useMemo(
    () => chatMessages
      .filter((m) => m.leadId === leadId)
      .sort((a, b) => (a.at || '').localeCompare(b.at || '')),
    [chatMessages, leadId],
  );

  const leadFollowups = React.useMemo(
    () => followupItems
      .filter((f) => f.leadId === leadId)
      .sort((a, b) => (a.followupDate || '').localeCompare(b.followupDate || '')),
    [followupItems, leadId],
  );

  const leadActivities = React.useMemo(() => {
    if (!lead) return [];
    return activities.filter((a) => {
      if (a.project === lead.id) return true;
      const text = `${a.activity} ${a.user} ${a.project}`;
      return text.includes(lead.id) || (lead.client && text.includes(lead.client));
    });
  }, [activities, lead]);

  if (!open || !lead) {
    return (
      <Sheet open={false} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-[600px] p-0" />
      </Sheet>
    );
  }

  // ---- Action handlers ----
  const handleQuickStatus = (statusId: string) => {
    updateLead(lead.id, { status: statusId });
    toast.success(`Status → ${statusId}`);
  };

  const handleStatusChange = (statusId: string) => {
    updateLead(lead.id, { status: statusId });
    toast.success('Status updated');
  };

  const handleAssign = (email: string) => {
    assignLead(lead.id, email || '');
    toast.success(email ? 'Lead assigned' : 'Lead unassigned');
  };

  const handleAddNote = () => {
    const trimmed = newNote.trim();
    if (!trimmed) {
      toast.error('Note is empty');
      return;
    }
    const stamp = `${today()} ${now()}`;
    const line = `[${stamp}] ${trimmed}`;
    const existing = lead.notes ? lead.notes + '\n' : '';
    updateLead(lead.id, { notes: existing + line });
    setNewNote('');
    toast.success('Note added');
  };

  const handleScheduleFollowup = () => {
    if (!fDate) {
      toast.error('Pick a follow-up date');
      return;
    }
    createFollowupItem(lead.id, fDate, fTime || '10:00', fNote.trim());
    setFDate('');
    setFTime('10:00');
    setFNote('');
    toast.success('Follow-up scheduled');
  };

  const handleCompleteFollowup = (id: string) => {
    completeFollowupItem(id);
    toast.success('Follow-up completed');
  };

  const handleSendDraft = () => {
    // No createChatMessage action exists yet — simulate an OUT bubble by
    // optimistically treating it as a note. Toast confirmation.
    const trimmed = draftMsg.trim();
    if (!trimmed) return;
    const stamp = `${today()} ${now()}`;
    const line = `[${stamp}] [OUT MSG] ${trimmed}`;
    const existing = lead.notes ? lead.notes + '\n' : '';
    updateLead(lead.id, { notes: existing + line });
    setDraftMsg('');
    toast.success('Message logged to lead notes');
  };

  // ---- Quotation handler ----
  const handleCreateQuotation = () => {
    if (!qItem.trim() || !qRate.trim()) { toast.error('Item name and rate required'); return; }
    createQuotation({
      client: lead.client,
      date: today(),
      items: [{ name: qItem.trim(), qty: parseInt(qQty) || 1, rate: parseFloat(qRate) || 0 }],
      gstEnabled: true,
      notes: '',
    });
    updateLead(lead.id, { status: 'Quotation Sent', leadStage: 'Quotation' });
    setShowQuotationModal(false);
    setQItem(''); setQQty('1'); setQRate('');
    toast.success('Quotation created for ' + lead.client);
  };

  // ---- Order handler ----
  const handleCreateOrder = () => {
    if (!oAmount.trim()) { toast.error('Order amount required'); return; }
    createCRMOrder({
      orderNumber: 'KD-ORD-' + Date.now().toString().slice(-6),
      leadId: lead.id,
      customerName: lead.client,
      orderAmount: parseFloat(oAmount) || 0,
      advanceReceived: parseFloat(oAdvance) || 0,
      orderDetails: oNotes.trim() || undefined,
      status: 'CONFIRMED',
      confirmedBy: currentUser?.name || 'Unknown',
    } as any);
    updateLead(lead.id, { status: 'Order Confirmed', leadStage: 'Won' });
    setShowOrderModal(false);
    setOAmount(''); setOAdvance(''); setONotes('');
    toast.success('Order created for ' + lead.client);
  };

  // ---- Call log handler ----
  const handleLogCall = () => {
    createCallLog({
      leadId: lead.id,
      customerName: lead.client,
      phone: lead.phone || '',
      type: cType,
      direction: 'outgoing',
      outcome: cOutcome as any,
      durationSec: cDuration ? parseInt(cDuration) * 60 : undefined,
      notes: cNote.trim() || undefined,
      by: currentUser?.name || 'Unknown',
      at: new Date().toISOString(),
    } as any);
    setShowCallModal(false);
    setCType('call'); setCOutcome('Connected'); setCDuration(''); setCNote('');
    toast.success('Call logged for ' + lead.client);
  };

  const activeTeam = team.filter((m) => m.active);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[600px] p-0 flex flex-col gap-0"
      >
        {/* ---- Header ---- */}
        <SheetHeader className="px-5 py-4 border-b border-border shrink-0 space-y-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-lg font-black truncate flex items-center gap-2">
                <UserCircle2 className="h-5 w-5 text-muted-foreground shrink-0" />
                <span className="truncate">{lead.client || lead.contact || lead.id}</span>
              </SheetTitle>
              <SheetDescription className="flex items-center gap-2 mt-1 flex-wrap">
                {lead.phone && (
                  <a
                    href={`tel:${lead.phone}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors"
                    title={`Call ${lead.phone}`}
                  >
                    <PhoneCall className="h-3.5 w-3.5" />
                    Call Now
                  </a>
                )}
                <span className="text-xs text-muted-foreground truncate">{lead.phone || 'No phone'}</span>
                {lead.status && (
                  <Badge className={cn('text-[10px] font-bold border-transparent', statusBadgeClass(lead.status))}>
                    {lead.status}
                  </Badge>
                )}
                {lead.priority && (
                  <Badge variant="outline" className="text-[10px] font-bold">
                    {lead.priority}
                  </Badge>
                )}
              </SheetDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 shrink-0"
              onClick={onClose}
              aria-label="Close panel"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        {/* ---- Quick Action buttons ---- */}
        <div className="px-5 py-3 border-b border-border bg-muted/30 shrink-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Quick Actions
          </div>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_ACTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => handleQuickStatus(s.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-xs font-bold transition-all shadow-sm hover:opacity-90 hover:scale-[1.02]',
                  s.color,
                  lead.status === s.id && 'ring-2 ring-offset-1 ring-offset-background ring-white/60',
                )}
              >
                <span className="text-sm leading-none">{s.emoji}</span>
                <span className="truncate">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ---- Tabs ---- */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="flex-1 flex flex-col gap-0 overflow-hidden">
          <TabsList className="h-10 rounded-none bg-card border-b border-border grid grid-cols-4 sm:grid-cols-8 w-full p-1">
            <TabsTrigger value="profile" className="text-[11px] gap-1"><UserCircle2 className="h-3 w-3" /> Profile</TabsTrigger>
            <TabsTrigger value="messages" className="text-[11px] gap-1"><MessageSquare className="h-3 w-3" /> Messages</TabsTrigger>
            <TabsTrigger value="notes" className="text-[11px] gap-1"><StickyNote className="h-3 w-3" /> Notes</TabsTrigger>
            <TabsTrigger value="followups" className="text-[11px] gap-1"><CalendarClock className="h-3 w-3" /> Follow-ups</TabsTrigger>
            <TabsTrigger value="quotations" className="text-[11px] gap-1"><FileText className="h-3 w-3" /> Quotations</TabsTrigger>
            <TabsTrigger value="orders" className="text-[11px] gap-1"><PackageCheck className="h-3 w-3" /> Orders</TabsTrigger>
            <TabsTrigger value="calls" className="text-[11px] gap-1"><PhoneCall className="h-3 w-3" /> Calls</TabsTrigger>
            <TabsTrigger value="activities" className="text-[11px] gap-1"><ActivityIcon className="h-3 w-3" /> Activity</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="p-5 space-y-5">

              {/* ===== PROFILE ===== */}
              <TabsContent value="profile" className="mt-0 space-y-4">
                <Section title="Customer">
                  <InfoRow icon={Phone} label="Phone" value={lead.phone || '—'} />
                  <InfoRow icon={Mail} label="Email" value={lead.email || '—'} />
                  <InfoRow icon={Building2} label="Company" value={lead.client || '—'} />
                  <InfoRow
                    icon={MapPin}
                    label="Location"
                    value={[lead.area, lead.city, lead.state].filter(Boolean).join(', ') || '—'}
                  />
                </Section>

                <Section title="Lead Information">
                  <InfoRow icon={Tag} label="Source" value={lead.source || '—'} />
                  <InfoRow icon={Tag} label="Category" value={lead.category || 'Uncategorized'} />
                  <InfoRow icon={Megaphone} label="Priority" value={lead.priority || 'Warm'} />
                  <InfoRow
                    icon={IndianRupee}
                    label="Expected Order Value"
                    value={lead.expectedOrderValue ? Rs(lead.expectedOrderValue) : '—'}
                  />
                  <InfoRow
                    icon={Star}
                    label="Lead Score"
                    value={lead.leadScore != null ? `${lead.leadScore}/100` : '—'}
                  />
                  <InfoRow icon={CalendarClock} label="Created" value={fD(lead.createdAt?.split('T')[0])} />
                  {lead.followup && <InfoRow icon={CalendarClock} label="Next Follow-up" value={fD(lead.followup)} />}
                </Section>

                <Section title="Status & Assignment">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Change Status
                    </Label>
                    <Select value={lead.status || 'New'} onValueChange={handleStatusChange}>
                      <SelectTrigger className="w-full h-9 text-sm">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {LOCAL_LEAD_STATUS_CONFIGS.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            <span className="mr-1">{s.emoji}</span> {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Assigned To
                    </Label>
                    <Select
                      value={lead.assignedTo || '__UNASSIGNED__'}
                      onValueChange={(v) => handleAssign(v === '__UNASSIGNED__' ? '' : v)}
                    >
                      <SelectTrigger className="w-full h-9 text-sm">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__UNASSIGNED__">— Unassigned —</SelectItem>
                        {activeTeam.map((m) => (
                          <SelectItem key={m.id} value={m.email}>
                            {m.name} · {m.dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {lead.assignedToName && (
                      <div className="text-[11px] text-muted-foreground">
                        Currently: <span className="font-semibold text-foreground">{lead.assignedToName}</span>
                      </div>
                    )}
                  </div>
                </Section>
              </TabsContent>

              {/* ===== MESSAGES ===== */}
              <TabsContent value="messages" className="mt-0 space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Conversation ({leadMessages.length})
                </div>
                {leadMessages.length === 0 ? (
                  <div className="text-center py-10 text-sm text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    No messages yet. Use the box below to log an outbound message.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {leadMessages.map((m) => (
                      <div
                        key={m.id}
                        className={cn(
                          'flex',
                          m.direction === 'out' ? 'justify-end' : 'justify-start',
                        )}
                      >
                        <div
                          className={cn(
                            'max-w-[80%] rounded-xl px-3 py-2 text-xs shadow-sm',
                            m.direction === 'out'
                              ? 'bg-emerald-500 text-white rounded-br-sm'
                              : 'bg-muted text-foreground rounded-bl-sm',
                          )}
                        >
                          <div className="whitespace-pre-wrap break-words">{m.body}</div>
                          <div
                            className={cn(
                              'text-[9px] mt-1 opacity-70 flex items-center gap-1',
                              m.direction === 'out' ? 'justify-end' : 'justify-start',
                            )}
                          >
                            {m.by && <span>{m.by}</span>}
                            <span>{fmtDateTime(m.at)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <Separator />
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Log Outbound Message
                  </Label>
                  <Textarea
                    value={draftMsg}
                    onChange={(e) => setDraftMsg(e.target.value)}
                    placeholder="Type a message to log…"
                    rows={2}
                  />
                  <Button size="sm" onClick={handleSendDraft} disabled={!draftMsg.trim()} className="bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Log Message
                  </Button>
                </div>
              </TabsContent>

              {/* ===== NOTES ===== */}
              <TabsContent value="notes" className="mt-0 space-y-3">
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Add a Note
                  </Label>
                  <Textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="e.g. Customer interested in Visual Aid design. Budget around ₹15,000."
                    rows={3}
                  />
                  <Button size="sm" onClick={handleAddNote} disabled={!newNote.trim()}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Note
                  </Button>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Notes History
                  </div>
                  {!lead.notes ? (
                    <p className="text-sm text-muted-foreground">No notes yet.</p>
                  ) : (
                    <div className="rounded-lg border border-border bg-card p-3 max-h-[300px] overflow-y-auto">
                      <pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed text-foreground">
                        {lead.notes}
                      </pre>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* ===== FOLLOW-UPS ===== */}
              <TabsContent value="followups" className="mt-0 space-y-4">
                <Section title="Schedule Follow-up">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-muted-foreground">Date</Label>
                      <Input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-muted-foreground">Time</Label>
                      <Input type="time" value={fTime} onChange={(e) => setFTime(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground">Note (optional)</Label>
                    <Textarea
                      value={fNote}
                      onChange={(e) => setFNote(e.target.value)}
                      placeholder="e.g. Customer asked to call after discussing with partner."
                      rows={2}
                    />
                  </div>
                  <Button size="sm" onClick={handleScheduleFollowup} className="w-full">
                    <CalendarClock className="h-3.5 w-3.5 mr-1.5" /> Schedule Follow-up
                  </Button>
                </Section>

                {leadFollowups.length > 0 && (
                  <Section title={`Follow-up History (${leadFollowups.length})`}>
                    <div className="space-y-2">
                      {leadFollowups.map((f) => {
                        const isOverdue =
                          f.status === 'PENDING' &&
                          f.followupDate &&
                          f.followupDate < today();
                        return (
                          <div
                            key={f.id}
                            className={cn(
                              'rounded-lg border p-3 flex items-start gap-2',
                              f.status === 'COMPLETED'
                                ? 'opacity-60 border-border bg-muted/30'
                                : isOverdue
                                  ? 'border-rose-300 bg-rose-50 dark:bg-rose-950/30'
                                  : 'border-amber-200 bg-amber-50/40 dark:bg-amber-950/20',
                            )}
                          >
                            <CalendarClock
                              className={cn(
                                'h-4 w-4 mt-0.5 shrink-0',
                                f.status === 'COMPLETED'
                                  ? 'text-emerald-500'
                                  : isOverdue
                                    ? 'text-rose-500'
                                    : 'text-amber-500',
                              )}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold">
                                {fD(f.followupDate)}
                                {f.followupTime && (
                                  <span className="text-muted-foreground font-normal"> · {f.followupTime}</span>
                                )}
                              </div>
                              {f.note && (
                                <p className="text-xs text-muted-foreground mt-0.5 break-words">{f.note}</p>
                              )}
                              <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-[10px] font-bold',
                                    f.status === 'COMPLETED'
                                      ? 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300'
                                      : isOverdue
                                        ? 'border-rose-300 text-rose-700 bg-rose-50 dark:bg-rose-950 dark:text-rose-300'
                                        : 'border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950 dark:text-amber-300',
                                  )}
                                >
                                  {f.status === 'COMPLETED'
                                    ? 'Completed'
                                    : isOverdue
                                      ? 'Overdue'
                                      : 'Pending'}
                                </Badge>
                                {f.status !== 'COMPLETED' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 px-2 text-[11px] text-emerald-700 hover:text-emerald-800"
                                    onClick={() => handleCompleteFollowup(f.id)}
                                  >
                                    <CheckCircle2 className="h-3 w-3 mr-1" /> Mark Complete
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Section>
                )}
              </TabsContent>
              {/* ===== QUOTATIONS ===== */}
              <TabsContent value="quotations" className="mt-0 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Quotations ({leadQuotations.length})
                  </div>
                  <Button size="sm" className="h-7 text-[11px]" onClick={() => setShowQuotationModal(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Quotation
                  </Button>
                </div>
                {leadQuotations.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    No quotations yet. Click "+" to create one.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {leadQuotations.map((q) => (
                      <div key={q.id} className="rounded-lg border border-border bg-card p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold">{q.id}</span>
                          <Badge variant="outline" className="text-[9px]">{q.status}</Badge>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1">
                          {q.items.length} items · {fD(q.date)}
                        </div>
                        <div className="text-sm font-bold mt-1">
                          {Rs(q.items.reduce((s, i) => s + i.qty * i.rate, 0) * 1.18)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* ===== ORDERS ===== */}
              <TabsContent value="orders" className="mt-0 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Orders ({leadOrders.length})
                  </div>
                  <Button size="sm" className="h-7 text-[11px]" onClick={() => setShowOrderModal(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Order
                  </Button>
                </div>
                {leadOrders.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    <PackageCheck className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    No orders yet. Click "+" to create one.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {leadOrders.map((o) => (
                      <div key={o.id} className="rounded-lg border border-border bg-card p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold">{o.orderNumber}</span>
                          <Badge className={cn('text-[9px]', o.status === 'DELIVERED' ? 'bg-emerald-500' : o.status === 'CANCELLED' ? 'bg-red-500' : 'bg-amber-500')}>{o.status}</Badge>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1">
                          Amount: {Rs(o.orderAmount)} · Advance: {Rs(o.advanceReceived)} · Balance: {Rs(o.orderAmount - o.advanceReceived)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* ===== CALLS ===== */}
              <TabsContent value="calls" className="mt-0 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Call History ({leadCalls.length})
                  </div>
                  <div className="flex items-center gap-1.5">
                    {lead.phone && (
                      <a href={`tel:${lead.phone}`} className="inline-flex items-center justify-center h-7 px-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold transition-colors">
                        <PhoneCall className="h-3.5 w-3.5 mr-1" /> Call
                      </a>
                    )}
                    <Button size="sm" className="h-7 text-[11px]" onClick={() => setShowCallModal(true)}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Log Call
                    </Button>
                  </div>
                </div>
                {leadCalls.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    <PhoneCall className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    No calls logged. Click "Call" to dial or "+" to log a manual call.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {leadCalls.map((c) => (
                      <div key={c.id} className="rounded-lg border border-border bg-card p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold">{c.type === 'meeting' ? '📋 Meeting' : '📞 Call'}</span>
                          <Badge variant="outline" className="text-[9px]">{c.outcome || '—'}</Badge>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1">
                          {fD(c.at?.split('T')[0] || '')} · {c.by} · {c.durationSec ? `${Math.floor(c.durationSec / 60)}m ${c.durationSec % 60}s` : '—'}
                        </div>
                        {c.notes && <div className="text-[11px] mt-1">{c.notes}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* ===== ACTIVITIES ===== */}
              <TabsContent value="activities" className="mt-0">
                {leadActivities.length === 0 ? (
                  <div className="text-center py-10 text-sm text-muted-foreground">
                    <ActivityIcon className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    No activity recorded yet.
                  </div>
                ) : (
                  <div className="relative pl-5">
                    <div className="absolute left-[7px] top-1 bottom-1 w-px bg-border" />
                    <div className="space-y-4">
                      {leadActivities.map((a, i) => (
                        <div key={i} className="relative">
                          <div className="absolute -left-[18px] top-1 h-3.5 w-3.5 rounded-full border-2 border-background bg-primary" />
                          <div className="text-sm font-semibold">{a.activity}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                            <Clock3 className="h-3 w-3" />
                            <span className="font-medium">{a.user}</span>
                            <span>·</span>
                            <span>{relativeTime(a.time)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </SheetContent>

      {/* ===== Quotation Modal ===== */}
      {showQuotationModal && lead && (
        <Dialog open onOpenChange={(v) => !v && setShowQuotationModal(false)}>
          <DialogContent className="max-w-md" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle className="text-base font-black flex items-center gap-2"><FileText className="h-4 w-4" /> New Quotation — {lead.client}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase">Item Name *</Label>
                <Input value={qItem} onChange={(e) => setQItem(e.target.value)} placeholder="e.g. Visual Aid PPT" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold uppercase">Qty</Label>
                  <Input type="number" value={qQty} onChange={(e) => setQQty(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold uppercase">Rate (₹) *</Label>
                  <Input type="number" value={qRate} onChange={(e) => setQRate(e.target.value)} placeholder="25000" />
                </div>
              </div>
              <div className="text-xs text-muted-foreground">GST 18% will be auto-applied. Total: {Rs((parseInt(qQty) || 1) * (parseFloat(qRate) || 0) * 1.18)}</div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowQuotationModal(false)}>Cancel</Button>
              <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={handleCreateQuotation} disabled={!qItem.trim() || !qRate.trim()}>
                <Plus className="h-4 w-4 mr-1" /> Create Quotation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ===== Order Modal ===== */}
      {showOrderModal && lead && (
        <Dialog open onOpenChange={(v) => !v && setShowOrderModal(false)}>
          <DialogContent className="max-w-md" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle className="text-base font-black flex items-center gap-2"><PackageCheck className="h-4 w-4" /> New Order — {lead.client}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold uppercase">Order Amount (₹) *</Label>
                  <Input type="number" value={oAmount} onChange={(e) => setOAmount(e.target.value)} placeholder="50000" autoFocus />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold uppercase">Advance (₹)</Label>
                  <Input type="number" value={oAdvance} onChange={(e) => setOAdvance(e.target.value)} placeholder="10000" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase">Notes</Label>
                <Textarea value={oNotes} onChange={(e) => setONotes(e.target.value)} placeholder="Order details..." rows={2} />
              </div>
              {oAmount && <div className="text-xs text-muted-foreground">Balance: {Rs((parseFloat(oAmount) || 0) - (parseFloat(oAdvance) || 0))}</div>}
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowOrderModal(false)}>Cancel</Button>
              <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={handleCreateOrder} disabled={!oAmount.trim()}>
                <Plus className="h-4 w-4 mr-1" /> Create Order
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ===== Call Log Modal ===== */}
      {showCallModal && lead && (
        <Dialog open onOpenChange={(v) => !v && setShowCallModal(false)}>
          <DialogContent className="max-w-md" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle className="text-base font-black flex items-center gap-2"><PhoneCall className="h-4 w-4" /> Log Call — {lead.client}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold uppercase">Type</Label>
                  <Select value={cType} onValueChange={(v) => setCType(v as 'call' | 'meeting')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="call">📞 Call</SelectItem><SelectItem value="meeting">📋 Meeting</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold uppercase">Outcome</Label>
                  <Select value={cOutcome} onValueChange={setCOutcome}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Connected">Connected</SelectItem>
                      <SelectItem value="Busy">Busy</SelectItem>
                      <SelectItem value="No Answer">No Answer</SelectItem>
                      <SelectItem value="Voicemail">Voicemail</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase">Duration (minutes)</Label>
                <Input type="number" value={cDuration} onChange={(e) => setCDuration(e.target.value)} placeholder="5" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase">Notes</Label>
                <Textarea value={cNote} onChange={(e) => setCNote(e.target.value)} placeholder="Call notes..." rows={2} />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowCallModal(false)}>Cancel</Button>
              <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={handleLogCall}>
                <Plus className="h-4 w-4 mr-1" /> Log Call
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Sheet>
  );
}

// ============================================================================
// Small presentational helpers
// ============================================================================

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3.5 space-y-2.5">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{label}</div>
        <div className="font-medium break-words">{value}</div>
      </div>
    </div>
  );
}
