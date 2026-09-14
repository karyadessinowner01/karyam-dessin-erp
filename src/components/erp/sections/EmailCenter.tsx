'use client';

import * as React from 'react';
import {
  Plus, Mail, FileText, Send, Pencil, Trash2, Eye, Inbox,
  CheckCheck, MailOpen, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useERP } from '@/lib/erp/store';
import { fD, today, matchSearch } from '@/lib/erp/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { SectionHeader, TableShell, Th, Td, EmptyState, Modal, Field, StatCard } from '../ui';
import type { EmailTemplate, EmailLog } from '@/lib/erp/types';

const TEMPLATE_CATEGORIES = ['Sales', 'Follow-up', 'Quotation', 'Onboarding', 'Support', 'Marketing', 'Newsletter', 'Other'];

type Tab = 'templates' | 'sent';

const STATUS_BADGE: Record<string, { cls: string; icon: React.ReactNode }> = {
  sent:    { cls: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',       icon: <Send className="h-2.5 w-2.5" /> },
  opened:  { cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300', icon: <MailOpen className="h-2.5 w-2.5" /> },
  clicked: { cls: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',     icon: <CheckCheck className="h-2.5 w-2.5" /> },
  bounced: { cls: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',       icon: <AlertCircle className="h-2.5 w-2.5" /> },
};

function fmtDateTime(iso: string): string {
  if (!iso) return '—';
  const d = iso.split('T')[0];
  const t = iso.split('T')[1] || '';
  return `${fD(d)}${t ? ' ' + t.slice(0, 5) : ''}`;
}

export function EmailCenter() {
  const emailTemplates = useERP((s) => s.emailTemplates || []);
  const emailLogs = useERP((s) => s.emailLogs || []);
  const currentUser = useERP((s) => s.currentUser);
  const createEmailTemplate = useERP((s) => s.createEmailTemplate);
  const updateEmailTemplate = useERP((s) => s.updateEmailTemplate);
  const deleteEmailTemplate = useERP((s) => s.deleteEmailTemplate);
  const sendEmail = useERP((s) => s.sendEmail);

  const [tab, setTab] = React.useState<Tab>('templates');
  const [tplSearch, setTplSearch] = React.useState('');
  const [logSearch, setLogSearch] = React.useState('');
  const [showNewTpl, setShowNewTpl] = React.useState(false);
  const [showSend, setShowSend] = React.useState(false);
  const [editTpl, setEditTpl] = React.useState<EmailTemplate | null>(null);
  const [viewLog, setViewLog] = React.useState<EmailLog | null>(null);

  const filteredTemplates = emailTemplates.filter((t) =>
    matchSearch(`${t.id} ${t.name} ${t.subject} ${t.category || ''} ${t.body}`, tplSearch),
  );
  const sortedLogs = [...emailLogs].sort((a, b) => (b.sentAt || '').localeCompare(a.sentAt || ''));
  const filteredLogs = sortedLogs.filter((l) =>
    matchSearch(`${l.id} ${l.to} ${l.cc || ''} ${l.subject} ${l.body} ${l.sentBy} ${l.status}`, logSearch),
  );

  // Stats
  const totalTemplates = emailTemplates.length;
  const totalSent = emailLogs.length;
  const openedCount = emailLogs.filter((l) => l.status === 'opened' || l.status === 'clicked').length;
  const openRate = totalSent > 0 ? Math.round((openedCount / totalSent) * 100) : 0;
  const bouncedCount = emailLogs.filter((l) => l.status === 'bounced').length;

  const handleDeleteTpl = (id: string) => {
    deleteEmailTemplate(id);
    toast.success('Template deleted');
  };

  const handleSend = (data: { to: string; cc?: string; subject: string; body: string; templateId?: string }) => {
    sendEmail(data);
    toast.success(`Email sent to ${data.to}`);
    setShowSend(false);
  };

  return (
    <div>
      <SectionHeader
        title="Email Center"
        subtitle="Manage email templates and track every sent email — opens, bounces, and more."
        accent="purple"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="h-9" onClick={() => setShowNewTpl(true)}>
              <Plus className="h-4 w-4" /> New Template
            </Button>
            <Button className="h-9 bg-slate-900 hover:bg-slate-800" onClick={() => setShowSend(true)}>
              <Send className="h-4 w-4" /> Send Email
            </Button>
          </div>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Templates" value={totalTemplates} tone="primary" icon={<FileText className="h-4 w-4" />} />
        <StatCard label="Emails Sent" value={totalSent} icon={<Send className="h-4 w-4" />} />
        <StatCard label="Open Rate" value={`${openRate}%`} tone="accent" icon={<MailOpen className="h-4 w-4" />} />
        <StatCard label="Bounced" value={bouncedCount} tone={bouncedCount > 0 ? 'danger' : 'default'} icon={<AlertCircle className="h-4 w-4" />} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl border border-border bg-muted/30 mb-4 w-fit">
        <button
          onClick={() => setTab('templates')}
          className={cn(
            'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all',
            tab === 'templates' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <FileText className="h-3.5 w-3.5" /> Templates
          <span className={cn(
            'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black',
            tab === 'templates' ? 'bg-white/20' : 'bg-card',
          )}>{totalTemplates}</span>
        </button>
        <button
          onClick={() => setTab('sent')}
          className={cn(
            'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all',
            tab === 'sent' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Inbox className="h-3.5 w-3.5" /> Sent
          <span className={cn(
            'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black',
            tab === 'sent' ? 'bg-white/20' : 'bg-card',
          )}>{totalSent}</span>
        </button>
      </div>

      {tab === 'templates' ? (
        <TableShell title="Email Templates" search={tplSearch} onSearch={setTplSearch}>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Subject</Th>
              <Th>Category</Th>
              <Th>Body Preview</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filteredTemplates.length === 0 ? (
              <EmptyState icon={<FileText className="h-8 w-8" />} message="No templates yet — click 'New Template' to create one." />
            ) : filteredTemplates.map((t) => (
              <tr key={t.id} className="hover:bg-muted/30">
                <Td>
                  <div className="font-bold">{t.name}</div>
                  <div className="text-[10px] text-muted-foreground">{t.id}</div>
                </Td>
                <Td className="max-w-[220px] truncate">{t.subject}</Td>
                <Td>
                  {t.category ? (
                    <Badge variant="outline" className="text-[9px] font-bold">{t.category}</Badge>
                  ) : <span className="text-muted-foreground text-xs">—</span>}
                </Td>
                <Td className="max-w-[260px] truncate text-muted-foreground">{t.body.slice(0, 80)}{t.body.length > 80 ? '...' : ''}</Td>
                <Td>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setEditTpl(t)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50" onClick={() => handleDeleteTpl(t.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      ) : (
        <TableShell title="Sent Emails" search={logSearch} onSearch={setLogSearch}>
          <thead>
            <tr>
              <Th>To</Th>
              <Th>Subject</Th>
              <Th>Status</Th>
              <Th>Sent By</Th>
              <Th>Sent At</Th>
              <Th>Opened At</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <EmptyState icon={<Mail className="h-8 w-8" />} message="No emails sent yet — click 'Send Email' to compose one." />
            ) : filteredLogs.map((l) => {
              const sb = STATUS_BADGE[l.status] || STATUS_BADGE.sent;
              return (
                <tr key={l.id} className="hover:bg-muted/30">
                  <Td>
                    <div className="font-bold">{l.to}</div>
                    {l.cc && <div className="text-[10px] text-muted-foreground">cc: {l.cc}</div>}
                  </Td>
                  <Td className="max-w-[220px] truncate">{l.subject}</Td>
                  <Td>
                    <Badge className={cn('text-[9px] font-bold gap-1', sb.cls)}>
                      {sb.icon} {l.status}
                    </Badge>
                  </Td>
                  <Td className="text-xs">{l.sentBy}</Td>
                  <Td className="text-xs">{fmtDateTime(l.sentAt)}</Td>
                  <Td className="text-xs">{l.openedAt ? fmtDateTime(l.openedAt) : <span className="text-muted-foreground">—</span>}</Td>
                  <Td>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setViewLog(l)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </TableShell>
      )}

      {/* New Template Modal */}
      <TemplateModal
        open={showNewTpl}
        onOpenChange={setShowNewTpl}
        title="New Email Template"
        onSave={(data) => {
          createEmailTemplate(data);
          toast.success('Template created');
          setShowNewTpl(false);
        }}
      />

      {/* Edit Template Modal */}
      {editTpl && (
        <TemplateModal
          open
          onOpenChange={(v) => !v && setEditTpl(null)}
          title={`Edit: ${editTpl.name}`}
          initial={editTpl}
          onSave={(data) => {
            updateEmailTemplate(editTpl.id, data);
            toast.success('Template updated');
            setEditTpl(null);
          }}
        />
      )}

      {/* Send Email Modal */}
      <SendEmailModal
        open={showSend}
        onOpenChange={setShowSend}
        templates={emailTemplates}
        defaultFrom={currentUser?.name || 'Unknown'}
        onSend={handleSend}
      />

      {/* View Sent Email Modal */}
      {viewLog && (
        <Modal
          open
          onOpenChange={(v) => !v && setViewLog(null)}
          title={`Sent Email: ${viewLog.subject}`}
          size="lg"
          footer={<Button variant="outline" onClick={() => setViewLog(null)}>Close</Button>}
        >
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl border border-border bg-muted/30">
            <div>
              <div className="text-[10px] font-bold uppercase text-muted-foreground">To</div>
              <div className="text-sm font-bold">{viewLog.to}</div>
            </div>
            {viewLog.cc && (
              <div>
                <div className="text-[10px] font-bold uppercase text-muted-foreground">CC</div>
                <div className="text-sm font-bold">{viewLog.cc}</div>
              </div>
            )}
            <div>
              <div className="text-[10px] font-bold uppercase text-muted-foreground">Sent By</div>
              <div className="text-sm font-bold">{viewLog.sentBy}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-muted-foreground">Sent At</div>
              <div className="text-sm font-bold">{fmtDateTime(viewLog.sentAt)}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-muted-foreground">Status</div>
              <Badge className={cn('text-[9px] font-bold gap-1 mt-0.5', (STATUS_BADGE[viewLog.status] || STATUS_BADGE.sent).cls)}>
                {(STATUS_BADGE[viewLog.status] || STATUS_BADGE.sent).icon} {viewLog.status}
              </Badge>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-muted-foreground">Opened At</div>
              <div className="text-sm font-bold">{viewLog.openedAt ? fmtDateTime(viewLog.openedAt) : '—'}</div>
            </div>
          </div>
          <Field label="Subject">
            <div className="text-sm font-bold p-2.5 rounded-lg bg-muted/40 border border-border">{viewLog.subject}</div>
          </Field>
          <Field label="Body">
            <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs whitespace-pre-wrap max-h-[40vh] overflow-y-auto">{viewLog.body}</div>
          </Field>
        </Modal>
      )}
    </div>
  );
}

// ============ New / Edit Template Modal ============

function TemplateModal({ open, onOpenChange, title, initial, onSave }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  initial?: EmailTemplate;
  onSave: (data: Omit<EmailTemplate, 'id'>) => void;
}) {
  const [name, setName] = React.useState('');
  const [subject, setSubject] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [body, setBody] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setName(initial?.name || '');
      setSubject(initial?.subject || '');
      setCategory(initial?.category || '');
      setBody(initial?.body || '');
    }
  }, [open, initial]);

  const submit = () => {
    if (!name.trim()) { toast.error('Template name is required'); return; }
    if (!subject.trim()) { toast.error('Subject is required'); return; }
    onSave({
      name: name.trim(),
      subject: subject.trim(),
      category: category || undefined,
      body: body,
    });
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      size="lg"
      footer={<>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button className="bg-purple-500 hover:bg-purple-600" onClick={submit}>
          {initial ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {initial ? 'Save Changes' : 'Create Template'}
        </Button>
      </>}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Template Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Welcome Email" />
        </Field>
        <Field label="Category">
          <Select value={category || 'none'} onValueChange={(v) => setCategory(v === 'none' ? '' : v)}>
            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— None —</SelectItem>
              {TEMPLATE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Subject">
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Welcome to {{company}}!" />
      </Field>
      <Field label="Body" desc="You can use placeholders like {{name}}, {{company}}, etc.">
        <Textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Hi {{name}},&#10;&#10;Thank you for reaching out..." />
      </Field>
    </Modal>
  );
}

// ============ Send Email Modal ============

function SendEmailModal({ open, onOpenChange, templates, defaultFrom, onSend }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  templates: EmailTemplate[];
  defaultFrom: string;
  onSend: (data: { to: string; cc?: string; subject: string; body: string; templateId?: string }) => void;
}) {
  const [to, setTo] = React.useState('');
  const [cc, setCc] = React.useState('');
  const [subject, setSubject] = React.useState('');
  const [body, setBody] = React.useState('');
  const [templateId, setTemplateId] = React.useState<string>('none');

  React.useEffect(() => {
    if (open) {
      setTo(''); setCc(''); setSubject(''); setBody(''); setTemplateId('none');
    }
  }, [open]);

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    if (id === 'none') return;
    const tpl = templates.find((t) => t.id === id);
    if (tpl) {
      setSubject(tpl.subject);
      setBody(tpl.body);
      toast.success(`Applied template: ${tpl.name}`);
    }
  };

  const submit = () => {
    if (!to.trim()) { toast.error('Recipient (To) is required'); return; }
    if (!subject.trim()) { toast.error('Subject is required'); return; }
    onSend({
      to: to.trim(),
      cc: cc.trim() || undefined,
      subject: subject.trim(),
      body,
      templateId: templateId !== 'none' ? templateId : undefined,
    });
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Send Email"
      size="lg"
      footer={<>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button className="bg-slate-900 hover:bg-slate-800" onClick={submit}>
          <Send className="h-4 w-4" /> Send
        </Button>
      </>}
    >
      <Field label="Use Template (optional)" desc="Pick a template to auto-fill the subject + body.">
        <Select value={templateId} onValueChange={applyTemplate}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— Blank email —</SelectItem>
            {templates.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}{t.category ? ` · ${t.category}` : ''}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="To" desc="Recipient email address.">
          <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="client@example.com" type="email" />
        </Field>
        <Field label="CC (optional)">
          <Input value={cc} onChange={(e) => setCc(e.target.value)} placeholder="manager@example.com" type="email" />
        </Field>
      </div>
      <Field label="Subject">
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Quote for Visual Aid PPT" />
      </Field>
      <Field label="Body">
        <Textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Dear Client,&#10;&#10;..." />
      </Field>
      <div className="text-[10px] text-muted-foreground italic">Sending as: {defaultFrom}</div>
    </Modal>
  );
}
