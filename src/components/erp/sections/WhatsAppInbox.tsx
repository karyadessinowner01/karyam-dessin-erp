'use client';

import * as React from 'react';
import {
  Search, Send, Paperclip, MessageSquare, Check, CheckCheck, Megaphone,
  User as UserIcon, Smile, X, ChevronRight, PhoneCall, Plus, UserPlus,
  FileText, PackageCheck, FolderOpen, ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { useERP } from '@/lib/erp/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// ============ Local types ============
// (Task ID 1 adds ChatMessage / QuickReply to lib/erp/types.ts and wires
// chatMessages / quickReplies / sendChatMessage / markLeadRead into the
// Zustand store. Until that lands, we keep local definitions so this
// component compiles standalone and cast defensively via `as any`.)
type ChatMessage = {
  id: string;
  leadId: string;
  direction: 'IN' | 'OUT';
  messageType?: string;
  body: string;
  status?: 'sent' | 'delivered' | 'read' | 'failed' | 'pending';
  sentBy?: string;
  timestamp: string;
};

type QuickReply = {
  id: string;
  title: string;
  message: string;
  category?: string;
};

// ============ Helpers ============

/** Initials from a full name — "Rahul Singh" → "RS" */
function initials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Format an E.164 phone for display: +919876543210 → +91 98765 43210 */
function formatPhone(phone: string): string {
  if (!phone) return '';
  const p = phone.replace(/[^\d+]/g, '');
  // India 10-digit: +91 98765 43210
  const m = p.match(/^\+(\d{2})(\d{5})(\d{5})$/);
  if (m) return `+${m[1]} ${m[2]} ${m[3]}`;
  // India alt grouping: +91 9876 543210
  const m2 = p.match(/^\+(\d{2})(\d{4})(\d{6})$/);
  if (m2) return `+${m2[1]} ${m2[2]} ${m2[3]}`;
  // Generic US-ish: +1 415-555-1234
  const m3 = p.match(/^\+(\d{1,3})(\d{3})(\d{3})(\d{4})$/);
  if (m3) return `+${m3[1]} ${m3[2]}-${m3[3]}-${m3[4]}`;
  // Already formatted with spaces / hyphens
  if (phone.includes(' ') || phone.includes('-')) return phone;
  // Bare 10-digit local: 98765 43210
  const m4 = p.match(/^(\d{5})(\d{5})$/);
  if (m4) return `${m4[1]} ${m4[2]}`;
  return phone;
}

/** 12h time string from an ISO timestamp — "2:35 PM" */
function formatTime(timestamp: string): string {
  if (!timestamp) return '';
  try {
    return new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

/** Relative time: "now", "2m ago", "1h ago", "3d ago", fallback to date */
function relativeTime(timestamp: string): string {
  if (!timestamp) return '';
  const then = new Date(timestamp).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Math.max(0, Date.now() - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  try {
    return new Date(timestamp).toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
  } catch {
    return '';
  }
}

// Deterministic avatar colors from name
const AVATAR_COLORS = [
  'bg-emerald-500', 'bg-rose-500', 'bg-amber-500', 'bg-purple-500',
  'bg-cyan-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500',
];

function avatarColor(name: string): string {
  if (!name) return AVATAR_COLORS[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// Stage badge tones
const STAGE_TONE: Record<string, string> = {
  New: 'border-slate-300 text-slate-600 bg-slate-50 dark:bg-slate-800/50',
  Contacted: 'border-blue-300 text-blue-600 bg-blue-50 dark:bg-blue-900/30',
  Qualified: 'border-purple-300 text-purple-600 bg-purple-50 dark:bg-purple-900/30',
  Quotation: 'border-amber-300 text-amber-600 bg-amber-50 dark:bg-amber-900/30',
  Negotiation: 'border-orange-300 text-orange-600 bg-orange-50 dark:bg-orange-900/30',
  Won: 'border-emerald-300 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30',
  Lost: 'border-rose-300 text-rose-600 bg-rose-50 dark:bg-rose-900/30',
};

function stageBadgeClass(stage?: string): string {
  if (!stage) return STAGE_TONE.New;
  return STAGE_TONE[stage] || STAGE_TONE.New;
}

/** Whether a lead came from a Meta/Ad source (for the megaphone badge) */
function isAdSource(source?: string): boolean {
  if (!source) return false;
  const s = source.toLowerCase();
  return s.includes('meta') || s.includes('ad') || s.includes('facebook') || s.includes('instagram');
}

// ============ Component ============

export function WhatsAppInbox({ onOpenLead, onOpenLeadTab, onNavigate }: { onOpenLead?: (leadId: string) => void; onOpenLeadTab?: (leadId: string, tab: string) => void; onNavigate?: (page: string) => void }) {
  const leads = useERP((s) => s.leads) || [];
  const chatMessages = useERP((s) => s.chatMessages) || [];
  const quickReplies = useERP((s) => s.quickReplies) || [];
  const sendChatMessage = useERP((s) => s.sendChatMessage);
  const markLeadRead = useERP((s) => s.markLeadRead);
  const updateLead = useERP((s) => s.updateLead);
  const quotations = useERP((s) => s.quotations) || [];
  const crmOrders = useERP((s) => s.crmOrders) || [];
  const projects = useERP((s) => s.projects) || [];
  const createQuotation = useERP((s) => s.createQuotation);
  const createCRMOrder = useERP((s) => s.createCRMOrder);
  const createLead = useERP((s) => s.createLead);
  const sendWhatsAppMessage = useERP((s) => s.sendWhatsAppMessage);
  const convertQuotationToProject = useERP((s) => s.convertQuotationToProject);
  const currentUser = useERP((s) => s.currentUser);
  const team = useERP((s) => s.team);

  const [filter, setFilter] = React.useState<'all' | 'unread'>('all');
  const [search, setSearch] = React.useState('');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState('');
  const [showNewChat, setShowNewChat] = React.useState(false);
  const [newChatName, setNewChatName] = React.useState('');
  const [newChatPhone, setNewChatPhone] = React.useState('');

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Filter + sort leads (most recent activity first; leads without activity fall back to createdAt)
  const conversations = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads
      .filter((l: any) => {
        const name = (l.client || l.contact || '').toLowerCase();
        const phone = (l.phone || '').toLowerCase();
        if (q && !name.includes(q) && !phone.includes(q)) return false;
        if (filter === 'unread' && !((l.unreadCount || 0) > 0)) return false;
        return true;
      })
      .slice()
      .sort((a: any, b: any) => {
        const ta = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const tb = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return (tb || 0) - (ta || 0);
      });
  }, [leads, search, filter]);

  // Auto-select the first conversation on mount / when the list changes
  React.useEffect(() => {
    if (!selectedId && conversations.length > 0) {
      setSelectedId(conversations[0].id);
    }
  }, [conversations, selectedId]);

  const selectedLead = React.useMemo(
    () => (leads.find((l: any) => l.id === selectedId) as any | undefined),
    [leads, selectedId],
  );

  const messages = React.useMemo(() => {
    if (!selectedId) return [] as ChatMessage[];
    return chatMessages
      .filter((m) => m.leadId === selectedId)
      .slice()
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [chatMessages, selectedId]);

  // Auto-scroll to bottom on new messages / conversation switch
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, selectedId]);

  // Mark the conversation as read whenever it's opened
  React.useEffect(() => {
    if (selectedId && markLeadRead) {
      try {
        markLeadRead(selectedId);
      } catch {
        /* no-op */
      }
    }
  }, [selectedId, markLeadRead]);

  function selectConversation(id: string) {
    setSelectedId(id);
    setDraft('');
  }

  function handleSend() {
    const body = draft.trim();
    if (!body || !selectedId) return;
    try {
      sendChatMessage(selectedId, body);
      setDraft('');
      requestAnimationFrame(() => textareaRef.current?.focus());
    } catch (e: any) {
      toast.error(e?.message || 'Failed to send message');
    }
  }

  function insertQuickReply(message: string) {
    if (!selectedLead) return;
    const name = (selectedLead.client || selectedLead.contact || '').split(' ')[0];
    const text = message.replace(/\{customer_name\}/g, name || '');
    setDraft(text);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  // ============ Render ============
  return (
    <div className="flex flex-col h-[calc(100vh-9rem)] sm:h-[calc(100vh-10rem)] md:h-[calc(100vh-11rem)] rounded-xl border bg-card overflow-hidden shadow-sm">
      <div className="flex flex-1 min-h-0">
        {/* ============ Left: conversations list ============ */}
        <div
          className={cn(
            'shrink-0 border-r flex-col bg-card',
            'w-full sm:w-[340px]',
            selectedLead ? 'hidden sm:flex' : 'flex',
          )}
        >
          {/* Search + filters + New Chat */}
          <div className="p-3 border-b space-y-2.5">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search conversations…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 pr-8"
                  aria-label="Search conversations"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-accent text-muted-foreground"
                    aria-label="Clear search"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
              <Button
                size="icon"
                className="h-9 w-9 bg-emerald-500 hover:bg-emerald-600 shrink-0"
                onClick={() => setShowNewChat(true)}
                title="New chat — manually add a lead"
              >
                <Plus className="size-4" />
              </Button>
            </div>
            <div className="flex gap-1 overflow-x-auto pb-0.5">
              {(['all', 'unread'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors',
                    filter === f
                      ? 'bg-emerald-500 text-white'
                      : 'bg-muted text-muted-foreground hover:bg-accent',
                  )}
                >
                  {f === 'all' ? 'All' : 'Unread'}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation list */}
          <ScrollArea className="flex-1">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <MessageSquare className="size-8 mx-auto mb-2 opacity-30" />
                {search ? 'No conversations match your search' : 'No conversations yet'}
              </div>
            ) : (
              conversations.map((l: any) => {
                const name = l.client || l.contact || 'Unknown';
                const isSelected = selectedId === l.id;
                const unread = (l.unreadCount || 0) > 0;
                return (
                  <button
                    key={l.id}
                    onClick={() => selectConversation(l.id)}
                    className={cn(
                      'w-full text-left flex items-start gap-3 p-3 border-b transition-colors',
                      isSelected
                        ? 'bg-emerald-500/[0.06] border-l-2 border-l-emerald-500'
                        : 'hover:bg-accent/40',
                    )}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div
                        className={cn(
                          'size-10 rounded-full flex items-center justify-center text-white text-xs font-semibold',
                          avatarColor(name),
                        )}
                      >
                        {initials(name)}
                      </div>
                      {unread && (
                        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-card">
                          {l.unreadCount > 99 ? '99+' : l.unreadCount}
                        </span>
                      )}
                    </div>
                    {/* Body */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn('text-sm truncate', unread ? 'font-bold' : 'font-medium')}>
                          {name}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {relativeTime(l.lastActivityAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground truncate flex-1">
                          {l.lastMessage || '—'}
                        </span>
                        {isAdSource(l.source) && (
                          <Megaphone className="size-3 text-amber-500 shrink-0" aria-label="Meta Ad source" />
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {l.leadStage && (
                          <Badge
                            variant="outline"
                            className={cn('text-[10px] h-4 px-1', stageBadgeClass(l.leadStage))}
                          >
                            {l.leadStage}
                          </Badge>
                        )}
                        {l.status && l.status !== 'New' && l.status !== l.leadStage && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1 text-muted-foreground">
                            {l.status}
                          </Badge>
                        )}
                        {/* Quotation / Order / Project status badges */}
                        {quotations.filter(q => q.client === l.client).length > 0 && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1 bg-violet-50 text-violet-600 dark:bg-violet-950/30">
                            📄 {quotations.filter(q => q.client === l.client).length}
                          </Badge>
                        )}
                        {crmOrders.filter(o => o.leadId === l.id).length > 0 && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30">
                            ✅ {crmOrders.filter(o => o.leadId === l.id).length}
                          </Badge>
                        )}
                        {projects.filter(p => p.client === l.client && !p.cancelled).length > 0 && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1 bg-blue-50 text-blue-600 dark:bg-blue-950/30">
                            📁 {projects.filter(p => p.client === l.client && !p.cancelled).length}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </ScrollArea>
        </div>

        {/* ============ Right: chat ============ */}
        <div
          className={cn(
            'flex-1 flex-col min-w-0',
            selectedLead ? 'flex' : 'hidden sm:flex',
          )}
        >
          {!selectedLead ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center px-6">
                <MessageSquare className="size-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium">Select a conversation to start chatting</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Pick a lead from the left to view messages
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="p-3 border-b bg-card flex items-center gap-3">
                {/* Mobile back */}
                <button
                  onClick={() => setSelectedId(null)}
                  className="sm:hidden p-1.5 -ml-1 rounded hover:bg-accent text-muted-foreground"
                  aria-label="Back to conversations"
                >
                  <ChevronRight className="size-5 rotate-180" />
                </button>
                <div
                  className={cn(
                    'size-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0',
                    avatarColor(selectedLead.client || selectedLead.contact || '?'),
                  )}
                >
                  {initials(selectedLead.client || selectedLead.contact || '?')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold truncate">
                      {selectedLead.client || selectedLead.contact || 'Unknown'}
                    </span>
                    {selectedLead.leadStage && (
                      <Badge
                        variant="outline"
                        className={cn('text-[10px] h-5', stageBadgeClass(selectedLead.leadStage))}
                      >
                        {selectedLead.leadStage}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span>{formatPhone(selectedLead.phone || '')}</span>
                    {isAdSource(selectedLead.source) && (
                      <span className="flex items-center gap-0.5">
                        <Megaphone className="size-3 text-amber-500" />
                        <span>Ad</span>
                      </span>
                    )}
                  </div>
                </div>
                {/* Action buttons: Call + Lead Details + Navigate to sections */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* Click-to-call */}
                  {selectedLead.phone && (
                    <a
                      href={`tel:${selectedLead.phone}`}
                      className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
                      title={`Call ${selectedLead.phone}`}
                    >
                      <PhoneCall className="size-4" />
                    </a>
                  )}
                  {/* Navigate to Quotations section */}
                  {onNavigate && quotations.filter(q => q.client === selectedLead.client).length > 0 && (
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-[11px]" onClick={() => onNavigate('quotations')} title="Go to Quotations">
                      <FileText className="size-3.5 mr-1" />
                      <span className="hidden sm:inline">{quotations.filter(q => q.client === selectedLead.client).length} Quote</span>
                    </Button>
                  )}
                  {/* Navigate to Orders section */}
                  {onNavigate && crmOrders.filter(o => o.leadId === selectedLead.id).length > 0 && (
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-[11px]" onClick={() => onNavigate('crmorders')} title="Go to Orders">
                      <PackageCheck className="size-3.5 mr-1" />
                      <span className="hidden sm:inline">{crmOrders.filter(o => o.leadId === selectedLead.id).length} Order</span>
                    </Button>
                  )}
                  {/* Navigate to Projects section */}
                  {onNavigate && projects.filter(p => p.client === selectedLead.client && !p.cancelled).length > 0 && (
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-[11px]" onClick={() => onNavigate('projects')} title="Go to Projects">
                      <FolderOpen className="size-3.5 mr-1" />
                      <span className="hidden sm:inline">{projects.filter(p => p.client === selectedLead.client && !p.cancelled).length} Project</span>
                    </Button>
                  )}
                  {/* Lead Details — opens the slide-out Lead Detail Panel */}
                  {onOpenLead && (
                    <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={() => onOpenLead(selectedLead.id)} title="Open lead details">
                      <UserIcon className="size-3.5 mr-1.5" />
                      Lead Details
                      <ChevronRight className="size-3.5 ml-1" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Status info bar — shows linked Quotation/Order/Project status */}
              {(() => {
                const leadQts = quotations.filter(q => q.client === selectedLead.client);
                const leadOrds = crmOrders.filter(o => o.leadId === selectedLead.id);
                const leadProjs = projects.filter(p => p.client === selectedLead.client && !p.cancelled);
                if (leadQts.length === 0 && leadOrds.length === 0 && leadProjs.length === 0) return null;
                return (
                  <div className="border-b bg-muted/20 px-3 py-1.5 flex items-center gap-2 overflow-x-auto text-[10px]">
                    {leadQts.length > 0 && (
                      <span className="shrink-0 flex items-center gap-1 text-violet-600 dark:text-violet-400">
                        <FileText className="size-3" /> {leadQts.length} Quotation(s)
                        <span className="text-muted-foreground">· {leadQts[0].status}</span>
                      </span>
                    )}
                    {leadOrds.length > 0 && (
                      <span className="shrink-0 flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <PackageCheck className="size-3" /> {leadOrds.length} Order(s)
                        <span className="text-muted-foreground">· {leadOrds[0].status}</span>
                      </span>
                    )}
                    {leadProjs.length > 0 && (
                      <span className="shrink-0 flex items-center gap-1 text-blue-600 dark:text-blue-400">
                        <FolderOpen className="size-3" /> {leadProjs.length} Project(s)
                        <span className="text-muted-foreground">· {leadProjs[0].stage}</span>
                      </span>
                    )}
                  </div>
                );
              })()}

              {/* Quick Action Bar — linked actions that open relevant sections */}
              {(() => {
                const leadQuotations = quotations.filter(q => q.client === selectedLead.client);
                const leadOrders = crmOrders.filter(o => o.leadId === selectedLead.id);

                // Create a quick quotation linked to this lead + send via WhatsApp
                const handleSendQuotation = () => {
                  // Auto-create a quotation for this lead
                  const qtId = createQuotation({
                    client: selectedLead.client,
                    date: new Date().toISOString().split('T')[0],
                    items: [{ name: selectedLead.requirement || 'General enquiry', qty: 1, rate: selectedLead.expectedOrderValue || 0 }],
                    gstEnabled: true,
                    notes: 'Created from WhatsApp Chat',
                  });
                  updateLead(selectedLead.id, { status: 'Quotation Sent', leadStage: 'Quotation' });
                  // Send quotation summary via WhatsApp (opens wa.me + logs)
                  const msg = `*Karyam Dessin — Quotation*\n\nClient: ${selectedLead.client}\nQuotation created from your WhatsApp enquiry.\nOur team will share the detailed quotation shortly.\n\n— Karyam Dessin ERP`;
                  sendWhatsAppMessage({ toPhone: selectedLead.phone || '', toName: selectedLead.client, body: msg, type: 'quotation', relatedId: qtId });
                  toast.success('Quotation created + sent via WhatsApp!');
                };

                // Confirm order → convert quotation to project + log in WhatsApp
                const handleConfirmOrder = () => {
                  if (leadQuotations.length > 0) {
                    // Convert the first quotation to a project
                    const pid = convertQuotationToProject(leadQuotations[0].id);
                    if (pid) {
                      // Create a CRM order
                      createCRMOrder({
                        orderNumber: 'KD-ORD-' + Date.now().toString().slice(-6),
                        leadId: selectedLead.id,
                        quotationId: leadQuotations[0].id,
                        customerName: selectedLead.client,
                        orderAmount: leadQuotations[0].items.reduce((s, i) => s + i.qty * i.rate, 0),
                        advanceReceived: 0,
                        status: 'CONFIRMED',
                        confirmedBy: currentUser?.name || 'Unknown',
                      } as any);
                      updateLead(selectedLead.id, { status: 'Order Confirmed', leadStage: 'Won' });
                      // Send order confirmation via WhatsApp
                      const msg = `✅ *Order Confirmed!*\n\nDear ${selectedLead.client}, your order has been confirmed.\nProject: ${pid}\nOur team will start processing immediately.\n\n— Karyam Dessin ERP`;
                      sendWhatsAppMessage({ toPhone: selectedLead.phone || '', toName: selectedLead.client, body: msg, type: 'message', relatedId: pid });
                      toast.success(`Order confirmed! Project ${pid} created + WhatsApp sent!`);
                    } else {
                      toast.error('Could not convert quotation to project');
                    }
                  } else {
                    // No quotation — just mark as order confirmed
                    updateLead(selectedLead.id, { status: 'Order Confirmed', leadStage: 'Won' });
                    toast.success('Marked as Order Confirmed (no quotation to convert)');
                  }
                };

                return (
                  <div className="border-b bg-muted/30 px-3 py-2 flex items-center gap-1.5 overflow-x-auto">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex-shrink-0 mr-1">Quick:</span>

                    {/* Interested → updates status + opens Lead Detail */}
                    <button
                      onClick={() => {
                        updateLead(selectedLead.id, { status: 'Interested', leadStage: 'Qualified' });
                        toast.success('Marked as Interested');
                        onOpenLeadTab?.(selectedLead.id, 'profile');
                      }}
                      className={cn('shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all', selectedLead.status === 'Interested' ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-950/40 dark:text-amber-300')}
                    >
                      🔥 Interested
                    </button>

                    {/* Quotation → creates quotation + sends via WhatsApp + links to Quotations section */}
                    <button
                      onClick={handleSendQuotation}
                      className={cn('shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all', selectedLead.status === 'Quotation Sent' ? 'bg-violet-500 text-white' : 'bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-950/40 dark:text-violet-300')}
                      title="Create quotation + send via WhatsApp"
                    >
                      📄 + Quotation
                    </button>

                    {/* Has Quotation? → click to open Lead Detail Quotations tab */}
                    {leadQuotations.length > 0 ? (
                      <button
                        onClick={() => onOpenLeadTab?.(selectedLead.id, 'quotations')}
                        className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 transition-all"
                        title="View quotations in Lead Detail"
                      >
                        ✓ {leadQuotations.length} Quotation(s)
                      </button>
                    ) : (
                      <span className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        No Quotation
                      </span>
                    )}

                    {/* Order → converts quotation to project + sends WhatsApp confirmation */}
                    {leadOrders.length > 0 ? (
                      <button
                        onClick={() => onOpenLeadTab?.(selectedLead.id, 'orders')}
                        className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-all"
                        title="View orders in Lead Detail"
                      >
                        ✓ Order Confirmed
                      </button>
                    ) : (
                      <button
                        onClick={handleConfirmOrder}
                        className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                        title="Confirm order → create project + send WhatsApp"
                      >
                        ✅ + Order
                      </button>
                    )}

                    {/* Follow Up → opens Lead Detail Follow-ups tab */}
                    <button
                      onClick={() => {
                        updateLead(selectedLead.id, { status: 'Follow Up', leadStage: 'Contacted' });
                        toast.success('Marked for Follow Up');
                        onOpenLeadTab?.(selectedLead.id, 'followups');
                      }}
                      className={cn('shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all', selectedLead.status === 'Follow Up' ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-950/40 dark:text-orange-300')}
                    >
                      ⏰ Follow Up
                    </button>

                    {/* Not Interested */}
                    <button
                      onClick={() => { updateLead(selectedLead.id, { status: 'Lost', leadStage: 'Lost', lostReason: 'Not interested' }); toast.success('Marked as Not Interested'); }}
                      className={cn('shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all', selectedLead.status === 'Lost' ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-950/40 dark:text-rose-300')}
                    >
                      ❌ Not Interested
                    </button>
                  </div>
                );
              })()}

              {/* Messages */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#efeae2] dark:bg-slate-900/40"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.04) 1px, transparent 0)',
                  backgroundSize: '20px 20px',
                }}
              >
                {messages.length === 0 ? (
                  <div className="flex justify-center">
                    <div className="text-xs text-muted-foreground mt-6 bg-white/70 dark:bg-slate-800/60 px-3 py-1.5 rounded-lg shadow-sm">
                      No messages yet. Send the first message below.
                    </div>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isOut = m.direction === 'OUT';
                    return (
                      <div key={m.id} className={cn('flex', isOut ? 'justify-end' : 'justify-start')}>
                        <div
                          className={cn(
                            'max-w-[78%] rounded-2xl px-3.5 py-2 shadow-sm',
                            isOut
                              ? 'bg-emerald-100 text-slate-800 rounded-br-sm dark:bg-emerald-900/40 dark:text-emerald-50'
                              : 'bg-white text-slate-800 rounded-bl-sm dark:bg-slate-800 dark:text-slate-100',
                          )}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                          <div
                            className={cn(
                              'flex items-center gap-1 mt-1 text-[10px]',
                              isOut ? 'text-slate-500 justify-end' : 'text-slate-400',
                            )}
                          >
                            <span>{formatTime(m.timestamp)}</span>
                            {isOut && (
                              m.status === 'read' ? (
                                <CheckCheck className="size-3 text-blue-500" aria-label="Read" />
                              ) : m.status === 'delivered' ? (
                                <CheckCheck className="size-3 text-slate-400" aria-label="Delivered" />
                              ) : m.status === 'failed' ? (
                                <span className="text-rose-500 font-bold" aria-label="Failed">
                                  !
                                </span>
                              ) : (
                                <Check className="size-3 text-slate-400" aria-label="Sent" />
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Composer */}
              <div className="border-t bg-card p-3">
                {/* Quick replies row (horizontal scroll pills) */}
                {quickReplies.length > 0 && (
                  <div className="flex gap-1.5 overflow-x-auto pb-2 mb-1">
                    {quickReplies.slice(0, 8).map((r) => (
                      <button
                        key={r.id}
                        onClick={() => insertQuickReply(r.message)}
                        className="shrink-0 px-2.5 py-1 rounded-full bg-muted hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-900/30 text-xs font-medium text-muted-foreground transition-colors"
                        title={r.message}
                      >
                        {r.title}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 shrink-0"
                    title="Emoji (decorative)"
                  >
                    <Smile className="size-5 text-muted-foreground" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 shrink-0"
                    title="Attach (decorative)"
                  >
                    <Paperclip className="size-5 text-muted-foreground" />
                  </Button>

                  <textarea
                    ref={textareaRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Type a WhatsApp message…"
                    rows={1}
                    className="flex-1 resize-none rounded-xl border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 min-h-[42px] max-h-32"
                    aria-label="Message composer"
                  />

                  <Button
                    onClick={handleSend}
                    disabled={!draft.trim()}
                    className="size-9 shrink-0 p-0 bg-emerald-500 hover:bg-emerald-600"
                    title="Send (Enter)"
                    aria-label="Send message"
                  >
                    <Send className="size-4" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground/70 mt-1.5 px-1">
                  Press <kbd className="font-sans">Enter</kbd> to send,{' '}
                  <kbd className="font-sans">Shift+Enter</kbd> for a newline.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ===== New Chat Modal — manually add a lead + start chatting ===== */}
      {showNewChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowNewChat(false)}>
          <div className="bg-card rounded-xl shadow-2xl p-5 w-[90vw] max-w-md space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black flex items-center gap-2">
                <UserPlus className="size-5 text-emerald-500" /> New Chat / Lead
              </h3>
              <button onClick={() => setShowNewChat(false)} className="p-1 rounded hover:bg-muted"><X className="size-4" /></button>
            </div>
            <p className="text-xs text-muted-foreground">
              Add a new lead manually. It will appear in WhatsApp Chat + Leads section automatically.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Name / Company *</label>
                <Input value={newChatName} onChange={(e) => setNewChatName(e.target.value)} placeholder="e.g. Rahul Sharma" autoFocus className="mt-1" />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">WhatsApp Number *</label>
                <Input value={newChatPhone} onChange={(e) => setNewChatPhone(e.target.value)} placeholder="9876543210" className="mt-1 font-mono" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowNewChat(false)}>Cancel</Button>
              <Button
                className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                disabled={!newChatName.trim() || !newChatPhone.trim()}
                onClick={() => {
                  // Create the lead — it will auto-appear in WhatsApp Chat (since all leads show as conversations)
                  createLead({
                    client: newChatName.trim(),
                    contact: newChatName.trim().split(' ')[0],
                    phone: newChatPhone.trim(),
                    email: '',
                    source: 'WhatsApp',
                    requirement: 'Manual lead from WhatsApp Chat',
                    followup: new Date().toISOString().split('T')[0],
                    notes: 'Created from WhatsApp Chat New Chat button',
                    category: 'General',
                    leadStage: 'New',
                    priority: 'Warm',
                  });
                  toast.success('Lead created! It will appear in your conversations.');
                  setNewChatName('');
                  setNewChatPhone('');
                  setShowNewChat(false);
                }}
              >
                <Plus className="size-4 mr-1" /> Create & Chat
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
