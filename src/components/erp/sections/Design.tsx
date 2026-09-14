'use client';

import * as React from 'react';
import { Plus, Eye, Palette, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useERP } from '@/lib/erp/store';
import { fD, today, matchSearch } from '@/lib/erp/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  SectionHeader, TableShell, Th, Td, EmptyState, StatusBadge,
  Modal, Field, StatCard,
} from '../ui';
import type { DesignAssignment } from '@/lib/erp/types';

const DESIGN_STATUSES = ['Unassigned', 'In Progress', 'Pending Approval', 'Revision', 'Completed'];

export function Design() {
  const designs = useERP((s) => s.designs);
  const team = useERP((s) => s.team);
  const projects = useERP((s) => s.projects);
  const assignDesign = useERP((s) => s.assignDesign);
  const updateDesignStatus = useERP((s) => s.updateDesignStatus);

  const [search, setSearch] = React.useState('');
  const [showAssign, setShowAssign] = React.useState(false);
  const [assignTarget, setAssignTarget] = React.useState<string | null>(null);
  const [view, setView] = React.useState<DesignAssignment | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<string>('all');

  const designers = team.filter((m) => m.dept === 'designer');
  const filtered = designs.filter((d) => {
    if (!matchSearch(`${d.projectId} ${d.client} ${d.product} ${d.designer} ${d.status}`, search)) return false;
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    return true;
  });

  const stats = { unassigned: 0, progress: 0, approval: 0, revision: 0 };
  designs.forEach((d) => {
    if (d.status === 'Unassigned') stats.unassigned++;
    else if (d.status === 'In Progress') stats.progress++;
    else if (d.status === 'Pending Approval') stats.approval++;
    else if (d.status === 'Revision') stats.revision++;
  });

  return (
    <div>
      <SectionHeader
        title="Design Assignments"
        subtitle="Update your design status directly from this list — no need to open the project."
        accent="emerald"
        actions={
          <Button onClick={() => { setAssignTarget(null); setShowAssign(true); }} className="h-9 bg-slate-900 hover:bg-slate-800">
            <Plus className="h-4 w-4" /> Assign
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Unassigned" value={stats.unassigned} tone="warn" />
        <StatCard label="In Progress" value={stats.progress} tone="primary" />
        <StatCard label="Pending Approval" value={stats.approval} />
        <StatCard label="Revision" value={stats.revision} tone="danger" />
      </div>

      {/* ===== Status filter ===== */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Filter by Status:</span>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {DESIGN_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {statusFilter !== 'all' && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setStatusFilter('all')}>Clear</Button>
        )}
        <span className="text-xs text-muted-foreground ml-auto">Showing {filtered.length} of {designs.length}</span>
      </div>

      <TableShell title="All Assignments" search={search} onSearch={setSearch}>
        <thead>
          <tr><Th>Project</Th><Th>Client</Th><Th>Item</Th><Th>Designer</Th><Th>Due</Th><Th>Status (update inline)</Th><Th>Quick Actions</Th></tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <EmptyState icon={<Palette className="h-8 w-8" />} message="No design assignments. Projects ko Marketing se Design mein bhejein." />
          ) : filtered.map((d) => (
            <tr key={d.projectId} className="hover:bg-muted/30">
              <Td><strong>{d.projectId}</strong></Td>
              <Td>{d.client}</Td>
              <Td>{d.product}</Td>
              <Td>{d.designer}</Td>
              <Td>{fD(d.due)}</Td>
              <Td>
                {/* Inline status update dropdown — no need to open project */}
                <Select
                  value={d.status}
                  onValueChange={(newStatus) => {
                    updateDesignStatus(d.projectId, newStatus);
                    toast.success(`${d.projectId} → ${newStatus}`);
                  }}
                >
                  <SelectTrigger className="h-8 w-44 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DESIGN_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Td>
              <Td>
                <div className="flex items-center gap-1">
                  {d.status !== 'Completed' && (
                    <Button
                      size="sm"
                      className="h-7 bg-emerald-500 hover:bg-emerald-600 text-xs"
                      onClick={() => {
                        updateDesignStatus(d.projectId, 'Completed');
                        toast.success(`${d.projectId} marked complete`);
                      }}
                      title="Mark Completed"
                    >
                      <Check className="h-3.5 w-3.5" /> Done
                    </Button>
                  )}
                  {d.status === 'Unassigned' && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setAssignTarget(d.projectId); setShowAssign(true); }}>
                      <Plus className="h-3.5 w-3.5" /> Assign
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setView(d)} title="View details">
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </TableShell>

      <AssignDesignModal
        open={showAssign}
        onOpenChange={setShowAssign}
        projectId={assignTarget}
        designers={designers.map((d) => d.name)}
        projects={projects.map((p) => p.id)}
        onAssign={(projectId, product, designer, due) => {
          assignDesign(projectId, product, designer, due);
          toast.success(`Designer ${designer === 'Unassigned' ? 'set to Unassigned' : 'assigned: ' + designer}`);
          setShowAssign(false);
        }}
      />

      {view && (
        <Modal open onOpenChange={() => setView(null)} title={`Design: ${view.projectId}`}
          footer={<>
            <Button variant="outline" onClick={() => setView(null)}>Cancel</Button>
            <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={() => {
              const sel = (document.getElementById('dsU') as HTMLSelectElement)?.value;
              if (sel) {
                updateDesignStatus(view.projectId, sel);
                toast.success('Status updated');
                setView(null);
              }
            }}>Update</Button>
          </>}
        >
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3.5 rounded-xl border border-border bg-muted/30 mb-3">
            <div><div className="text-[10px] font-bold uppercase text-muted-foreground">Client</div><div className="text-sm font-bold">{view.client}</div></div>
            <div><div className="text-[10px] font-bold uppercase text-muted-foreground">Item</div><div className="text-sm font-bold">{view.product}</div></div>
            <div><div className="text-[10px] font-bold uppercase text-muted-foreground">Designer</div><div className="text-sm font-bold">{view.designer}</div></div>
            <div><div className="text-[10px] font-bold uppercase text-muted-foreground">Status</div><div><StatusBadge status={view.status} /></div></div>
            <div><div className="text-[10px] font-bold uppercase text-muted-foreground">Due</div><div className="text-sm font-bold">{fD(view.due)}</div></div>
          </div>
          <Field label="Update Status">
            <Select defaultValue={view.status} onValueChange={() => {}}>
              <SelectTrigger id="dsU"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['Unassigned', 'In Progress', 'Pending Approval', 'Revision', 'Completed'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </Modal>
      )}
    </div>
  );
}

function AssignDesignModal({ open, onOpenChange, projectId, designers, projects, onAssign }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string | null;
  designers: string[];
  projects: string[];
  onAssign: (projectId: string, product: string, designer: string, due: string) => void;
}) {
  const [pid, setPid] = React.useState('');
  const [product, setProduct] = React.useState('');
  const [designer, setDesigner] = React.useState('Unassigned');
  const [due, setDue] = React.useState(today());

  React.useEffect(() => {
    if (open) {
      setPid(projectId || '');
      setDesigner('Unassigned');
      setDue(today());
    }
  }, [open, projectId]);

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Assign Designer"
      footer={<><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={() => {
          if (!pid) { toast.error('Project ID zaroori'); return; }
          onAssign(pid, product || '-', designer, due);
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
      <Field label="Item"><Input value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Visual Aid" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Designer">
          <Select value={designer} onValueChange={setDesigner}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Unassigned">Unassigned</SelectItem>
              {designers.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Due"><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
