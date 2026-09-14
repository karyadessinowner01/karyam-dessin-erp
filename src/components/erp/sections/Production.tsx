'use client';

import * as React from 'react';
import { Plus, Eye, Factory, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useERP } from '@/lib/erp/store';
import { Rs, fD, today, matchSearch } from '@/lib/erp/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  SectionHeader, TableShell, Th, Td, EmptyState, StatusBadge,
  Modal, Field, StatCard,
} from '../ui';
import type { ProductionJob } from '@/lib/erp/types';

const PRODUCTION_STATUSES = ['Pending', 'Running', 'Packing', 'Completed'];

export function Production() {
  const production = useERP((s) => s.production);
  const printJobs = useERP((s) => s.printJobs);
  const team = useERP((s) => s.team);
  const projects = useERP((s) => s.projects);
  const assignProduction = useERP((s) => s.assignProduction);
  const updateProductionStatus = useERP((s) => s.updateProductionStatus);

  const [search, setSearch] = React.useState('');
  const [showAssign, setShowAssign] = React.useState(false);
  const [assignTarget, setAssignTarget] = React.useState<string | null>(null);
  const [view, setView] = React.useState<ProductionJob | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<string>('all');

  const prodTeam = team.filter((m) => m.dept === 'production');
  const filtered = production.filter((p) => {
    if (!matchSearch(`${p.projectId} ${p.client} ${p.product} ${p.assigned} ${p.status}`, search)) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    return true;
  });

  const stats = { pending: 0, running: 0, completed: 0, packing: 0 };
  production.forEach((p) => {
    if (p.status === 'Pending') stats.pending++;
    else if (p.status === 'Running') stats.running++;
    else if (p.status === 'Completed') stats.completed++;
    else if (p.status === 'Packing') stats.packing++;
  });

  return (
    <div>
      <SectionHeader
        title="Production"
        subtitle="Update production status inline — no need to open the project."
        accent="amber"
        actions={
          <Button onClick={() => { setAssignTarget(null); setShowAssign(true); }} className="h-9 bg-slate-900 hover:bg-slate-800">
            <Plus className="h-4 w-4" /> New Job
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Pending" value={stats.pending} tone="warn" />
        <StatCard label="Running" value={stats.running} tone="primary" />
        <StatCard label="Packing" value={stats.packing} />
        <StatCard label="Completed" value={stats.completed} tone="accent" />
      </div>

      {/* ===== Status filter ===== */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Filter by Status:</span>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {PRODUCTION_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {statusFilter !== 'all' && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setStatusFilter('all')}>Clear</Button>
        )}
        <span className="text-xs text-muted-foreground ml-auto">Showing {filtered.length} of {production.length}</span>
      </div>

      <TableShell title="Queue" search={search} onSearch={setSearch}>
        <thead>
          <tr><Th>Project</Th><Th>Client</Th><Th>Item</Th><Th>Assigned</Th><Th>Start</Th><Th>Completion</Th><Th>Status (update inline)</Th><Th>Quick Actions</Th></tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <EmptyState icon={<Factory className="h-8 w-8" />} message="No production jobs. Design se Production mein bhejein." />
          ) : filtered.map((p) => (
            <tr key={p.projectId} className="hover:bg-muted/30">
              <Td><strong>{p.projectId}</strong></Td>
              <Td>{p.client}</Td>
              <Td>{p.product}</Td>
              <Td>{p.assigned}</Td>
              <Td>{fD(p.start)}</Td>
              <Td>{fD(p.completion)}</Td>
              <Td>
                {/* Inline status update dropdown */}
                <Select
                  value={p.status}
                  onValueChange={(newStatus) => {
                    updateProductionStatus(p.projectId, newStatus);
                    toast.success(`${p.projectId} → ${newStatus}`);
                  }}
                >
                  <SelectTrigger className="h-8 w-36 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCTION_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Td>
              <Td>
                <div className="flex items-center gap-1">
                  {p.status !== 'Completed' && (
                    <Button
                      size="sm"
                      className="h-7 bg-emerald-500 hover:bg-emerald-600 text-xs"
                      onClick={() => {
                        updateProductionStatus(p.projectId, 'Completed');
                        toast.success(`${p.projectId} marked complete`);
                      }}
                      title="Mark Completed"
                    >
                      <Check className="h-3.5 w-3.5" /> Done
                    </Button>
                  )}
                  {p.status === 'Pending' && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setAssignTarget(p.projectId); setShowAssign(true); }}>
                      <Plus className="h-3.5 w-3.5" /> Assign
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setView(p)} title="View details">
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </TableShell>

      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="p-3.5 border-b border-border text-sm font-bold">Print Jobs</div>
        <table className="w-full text-sm">
          <thead><tr><Th>Project</Th><Th>Vendor</Th><Th>Sent</Th><Th>Expected</Th><Th>Received</Th><Th>Cost</Th><Th>Status</Th></tr></thead>
          <tbody>
            {printJobs.length === 0 ? (
              <EmptyState message="No print jobs" />
            ) : printJobs.map((j) => (
              <tr key={j.id} className="hover:bg-muted/30">
                <Td>{j.projectId}</Td>
                <Td>{j.vendor}</Td>
                <Td>{fD(j.sent)}</Td>
                <Td>{fD(j.expected)}</Td>
                <Td>{j.received !== '-' ? fD(j.received) : '-'}</Td>
                <Td className="font-semibold">{Rs(j.cost)}</Td>
                <Td><StatusBadge status={j.status} /></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AssignProductionModal
        open={showAssign}
        onOpenChange={setShowAssign}
        projectId={assignTarget}
        prodTeam={prodTeam.map((m) => m.name)}
        projects={projects.map((p) => p.id)}
        onAssign={(pid, assigned, completion) => {
          assignProduction(pid, assigned, completion);
          toast.success(`Production ${assigned === 'Unassigned' ? 'set to Unassigned' : 'assigned: ' + assigned}`);
          setShowAssign(false);
        }}
      />

      {view && (
        <Modal open onOpenChange={() => setView(null)} title={`Production: ${view.projectId}`}
          footer={<>
            <Button variant="outline" onClick={() => setView(null)}>Cancel</Button>
            <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={() => {
              const sel = (document.getElementById('prU') as HTMLSelectElement)?.value;
              if (sel) {
                updateProductionStatus(view.projectId, sel);
                toast.success('Updated');
                setView(null);
              }
            }}>Update</Button>
          </>}
        >
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3.5 rounded-xl border border-border bg-muted/30 mb-3">
            <div><div className="text-[10px] font-bold uppercase text-muted-foreground">Client</div><div className="text-sm font-bold">{view.client}</div></div>
            <div><div className="text-[10px] font-bold uppercase text-muted-foreground">Item</div><div className="text-sm font-bold">{view.product}</div></div>
            <div><div className="text-[10px] font-bold uppercase text-muted-foreground">Assigned</div><div className="text-sm font-bold">{view.assigned}</div></div>
            <div><div className="text-[10px] font-bold uppercase text-muted-foreground">Status</div><div><StatusBadge status={view.status} /></div></div>
            <div><div className="text-[10px] font-bold uppercase text-muted-foreground">Start</div><div className="text-sm font-bold">{fD(view.start)}</div></div>
            <div><div className="text-[10px] font-bold uppercase text-muted-foreground">Completion</div><div className="text-sm font-bold">{fD(view.completion)}</div></div>
          </div>
          <Field label="Update Status">
            <Select defaultValue={view.status} onValueChange={() => {}}>
              <SelectTrigger id="prU"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['Pending', 'Running', 'Packing', 'Completed'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </Modal>
      )}
    </div>
  );
}

function AssignProductionModal({ open, onOpenChange, projectId, prodTeam, projects, onAssign }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string | null;
  prodTeam: string[];
  projects: string[];
  onAssign: (pid: string, assigned: string, completion: string) => void;
}) {
  const [pid, setPid] = React.useState('');
  const [assigned, setAssigned] = React.useState('Unassigned');
  const [completion, setCompletion] = React.useState(today());

  React.useEffect(() => {
    if (open) {
      setPid(projectId || '');
      setAssigned('Unassigned');
      setCompletion(today());
    }
  }, [open, projectId]);

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Assign Production"
      footer={<><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={() => {
          if (!pid) { toast.error('Project ID zaroori'); return; }
          onAssign(pid, assigned, completion);
        }}>Assign</Button></>}
    >
      <Field label="Project">
        {projectId ? (
          <Input value={pid} readOnly />
        ) : (
          <Select value={pid} onValueChange={setPid}>
            <SelectTrigger><SelectValue placeholder="KD-0001" /></SelectTrigger>
            <SelectContent>{projects.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
        )}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Assign To">
          <Select value={assigned} onValueChange={setAssigned}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Unassigned">Unassigned</SelectItem>
              {prodTeam.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Completion"><Input type="date" value={completion} onChange={(e) => setCompletion(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
