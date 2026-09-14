'use client';

import * as React from 'react';
import {
  Plus, StickyNote, Pin, PinOff, Pencil, Trash2, X, Tag, Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { useERP } from '@/lib/erp/store';
import { NOTE_COLORS } from '@/lib/erp/constants';
import { fD, today, matchSearch } from '@/lib/erp/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  SectionHeader, EmptyState, Modal, Field, StatCard,
  FilterChip, FilterBar,
} from '../ui';
import type { Note, NoteColor } from '@/lib/erp/types';

function colorClasses(c: NoteColor): { bg: string; border: string } {
  const found = NOTE_COLORS.find((n) => n.key === c);
  return { bg: found?.bg || NOTE_COLORS[0].bg, border: found?.border || NOTE_COLORS[0].border };
}

export function Notes() {
  const notes = useERP((s) => s.notes || []);
  const createNote = useERP((s) => s.createNote);
  const updateNote = useERP((s) => s.updateNote);
  const deleteNote = useERP((s) => s.deleteNote);
  const togglePinNote = useERP((s) => s.togglePinNote);

  const [search, setSearch] = React.useState('');
  const [colorFilter, setColorFilter] = React.useState<NoteColor | 'all'>('all');
  const [tagFilter, setTagFilter] = React.useState<string>('all');
  const [showNew, setShowNew] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<Note | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Note | null>(null);

  // Collect all unique tags across notes
  const allTags = React.useMemo(() => {
    const set = new Set<string>();
    notes.forEach((n) => n.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [notes]);

  // Filtered + sorted (pinned first, then by updatedAt desc)
  const filtered = React.useMemo(() => {
    let list = notes;
    if (colorFilter !== 'all') list = list.filter((n) => n.color === colorFilter);
    if (tagFilter !== 'all') list = list.filter((n) => n.tags.includes(tagFilter));
    if (search.trim()) {
      list = list.filter((n) =>
        matchSearch(`${n.title} ${n.content} ${n.tags.join(' ')}`, search),
      );
    }
    return [...list].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return (b.updatedAt || '').localeCompare(a.updatedAt || '');
    });
  }, [notes, colorFilter, tagFilter, search]);

  const stats = React.useMemo(() => ({
    total: notes.length,
    pinned: notes.filter((n) => n.pinned).length,
    tags: allTags.length,
  }), [notes, allTags]);

  const handleSave = (data: NoteFormValues) => {
    const tags = data.tags.split(',').map((t) => t.trim()).filter(Boolean);
    if (editTarget) {
      updateNote(editTarget.id, {
        title: data.title,
        content: data.content,
        color: data.color,
        tags,
      });
      toast.success('Note updated');
      setEditTarget(null);
    } else {
      createNote({ title: data.title, content: data.content, color: data.color, tags });
      toast.success('Note created');
      setShowNew(false);
    }
  };

  return (
    <div>
      <SectionHeader
        title="Notes"
        subtitle="Jot down ideas, contacts, memos, and references — pinned notes stay on top."
        accent="amber"
        actions={
          <Button size="sm" className="h-9 bg-amber-500 hover:bg-amber-600" onClick={() => setShowNew(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Note
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard label="Total Notes" value={stats.total} tone="primary" icon={<StickyNote className="h-5 w-5" />} />
        <StatCard label="Pinned" value={stats.pinned} tone={stats.pinned > 0 ? 'warn' : 'default'} icon={<Pin className="h-5 w-5" />} />
        <StatCard label="Tags" value={stats.tags} tone="default" icon={<Tag className="h-5 w-5" />} />
      </div>

      {/* Filters */}
      <FilterBar
        label="Filter"
        onClear={() => { setSearch(''); setColorFilter('all'); setTagFilter('all'); }}
        showClear={search !== '' || colorFilter !== 'all' || tagFilter !== 'all'}
      >
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notes..." className="h-8 w-48 text-xs pl-7" />
        </div>
        <span className="mx-1 h-5 w-px bg-border" />
        <FilterChip label="All colors" active={colorFilter === 'all'} onClick={() => setColorFilter('all')} />
        {NOTE_COLORS.map((c) => (
          <FilterChip
            key={c.key}
            label={c.label}
            active={colorFilter === c.key}
            onClick={() => setColorFilter(c.key)}
            color={c.key === 'slate' ? '#94a3b8' : undefined}
          />
        ))}
        {allTags.length > 0 && (
          <>
            <span className="mx-1 h-5 w-px bg-border" />
            <FilterChip label="All tags" active={tagFilter === 'all'} onClick={() => setTagFilter('all')} />
            {allTags.map((t) => (
              <FilterChip key={t} label={`#${t}`} active={tagFilter === t} onClick={() => setTagFilter(t)} />
            ))}
          </>
        )}
      </FilterBar>

      {/* Notes grid */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 py-16 text-center">
          <StickyNote className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {search || colorFilter !== 'all' || tagFilter !== 'all'
              ? 'No notes match your filters.'
              : 'No notes yet. Click “New Note” to create one.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((n) => (
            <NoteCard
              key={n.id}
              note={n}
              onClick={() => setEditTarget(n)}
              onTogglePin={() => togglePinNote(n.id)}
              onDelete={() => setDeleteTarget(n)}
            />
          ))}
        </div>
      )}

      {/* New / Edit modal */}
      {(showNew || editTarget) && (
        <NoteForm
          note={editTarget}
          onCancel={() => { setShowNew(false); setEditTarget(null); }}
          onSave={handleSave}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <Modal
          open
          onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
          title="Delete note?"
          size="sm"
          footer={
            <>
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button
                className="bg-red-500 hover:bg-red-600"
                onClick={() => {
                  deleteNote(deleteTarget.id);
                  toast.success('Note deleted');
                  setDeleteTarget(null);
                }}
              >
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
            </>
          }
        >
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 p-4 text-sm text-amber-900 dark:text-amber-200">
            This will permanently delete <strong>“{deleteTarget.title}”</strong>. This cannot be undone.
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============ Note Card ============
function NoteCard({
  note, onClick, onTogglePin, onDelete,
}: {
  note: Note;
  onClick: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
}) {
  const { bg, border } = colorClasses(note.color);
  return (
    <div className={cn('group rounded-xl border-2 p-4 shadow-sm hover:shadow-md transition-all relative flex flex-col', bg, border)}>
      {/* Pin + actions */}
      <div className="flex items-start justify-between mb-1.5">
        <button
          onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
          title={note.pinned ? 'Unpin' : 'Pin to top'}
          className={cn(
            'p-1 rounded-md transition-all',
            note.pinned
              ? 'text-amber-600 bg-amber-100 dark:bg-amber-950/60'
              : 'text-muted-foreground/50 opacity-0 group-hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10',
          )}
        >
          <Pin className={cn('h-3.5 w-3.5', note.pinned && 'fill-current')} />
        </button>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            title="Edit"
            className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title="Delete"
            className="p-1 rounded-md hover:bg-red-100 dark:hover:bg-red-950/40 text-muted-foreground hover:text-red-500"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Clickable content area */}
      <div onClick={onClick} className="flex-1 cursor-pointer">
        <div className="flex items-center gap-1.5 mb-1.5">
          {note.pinned && <Pin className="h-3 w-3 text-amber-600 fill-current flex-shrink-0" />}
          <h3 className="text-[14px] font-black leading-tight line-clamp-2">{note.title}</h3>
        </div>
        <p className="text-[12px] text-foreground/80 whitespace-pre-wrap line-clamp-[8] leading-relaxed">{note.content}</p>
      </div>

      {/* Tags + date footer */}
      <div className="mt-3 pt-2 border-t border-black/5 dark:border-white/10">
        {note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {note.tags.map((t) => (
              <span key={t} className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-foreground/70">
                #{t}
              </span>
            ))}
          </div>
        )}
        <div className="text-[9px] text-foreground/50 font-semibold">
          Updated {fD(note.updatedAt)} · by {note.createdBy}
        </div>
      </div>
    </div>
  );
}

// ============ Note Form (New / Edit) ============
interface NoteFormValues {
  title: string;
  content: string;
  color: NoteColor;
  tags: string; // comma-separated in the form, split on save
}

function NoteForm({
  note, onCancel, onSave,
}: {
  note: Note | null;
  onCancel: () => void;
  onSave: (v: NoteFormValues) => void;
}) {
  const [title, setTitle] = React.useState(note?.title || '');
  const [content, setContent] = React.useState(note?.content || '');
  const [color, setColor] = React.useState<NoteColor>(note?.color || 'yellow');
  const [tags, setTags] = React.useState(note?.tags.join(', ') || '');

  const isEdit = !!note;
  const valid = title.trim() && content.trim();

  const handleSubmit = () => {
    if (!valid) {
      toast.error('Title and content are required');
      return;
    }
    onSave({ title: title.trim(), content, color, tags });
  };

  const { bg, border } = colorClasses(color);

  return (
    <Modal
      open
      onOpenChange={(v) => { if (!v) onCancel(); }}
      title={isEdit ? 'Edit Note' : 'New Note'}
      description={isEdit ? 'Update the note.' : 'Create a sticky note — pick a color, add tags.'}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button className="bg-amber-500 hover:bg-amber-600" onClick={handleSubmit} disabled={!valid}>
            {isEdit ? <><Pencil className="h-4 w-4 mr-1" /> Save Changes</> : <><Plus className="h-4 w-4 mr-1" /> Create Note</>}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {/* Live preview */}
        <div className={cn('rounded-xl border-2 p-3', bg, border)}>
          <div className="text-[14px] font-black mb-1">{title || 'Note title...'}</div>
          <p className="text-[12px] text-foreground/80 whitespace-pre-wrap line-clamp-4">{content || 'Note content preview...'}</p>
        </div>

        <Field label="Title *">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Vendor rate benchmarks" autoFocus />
        </Field>
        <Field label="Content *">
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write your note here... (line breaks are preserved)" rows={6} className="resize-y" />
        </Field>

        {/* Color picker */}
        <Field label="Color">
          <div className="flex flex-wrap gap-2">
            {NOTE_COLORS.map((c) => (
              <button
                key={c.key}
                onClick={() => setColor(c.key)}
                title={c.label}
                className={cn(
                  'h-8 w-8 rounded-lg border-2 transition-all',
                  c.bg, c.border,
                  color === c.key ? 'ring-2 ring-offset-2 ring-foreground scale-110' : 'hover:scale-105',
                )}
              />
            ))}
          </div>
        </Field>

        <Field label="Tags (comma-separated, optional)">
          <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. procurement, printing, vendor" />
        </Field>
      </div>
    </Modal>
  );
}
