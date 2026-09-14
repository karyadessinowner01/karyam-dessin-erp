'use client';

import * as React from 'react';
import { Plus, Truck, MapPin, Check, Package } from 'lucide-react';
import { toast } from 'sonner';
import { useERP } from '@/lib/erp/store';
import { COURIERS } from '@/lib/erp/constants';
import { fD, today, matchSearch } from '@/lib/erp/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  SectionHeader, TableShell, Th, Td, EmptyState, StatusBadge,
  Modal, Field, StatCard,
} from '../ui';
import type { Dispatch as DispatchT } from '@/lib/erp/types';

const DISPATCH_STATUSES = ['Ready', 'Packing', 'In Transit', 'Delivered'];
const DISPATCH_FILTER_STATUSES = ['Packing', 'In Transit', 'Delivered'];

export function DispatchSection() {
  const dispatches = useERP((s) => s.dispatches);
  const projects = useERP((s) => s.projects);
  const createDispatch = useERP((s) => s.createDispatch);
  const dispatchItem = useERP((s) => s.dispatchItem);
  const updateDispatchStatus = useERP((s) => s.updateDispatchStatus);

  const [search, setSearch] = React.useState('');
  const [showNew, setShowNew] = React.useState(false);
  const [dispTarget, setDispTarget] = React.useState<DispatchT | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<string>('all');

  const ready = dispatches.filter((d) => d.status === 'Ready');
  const transit = dispatches.filter((d) => d.status === 'In Transit');
  const del = dispatches.filter((d) => d.status === 'Delivered');

  const othersBase = dispatches.filter((d) => d.status !== 'Ready');
  const others = othersBase.filter((d) => {
    if (!matchSearch(`${d.projectId} ${d.client} ${d.courier || ''} ${d.tracking || ''} ${d.status}`, search)) return false;
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    return true;
  });

  return (
    <div>
      <SectionHeader
        title="Dispatch"
        subtitle="Update dispatch status inline — Packing → Ready → In Transit → Delivered."
        accent="amber"
        actions={
          <Button onClick={() => setShowNew(true)} className="h-9 bg-slate-900 hover:bg-slate-800">
            <Plus className="h-4 w-4" /> New
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Packing" value={dispatches.filter((d) => d.status === 'Packing').length} tone="warn" icon={<Package className="h-4 w-4" />} />
        <StatCard label="Ready" value={ready.length} tone="primary" icon={<Package className="h-4 w-4" />} />
        <StatCard label="In Transit" value={transit.length} icon={<Truck className="h-4 w-4" />} />
        <StatCard label="Delivered" value={del.length} tone="accent" icon={<Check className="h-4 w-4" />} />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm mb-5">
        <div className="p-3.5 border-b border-border text-sm font-bold">Ready to Dispatch</div>
        <table className="w-full text-sm">
          <thead><tr><Th>Project</Th><Th>Client</Th><Th>Address</Th><Th>Packed By</Th><Th>Date</Th><Th>Status (update inline)</Th><Th>Action</Th></tr></thead>
          <tbody>
            {ready.length === 0 ? (
              <EmptyState message="Nothing ready" />
            ) : ready.map((d) => (
              <tr key={d.id} className="hover:bg-muted/30">
                <Td><strong>{d.projectId}</strong></Td>
                <Td>{d.client}</Td>
                <Td>{d.address}</Td>
                <Td>{d.packedBy}</Td>
                <Td>{fD(d.date)}</Td>
                <Td>
                  <Select
                    value={d.status}
                    onValueChange={(newStatus) => {
                      updateDispatchStatus(d.projectId, newStatus);
                      toast.success(`${d.projectId} → ${newStatus}`);
                    }}
                  >
                    <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DISPATCH_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Td>
                <Td>
                  <Button size="sm" className="h-7 bg-emerald-500 hover:bg-emerald-600" onClick={() => setDispTarget(d)}>
                    <Truck className="h-3.5 w-3.5" /> Dispatch
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ===== Status filter ===== */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Filter by Status:</span>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {DISPATCH_FILTER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {statusFilter !== 'all' && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setStatusFilter('all')}>Clear</Button>
        )}
        <span className="text-xs text-muted-foreground ml-auto">Showing {others.length} of {othersBase.length}</span>
      </div>

      <TableShell title="In Transit / Delivered" search={search} onSearch={setSearch}>
        <thead>
          <tr><Th>Project</Th><Th>Client</Th><Th>Courier</Th><Th>Tracking</Th><Th>Dispatched</Th><Th>Expected</Th><Th>Status (update inline)</Th><Th>Quick</Th></tr>
        </thead>
        <tbody>
          {others.length === 0 ? (
            <EmptyState message="No dispatches" />
          ) : others.map((d) => (
            <tr key={d.id} className="hover:bg-muted/30">
              <Td><strong>{d.projectId}</strong></Td>
              <Td>{d.client}</Td>
              <Td>{d.courier || '-'}</Td>
              <Td className="font-mono text-xs">{d.tracking || '-'}</Td>
              <Td>{fD(d.dispatched || '-')}</Td>
              <Td>{fD(d.expected || '-')}</Td>
              <Td>
                <Select
                  value={d.status}
                  onValueChange={(newStatus) => {
                    updateDispatchStatus(d.projectId, newStatus);
                    toast.success(`${d.projectId} → ${newStatus}`);
                  }}
                >
                  <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DISPATCH_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Td>
              <Td>
                <div className="flex items-center gap-1">
                  {d.status === 'In Transit' && (
                    <Button
                      size="sm"
                      className="h-7 bg-emerald-500 hover:bg-emerald-600 text-xs"
                      onClick={() => {
                        updateDispatchStatus(d.projectId, 'Delivered');
                        toast.success(`${d.projectId} → Delivered`);
                      }}
                      title="Mark Delivered"
                    >
                      <Check className="h-3.5 w-3.5" /> Delivered
                    </Button>
                  )}
                  {d.status === 'In Transit' && (
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => toast.info(`Tracking: ${d.tracking}`)} title="Track">
                      <MapPin className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {d.status === 'Delivered' && (
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => toast.success('Delivered')} title="Delivered">
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </TableShell>

      {/* New Dispatch */}
      <NewDispatchModal open={showNew} onOpenChange={setShowNew} projects={projects.filter((p) => p.stage === 'production' || p.stage === 'completed')} onCreate={(pid) => {
        createDispatch(pid);
        toast.success('Dispatch entry created');
        setShowNew(false);
      }} />

      {/* Dispatch Item */}
      {dispTarget && (
        <DispatchItemModal dispatch={dispTarget} onClose={() => setDispTarget(null)} onDispatch={(courier, tracking, expected) => {
          if (!tracking.trim()) { toast.error('Tracking zaroori'); return; }
          dispatchItem(dispTarget.projectId, courier, tracking, expected);
          toast.success('Dispatched!');
          setDispTarget(null);
        }} />
      )}
    </div>
  );
}

function NewDispatchModal({ open, onOpenChange, projects, onCreate }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projects: { id: string; client: string }[];
  onCreate: (pid: string) => void;
}) {
  const [pid, setPid] = React.useState('');
  React.useEffect(() => { if (open && projects.length) setPid(projects[0].id); }, [open, projects]);
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="New Dispatch"
      footer={<><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={() => { if (!pid) { toast.error('No eligible projects'); return; } onCreate(pid); }}>Create</Button></>}
    >
      {projects.length === 0 ? (
        <p className="text-sm text-muted-foreground">No eligible projects (Production / Completed stage).</p>
      ) : (
        <Field label="Project">
          <Select value={pid} onValueChange={setPid}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.id} — {p.client}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      )}
    </Modal>
  );
}

function DispatchItemModal({ dispatch, onClose, onDispatch }: {
  dispatch: DispatchT;
  onClose: () => void;
  onDispatch: (courier: string, tracking: string, expected: string) => void;
}) {
  const [courier, setCourier] = React.useState('DTDC');
  const [tracking, setTracking] = React.useState('');
  const [expected, setExpected] = React.useState(today());
  return (
    <Modal open onOpenChange={onClose} title={`Dispatch: ${dispatch.projectId}`}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={() => onDispatch(courier, tracking, expected)}>Dispatch</Button></>}
    >
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3.5 rounded-xl border border-border bg-muted/30 mb-3">
        <div><div className="text-[10px] font-bold uppercase text-muted-foreground">Client</div><div className="text-sm font-bold">{dispatch.client}</div></div>
        <div><div className="text-[10px] font-bold uppercase text-muted-foreground">Address</div><div className="text-sm font-bold">{dispatch.address}</div></div>
        <div><div className="text-[10px] font-bold uppercase text-muted-foreground">Packed By</div><div className="text-sm font-bold">{dispatch.packedBy}</div></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Courier">
          <Select value={courier} onValueChange={setCourier}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{COURIERS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Tracking"><Input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="D123456789" /></Field>
      </div>
      <Field label="Expected"><Input type="date" value={expected} onChange={(e) => setExpected(e.target.value)} /></Field>
    </Modal>
  );
}
