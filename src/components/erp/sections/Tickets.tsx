'use client';

import * as React from 'react';
import { Plus, Ticket as TicketIcon, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useERP } from '@/lib/erp/store';
import { DEPT_LABELS, DEPT_BADGE } from '@/lib/erp/constants';
import { fD, today, matchSearch } from '@/lib/erp/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  SectionHeader, TableShell, Th, Td, EmptyState, StatusBadge,
  Modal, Field, StatCard,
} from '../ui';
import type { Ticket, Role } from '@/lib/erp/types';

const PRIORITY_DOT: Record<string, string> = {
  low: 'bg-slate-400', medium: 'bg-blue-500', high: 'bg-orange-500', urgent: 'bg-red-500',
};

export function Tickets() {
  const tickets = useERP((s) => s.tickets);
  const projects = useERP((s) => s.projects);
  const currentUser = useERP((s) => s.currentUser);
  const createTicket = useERP((s) => s.createTicket);
  const updateTicketStatus = useERP((s) => s.updateTicketStatus);
  const reassignTicket = useERP((s) => s.reassignTicket);
  const addTicketComment = useERP((s) => s.addTicketComment);

  const isOM = currentUser?.role === 'owner' || currentUser?.role === 'management';

  const [search, setSearch] = React.useState('');
  const [showNew, setShowNew] = React.useState(false);
  const [view, setView] = React.useState<Ticket | null>(null);
  const [comment, setComment] = React.useState('');

  // refresh view when tickets change
  React.useEffect(() => {
    if (view) {
      const updated = tickets.find((t) => t.id === view.id);
      if (updated && updated !== view) setView(updated);
    }
  }, [tickets, view]);

  const myTickets = tickets.filter((t) => {
    if (isOM) return true;
    return t.raisedBy.dept === currentUser?.role || t.assignedTo.dept === currentUser?.role;
  });
  const filtered = myTickets.filter((t) => matchSearch(`${t.id} ${t.subject} ${t.status}`, search));

  const stats = { open: 0, in_progress: 0, resolved: 0, closed: 0 };
  tickets.forEach((t) => { (stats as any)[t.status]++; });

  return (
    <div>
      <SectionHeader
        title="Tickets / Queries"
        accent="amber"
        actions={
          <Button onClick={() => setShowNew(true)} className="h-9 bg-slate-900 hover:bg-slate-800">
            <Plus className="h-4 w-4" /> Raise Ticket
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Open" value={stats.open} tone="warn" />
        <StatCard label="In Progress" value={stats.in_progress} tone="primary" />
        <StatCard label="Resolved" value={stats.resolved} tone="accent" />
        <StatCard label="Closed" value={stats.closed} />
      </div>

      <TableShell title={`${isOM ? 'All Tickets' : 'My Tickets'} (${myTickets.length})`} search={search} onSearch={setSearch}>
        <thead>
          <tr><Th>ID</Th><Th>Subject</Th><Th>From</Th><Th>Assigned To</Th><Th>Priority</Th><Th>Status</Th><Th>Date</Th></tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <EmptyState icon={<TicketIcon className="h-8 w-8" />} message="No tickets" />
          ) : filtered.map((t) => (
            <tr key={t.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setView(t)}>
              <Td><strong>{t.id}</strong></Td>
              <Td>
                <span className="inline-flex items-center gap-1.5">
                  <span className={cn('h-1.5 w-1.5 rounded-full', PRIORITY_DOT[t.priority])} />
                  {t.subject}
                </span>
              </Td>
              <Td>
                <div className="font-semibold">{t.raisedBy.name}</div>
                <div className="text-[10px] text-muted-foreground">{DEPT_LABELS[t.raisedBy.dept]}</div>
              </Td>
              <Td>
                <div className="font-semibold">{t.assignedTo.name}</div>
                <div className="text-[10px] text-muted-foreground">{DEPT_LABELS[t.assignedTo.dept]}</div>
              </Td>
              <Td><span className="capitalize">{t.priority}</span></Td>
              <Td><StatusBadge status={t.status} /></Td>
              <Td>{fD(t.createdAt)}</Td>
            </tr>
          ))}
        </tbody>
      </TableShell>

      {/* New Ticket */}
      <NewTicketModal open={showNew} onOpenChange={setShowNew} projects={projects.map((p) => ({ id: p.id, client: p.client }))} onCreate={(data) => {
        createTicket(data);
        toast.success('Ticket raised!');
        setShowNew(false);
      }} />

      {/* View Ticket */}
      {view && (
        <Modal open onOpenChange={() => setView(null)} title={`Ticket: ${view.id}`} size="lg"
          footer={<>
            <Button variant="outline" onClick={() => setView(null)}>Close</Button>
            <div className="flex-1" />
            {view.status !== 'closed' && (
              <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={() => { updateTicketStatus(view.id, 'resolved'); toast.success('Ticket resolved'); }}>
                Mark Resolved
              </Button>
            )}
            {view.status === 'resolved' && (
              <Button className="bg-slate-900 hover:bg-slate-800" onClick={() => { updateTicketStatus(view.id, 'closed'); toast.success('Ticket closed'); }}>
                Close Ticket
              </Button>
            )}
            {view.status === 'closed' && (
              <Button variant="outline" onClick={() => { updateTicketStatus(view.id, 'open'); toast.success('Ticket reopened'); }}>
                Reopen
              </Button>
            )}
            {isOM && view.status !== 'closed' && (
              <ReassignButton ticket={view} onReassign={(dept, reason) => { reassignTicket(view.id, dept, reason); toast.success('Reassigned'); }} />
            )}
          </>}
        >
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3.5 rounded-xl border border-border bg-muted/30 mb-3">
            <div><div className="text-[10px] font-bold uppercase text-muted-foreground">Subject</div><div className="text-sm font-bold">{view.subject}</div></div>
            <div><div className="text-[10px] font-bold uppercase text-muted-foreground">Priority</div><div className="text-sm font-bold capitalize flex items-center gap-1.5"><span className={cn('h-1.5 w-1.5 rounded-full', PRIORITY_DOT[view.priority])} />{view.priority}</div></div>
            <div><div className="text-[10px] font-bold uppercase text-muted-foreground">Status</div><div><StatusBadge status={view.status} /></div></div>
            <div><div className="text-[10px] font-bold uppercase text-muted-foreground">Project</div><div className="text-sm font-bold">{view.relatedProject || '-'}</div></div>
            <div><div className="text-[10px] font-bold uppercase text-muted-foreground">Raised By</div><div className="text-sm font-bold">{view.raisedBy.name} <span className="text-[10px] text-muted-foreground">({DEPT_LABELS[view.raisedBy.dept]})</span></div></div>
            <div><div className="text-[10px] font-bold uppercase text-muted-foreground">Assigned To</div><div className="text-sm font-bold">{view.assignedTo.name} <span className="text-[10px] text-muted-foreground">({DEPT_LABELS[view.assignedTo.dept]})</span></div></div>
          </div>

          <Field label="Description">
            <div className="p-2.5 rounded-lg bg-muted/50 text-xs">{view.description}</div>
          </Field>

          <div className="mt-3">
            <div className="text-[12px] font-bold mb-2">COMMENTS ({view.comments.length})</div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {view.comments.length === 0 ? (
                <div className="text-center text-muted-foreground text-xs py-4">No comments yet</div>
              ) : view.comments.map((c, i) => (
                <div key={i} className="flex gap-2.5 p-2.5 rounded-lg bg-muted/30">
                  <div className="h-7 w-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {c.by.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-bold">{c.by.name}</span>
                      <span className="text-[10px] text-muted-foreground">{fD(c.date)} {c.time}</span>
                    </div>
                    <div className="text-xs mt-0.5">{c.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Type your comment..." className="text-xs" />
            <Button className="bg-emerald-500 hover:bg-emerald-600 self-end" onClick={() => {
              if (!comment.trim()) { toast.error('Comment likho'); return; }
              addTicketComment(view.id, comment.trim());
              setComment('');
              toast.success('Comment added');
            }}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function NewTicketModal({ open, onOpenChange, projects, onCreate }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projects: { id: string; client: string }[];
  onCreate: (data: { subject: string; description: string; priority: Ticket['priority']; relatedProject: string | null; assignedDept: string }) => void;
}) {
  const [subject, setSubject] = React.useState('');
  const [priority, setPriority] = React.useState<Ticket['priority']>('medium');
  const [dept, setDept] = React.useState<string>('management');
  const [pid, setPid] = React.useState('');
  const [description, setDescription] = React.useState('');

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Raise Ticket" size="lg"
      footer={<><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={() => {
          if (!subject.trim() || !description.trim()) { toast.error('Subject aur Description zaroori'); return; }
          onCreate({ subject: subject.trim(), description: description.trim(), priority, relatedProject: pid || null, assignedDept: dept });
          setSubject(''); setDescription(''); setPid(''); setPriority('medium'); setDept('management');
        }}>Raise Ticket</Button></>}
    >
      <Field label="Subject"><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Brief subject" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Priority">
          <Select value={priority} onValueChange={(v) => setPriority(v as Ticket['priority'])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Assign To Department">
          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(['owner', 'management', 'marketing', 'designer', 'production'] as Role[]).map((d) => <SelectItem key={d} value={d}>{DEPT_LABELS[d]}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Related Project (optional)">
        <Select value={pid || 'none'} onValueChange={(v) => setPid(v === 'none' ? '' : v)}>
          <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.id} — {p.client}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Description"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your issue or query..." /></Field>
    </Modal>
  );
}

function ReassignButton({ ticket, onReassign }: { ticket: Ticket; onReassign: (dept: string, reason: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const [dept, setDept] = React.useState(ticket.assignedTo.dept);
  const [reason, setReason] = React.useState('');

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>Reassign</Button>
      <Modal open={open} onOpenChange={setOpen} title={`Reassign ${ticket.id}`}
        footer={<><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={() => { onReassign(dept, reason); setOpen(false); setReason(''); }}>Reassign</Button></>}
      >
        <Field label="Assign to Department">
          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(['owner', 'management', 'marketing', 'designer', 'production'] as Role[]).map((d) => <SelectItem key={d} value={d}>{DEPT_LABELS[d]}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Reason"><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why reassigning?" /></Field>
      </Modal>
    </>
  );
}
