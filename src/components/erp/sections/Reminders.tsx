'use client';

import * as React from 'react';
import {
  Plus, BellRing, CalendarClock, AlertTriangle, CheckCircle2, Circle,
  Pencil, Trash2, AlarmClockOff, ListChecks, User as UserIcon, Send,
} from 'lucide-react';
import { toast } from 'sonner';
import { useERP } from '@/lib/erp/store';
import { REMINDER_CATEGORIES } from '@/lib/erp/constants';
import { fD, today, matchSearch } from '@/lib/erp/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  SectionHeader, TableShell, Th, Td, EmptyState,
  Modal, Field, StatCard, FilterChip, FilterBar, ConfirmDialog,
} from '../ui';
import type { Reminder, ReminderPriority } from '@/lib/erp/types';

const PRIORITY_DOT: Record<ReminderPriority, string> = {
  low: 'bg-slate-400',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
};

const PRIORITY_LABEL: Record<ReminderPriority, string> = {
  low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent',
};

type FilterKey = 'all' | 'today' | 'overdue' | 'upcoming' | 'snoozed' | 'done';

/** Whether a reminder is overdue (past due date, not done). */
function isOverdue(r: Reminder): boolean {
  if (r.status === 'done') return false;
  return r.dueDate < today();
}

/** Whether a reminder is due today (not done). */
function isDueToday(r: Reminder): boolean {
  if (r.status === 'done') return false;
  return r.dueDate === today();
}

/** Whether a reminder is upcoming (future, not done, not snoozed). */
function isUpcoming(r: Reminder): boolean {
  if (r.status !== 'pending') return false;
  return r.dueDate > today();
}

export function Reminders() {
  const reminders = useERP((s) => s.reminders || []);
  const team = useERP((s) => s.team);
  const projects = useERP((s) => s.projects);
  const currentUser = useERP((s) => s.currentUser);
  const createReminder = useERP((s) => s.createReminder);
  const updateReminder = useERP((s) => s.updateReminder);
  const deleteReminder = useERP((s) => s.deleteReminder);
  const toggleReminderDone = useERP((s) => s.toggleReminderDone);
  const snoozeReminder = useERP((s) => s.snoozeReminder);
  const clearCompletedReminders = useERP((s) => s.clearCompletedReminders);

  // Owner & Management can see ALL reminders + assign to anyone.
  // Other roles see only their own reminders.
  const canSeeAll = currentUser?.role === 'owner' || currentUser?.role === 'management';

  const visibleReminders = React.useMemo(() => {
    if (canSeeAll) return reminders;
    return reminders.filter((r) => r.assignedTo.toLowerCase() === (currentUser?.email || '').toLowerCase());
  }, [reminders, canSeeAll, currentUser]);

  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState<FilterKey>('all');
  const [priorityFilter, setPriorityFilter] = React.useState<ReminderPriority | 'all'>('all');
  const [assigneeFilter, setAssigneeFilter] = React.useState<string>('all'); // email or 'all' (owner only)
  const [showNew, setShowNew] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<Reminder | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Reminder | null>(null);
  const [snoozeTarget, setSnoozeTarget] = React.useState<Reminder | null>(null);

  // Apply filters
  const filtered = React.useMemo(() => {
    let list = visibleReminders;
    if (filter === 'today') list = list.filter(isDueToday);
    else if (filter === 'overdue') list = list.filter(isOverdue);
    else if (filter === 'upcoming') list = list.filter(isUpcoming);
    else if (filter === 'snoozed') list = list.filter((r) => r.status === 'snoozed');
    else if (filter === 'done') list = list.filter((r) => r.status === 'done');

    if (priorityFilter !== 'all') list = list.filter((r) => r.priority === priorityFilter);

    if (canSeeAll && assigneeFilter !== 'all') {
      list = list.filter((r) => r.assignedTo.toLowerCase() === assigneeFilter.toLowerCase());
    }

    if (search.trim()) {
      list = list.filter((r) =>
        matchSearch(`${r.title} ${r.description || ''} ${r.category} ${r.assignedToName}`, search),
      );
    }

    // Sort: overdue first (by due date asc), then today, then upcoming, then snoozed, then done.
    const rank: Record<string, number> = { pending: 0, snoozed: 1, done: 2 };
    return [...list].sort((a, b) => {
      const ar = rank[a.status] ?? 3;
      const br = rank[b.status] ?? 3;
      if (ar !== br) return ar - br;
      // within same status, earliest due date first
      return a.dueDate.localeCompare(b.dueDate);
    });
  }, [visibleReminders, filter, priorityFilter, assigneeFilter, search, canSeeAll]);

  // Stats
  const stats = React.useMemo(() => {
    const todayC = visibleReminders.filter(isDueToday).length;
    const overdueC = visibleReminders.filter(isOverdue).length;
    const upcomingC = visibleReminders.filter(isUpcoming).length;
    const doneC = visibleReminders.filter((r) => r.status === 'done').length;
    return { todayC, overdueC, upcomingC, doneC };
  }, [visibleReminders]);

  // Assignee options for owner/management (active team members)
  const activeTeam = team.filter((m) => m.active);

  const handleSave = (data: ReminderFormValues) => {
    if (editTarget) {
      updateReminder(editTarget.id, {
        title: data.title,
        description: data.description,
        dueDate: data.dueDate,
        dueTime: data.dueTime,
        priority: data.priority,
        category: data.category,
        assignedTo: data.assignedTo,
        relatedProject: data.relatedProject || undefined,
      });
      toast.success('Reminder updated');
      setEditTarget(null);
    } else {
      createReminder({
        title: data.title,
        description: data.description,
        dueDate: data.dueDate,
        dueTime: data.dueTime,
        priority: data.priority,
        category: data.category,
        assignedTo: data.assignedTo,
        relatedProject: data.relatedProject,
      });
      toast.success('Reminder created');
      setShowNew(false);
    }
  };

  const handleSnooze = (untilDate: string) => {
    if (!snoozeTarget) return;
    snoozeReminder(snoozeTarget.id, untilDate);
    toast.success(`Snoozed until ${fD(untilDate)}`);
    setSnoozeTarget(null);
  };

  const handleClearCompleted = () => {
    const scope = canSeeAll && assigneeFilter !== 'all' ? assigneeFilter : (canSeeAll ? undefined : currentUser?.email);
    if (!confirm('Clear all completed reminders? This cannot be undone.')) return;
    clearCompletedReminders(scope);
    toast.success('Completed reminders cleared');
  };

  const showClear = filter === 'done' && stats.doneC > 0;

  return (
    <div>
      <SectionHeader
        title="Reminders"
        subtitle={
          canSeeAll
            ? 'Stay on top of tasks — oversee reminders for the whole team and your own.'
            : 'Your personal task reminders — never miss a follow-up, meeting, or deadline.'
        }
        accent="amber"
        actions={
          <>
            {showClear && (
              <Button variant="outline" size="sm" className="h-9" onClick={handleClearCompleted}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear completed
              </Button>
            )}
            <Button size="sm" className="h-9 bg-amber-500 hover:bg-amber-600" onClick={() => setShowNew(true)}>
              <Plus className="h-4 w-4 mr-1" /> New Reminder
            </Button>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard
          label="Due Today"
          value={stats.todayC}
          tone={stats.todayC > 0 ? 'warn' : 'default'}
          icon={<CalendarClock className="h-5 w-5" />}
        />
        <StatCard
          label="Overdue"
          value={stats.overdueC}
          tone={stats.overdueC > 0 ? 'danger' : 'default'}
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <StatCard
          label="Upcoming"
          value={stats.upcomingC}
          tone="default"
          icon={<BellRing className="h-5 w-5" />}
        />
        <StatCard
          label="Completed"
          value={stats.doneC}
          tone={stats.doneC > 0 ? 'accent' : 'default'}
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
      </div>

      {/* Filters */}
      <FilterBar label="Filter" onClear={() => { setFilter('all'); setPriorityFilter('all'); setAssigneeFilter('all'); }} showClear={filter !== 'all' || priorityFilter !== 'all' || assigneeFilter !== 'all'}>
        <FilterChip label="All" active={filter === 'all'} onClick={() => setFilter('all')} count={visibleReminders.length} />
        <FilterChip label="Today" active={filter === 'today'} onClick={() => setFilter('today')} count={stats.todayC} color="#f59e0b" />
        <FilterChip label="Overdue" active={filter === 'overdue'} onClick={() => setFilter('overdue')} count={stats.overdueC} color="#ef4444" />
        <FilterChip label="Upcoming" active={filter === 'upcoming'} onClick={() => setFilter('upcoming')} count={stats.upcomingC} color="#3b82f6" />
        <FilterChip label="Snoozed" active={filter === 'snoozed'} onClick={() => setFilter('snoozed')} color="#a855f7" />
        <FilterChip label="Done" active={filter === 'done'} onClick={() => setFilter('done')} count={stats.doneC} color="#10b981" />

        <span className="mx-1 h-5 w-px bg-border" />

        <FilterChip label="All priorities" active={priorityFilter === 'all'} onClick={() => setPriorityFilter('all')} />
        {(['urgent', 'high', 'medium', 'low'] as ReminderPriority[]).map((p) => (
          <FilterChip
            key={p}
            label={PRIORITY_LABEL[p]}
            active={priorityFilter === p}
            onClick={() => setPriorityFilter(p)}
            color={
              p === 'urgent' ? '#ef4444' : p === 'high' ? '#f97316' : p === 'medium' ? '#3b82f6' : '#94a3b8'
            }
          />
        ))}

        {canSeeAll && (
          <>
            <span className="mx-1 h-5 w-px bg-border" />
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="h-7 w-[170px] text-xs rounded-full border-border bg-card">
                <span className="flex items-center gap-1.5">
                  <UserIcon className="h-3 w-3" />
                  <SelectValue placeholder="Assignee" />
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Everyone</SelectItem>
                {activeTeam.map((m) => (
                  <SelectItem key={m.id} value={m.email}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
      </FilterBar>

      {/* Table */}
      <TableShell
        title={`Reminders (${filtered.length})`}
        search={search}
        onSearch={setSearch}
        toolbar={
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            {canSeeAll ? 'Showing all team reminders' : 'Showing your reminders'}
          </span>
        }
      >
        <thead>
          <tr>
            <Th className="w-10" />
            <Th>Title</Th>
            <Th className="hidden md:table-cell">Category</Th>
            <Th>Due</Th>
            <Th>Priority</Th>
            {canSeeAll && <Th className="hidden lg:table-cell">Assigned To</Th>}
            <Th>Status</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <EmptyState
              icon={<BellRing className="h-8 w-8" />}
              message={search || filter !== 'all' ? 'No reminders match your filters.' : 'No reminders yet. Click “New Reminder” to create one.'}
            />
          )}
          {filtered.map((r) => {
            const overdue = isOverdue(r);
            const dueToday = isDueToday(r);
            return (
              <tr key={r.id} className={cn('hover:bg-muted/30 transition-colors', r.status === 'done' && 'opacity-55')}>
                {/* Done toggle */}
                <Td>
                  <button
                    onClick={() => toggleReminderDone(r.id)}
                    title={r.status === 'done' ? 'Mark as pending' : 'Mark as done'}
                    className="text-muted-foreground hover:text-emerald-500 transition-colors"
                  >
                    {r.status === 'done'
                      ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      : <Circle className="h-5 w-5" />}
                  </button>
                </Td>
                {/* Title + description */}
                <Td>
                  <div className={cn('font-semibold text-[13px]', r.status === 'done' && 'line-through text-muted-foreground')}>
                    {r.title}
                  </div>
                  {r.description && (
                    <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{r.description}</div>
                  )}
                  {r.relatedProject && (
                    <Badge variant="outline" className="mt-1 text-[9px] font-bold">
                      {r.relatedProject}
                    </Badge>
                  )}
                </Td>
                <Td className="hidden md:table-cell">
                  <span className="text-[11px] text-muted-foreground">{r.category}</span>
                </Td>
                {/* Due date */}
                <Td>
                  <div className={cn('text-[12px] font-bold', overdue ? 'text-red-600' : dueToday ? 'text-amber-600' : 'text-foreground')}>
                    {fD(r.dueDate)}
                  </div>
                  {r.dueTime && <div className="text-[10px] text-muted-foreground">{r.dueTime}</div>}
                  {r.status === 'snoozed' && r.snoozedUntil && (
                    <div className="text-[9px] text-purple-600 font-bold">↳ {fD(r.snoozedUntil)}</div>
                  )}
                  {overdue && <div className="text-[9px] text-red-500 font-bold uppercase">Overdue</div>}
                </Td>
                {/* Priority */}
                <Td>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold">
                    <span className={cn('h-2 w-2 rounded-full', PRIORITY_DOT[r.priority])} />
                    {PRIORITY_LABEL[r.priority]}
                  </span>
                </Td>
                {canSeeAll && (
                  <Td className="hidden lg:table-cell">
                    <div className="text-[12px] font-semibold">{r.assignedToName}</div>
                    <div className="text-[10px] text-muted-foreground">{r.assignedTo}</div>
                  </Td>
                )}
                {/* Status */}
                <Td>
                  <StatusPill status={r.status} overdue={overdue} dueToday={dueToday} />
                </Td>
                {/* Actions */}
                <Td>
                  <div className="flex items-center justify-end gap-1">
                    {r.status !== 'done' && (
                      <button
                        onClick={() => setSnoozeTarget(r)}
                        title="Snooze"
                        className="p-1.5 rounded-md hover:bg-purple-100 dark:hover:bg-purple-950/40 text-purple-500"
                      >
                        <AlarmClockOff className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => setEditTarget(r)}
                      title="Edit"
                      className="p-1.5 rounded-md hover:bg-blue-100 dark:hover:bg-blue-950/40 text-blue-500"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(r)}
                      title="Delete"
                      className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-950/40 text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </TableShell>

      {/* New / Edit modal */}
      {(showNew || editTarget) && (
        <ReminderForm
          reminder={editTarget}
          canAssign={canSeeAll}
          currentUserEmail={currentUser?.email || ''}
          currentUserName={currentUser?.name || ''}
          team={activeTeam}
          projects={projects}
          onCancel={() => { setShowNew(false); setEditTarget(null); }}
          onSave={handleSave}
        />
      )}

      {/* Snooze modal */}
      {snoozeTarget && (
        <SnoozeModal
          title={snoozeTarget.title}
          onCancel={() => setSnoozeTarget(null)}
          onSnooze={handleSnooze}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <ConfirmDialog
          open
          onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
          title="Delete reminder?"
          message={<>This will permanently delete <strong>“{deleteTarget.title}”</strong>. This cannot be undone.</>}
          confirmLabel="Delete"
          onConfirm={() => {
            deleteReminder(deleteTarget.id);
            toast.success('Reminder deleted');
            setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}

// ============ Status Pill ============
function StatusPill({ status, overdue, dueToday }: { status: string; overdue: boolean; dueToday: boolean }) {
  if (status === 'done') {
    return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Done</span>;
  }
  if (status === 'snoozed') {
    return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">Snoozed</span>;
  }
  if (overdue) {
    return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">Overdue</span>;
  }
  if (dueToday) {
    return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">Due Today</span>;
  }
  return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">Pending</span>;
}

// ============ Reminder Form (New / Edit) ============
interface ReminderFormValues {
  title: string;
  description?: string;
  dueDate: string;
  dueTime?: string;
  priority: ReminderPriority;
  category: string;
  assignedTo: string;
  relatedProject?: string;
}

function ReminderForm({
  reminder, canAssign, currentUserEmail, currentUserName, team, projects, onCancel, onSave,
}: {
  reminder: Reminder | null;
  canAssign: boolean;
  currentUserEmail: string;
  currentUserName: string;
  team: { id: number; name: string; email: string; dept: string }[];
  projects: { id: string; client: string; title: string }[];
  onCancel: () => void;
  onSave: (v: ReminderFormValues) => void;
}) {
  const [title, setTitle] = React.useState(reminder?.title || '');
  const [description, setDescription] = React.useState(reminder?.description || '');
  const [dueDate, setDueDate] = React.useState(reminder?.dueDate || today());
  const [dueTime, setDueTime] = React.useState(reminder?.dueTime || '');
  const [priority, setPriority] = React.useState<ReminderPriority>(reminder?.priority || 'medium');
  const [category, setCategory] = React.useState(reminder?.category || 'Task');
  const [assignedTo, setAssignedTo] = React.useState(reminder?.assignedTo || currentUserEmail);
  const [relatedProject, setRelatedProject] = React.useState(reminder?.relatedProject || 'none');

  const isEdit = !!reminder;
  const valid = title.trim() && dueDate && assignedTo;

  const handleSubmit = () => {
    if (!valid) {
      toast.error('Title and due date are required');
      return;
    }
    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      dueDate,
      dueTime: dueTime.trim() || undefined,
      priority,
      category,
      assignedTo,
      relatedProject: relatedProject === 'none' ? '' : relatedProject,
    });
  };

  return (
    <Modal
      open
      onOpenChange={(v) => { if (!v) onCancel(); }}
      title={isEdit ? 'Edit Reminder' : 'New Reminder'}
      description={isEdit ? 'Update the reminder details.' : 'Create a task reminder for yourself or a team member.'}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button className="bg-amber-500 hover:bg-amber-600" onClick={handleSubmit} disabled={!valid}>
            {isEdit ? <><Pencil className="h-4 w-4 mr-1" /> Save Changes</> : <><Plus className="h-4 w-4 mr-1" /> Create Reminder</>}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Title *" className="sm:col-span-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Follow up with Abbott India" autoFocus />
        </Field>

        <Field label="Description" className="sm:col-span-2">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional details / notes" rows={2} />
        </Field>

        <Field label="Due Date *" className="sm:col-span-2">
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {(() => {
              const dAhead = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0]; };
              const presets = [
                { label: 'Today', date: today() },
                { label: 'Tomorrow', date: dAhead(1) },
                { label: 'In 3 days', date: dAhead(3) },
                { label: 'In 1 week', date: dAhead(7) },
                { label: 'In 2 weeks', date: dAhead(14) },
              ];
              return presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setDueDate(p.date)}
                  className={cn(
                    'text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all',
                    dueDate === p.date
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-card border-border text-muted-foreground hover:border-amber-400 hover:text-foreground',
                  )}
                >
                  {p.label}
                </button>
              ));
            })()}
          </div>
        </Field>
        <Field label="Due Time (optional)">
          <Input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
        </Field>

        <Field label="Priority">
          <Select value={priority} onValueChange={(v) => setPriority(v as ReminderPriority)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Category">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {REMINDER_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Assign To" className="sm:col-span-2">
          {canAssign ? (
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {team.map((m) => (
                  <SelectItem key={m.id} value={m.email}>
                    {m.name} <span className="text-muted-foreground">· {m.dept}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-muted/40 text-sm">
              <UserIcon className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{currentUserName}</span>
              <span className="text-muted-foreground text-xs">({currentUserEmail})</span>
            </div>
          )}
        </Field>

        <Field label="Related Project (optional)" className="sm:col-span-2">
          <Select value={relatedProject} onValueChange={setRelatedProject}>
            <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.id} · {p.client} — {p.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
    </Modal>
  );
}

// ============ Snooze Modal ============
function SnoozeModal({
  title, onCancel, onSnooze,
}: {
  title: string;
  onCancel: () => void;
  onSnooze: (untilDate: string) => void;
}) {
  const daysAhead = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0];
  };

  const options = [
    { label: 'Tomorrow', date: daysAhead(1) },
    { label: 'In 2 days', date: daysAhead(2) },
    { label: 'In 3 days', date: daysAhead(3) },
    { label: 'In 1 week', date: daysAhead(7) },
  ];
  const [custom, setCustom] = React.useState('');

  return (
    <Modal
      open
      onOpenChange={(v) => { if (!v) onCancel(); }}
      title="Snooze Reminder"
      description={`Push “${title}” to a later date.`}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button
            className="bg-purple-500 hover:bg-purple-600"
            disabled={!custom}
            onClick={() => custom && onSnooze(custom)}
          >
            <Send className="h-4 w-4 mr-1" /> Snooze to {custom ? fD(custom) : '...'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-2">
        {options.map((o) => (
          <button
            key={o.label}
            onClick={() => onSnooze(o.date)}
            className="flex flex-col items-start p-3 rounded-xl border-2 border-border hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-all text-left"
          >
            <span className="text-sm font-bold">{o.label}</span>
            <span className="text-[11px] text-muted-foreground">{fD(o.date)}</span>
          </button>
        ))}
      </div>
      <Field label="Or pick a custom date">
        <Input type="date" value={custom} onChange={(e) => setCustom(e.target.value)} min={today()} />
      </Field>
    </Modal>
  );
}
