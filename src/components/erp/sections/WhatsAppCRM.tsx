'use client';

import * as React from 'react';
import {
  MessageCircle, Send, Plus, Trash2, Pencil, FileText, Receipt, Bell, Users,
  CheckCircle2, Clock, Search, Phone, X, Save,
} from 'lucide-react';
import { toast } from 'sonner';
import { useERP } from '@/lib/erp/store';
import { fD, today, matchSearch } from '@/lib/erp/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  SectionHeader, TableShell, Th, Td, EmptyState, StatusBadge,
  Modal, Field, StatCard, FilterBar, FilterChip,
} from '../ui';
import type { WhatsAppTemplate, WhatsAppLog } from '@/lib/erp/types';

const TEMPLATE_CATEGORIES = ['Welcome', 'Follow-up', 'Quotation', 'Payment', 'Invoice', 'Thank You', 'Greeting', 'Custom'];

export function WhatsAppCRM() {
  const templates = useERP((s) => s.whatsappTemplates || []);
  const logs = useERP((s) => s.whatsappLogs || []);
  const leads = useERP((s) => s.leads);
  const quotations = useERP((s) => s.quotations);
  const invoices = useERP((s) => s.gstInvoices) || [];
  const currentUser = useERP((s) => s.currentUser);
  const sendWhatsAppMessage = useERP((s) => s.sendWhatsAppMessage);
  const bulkWhatsApp = useERP((s) => s.bulkWhatsApp);
  const createWhatsAppTemplate = useERP((s) => s.createWhatsAppTemplate);
  const updateWhatsAppTemplate = useERP((s) => s.updateWhatsAppTemplate);
  const deleteWhatsAppTemplate = useERP((s) => s.deleteWhatsAppTemplate);

  const [tab, setTab] = React.useState<'send' | 'templates' | 'history' | 'bulk'>('send');
  const [showNewTemplate, setShowNewTemplate] = React.useState(false);
  const [editTemplate, setEditTemplate] = React.useState<WhatsAppTemplate | null>(null);
  const [showSend, setShowSend] = React.useState(false);
  const [showBulk, setShowBulk] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [logFilter, setLogFilter] = React.useState<string>('all');

  const filteredLogs = logs.filter((l) => {
    if (!matchSearch(`${l.toName} ${l.toPhone} ${l.body} ${l.templateName || ''} ${l.sentBy}`, search)) return false;
    if (logFilter !== 'all' && l.type !== logFilter) return false;
    return true;
  });

  const stats = React.useMemo(() => ({
    total: logs.length,
    today: logs.filter((l) => l.sentAt.startsWith(today())).length,
    templates: templates.length,
    autoSend: templates.filter((t) => t.autoSend).length,
  }), [logs, templates]);

  return (
    <div>
      <SectionHeader
        title="WhatsApp CRM"
        subtitle="CRM-style WhatsApp messaging — send quotations, invoices, reminders & bulk messages. Templates with auto-send."
        accent="emerald"
        actions={<>
          <Button variant="outline" className="h-9" onClick={() => setShowBulk(true)} title="Bulk send to multiple recipients">
            <Users className="h-4 w-4 mr-1" /> Bulk Send
          </Button>
          <Button variant="outline" className="h-9 border-emerald-400 text-emerald-600" onClick={() => setShowSend(true)} title="Send a WhatsApp message">
            <Send className="h-4 w-4 mr-1" /> Send Message
          </Button>
        </>}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Sent" value={stats.total} tone="primary" icon={<Send className="h-4 w-4" />} />
        <StatCard label="Sent Today" value={stats.today} tone={stats.today > 0 ? 'accent' : 'default'} icon={<Clock className="h-4 w-4" />} />
        <StatCard label="Templates" value={stats.templates} icon={<FileText className="h-4 w-4" />} />
        <StatCard label="Auto-Send" value={stats.autoSend} tone={stats.autoSend > 0 ? 'warn' : 'default'} icon={<Bell className="h-4 w-4" />} />
      </div>

      {/* Info banner */}
      <div className="mb-4 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 flex items-center gap-2 text-xs">
        <MessageCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
        <span className="text-emerald-700 dark:text-emerald-300">
          <strong>CRM WhatsApp:</strong> Send messages, quotations, invoices & reminders through WhatsApp Cloud API when configured. Templates support <code className="font-mono bg-emerald-100 dark:bg-emerald-900 px-1 rounded">{`{{name}}`}</code> & <code className="font-mono bg-emerald-100 dark:bg-emerald-900 px-1 rounded">{`{{amount}}`}</code> placeholders. All sent messages are logged for conversation history.
        </span>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {([
          { k: 'send', l: 'Quick Send', icon: Send },
          { k: 'templates', l: 'Templates', icon: FileText },
          { k: 'history', l: 'Conversation History', icon: MessageCircle },
          { k: 'bulk', l: 'Bulk Send', icon: Users },
        ] as const).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border',
                tab === t.k ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-card text-muted-foreground border-border hover:bg-muted/50',
              )}
            >
              <Icon className="h-4 w-4" /> {t.l}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === 'send' && (
        <QuickSendPanel templates={templates} leads={leads} quotations={quotations} invoices={invoices} onSend={sendWhatsAppMessage} currentUser={currentUser} />
      )}

      {tab === 'templates' && (
        <TemplatesPanel
          templates={templates}
          search={search}
          onSearch={setSearch}
          onNew={() => setShowNewTemplate(true)}
          onEdit={setEditTemplate}
          onDelete={(id) => { if (confirm('Delete this template?')) { deleteWhatsAppTemplate(id); toast.success('Template deleted'); } }}
          onToggleAutoSend={(t) => { updateWhatsAppTemplate(t.id, { autoSend: !t.autoSend }); toast.success(!t.autoSend ? 'Auto-send enabled' : 'Auto-send disabled'); }}
        />
      )}

      {tab === 'history' && (
        <HistoryPanel logs={filteredLogs} search={search} onSearch={setSearch} logFilter={logFilter} setLogFilter={setLogFilter} />
      )}

      {tab === 'bulk' && (
        <BulkPanel leads={leads} templates={templates} onBulk={bulkWhatsApp} />
      )}

      {/* Send Message modal */}
      {showSend && (
        <SendMessageModal
          templates={templates}
          leads={leads}
          quotations={quotations}
          invoices={invoices}
          onClose={() => setShowSend(false)}
          onSend={(msg) => { sendWhatsAppMessage(msg); toast.success(`WhatsApp message sent to ${msg.toName}`); setShowSend(false); }}
        />
      )}

      {/* Bulk modal */}
      {showBulk && (
        <BulkModal
          leads={leads}
          templates={templates}
          onClose={() => setShowBulk(false)}
          onSend={(recipients, body) => {
            const count = bulkWhatsApp(recipients, body);
            toast.success(`Bulk WhatsApp sent to ${count} recipient(s)`);
            setShowBulk(false);
          }}
        />
      )}

      {/* New/Edit template modal */}
      {(showNewTemplate || editTemplate) && (
        <TemplateForm
          existing={editTemplate}
          onClose={() => { setShowNewTemplate(false); setEditTemplate(null); }}
          onSave={(data) => {
            if (editTemplate) { updateWhatsAppTemplate(editTemplate.id, data); toast.success('Template updated'); }
            else { createWhatsAppTemplate(data); toast.success('Template created'); }
            setShowNewTemplate(false); setEditTemplate(null);
          }}
        />
      )}
    </div>
  );
}

// ============ Quick Send Panel ============
function QuickSendPanel({ templates, leads, quotations, invoices, onSend, currentUser }: {
  templates: WhatsAppTemplate[];
  leads: any[];
  quotations: any[];
  invoices: any[];
  onSend: (msg: any) => void;
  currentUser: any;
}) {
  const [phone, setPhone] = React.useState('');
  const [name, setName] = React.useState('');
  const [body, setBody] = React.useState('');
  const [type, setType] = React.useState<WhatsAppLog['type']>('message');

  const applyTemplate = (t: WhatsAppTemplate) => {
    setBody(t.body.replace(/\{\{name\}\}/g, name || 'there').replace(/\{\{amount\}\}/g, ''));
  };

  const send = () => {
    if (!phone.trim() || !body.trim()) { toast.error('Phone and message are required'); return; }
    onSend({ toPhone: phone.trim(), toName: name.trim() || 'Recipient', body: body.trim(), type });
    setPhone(''); setName(''); setBody('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Compose */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="text-sm font-bold mb-3 flex items-center gap-2"><Send className="h-4 w-4 text-emerald-500" /> Compose Message</div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Recipient Phone *"><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" className="font-mono" /></Field>
            <Field label="Recipient Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Suresh" /></Field>
          </div>
          <Field label="Message Type">
            <Select value={type} onValueChange={(v) => setType(v as WhatsAppLog['type'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="message">General Message</SelectItem>
                <SelectItem value="quotation">Quotation</SelectItem>
                <SelectItem value="invoice">Invoice</SelectItem>
                <SelectItem value="reminder">Reminder</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Message Body *"><Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type your WhatsApp message..." rows={5} /></Field>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>Placeholders: <code className="font-mono bg-muted px-1 rounded">{`{{name}}`}</code> <code className="font-mono bg-muted px-1 rounded">{`{{amount}}`}</code> — auto-filled from recipient name</span>
          </div>
          <Button className="w-full bg-emerald-500 hover:bg-emerald-600" onClick={send} disabled={!phone.trim() || !body.trim()}>
            <Send className="h-4 w-4 mr-1" /> Send via WhatsApp
          </Button>
        </div>
      </div>

      {/* Quick templates + recent leads */}
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="text-sm font-bold mb-3 flex items-center gap-2"><FileText className="h-4 w-4 text-emerald-500" /> Quick Templates</div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {templates.map((t) => (
              <button key={t.id} onClick={() => applyTemplate(t)} className="w-full text-left p-2.5 rounded-lg border border-border hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">{t.name}</span>
                  <Badge variant="outline" className="text-[9px]">{t.category}</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{t.body}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="text-sm font-bold mb-3 flex items-center gap-2"><Phone className="h-4 w-4 text-emerald-500" /> Recent Leads (click to fill)</div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {leads.slice(0, 6).map((l) => (
              <button key={l.id} onClick={() => { setPhone(l.phone || ''); setName(l.contact || l.client); }} className="w-full text-left p-2 rounded-lg hover:bg-muted/50 transition-all">
                <div className="text-xs font-bold">{l.client}</div>
                <div className="text-[10px] text-muted-foreground">{l.phone} · {l.contact}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ Templates Panel ============
function TemplatesPanel({ templates, search, onSearch, onNew, onEdit, onDelete, onToggleAutoSend }: {
  templates: WhatsAppTemplate[];
  search: string;
  onSearch: (v: string) => void;
  onNew: () => void;
  onEdit: (t: WhatsAppTemplate) => void;
  onDelete: (id: string) => void;
  onToggleAutoSend: (t: WhatsAppTemplate) => void;
}) {
  const filtered = templates.filter((t) => matchSearch(`${t.name} ${t.category} ${t.body}`, search));
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <Input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search templates..." className="h-8 w-64 text-xs" />
        <Button size="sm" className="h-8 bg-emerald-500 hover:bg-emerald-600" onClick={onNew}><Plus className="h-3.5 w-3.5 mr-1" /> New Template</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((t) => (
          <div key={t.id} className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-sm font-bold">{t.name}</div>
                <Badge variant="outline" className="text-[9px] mt-1">{t.category}</Badge>
              </div>
              {t.autoSend && <Badge className="text-[9px] bg-amber-500">Auto</Badge>}
            </div>
            <p className="text-[11px] text-muted-foreground mb-3 line-clamp-3 whitespace-pre-wrap">{t.body}</p>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-[10px] font-bold cursor-pointer">
                <Switch checked={!!t.autoSend} onCheckedChange={() => onToggleAutoSend(t)} /> Auto-send
              </label>
              <div className="flex gap-1">
                <button onClick={() => onEdit(t)} className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-950/40 text-blue-500"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => onDelete(t.id)} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-950/40 text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="col-span-full text-center py-12 text-muted-foreground text-sm">No templates found.</div>}
      </div>
    </div>
  );
}

// ============ History Panel ============
function HistoryPanel({ logs, search, onSearch, logFilter, setLogFilter }: {
  logs: WhatsAppLog[];
  search: string;
  onSearch: (v: string) => void;
  logFilter: string;
  setLogFilter: (v: string) => void;
}) {
  const typeIcon = (type: string) => {
    if (type === 'quotation') return <FileText className="h-3 w-3" />;
    if (type === 'invoice') return <Receipt className="h-3 w-3" />;
    if (type === 'reminder') return <Bell className="h-3 w-3" />;
    if (type === 'bulk') return <Users className="h-3 w-3" />;
    return <MessageCircle className="h-3 w-3" />;
  };
  return (
    <div>
      <FilterBar label="Filter" showClear={logFilter !== 'all' || search !== ''} onClear={() => { setLogFilter('all'); onSearch(''); }}>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search history..." className="h-8 w-48 text-xs pl-7" />
        </div>
        <span className="mx-1 h-5 w-px bg-border" />
        <FilterChip label="All" active={logFilter === 'all'} onClick={() => setLogFilter('all')} />
        <FilterChip label="Message" active={logFilter === 'message'} onClick={() => setLogFilter('message')} color="#10b981" />
        <FilterChip label="Quotation" active={logFilter === 'quotation'} onClick={() => setLogFilter('quotation')} color="#3b82f6" />
        <FilterChip label="Invoice" active={logFilter === 'invoice'} onClick={() => setLogFilter('invoice')} color="#8b5cf6" />
        <FilterChip label="Reminder" active={logFilter === 'reminder'} onClick={() => setLogFilter('reminder')} color="#f59e0b" />
      </FilterBar>
      <TableShell title={`Conversation History (${logs.length})`}>
        <thead>
          <tr><Th>Recipient</Th><Th>Phone</Th><Th>Type</Th><Th>Message</Th><Th>Template</Th><Th>Sent By</Th><Th>Sent At</Th><Th>Status</Th></tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <EmptyState icon={<MessageCircle className="h-8 w-8" />} message="No WhatsApp messages sent yet." />
          ) : logs.map((l) => (
            <tr key={l.id} className="hover:bg-muted/30">
              <Td className="font-semibold">{l.toName}</Td>
              <Td className="font-mono text-xs">{l.toPhone}</Td>
              <Td><span className="inline-flex items-center gap-1 text-[10px] font-bold">{typeIcon(l.type)} {l.type}</span></Td>
              <Td className="max-w-[240px] truncate text-xs">{l.body}</Td>
              <Td className="text-xs">{l.templateName || '—'}</Td>
              <Td className="text-xs">{l.sentBy}</Td>
              <Td className="text-xs whitespace-nowrap">{fD(l.sentAt.split('T')[0])} {l.sentAt.split('T')[1]?.slice(0, 5) || ''}</Td>
              <Td><span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600"><CheckCircle2 className="h-3 w-3" /> {l.status}</span></Td>
            </tr>
          ))}
        </tbody>
      </TableShell>
    </div>
  );
}

// ============ Bulk Panel ============
function BulkPanel({ leads, templates, onBulk }: {
  leads: any[];
  templates: WhatsAppTemplate[];
  onBulk: (recipients: { phone: string; name: string }[], body: string) => void;
}) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [body, setBody] = React.useState('');

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const recipients = leads.filter((l) => selected.has(l.id) && l.phone).map((l) => ({ phone: l.phone, name: l.contact || l.client }));

  const send = () => {
    if (!recipients.length) { toast.error('Select at least one lead with a phone number'); return; }
    if (!body.trim()) { toast.error('Message body is required'); return; }
    onBulk(recipients, body);
    setSelected(new Set()); setBody('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="text-sm font-bold mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2"><Users className="h-4 w-4 text-emerald-500" /> Select Recipients</span>
          <span className="text-xs text-muted-foreground">{selected.size} selected</span>
        </div>
        <div className="space-y-1.5 max-h-96 overflow-y-auto">
          {leads.filter((l) => l.phone).map((l) => (
            <label key={l.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
              <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggle(l.id)} className="w-4 h-4" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold">{l.client}</div>
                <div className="text-[10px] text-muted-foreground">{l.phone} · {l.contact}</div>
              </div>
            </label>
          ))}
          {leads.filter((l) => l.phone).length === 0 && <div className="text-center py-8 text-muted-foreground text-xs">No leads with phone numbers.</div>}
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="text-sm font-bold mb-3 flex items-center gap-2"><Send className="h-4 w-4 text-emerald-500" /> Message</div>
        <div className="space-y-2 mb-3">
          <div className="text-[10px] font-bold text-muted-foreground">Quick templates:</div>
          <div className="flex flex-wrap gap-1.5">
            {templates.slice(0, 5).map((t) => (
              <button key={t.id} onClick={() => setBody(t.body)} className="text-[10px] font-bold px-2 py-1 rounded-full border border-border hover:border-emerald-300">{t.name}</button>
            ))}
          </div>
        </div>
        <Field label="Bulk Message Body *"><Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type your bulk message... Use {{name}} for personalization" rows={8} /></Field>
        <div className="mt-2 text-[10px] text-muted-foreground">{`{{name}} will be replaced with each recipient's name`}</div>
        <Button className="w-full mt-3 bg-emerald-500 hover:bg-emerald-600" onClick={send} disabled={!recipients.length || !body.trim()}>
          <Users className="h-4 w-4 mr-1" /> Send to {recipients.length} recipient(s)
        </Button>
      </div>
    </div>
  );
}

// ============ Send Message Modal ============
function SendMessageModal({ templates, leads, quotations, invoices, onClose, onSend }: {
  templates: WhatsAppTemplate[];
  leads: any[];
  quotations: any[];
  invoices: any[];
  onClose: () => void;
  onSend: (msg: any) => void;
}) {
  const [phone, setPhone] = React.useState('');
  const [name, setName] = React.useState('');
  const [body, setBody] = React.useState('');
  const [type, setType] = React.useState<WhatsAppLog['type']>('message');
  const [templateId, setTemplateId] = React.useState('none');

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    if (id === 'none') return;
    const t = templates.find((x) => x.id === id);
    if (t) setBody(t.body.replace(/\{\{name\}\}/g, name || 'there').replace(/\{\{amount\}\}/g, ''));
  };

  return (
    <Modal open onOpenChange={(v) => !v && onClose()} title="Send WhatsApp Message" size="md"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button className="bg-emerald-500 hover:bg-emerald-600" disabled={!phone.trim() || !body.trim()} onClick={() => onSend({ toPhone: phone.trim(), toName: name.trim() || 'Recipient', body: body.trim(), type, templateId: templateId !== 'none' ? templateId : undefined, templateName: templates.find((t) => t.id === templateId)?.name })}>
          <Send className="h-4 w-4 mr-1" /> Send
        </Button></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone *"><Input value={phone} onChange={(e) => { setPhone(e.target.value); if (templateId !== 'none') applyTemplate(templateId); }} placeholder="9876543210" className="font-mono" autoFocus /></Field>
          <Field label="Name"><Input value={name} onChange={(e) => { setName(e.target.value); if (templateId !== 'none') applyTemplate(templateId); }} placeholder="Suresh" /></Field>
        </div>
        <Field label="Type">
          <Select value={type} onValueChange={(v) => setType(v as WhatsAppLog['type'])}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="message">Message</SelectItem><SelectItem value="quotation">Quotation</SelectItem><SelectItem value="invoice">Invoice</SelectItem><SelectItem value="reminder">Reminder</SelectItem></SelectContent>
          </Select>
        </Field>
        <Field label="Use Template">
          <Select value={templateId} onValueChange={applyTemplate}><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent><SelectItem value="none">None (custom)</SelectItem>{templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Message *"><Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder="Type your message..." /></Field>
      </div>
    </Modal>
  );
}

// ============ Bulk Modal ============
function BulkModal({ leads, templates, onClose, onSend }: {
  leads: any[];
  templates: WhatsAppTemplate[];
  onClose: () => void;
  onSend: (recipients: { phone: string; name: string }[], body: string) => void;
}) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [body, setBody] = React.useState('');
  const toggle = (id: string) => { const n = new Set(selected); if (n.has(id)) n.delete(id); else n.add(id); setSelected(n); };
  const recipients = leads.filter((l) => selected.has(l.id) && l.phone).map((l) => ({ phone: l.phone, name: l.contact || l.client }));
  return (
    <Modal open onOpenChange={(v) => !v && onClose()} title="Bulk WhatsApp Send" size="lg"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button className="bg-emerald-500 hover:bg-emerald-600" disabled={!recipients.length || !body.trim()} onClick={() => onSend(recipients, body)}>
          <Users className="h-4 w-4 mr-1" /> Send to {recipients.length}
        </Button></>}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs font-bold mb-2">Recipients ({selected.size} selected)</div>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {leads.filter((l) => l.phone).map((l) => (
              <label key={l.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer">
                <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggle(l.id)} className="w-4 h-4" />
                <span className="text-xs">{l.client} <span className="text-muted-foreground">({l.phone})</span></span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs font-bold mb-2">Message</div>
          <div className="flex flex-wrap gap-1 mb-2">
            {templates.slice(0, 4).map((t) => <button key={t.id} onClick={() => setBody(t.body)} className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-border">{t.name}</button>)}
          </div>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} placeholder="Use {{name}} for personalization" />
        </div>
      </div>
    </Modal>
  );
}

// ============ Template Form ============
function TemplateForm({ existing, onClose, onSave }: {
  existing: WhatsAppTemplate | null;
  onClose: () => void;
  onSave: (data: Omit<WhatsAppTemplate, 'id' | 'createdAt'>) => void;
}) {
  const [name, setName] = React.useState(existing?.name || '');
  const [category, setCategory] = React.useState(existing?.category || 'Welcome');
  const [body, setBody] = React.useState(existing?.body || '');
  const [autoSend, setAutoSend] = React.useState(existing?.autoSend || false);
  return (
    <Modal open onOpenChange={(v) => !v && onClose()} title={existing ? 'Edit Template' : 'New Template'} size="md"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button className="bg-emerald-500 hover:bg-emerald-600" disabled={!name.trim() || !body.trim()} onClick={() => onSave({ name: name.trim(), category, body: body.trim(), autoSend })}>
          <Save className="h-4 w-4 mr-1" /> Save
        </Button></>}>
      <div className="space-y-3">
        <Field label="Template Name *"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Welcome New Lead" autoFocus /></Field>
        <Field label="Category">
          <Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TEMPLATE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Message Body *" desc="Use {{name}} and {{amount}} as placeholders — auto-filled when sending.">
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} placeholder="Hello {{name}}! Thank you for..." />
        </Field>
        <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
          <Switch checked={autoSend} onCheckedChange={setAutoSend} /> Auto-send (e.g. on new lead creation)
        </label>
      </div>
    </Modal>
  );
}
