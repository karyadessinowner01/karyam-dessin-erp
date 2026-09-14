'use client';

import * as React from 'react';
import {
  Plus, ListChecks, Pencil, Trash2, CheckCircle2, Circle, X, GripVertical,
  User as UserIcon, Calendar, Flag, Filter as FilterIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useERP } from '@/lib/erp/store';
import { TASK_CATEGORIES } from '@/lib/erp/constants';
import { fD, today, matchSearch } from '@/lib/erp/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  SectionHeader, EmptyState, Modal, Field, StatCard,
  FilterChip, FilterBar,
} from '../ui';
import type { Task, TaskStatus, ReminderPriority, ChecklistItem } from '@/lib/erp/types';

const PRIORITY_DOT: Record<ReminderPriority, string> = {
  low: 'bg-slate-400', medium: 'bg-blue-500', high: 'bg-orange-500', urgent: 'bg-red-500',
};
const PRIORITY_LABEL: Record<ReminderPriority, string> = {
  low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent',
};

const COLUMNS: { key: TaskStatus; label: string; accent: string; dot: string }[] = [
  { key: 'todo', label: 'To Do', accent: 'border-t-slate-400', dot: 'bg-slate-400' },
  { key: 'in_progress', label: 'In Progress', accent: 'border-t-blue-500', dot: 'bg-blue-500' },
  { key: 'on_hold', label: 'On Hold', accent: 'border-t-amber-500', dot: 'bg-amber-500' },
  { key: 'blocked', label: 'Blocked', accent: 'border-t-red-500', dot: 'bg-red-500' },
  { key: 'done', label: 'Done', accent: 'border-t-emerald-500', dot: 'bg-emerald-500' },
];

export function Tasks() {
  const tasks = useERP((s) => s.tasks || []);
  const team = useERP((s) => s.team);
  const projects = useERP((s) => s.projects);
  const createTask = useERP((s) => s.createTask);
  const updateTask = useERP((s) => s.updateTask);
  const updateTaskStatus = useERP((s) => s.updateTaskStatus);
  const deleteTask = useERP((s) => s.deleteTask);
  const addChecklistItem = useERP((s) => s.addChecklistItem);
  const updateChecklistItem = useERP((s) => s.updateChecklistItem);
  const deleteChecklistItem = useERP((s) => s.deleteChecklistItem);

  const [search, setSearch] = React.useState('');
  const [priorityFilter, setPriorityFilter] = React.useState<ReminderPriority | 'all'>('all');
  const [assigneeFilter, setAssigneeFilter] = React.useState<string>('all');
  const [showNew, setShowNew] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Task | null>(null);
  const [detailTask, setDetailTask] = React.useState<Task | null>(null);

  const activeTeam = team.filter((m) => m.active);

  // Apply filters
  const filtered = React.useMemo(() => {
    let list = tasks;
    if (priorityFilter !== 'all') list = list.filter((t) => t.priority === priorityFilter);
    if (assigneeFilter !== 'all') {
      list = list.filter((t) =>
        assigneeFilter === 'unassigned'
          ? !t.assignedTo
          : t.assignedTo?.toLowerCase() === assigneeFilter.toLowerCase(),
      );
    }
    if (search.trim()) {
      list = list.filter((t) =>
        matchSearch(`${t.title} ${t.description || ''} ${t.category || ''} ${t.assignedToName || ''}`, search),
      );
    }
    return list;
  }, [tasks, priorityFilter, assigneeFilter, search]);

  // Group by status column
  const byStatus = React.useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], on_hold: [], blocked: [], done: [] };
    filtered.forEach((t) => map[t.status].push(t));
    return map;
  }, [filtered]);

  // Stats
  const stats = React.useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === 'done').length;
    const inProg = tasks.filter((t) => t.status === 'in_progress').length;
    const blocked = tasks.filter((t) => t.status === 'blocked').length;
    // Overdue = not done + has dueDate in past
    const todayStr = today();
    const overdue = tasks.filter((t) => t.status !== 'done' && t.dueDate && t.dueDate < todayStr).length;
    return { total, done, inProg, blocked, overdue };
  }, [tasks]);

  const handleSave = (data: TaskFormValues) => {
    if (editTarget) {
      updateTask(editTarget.id, {
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: data.status,
        assignedTo: data.assignedTo || undefined,
        dueDate: data.dueDate || undefined,
        category: data.category || undefined,
        relatedProject: data.relatedProject || undefined,
      });
      toast.success('Task updated');
      setEditTarget(null);
    } else {
      createTask({
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: data.status,
        assignedTo: data.assignedTo || undefined,
        dueDate: data.dueDate || undefined,
        category: data.category || undefined,
        relatedProject: data.relatedProject || undefined,
      });
      toast.success('Task created');
      setShowNew(false);
    }
  };

  // Keep detail task in sync with store updates (e.g. checklist toggle)
  const liveDetailTask = detailTask ? tasks.find((t) => t.id === detailTask.id) || null : null;

  return (
    <div>
      <SectionHeader
        title="Tasks"
        subtitle="Plan work, track progress with checklists, and assign to your team."
        accent="purple"
        actions={
          <Button size="sm" className="h-9 bg-purple-500 hover:bg-purple-600" onClick={() => setShowNew(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Task
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <StatCard label="Total Tasks" value={stats.total} tone="primary" icon={<ListChecks className="h-5 w-5" />} />
        <StatCard label="In Progress" value={stats.inProg} tone="default" icon={<Circle className="h-5 w-5" />} />
        <StatCard label="Done" value={stats.done} tone={stats.done > 0 ? 'accent' : 'default'} icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard label="Blocked" value={stats.blocked} tone={stats.blocked > 0 ? 'danger' : 'default'} icon={<X className="h-5 w-5" />} />
        <StatCard label="Overdue" value={stats.overdue} tone={stats.overdue > 0 ? 'warn' : 'default'} icon={<Calendar className="h-5 w-5" />} />
      </div>

      {/* Filters */}
      <FilterBar
        label="Filter"
        onClear={() => { setPriorityFilter('all'); setAssigneeFilter('all'); setSearch(''); }}
        showClear={priorityFilter !== 'all' || assigneeFilter !== 'all' || search !== ''}
      >
        <div className="relative">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="h-8 w-48 text-xs pl-7"
          />
          <FilterIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
        </div>
        <span className="mx-1 h-5 w-px bg-border" />
        <FilterChip label="All priorities" active={priorityFilter === 'all'} onClick={() => setPriorityFilter('all')} />
        {(['urgent', 'high', 'medium', 'low'] as ReminderPriority[]).map((p) => (
          <FilterChip
            key={p}
            label={PRIORITY_LABEL[p]}
            active={priorityFilter === p}
            onClick={() => setPriorityFilter(p)}
            color={p === 'urgent' ? '#ef4444' : p === 'high' ? '#f97316' : p === 'medium' ? '#3b82f6' : '#94a3b8'}
          />
        ))}
        <span className="mx-1 h-5 w-px bg-border" />
        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="h-7 w-[160px] text-xs rounded-full border-border bg-card">
            <span className="flex items-center gap-1.5">
              <UserIcon className="h-3 w-3" />
              <SelectValue placeholder="Assignee" />
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Everyone</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {activeTeam.map((m) => (
              <SelectItem key={m.id} value={m.email}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>

      {/* Kanban board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {COLUMNS.map((col) => {
          const items = byStatus[col.key];
          return (
            <div key={col.key} className={cn('rounded-xl border border-border bg-card overflow-hidden shadow-sm border-t-4', col.accent)}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  <span className={cn('h-2.5 w-2.5 rounded-full', col.dot)} />
                  <span className="text-sm font-black">{col.label}</span>
                </div>
                <span className="text-[11px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{items.length}</span>
              </div>
              <div className="p-3 space-y-2.5 min-h-[120px] max-h-[640px] overflow-y-auto">
                {items.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground">No tasks</div>
                ) : (
                  items.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      onClick={() => setDetailTask(t)}
                      onStatusChange={(s) => updateTaskStatus(t.id, s)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* New / Edit modal */}
      {(showNew || editTarget) && (
        <TaskForm
          task={editTarget}
          team={activeTeam}
          projects={projects}
          onCancel={() => { setShowNew(false); setEditTarget(null); }}
          onSave={handleSave}
        />
      )}

      {/* Detail modal with checklist */}
      {liveDetailTask && (
        <TaskDetail
          task={liveDetailTask}
          onClose={() => setDetailTask(null)}
          onEdit={() => { setEditTarget(liveDetailTask); setDetailTask(null); }}
          onDelete={() => { setDeleteTarget(liveDetailTask); setDetailTask(null); }}
          onStatusChange={(s) => updateTaskStatus(liveDetailTask.id, s)}
          onAddChecklistItem={(text) => addChecklistItem(liveDetailTask.id, text)}
          onToggleChecklistItem={(itemId, done) => updateChecklistItem(liveDetailTask.id, itemId, { done })}
          onDeleteChecklistItem={(itemId) => deleteChecklistItem(liveDetailTask.id, itemId)}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <Modal
          open
          onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
          title="Delete task?"
          size="sm"
          footer={
            <>
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button
                className="bg-red-500 hover:bg-red-600"
                onClick={() => {
                  deleteTask(deleteTarget.id);
                  toast.success('Task deleted');
                  setDeleteTarget(null);
                }}
              >
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
            </>
          }
        >
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 p-4 text-sm text-amber-900 dark:text-amber-200">
            This will permanently delete <strong>“{deleteTarget.title}”</strong> and its checklist. This cannot be undone.
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============ Task Card (in Kanban column) ============
function TaskCard({
  task, onClick, onStatusChange,
}: {
  task: Task;
  onClick: () => void;
  onStatusChange: (s: TaskStatus) => void;
}) {
  const todayStr = today();
  const overdue = task.status !== 'done' && !!task.dueDate && task.dueDate < todayStr;
  const totalCl = task.checklist.length;
  const doneCl = task.checklist.filter((c) => c.done).length;
  const pct = totalCl > 0 ? Math.round((doneCl / totalCl) * 100) : 0;

  return (
    <div
      onClick={onClick}
      className="group rounded-lg border border-border bg-background p-3 shadow-sm hover:shadow-md hover:border-purple-300 transition-all cursor-pointer"
    >
      <div className="flex items-start gap-2 mb-1.5">
        <span className={cn('h-2 w-2 rounded-full mt-1.5 flex-shrink-0', PRIORITY_DOT[task.priority])} />
        <div className="flex-1 min-w-0">
          <div className={cn('text-[13px] font-bold leading-snug', task.status === 'done' && 'line-through text-muted-foreground')}>
            {task.title}
          </div>
          {task.description && (
            <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{task.description}</div>
          )}
        </div>
      </div>

      {/* Checklist progress */}
      {totalCl > 0 && (
        <div className="mb-2">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
            <span className="font-bold">{doneCl}/{totalCl} done</span>
            <span className="font-bold">{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', task.status === 'done' ? 'bg-emerald-500' : 'bg-purple-500')}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Meta footer */}
      <div className="flex flex-wrap items-center gap-1.5 mt-1">
        {task.category && (
          <Badge variant="outline" className="text-[9px] font-bold">{task.category}</Badge>
        )}
        {task.dueDate && (
          <span className={cn('inline-flex items-center gap-0.5 text-[10px] font-bold', overdue ? 'text-red-500' : 'text-muted-foreground')}>
            <Calendar className="h-2.5 w-2.5" />{fD(task.dueDate)}{overdue && ' · Overdue'}
          </span>
        )}
        {task.assignedToName && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground ml-auto">
            <UserIcon className="h-2.5 w-2.5" />{task.assignedToName.split(' ')[0]}
          </span>
        )}
      </div>

      {/* Quick status move (visible on hover) */}
      <div className="mt-2 pt-2 border-t border-border/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
        <span className="text-[9px] text-muted-foreground font-bold uppercase mr-1">Move:</span>
        {COLUMNS.filter((c) => c.key !== task.status).map((c) => (
          <button
            key={c.key}
            onClick={(e) => { e.stopPropagation(); onStatusChange(c.key); }}
            className="text-[9px] font-bold px-1.5 py-0.5 rounded hover:bg-muted transition-colors"
            title={`Move to ${c.label}`}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============ Task Detail Modal (with checklist) ============
function TaskDetail({
  task, onClose, onEdit, onDelete, onStatusChange, onAddChecklistItem, onToggleChecklistItem, onDeleteChecklistItem,
}: {
  task: Task;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (s: TaskStatus) => void;
  onAddChecklistItem: (text: string) => void;
  onToggleChecklistItem: (itemId: string, done: boolean) => void;
  onDeleteChecklistItem: (itemId: string) => void;
}) {
  const [newItem, setNewItem] = React.useState('');
  const todayStr = today();
  const overdue = task.status !== 'done' && !!task.dueDate && task.dueDate < todayStr;
  const totalCl = task.checklist.length;
  const doneCl = task.checklist.filter((c) => c.done).length;
  const pct = totalCl > 0 ? Math.round((doneCl / totalCl) * 100) : 0;

  const handleAdd = () => {
    if (!newItem.trim()) return;
    onAddChecklistItem(newItem.trim());
    setNewItem('');
  };

  return (
    <Modal
      open
      onOpenChange={(v) => { if (!v) onClose(); }}
      title={task.title}
      description={task.description || 'No description.'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onEdit}><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</Button>
          <Button variant="outline" className="hover:border-red-400 hover:text-red-500" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
          </Button>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </>
      }
    >
      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="inline-flex items-center gap-1.5 font-bold">
          <span className={cn('h-2.5 w-2.5 rounded-full', PRIORITY_DOT[task.priority])} />
          {PRIORITY_LABEL[task.priority]} priority
        </span>
        {task.category && <Badge variant="outline" className="text-[10px] font-bold">{task.category}</Badge>}
        {task.dueDate && (
          <span className={cn('inline-flex items-center gap-1 font-bold', overdue ? 'text-red-500' : 'text-muted-foreground')}>
            <Calendar className="h-3 w-3" /> Due {fD(task.dueDate)}{overdue && ' · Overdue'}
          </span>
        )}
        {task.assignedToName && (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <UserIcon className="h-3 w-3" /> {task.assignedToName}
          </span>
        )}
        {task.relatedProject && <Badge variant="outline" className="text-[10px] font-bold">{task.relatedProject}</Badge>}
      </div>

      {/* Status selector */}
      <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/30">
        <Flag className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-bold mr-1">Status:</span>
        <Select value={task.status} onValueChange={(v) => onStatusChange(v as TaskStatus)}>
          <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {COLUMNS.map((c) => (
              <SelectItem key={c.key} value={c.key}>
                <span className="inline-flex items-center gap-1.5">
                  <span className={cn('h-2 w-2 rounded-full', c.dot)} />{c.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Checklist */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b border-border">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-bold">Checklist</span>
            <span className="text-[11px] text-muted-foreground font-bold">{doneCl}/{totalCl}</span>
          </div>
          <span className="text-[11px] font-bold text-purple-600">{pct}%</span>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 bg-muted">
          <div
            className={cn('h-full transition-all', task.status === 'done' ? 'bg-emerald-500' : 'bg-purple-500')}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="p-3 space-y-1.5 max-h-[300px] overflow-y-auto">
          {task.checklist.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground">No checklist items yet. Add one below.</div>
          ) : (
            task.checklist.map((c) => (
              <ChecklistRow
                key={c.id}
                item={c}
                onToggle={(done) => onToggleChecklistItem(c.id, done)}
                onDelete={() => onDeleteChecklistItem(c.id)}
              />
            ))
          )}
        </div>
        {/* Add item */}
        <div className="flex items-center gap-2 p-3 border-t border-border bg-muted/20">
          <Input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
            placeholder="Add a checklist item..."
            className="h-8 text-xs"
          />
          <Button size="sm" className="h-8 bg-purple-500 hover:bg-purple-600" onClick={handleAdd} disabled={!newItem.trim()}>
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ============ Checklist Row ============
function ChecklistRow({
  item, onToggle, onDelete,
}: {
  item: ChecklistItem;
  onToggle: (done: boolean) => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-2 group">
      <Checkbox checked={item.done} onCheckedChange={(v) => onToggle(!!v)} className="flex-shrink-0" />
      <span className={cn('text-[13px] flex-1', item.done && 'line-through text-muted-foreground')}>{item.text}</span>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-950/40 text-red-500 transition-all flex-shrink-0"
        title="Remove item"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ============ Task Form (New / Edit) ============
interface TaskFormValues {
  title: string;
  description?: string;
  priority: ReminderPriority;
  status: TaskStatus;
  assignedTo?: string;
  dueDate?: string;
  category?: string;
  relatedProject?: string;
}

function TaskForm({
  task, team, projects, onCancel, onSave,
}: {
  task: Task | null;
  team: { id: number; name: string; email: string; dept: string }[];
  projects: { id: string; client: string; title: string }[];
  onCancel: () => void;
  onSave: (v: TaskFormValues) => void;
}) {
  const [title, setTitle] = React.useState(task?.title || '');
  const [description, setDescription] = React.useState(task?.description || '');
  const [priority, setPriority] = React.useState<ReminderPriority>(task?.priority || 'medium');
  const [status, setStatus] = React.useState<TaskStatus>(task?.status || 'todo');
  const [assignedTo, setAssignedTo] = React.useState(task?.assignedTo || 'none');
  const [dueDate, setDueDate] = React.useState(task?.dueDate || '');
  const [category, setCategory] = React.useState(task?.category || 'Operations');
  const [relatedProject, setRelatedProject] = React.useState(task?.relatedProject || 'none');

  const isEdit = !!task;
  const valid = title.trim();

  const handleSubmit = () => {
    if (!valid) {
      toast.error('Title is required');
      return;
    }
    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      status,
      assignedTo: assignedTo === 'none' ? '' : assignedTo,
      dueDate: dueDate || undefined,
      category: category || undefined,
      relatedProject: relatedProject === 'none' ? '' : relatedProject,
    });
  };

  return (
    <Modal
      open
      onOpenChange={(v) => { if (!v) onCancel(); }}
      title={isEdit ? 'Edit Task' : 'New Task'}
      description={isEdit ? 'Update the task details.' : 'Create a new task — assign it, set priority, and add a checklist later.'}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button className="bg-purple-500 hover:bg-purple-600" onClick={handleSubmit} disabled={!valid}>
            {isEdit ? <><Pencil className="h-4 w-4 mr-1" /> Save Changes</> : <><Plus className="h-4 w-4 mr-1" /> Create Task</>}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Title *" className="sm:col-span-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Onboard new print vendor" autoFocus />
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional details" rows={2} />
        </Field>
        <Field label="Status">
          <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {COLUMNS.map((c) => (
                <SelectItem key={c.key} value={c.key}>
                  <span className="inline-flex items-center gap-1.5">
                    <span className={cn('h-2 w-2 rounded-full', c.dot)} />{c.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              {TASK_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Due Date (optional)">
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
        <Field label="Assign To" className="sm:col-span-2">
          <Select value={assignedTo} onValueChange={setAssignedTo}>
            <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Unassigned</SelectItem>
              {team.map((m) => (
                <SelectItem key={m.id} value={m.email}>
                  {m.name} <span className="text-muted-foreground">· {m.dept}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
