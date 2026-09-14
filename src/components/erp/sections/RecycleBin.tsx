'use client';

import * as React from 'react';
import {
  Trash2, RotateCcw, FolderOpen, UserPlus, FileText, Package,
  Coins, TrendingDown, Users, Ticket, AlertTriangle, Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { useERP } from '@/lib/erp/store';
import { Rs, fD, matchSearch } from '@/lib/erp/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { SectionHeader, TableShell, Th, Td, EmptyState, ConfirmDialog } from '../ui';
import type { RecyclableType } from '@/lib/erp/types';

const TYPE_META: Record<RecyclableType, { label: string; icon: any; tone: string }> = {
  project: { label: 'Project', icon: FolderOpen, tone: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  lead: { label: 'Lead', icon: UserPlus, tone: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300' },
  quotation: { label: 'Quotation', icon: FileText, tone: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-emerald-500' },
  item: { label: 'Item', icon: Package, tone: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' },
  payment: { label: 'Payment', icon: Coins, tone: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-emerald-500' },
  expense: { label: 'Expense', icon: TrendingDown, tone: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' },
  team: { label: 'Team Member', icon: Users, tone: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300' },
  ticket: { label: 'Ticket', icon: Ticket, tone: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
};

function describeSnapshot(type: RecyclableType, snap: any): string {
  if (!snap) return '-';
  switch (type) {
    case 'project': return `${snap.client} — ${snap.title} (${Rs(snap.value)})`;
    case 'lead': return `${snap.client} — ${snap.contact} (${snap.requirement})`;
    case 'quotation': return `${snap.client} — ${snap.items?.length || 0} items`;
    case 'item': return `${snap.name} (${snap.category}, stock ${snap.stock})`;
    case 'payment': return `${snap.client} — ${Rs(snap.amount)} (${snap.mode})`;
    case 'expense': return `${snap.category} — ${Rs(snap.amount)}`;
    case 'team': return `${snap.name} (${snap.dept})`;
    case 'ticket': return `${snap.subject}`;
    default: return '-';
  }
}

export function RecycleBin() {
  const recycleBin = useERP((s) => s.recycleBin);
  const restoreFromBin = useERP((s) => s.restoreFromBin);
  const permanentlyDelete = useERP((s) => s.permanentlyDelete);
  const emptyBin = useERP((s) => s.emptyBin);

  const [search, setSearch] = React.useState('');
  const [filterType, setFilterType] = React.useState('all');
  const [confirmEmpty, setConfirmEmpty] = React.useState(false);
  const [confirmPerm, setConfirmPerm] = React.useState<string | null>(null);

  const filtered = recycleBin.filter((e) =>
    (filterType === 'all' || e.type === filterType) &&
    matchSearch(`${e.recycleId} ${e.type} ${e.originalId} ${describeSnapshot(e.type, e.snapshot)}`, search),
  );

  return (
    <div>
      <SectionHeader
        title="Recycle Bin"
        subtitle="Restore deleted records or permanently purge them. (Owner/Admin only.)"
        accent="rose"
        actions={
          recycleBin.length > 0 && (
            <Button variant="destructive" onClick={() => setConfirmEmpty(true)} className="h-9">
              <Trash2 className="h-4 w-4" /> Empty Bin
            </Button>
          )
        }
      />

      {recycleBin.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
          <Trash2 className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Recycle bin is empty.</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Deleted projects, items, leads, quotations, payments, expenses, and team members will appear here for restoration.</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 p-3.5 mb-5 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-bold text-amber-800 dark:text-amber-300">{recycleBin.length} item(s) in Recycle Bin</div>
              <div className="text-amber-700 dark:text-amber-400 mt-0.5">
                Use <strong>Restore</strong> to bring an item back, or <strong>Purge</strong> to delete it forever. <strong>Empty Bin</strong> purges everything.
              </div>
            </div>
          </div>

          <TableShell
            title={`Deleted Records (${recycleBin.length})`}
            search={search}
            onSearch={setSearch}
            toolbar={
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(TYPE_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            }
          >
            <thead>
              <tr><Th>Recycle ID</Th><Th>Type</Th><Th>Original ID</Th><Th>Snapshot</Th><Th>Deleted At</Th><Th>Deleted By</Th><Th>Actions</Th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <EmptyState message="No matching records" />
              ) : filtered.map((e) => {
                const meta = TYPE_META[e.type];
                const Icon = meta.icon;
                return (
                  <tr key={e.recycleId} className="hover:bg-muted/30">
                    <Td className="font-mono text-xs text-muted-foreground">{e.recycleId}</Td>
                    <Td>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${meta.tone}`}>
                        <Icon className="h-3 w-3" /> {meta.label}
                      </span>
                    </Td>
                    <Td className="font-bold">{e.originalId}</Td>
                    <Td className="text-muted-foreground">{describeSnapshot(e.type, e.snapshot)}</Td>
                    <Td>{fD(e.deletedAt)}</Td>
                    <Td className="text-muted-foreground">{e.deletedBy}</Td>
                    <Td>
                      <div className="flex items-center gap-1">
                        <Button size="sm" className="h-7 bg-emerald-500 hover:bg-emerald-600" onClick={() => {
                          restoreFromBin(e.recycleId);
                          toast.success(`Restored ${e.type} ${e.originalId}`);
                        }}>
                          <RotateCcw className="h-3.5 w-3.5" /> Restore
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50" onClick={() => setConfirmPerm(e.recycleId)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
        </>
      )}

      <ConfirmDialog
        open={confirmEmpty}
        onOpenChange={setConfirmEmpty}
        title="Empty Recycle Bin?"
        message="All records in the recycle bin will be permanently deleted. This cannot be undone."
        confirmLabel="Empty Bin"
        onConfirm={() => { emptyBin(); toast.success('Recycle bin emptied'); }}
      />

      <ConfirmDialog
        open={!!confirmPerm}
        onOpenChange={(v) => !v && setConfirmPerm(null)}
        title="Permanently Delete?"
        message="This record will be gone forever."
        confirmLabel="Purge"
        onConfirm={() => { if (confirmPerm) { permanentlyDelete(confirmPerm); toast.error('Purged'); } }}
      />
    </div>
  );
}
