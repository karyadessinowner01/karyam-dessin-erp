'use client';

import * as React from 'react';
import {
  Plus, Eye, Ban, Undo2, Trash2, ArrowRight, Check, ArrowLeft,
  FileText, Upload, Package as PackageIcon, ChevronRight, FolderOpen,
  Megaphone, Palette, Factory, UserCog, CheckCircle2,
  Send, GitBranch, MessageSquare, Clock, User as UserIcon, IndianRupee, Receipt, type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useERP, mapRoleToDept } from '@/lib/erp/store';
import { STAGES, STAGE_ORDER, STAGE_LABELS, PAYMENT_TYPES, PAYMENT_MODES } from '@/lib/erp/constants';
import { Rs, fD, today, matchSearch } from '@/lib/erp/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  SectionHeader, TableShell, Th, Td, EmptyState, StatusBadge,
  Modal, ConfirmDialog, Field, StatCard,
} from '../ui';
import { cn } from '@/lib/utils';
import type { Project, Stage, DeptKey, DeptStatus, DeptStatusEntry, HandoffEvent } from '@/lib/erp/types';

const STAGE_ICONS: Record<string, LucideIcon> = {
  Megaphone, Palette, Factory, UserCog, CheckCircle2,
};

const DEPT_ORDER: DeptKey[] = ['marketing', 'designing', 'production', 'management'];
const DEPT_LABELS_LOCAL: Record<DeptKey, string> = {
  marketing: 'Marketing',
  designing: 'Designing',
  production: 'Production',
  management: 'Management',
};
const DEPT_ICONS: Record<DeptKey, LucideIcon> = {
  marketing: Megaphone,
  designing: Palette,
  production: Factory,
  management: UserCog,
};
const DEPT_STATUS_STYLE: Record<DeptStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  in_progress: { label: 'In Progress', className: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-emerald-500' },
  completed: { label: 'Completed', className: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-emerald-500' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' },
};

function FlowVisual({ stage }: { stage: Stage }) {
  const idx = STAGE_ORDER[stage] ?? 0;
  const cancelled = stage === 'cancelled';
  return (
    <div className="flex items-center gap-1 mb-5 flex-wrap">
      {STAGES.map((s, i) => {
        const Icon = STAGE_ICONS[s.icon] || Megaphone;
        const cls = cancelled
          ? 'bg-muted text-muted-foreground opacity-50'
          : i < idx
            ? 'bg-emerald-500 text-white'
            : i === idx
              ? 'bg-blue-800 dark:bg-blue-100 text-white dark:text-blue-900 ring-2 ring-emerald-500 ring-offset-2'
              : 'bg-muted text-muted-foreground';
        return (
          <React.Fragment key={s.key}>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${cls}`}>
              <Icon className="h-3.5 w-3.5" /> {s.label}
            </div>
            {i < STAGES.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground/50" />}
          </React.Fragment>
        );
      })}
      {cancelled && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500 text-white">
          <Ban className="h-3.5 w-3.5" /> Cancelled
        </div>
      )}
    </div>
  );
}

function DetailGrid({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3.5 rounded-xl border border-border bg-muted/30 mb-4">
      {items.map((it, i) => (
        <div key={i}>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{it.label}</div>
          <div className="text-sm font-bold mt-0.5">{it.value}</div>
        </div>
      ))}
    </div>
  );
}

/** Compact 4-dot department progress indicator for the projects list */
function DeptMiniStatus({ project }: { project: Project }) {
  if (project.cancelled) {
    return <span className="text-[10px] text-muted-foreground italic">—</span>;
  }
  const ds = project.departmentStatus;
  return (
    <div className="flex items-center gap-1" title="Marketing · Design · Production · Management">
      {DEPT_ORDER.map((dept) => {
        const status = ds?.[dept]?.status || 'pending';
        const dotClass =
          status === 'completed' ? 'bg-emerald-500'
          : status === 'in_progress' ? 'bg-blue-500'
          : status === 'rejected' ? 'bg-red-500'
          : 'bg-slate-300 dark:bg-slate-700';
        return (
          <div
            key={dept}
            className={cn('h-2 w-2 rounded-full', dotClass)}
            title={`${DEPT_LABELS_LOCAL[dept]}: ${DEPT_STATUS_STYLE[status].label}`}
          />
        );
      })}
    </div>
  );
}

export function Projects() {
  const projects = useERP((s) => s.projects);
  const items = useERP((s) => s.items);
  const currentUser = useERP((s) => s.currentUser);
  const cancelProject = useERP((s) => s.cancelProject);
  const refundProject = useERP((s) => s.refundProject);
  const deleteProject = useERP((s) => s.deleteProject);
  const flowTo = useERP((s) => s.flowTo);
  const addProjectProduct = useERP((s) => s.addProjectProduct);
  const addProjectFile = useERP((s) => s.addProjectFile);

  const isOwner = currentUser?.role === 'owner';
  const isMgmt = currentUser?.role === 'management';
  const isFinance = currentUser?.role === 'finance';
  const isOM = isOwner || isMgmt;
  // Finance-related info (value, advance, due, payments) only for owner / management / finance
  const canSeeFinance = isOwner || isMgmt || isFinance;
  const canCreate = isOwner || isMgmt || currentUser?.role === 'marketing';

  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [view, setView] = React.useState<Project | null>(null);
  const [showNew, setShowNew] = React.useState(false);
  const [showAddProd, setShowAddProd] = React.useState(false);
  const [showFile, setShowFile] = React.useState(false);
  const [showInvoice, setShowInvoice] = React.useState(false);
  const [confirmCancel, setConfirmCancel] = React.useState<Project | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<Project | null>(null);
  const [refundTarget, setRefundTarget] = React.useState<Project | null>(null);

  // ===== Status counts for the summary boxes =====
  const activeCount = projects.filter((p) => !p.cancelled && p.stage !== 'completed').length;
  const completedCount = projects.filter((p) => !p.cancelled && p.stage === 'completed').length;
  const cancelledCount = projects.filter((p) => p.cancelled).length;
  const stageCounts: Record<string, number> = {};
  STAGES.forEach((s) => { stageCounts[s.key] = 0; });
  projects.forEach((p) => {
    if (!p.cancelled && stageCounts[p.stage] !== undefined) stageCounts[p.stage]++;
  });

  const filtered = projects.filter((p) => {
    if (!matchSearch(`${p.id} ${p.client} ${p.title} ${p.stage}`, search)) return false;
    if (statusFilter !== 'all') {
      if (statusFilter === 'cancelled') { if (!p.cancelled) return false; }
      else if (statusFilter === 'completed') { if (p.cancelled || p.stage !== 'completed') return false; }
      else { if (p.cancelled || p.stage !== statusFilter) return false; }
    }
    return true;
  });

  return (
    <div>
      <SectionHeader
        title="Projects"
        accent="emerald"
        actions={canCreate && (
          <Button onClick={() => setShowNew(true)} className="h-9 bg-slate-900 hover:bg-slate-800">
            <Plus className="h-4 w-4" /> New Project
          </Button>
        )}
      />

      {/* ===== Status count boxes ===== */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        <StatCard label="Active" value={activeCount} tone="primary" icon={<FolderOpen className="h-4 w-4" />} />
        {STAGES.map((s) => (
          <StatCard key={s.key} label={s.label} value={stageCounts[s.key] || 0} />
        ))}
        <StatCard label="Completed" value={completedCount} tone="accent" icon={<Check className="h-4 w-4" />} />
        <StatCard label="Cancelled" value={cancelledCount} tone="danger" icon={<Ban className="h-4 w-4" />} />
      </div>

      {/* ===== Status filter ===== */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Filter by Status:</span>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STAGES.map((s) => (
              <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
            ))}
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        {statusFilter !== 'all' && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setStatusFilter('all')}>Clear</Button>
        )}
        <span className="text-xs text-muted-foreground ml-auto">Showing {filtered.length} of {projects.length}</span>
      </div>


      <TableShell
        title={`All Projects (${projects.length})`}
        search={search}
        onSearch={setSearch}
      >
        <thead>
          <tr>
            <Th>ID</Th><Th>Client</Th><Th>Title</Th>{canSeeFinance && <Th>Value</Th>}
            <Th>Stage</Th><Th>Dept Progress</Th><Th>Delivery</Th><Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <EmptyState icon={<FolderOpen className="h-8 w-8" />} message="No projects yet. Marketing team se start karein." />
          ) : filtered.map((p) => {
            const stageLabel = p.cancelled ? 'Cancelled' : STAGE_LABELS[p.stage] || p.stage;
            return (
              <tr key={p.id} className={`hover:bg-muted/30 ${p.cancelled ? 'opacity-40 line-through' : ''}`}>
                <Td><strong>{p.id}</strong></Td>
                <Td>{p.client}</Td>
                <Td>{p.title}</Td>
                {canSeeFinance && <Td className="font-semibold">{Rs(p.value)}</Td>}
                <Td><StatusBadge status={stageLabel} /></Td>
                <Td>
                  <DeptMiniStatus project={p} />
                </Td>
                <Td>{fD(p.delivery)}</Td>
                <Td>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setView(p)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    {isOwner && !p.cancelled && p.stage !== 'completed' && (
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50" onClick={() => setConfirmCancel(p)} title="Cancel">
                        <Ban className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {isOwner && p.cancelled && !p.refunded && p.advance > 0 && (
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-purple-600 hover:bg-purple-50" onClick={() => setRefundTarget(p)} title="Refund">
                        <Undo2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {isOwner && (
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50" onClick={() => setConfirmDelete(p)} title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </TableShell>

      {/* ===== Project detail view ===== */}
      {view && (
        <ProjectDetailModal
          project={view}
          onClose={() => setView(null)}
          onAddProd={() => setShowAddProd(true)}
          onAddFile={() => setShowFile(true)}
          onInvoice={() => setShowInvoice(true)}
          onFlow={flowTo}
          onCancel={(p) => { setView(null); setConfirmCancel(p); }}
          onRefund={(p) => { setView(null); setRefundTarget(p); }}
          onDelete={(p) => { setView(null); setConfirmDelete(p); }}
        />
      )}

      {/* ===== New Project ===== */}
      <NewProjectModal open={showNew} onOpenChange={setShowNew} items={items} onCreate={(data) => {
        const id = useERP.getState().createProject(data);
        toast.success(`Project ${id} created!`);
        setShowNew(false);
      }} />

      {/* ===== Add Product ===== */}
      {view && (
        <AddProductModal
          open={showAddProd}
          onOpenChange={setShowAddProd}
          items={items}
          onAdd={(p) => {
            addProjectProduct(view.id, p);
            toast.success('Item added');
            setShowAddProd(false);
            setView({ ...view, products: [...view.products, { ...p, status: 'Pending' }] });
          }}
        />
      )}

      {/* ===== Upload File ===== */}
      {view && (
        <UploadFileModal open={showFile} onOpenChange={setShowFile} onUpload={(name) => {
          addProjectFile(view.id, name);
          toast.success('Uploaded');
          setShowFile(false);
          setView({ ...view, files: [...view.files, { name, date: today(), by: currentUser?.name || 'Unknown' }] });
        }} />
      )}

      {/* ===== Invoice ===== */}
      {view && (
        <InvoiceModal open={showInvoice} onOpenChange={setShowInvoice} project={view} />
      )}

      {/* ===== Confirm dialogs ===== */}
      <ConfirmDialog
        open={!!confirmCancel}
        onOpenChange={(v) => !v && setConfirmCancel(null)}
        title={`Cancel ${confirmCancel?.id}?`}
        message={<div><p className="font-bold">{confirmCancel?.client} — {confirmCancel?.title}</p><p className="mt-1">Ye action reverse nahi hoga.</p></div>}
        confirmLabel="Yes, Cancel"
        onConfirm={() => {
          if (confirmCancel) {
            cancelProject(confirmCancel.id);
            toast.error(`${confirmCancel.id} cancelled`);
          }
        }}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title={`Delete ${confirmDelete?.id} Forever?`}
        message="Sab data permanently delete hoga! (Moved to Recycle Bin — admin can restore.)"
        confirmLabel="Delete Forever"
        onConfirm={() => {
          if (confirmDelete) {
            deleteProject(confirmDelete.id);
            toast.error(`${confirmDelete.id} deleted`);
          }
        }}
      />

      {refundTarget && (
        <RefundModal project={refundTarget} onClose={() => setRefundTarget(null)} onRefund={(amt, mode, reason) => {
          refundProject(refundTarget.id, amt, mode, reason);
          toast.success(`Refund ${Rs(amt)} processed`);
          setRefundTarget(null);
        }} />
      )}
    </div>
  );
}

// ============ Project Detail Modal ============
function ProjectDetailModal({
  project: initialProject, onClose, onAddProd, onAddFile, onInvoice, onFlow, onCancel, onRefund, onDelete,
}: {
  project: Project;
  onClose: () => void;
  onAddProd: () => void;
  onAddFile: () => void;
  onInvoice: () => void;
  onFlow: (id: string, stage: Stage) => void;
  onCancel: (p: Project) => void;
  onRefund: (p: Project) => void;
  onDelete: (p: Project) => void;
}) {
  const currentUser = useERP((s) => s.currentUser);
  const isOwner = currentUser?.role === 'owner';
  const isMgmt = currentUser?.role === 'management';
  const isFinance = currentUser?.role === 'finance';
  const isOM = isOwner || isMgmt;
  // Finance-related info (value, advance, due, payments, invoices) only for owner / management / finance
  const canSeeFinance = isOwner || isMgmt || isFinance;

  // Subscribe to the live project from the store so the modal auto-refreshes after any mutation
  const project = useERP((s) => s.projects.find((p) => p.id === initialProject.id)) || initialProject;

  // New store actions
  const updateDepartmentStatus = useERP((s) => s.updateDepartmentStatus);
  const forwardToManagement = useERP((s) => s.forwardToManagement);
  const reassignToDepartment = useERP((s) => s.reassignToDepartment);
  const createPayment = useERP((s) => s.createPayment);

  const [showForward, setShowForward] = React.useState(false);
  const [showReassign, setShowReassign] = React.useState(false);
  const [showStatusNote, setShowStatusNote] = React.useState<{ dept: DeptKey; status: DeptStatus } | null>(null);
  const [showPayment, setShowPayment] = React.useState(false);

  const due = project.value - project.advance;
  const stageLabel = STAGE_LABELS[project.stage] || project.stage;

  const myDept = mapRoleToDept(currentUser?.role);
  const myDeptStatus = project.departmentStatus?.[myDept]?.status || 'pending';

  // Standard stage-based flow buttons (next stage in the pipeline)
  // Flow: Marketing → Design → Production → Management → Packing → Dispatch → Completed
  let flowBtns: { label: string; tone: 'accent' | 'warn'; icon: LucideIcon; stage: Stage }[] = [];
  if (!project.cancelled && project.stage !== 'completed') {
    if (project.stage === 'marketing' && (currentUser?.role === 'marketing' || isOM)) {
      flowBtns.push({ label: 'Send to Design', tone: 'accent', icon: ArrowRight, stage: 'designing' });
    }
    if (project.stage === 'designing' && (currentUser?.role === 'designer' || isOM)) {
      flowBtns.push({ label: 'Send to Production', tone: 'accent', icon: ArrowRight, stage: 'production' });
    }
    if (project.stage === 'production' && (currentUser?.role === 'production' || isOM)) {
      flowBtns.push({ label: 'Send to Management', tone: 'accent', icon: ArrowRight, stage: 'management' });
    }
    if (project.stage === 'management' && (isMgmt || isOwner)) {
      flowBtns.push({ label: 'Approve → Packing', tone: 'accent', icon: Check, stage: 'completed' });
    }
  }

  // Can the current user forward to management directly? (any department role, when not already in management/completed)
  const canForwardToMgmt = !project.cancelled
    && project.stage !== 'completed'
    && project.stage !== 'management'
    && currentUser && currentUser.role !== 'owner'; // owner uses reassign

  // Can the current user reassign? (Owner/Management only)
  const canReassign = isOM && !project.cancelled && project.stage !== 'completed';

  // Can the current user mark their own department's status? (any department role, when not completed)
  const canUpdateMyDept = !project.cancelled
    && project.stage !== 'completed'
    && currentUser && currentUser.role !== 'owner'
    && myDeptStatus !== 'completed';

  return (
    <Modal
      open
      onOpenChange={(v) => !v && onClose()}
      title={`${project.cancelled ? '[CANCELLED] ' : ''}Project: ${project.id}`}
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}><ArrowLeft className="h-4 w-4" /> Back</Button>
          <Button variant="outline" onClick={onInvoice}><FileText className="h-4 w-4" /> Invoice</Button>
          {canSeeFinance && !project.cancelled && (
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => {
              // Link/Generate GST Invoice from this project
              const { createGSTInvoice } = useERP.getState();
              const isInter = false; // default intrastate
              const items = project.products.map(pr => ({
                description: pr.name,
                hsn: '998361',
                qty: pr.qty,
                rate: pr.rate,
                gstRate: 18,
                cgst: isInter ? 0 : Math.round(pr.qty * pr.rate * 0.09),
                sgst: isInter ? 0 : Math.round(pr.qty * pr.rate * 0.09),
                igst: isInter ? Math.round(pr.qty * pr.rate * 0.18) : 0,
              }));
              const taxable = items.reduce((s, i) => s + i.qty * i.rate, 0);
              const cgst = items.reduce((s, i) => s + i.cgst, 0);
              const sgst = items.reduce((s, i) => s + i.sgst, 0);
              const igst = items.reduce((s, i) => s + i.igst, 0);
              const grand = taxable + cgst + sgst + igst;
              createGSTInvoice({
                clientName: project.client,
                company: project.client,
                gstin: '',
                address: '',
                date: today(),
                placeOfSupply: 'Uttar Pradesh',
                isInterstate: isInter,
                items,
                taxableAmount: taxable,
                cgst, sgst, igst,
                grandTotal: grand,
                amountInWords: '',
                status: 'Draft',
              });
              toast.success(`GST Invoice created from project ${project.id}!`);
            }}>
              <Receipt className="h-4 w-4" /> GST Bill
            </Button>
          )}
          {canSeeFinance && !project.cancelled && (
            <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={() => setShowPayment(true)}>
              <IndianRupee className="h-4 w-4" /> Record Payment
            </Button>
          )}
          {isOwner && !project.cancelled && (
            <Button variant="destructive" onClick={() => onCancel(project)}><Ban className="h-4 w-4" /> Cancel</Button>
          )}
          {isOwner && project.cancelled && !project.refunded && project.advance > 0 && (
            <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => onRefund(project)}><Undo2 className="h-4 w-4" /> Refund</Button>
          )}
          {isOwner && (
            <Button variant="destructive" onClick={() => onDelete(project)}><Trash2 className="h-4 w-4" /> Delete</Button>
          )}
        </>
      }
    >
      <FlowVisual stage={project.stage} />

      <DetailGrid items={[
        { label: 'Client', value: project.client },
        { label: 'Stage', value: <StatusBadge status={stageLabel} /> },
        { label: 'Delivery', value: fD(project.delivery) },
        { label: 'Created By', value: project.createdBy },
        ...(canSeeFinance ? [
          { label: 'Total Value', value: Rs(project.value) },
          { label: 'Advance', value: Rs(project.advance) },
          { label: 'Due', value: <span className="text-red-500">{Rs(due)}</span> },
        ] : []),
        { label: 'Created', value: fD(project.createdAt) },
      ]} />

      {/* ============ Department Status Grid (NEW) ============ */}
      <div className="rounded-xl border border-border bg-card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-bold flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-muted-foreground" />
            Department Status
          </div>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
            Each dept updates its own status & can forward to Mgmt
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {DEPT_ORDER.map((dept) => {
            const entry = project.departmentStatus?.[dept] || { status: 'pending' as DeptStatus };
            const style = DEPT_STATUS_STYLE[entry.status];
            const Icon = DEPT_ICONS[dept];
            const isMyDept = dept === myDept && canUpdateMyDept;
            const isCurrentStage = project.stage === dept;
            return (
              <div
                key={dept}
                className={cn(
                  'rounded-lg border p-3 transition-all',
                  isCurrentStage
                    ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-400'
                    : 'border-border bg-muted/30',
                )}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    {DEPT_LABELS_LOCAL[dept]}
                  </div>
                  {isCurrentStage && (
                    <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">Active</span>
                  )}
                </div>
                <div className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold', style.className)}>
                  {style.label}
                </div>
                {entry.updatedBy && (
                  <div className="mt-1.5 text-[10px] text-muted-foreground flex items-center gap-1">
                    <UserIcon className="h-2.5 w-2.5" /> {entry.updatedBy}
                    {entry.updatedAt && <span>· {fD(entry.updatedAt)}</span>}
                  </div>
                )}
                {entry.note && (
                  <div className="mt-1 text-[10px] text-muted-foreground italic line-clamp-2">"{entry.note}"</div>
                )}
                {isMyDept && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {entry.status !== 'in_progress' && entry.status !== 'completed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-[10px]"
                        onClick={() => {
                          updateDepartmentStatus(project.id, dept, 'in_progress');
                          toast.success(`${DEPT_LABELS_LOCAL[dept]} marked In Progress`);
                        }}
                      >
                        Start
                      </Button>
                    )}
                    {entry.status !== 'completed' && (
                      <Button
                        size="sm"
                        className="h-6 px-2 text-[10px] bg-emerald-500 hover:bg-emerald-600"
                        onClick={() => setShowStatusNote({ dept, status: 'completed' })}
                      >
                        <Check className="h-3 w-3" /> Mark Done
                      </Button>
                    )}
                    {entry.status === 'completed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-[10px] text-amber-600 border-amber-300"
                        onClick={() => setShowStatusNote({ dept, status: 'in_progress' })}
                      >
                        Reopen
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ============ Flow + Forward + Reassign Actions ============ */}
      {(flowBtns.length > 0 || canForwardToMgmt || canReassign || canUpdateMyDept) && !project.cancelled && project.stage !== 'completed' && (
        <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900 mb-4">
          <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 mb-2 uppercase tracking-wider">
            Workflow Actions
          </div>
          <div className="flex flex-wrap gap-2">
            {flowBtns.map((b) => (
              <Button key={b.label} className="bg-emerald-500 hover:bg-emerald-600" onClick={() => {
                onFlow(project.id, b.stage);
                toast.success(`Project ${project.id} → ${STAGE_LABELS[b.stage]}`);
                onClose();
              }}>
                <b.icon className="h-4 w-4" /> {b.label}
              </Button>
            ))}
            {canForwardToMgmt && (
              <Button
                className="bg-emerald-500 hover:bg-emerald-600"
                onClick={() => setShowForward(true)}
              >
                <Send className="h-4 w-4" /> Forward to Management
              </Button>
            )}
            {canUpdateMyDept && myDeptStatus !== 'completed' && (
              <Button
                className="bg-slate-700 hover:bg-slate-800"
                onClick={() => setShowStatusNote({ dept: myDept, status: 'completed' })}
              >
                <Check className="h-4 w-4" /> Mark {DEPT_LABELS_LOCAL[myDept]} Complete
              </Button>
            )}
            {canReassign && (
              <Button
                variant="outline"
                className="border-amber-400 text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/30"
                onClick={() => setShowReassign(true)}
              >
                <GitBranch className="h-4 w-4" /> Reassign to Dept
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ============ Items Table ============ */}
      <div className="rounded-xl border border-border bg-card overflow-hidden mb-4">
        <div className="flex items-center justify-between p-3.5 border-b border-border">
          <div className="text-sm font-bold">Items ({project.products.length})</div>
          <Button variant="outline" size="sm" className="h-7" onClick={onAddProd}><Plus className="h-3.5 w-3.5" /> Add Item</Button>
        </div>
        <table className="w-full text-sm">
          <thead><tr><Th>Item</Th><Th>Qty</Th>{canSeeFinance && <Th>Rate</Th>}{canSeeFinance && <Th>Amount</Th>}<Th>Status</Th></tr></thead>
          <tbody>
            {project.products.length === 0 ? (
              <EmptyState icon={<PackageIcon className="h-8 w-8" />} message="No items" />
            ) : project.products.map((p, i) => (
              <tr key={i} className="hover:bg-muted/30">
                <Td>{p.name}</Td>
                <Td>{p.qty}</Td>
                {canSeeFinance && <Td>{Rs(p.rate)}</Td>}
                {canSeeFinance && <Td className="font-semibold">{Rs(p.qty * p.rate)}</Td>}
                <Td><StatusBadge status={p.status} /></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ============ Files Table ============ */}
      <div className="rounded-xl border border-border bg-card overflow-hidden mb-4">
        <div className="flex items-center justify-between p-3.5 border-b border-border">
          <div className="text-sm font-bold">Files ({project.files.length})</div>
          <Button variant="outline" size="sm" className="h-7" onClick={onAddFile}><Upload className="h-3.5 w-3.5" /> Upload</Button>
        </div>
        <table className="w-full text-sm">
          <thead><tr><Th>File</Th><Th>Uploaded</Th><Th>By</Th></tr></thead>
          <tbody>
            {project.files.length === 0 ? (
              <EmptyState icon={<FileText className="h-8 w-8" />} message="No files" />
            ) : project.files.map((f, i) => (
              <tr key={i} className="hover:bg-muted/30">
                <Td><FileText className="inline h-3.5 w-3.5 mr-1.5 text-muted-foreground" /> {f.name}</Td>
                <Td>{fD(f.date)}</Td>
                <Td>{f.by}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ============ Handoff Log (NEW) ============ */}
      <HandoffLog events={project.handoffLog || []} />

      {/* ============ Forward to Management Modal ============ */}
      {showForward && (
        <NoteModal
          open
          onOpenChange={setShowForward}
          title={`Forward ${project.id} to Management`}
          description={`You (${currentUser?.name}) are forwarding this project to Management for review. Your department (${DEPT_LABELS_LOCAL[myDept]}) will be marked complete.`}
          confirmLabel="Forward to Management"
          tone="primary"
          onConfirm={(note) => {
            forwardToManagement(project.id, note);
            toast.success(`Forwarded ${project.id} to Management`);
            setShowForward(false);
            onClose();
          }}
        />
      )}

      {/* ============ Reassign Modal ============ */}
      {showReassign && (
        <ReassignModal
          open
          onOpenChange={setShowReassign}
          currentStage={project.stage}
          onConfirm={(dept, note) => {
            reassignToDepartment(project.id, dept, note);
            toast.success(`Reassigned ${project.id} to ${DEPT_LABELS_LOCAL[dept]}`);
            setShowReassign(false);
          }}
        />
      )}

      {/* ============ Status Update Modal (with note) ============ */}
      {showStatusNote && (
        <NoteModal
          open
          onOpenChange={() => setShowStatusNote(null)}
          title={`${showStatusNote.status === 'completed' ? 'Mark' : 'Set'} ${DEPT_LABELS_LOCAL[showStatusNote.dept]} as ${DEPT_STATUS_STYLE[showStatusNote.status].label}`}
          description={`Add an optional note explaining this status change (e.g. work done, reason for reopening).`}
          confirmLabel="Save Status"
          tone="accent"
          onConfirm={(note) => {
            updateDepartmentStatus(project.id, showStatusNote.dept, showStatusNote.status, note);
            toast.success(`${DEPT_LABELS_LOCAL[showStatusNote.dept]} → ${DEPT_STATUS_STYLE[showStatusNote.status].label}`);
            setShowStatusNote(null);
          }}
        />
      )}

      {/* ============ Record Payment Modal (inline in project detail) ============ */}
      {showPayment && (
        <ProjectPaymentModal
          projectId={project.id}
          client={project.client}
          due={Math.max(0, project.value - project.advance)}
          onClose={() => setShowPayment(false)}
          onRecord={(data) => {
            createPayment(data);
            toast.success(`Payment ${Rs(data.amount)} recorded`);
            setShowPayment(false);
          }}
        />
      )}
    </Modal>
  );
}

// ============ Handoff Log Component ============
function HandoffLog({ events }: { events: HandoffEvent[] }) {
  if (!events.length) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-center text-xs text-muted-foreground">
        <MessageSquare className="h-4 w-4 inline mr-1.5 opacity-50" />
        No handoff activity yet. Status updates and forwards will be logged here.
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-3.5 border-b border-border text-sm font-bold flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        Handoff & Activity Log ({events.length})
      </div>
      <div className="max-h-60 overflow-y-auto p-3 space-y-2">
        {events.map((e) => (
          <div key={e.id} className="flex gap-2.5 text-xs">
            <div className="flex-shrink-0 mt-0.5">
              <div className={cn(
                'h-6 w-6 rounded-full flex items-center justify-center',
                e.action === 'forwarded' ? 'bg-blue-100 text-emerald-600 dark:bg-blue-950 dark:text-emerald-500'
                : e.action === 'reassigned' ? 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-300'
                : e.action === 'completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-emerald-500'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              )}>
                {e.action === 'forwarded' ? <Send className="h-3 w-3" />
                  : e.action === 'reassigned' ? <GitBranch className="h-3 w-3" />
                  : e.action === 'completed' ? <Check className="h-3 w-3" />
                  : <Clock className="h-3 w-3" />}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="font-bold capitalize">{e.action.replace('_', ' ')}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{e.from} → {e.to}</span>
              </div>
              <div className="text-muted-foreground mt-0.5">{e.note}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {e.by} · {new Date(e.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ Note Modal (reusable) ============
function NoteModal({
  open, onOpenChange, title, description, confirmLabel, tone = 'accent', onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  tone?: 'accent' | 'primary' | 'warn';
  onConfirm: (note: string) => void;
}) {
  const [note, setNote] = React.useState('');
  const tones = {
    accent: 'bg-emerald-500 hover:bg-emerald-600 text-white',
    primary: 'bg-emerald-500 hover:bg-emerald-600 text-white',
    warn: 'bg-amber-500 hover:bg-amber-600 text-white',
  };
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} description={description}
      footer={<><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button className={tones[tone]} onClick={() => { onConfirm(note.trim()); setNote(''); }}>{confirmLabel}</Button></>}
    >
      <Field label="Note (optional)">
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note for the handoff / status change..." />
      </Field>
    </Modal>
  );
}

// ============ Reassign Modal ============
function ReassignModal({
  open, onOpenChange, currentStage, onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentStage: Stage;
  onConfirm: (dept: DeptKey, note: string) => void;
}) {
  const [dept, setDept] = React.useState<DeptKey>('designing');
  const [note, setNote] = React.useState('');
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Reassign to Department"
      description={`Currently in: ${STAGE_LABELS[currentStage] || currentStage}. Pick a target department — the project will move there and that dept will be set to In Progress.`}
      footer={<><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => { onConfirm(dept, note.trim()); setNote(''); }}>Reassign</Button></>}
    >
      <Field label="Target Department">
        <Select value={dept} onValueChange={(v) => setDept(v as DeptKey)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {DEPT_ORDER.map((d) => <SelectItem key={d} value={d}>{DEPT_LABELS_LOCAL[d]}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Reason (optional)">
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why are you reassigning this project?" />
      </Field>
    </Modal>
  );
}

// ============ Project Payment Modal (inline in project detail) ============
function ProjectPaymentModal({
  projectId, client, due, onClose, onRecord,
}: {
  projectId: string;
  client: string;
  due: number;
  onClose: () => void;
  onRecord: (data: { projectId: string; amount: number; type: string; mode: string; reference?: string; note?: string }) => void;
}) {
  const [amount, setAmount] = React.useState('');
  const [type, setType] = React.useState('Mid');
  const [mode, setMode] = React.useState('Bank Transfer');
  const [reference, setReference] = React.useState('');
  const [note, setNote] = React.useState('');

  return (
    <Modal open onOpenChange={onClose} title={`Record Payment — ${projectId}`}
      description={`Client: ${client} · Outstanding due: ${Rs(due)}`}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={() => {
          const amt = parseInt(amount) || 0;
          if (!amt) { toast.error('Amount zaroori'); return; }
          onRecord({ projectId, amount: amt, type, mode, reference: reference.trim() || undefined, note: note.trim() || undefined });
          setAmount(''); setReference(''); setNote('');
        }}>Record Payment</Button></>}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount (₹)"><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="25000" /></Field>
        <Field label="Quick fill">
          <div className="flex gap-1.5">
            <Button type="button" variant="outline" size="sm" className="h-9 flex-1 text-xs" onClick={() => setAmount(String(due))}>Full Due</Button>
            <Button type="button" variant="outline" size="sm" className="h-9 flex-1 text-xs" onClick={() => setAmount(String(Math.round(due / 2)))}>50%</Button>
          </div>
        </Field>
        <Field label="Type">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PAYMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Mode">
          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PAYMENT_MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Reference No. (UTR / Cheque)">
        <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UTR9821347" className="font-mono" />
      </Field>
      <Field label="Note (optional)">
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="NEFT - HDFC Bank" />
      </Field>
    </Modal>
  );
}

// ============ New Project Modal ============
function NewProjectModal({
  open, onOpenChange, items, onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  items: { id: string; name: string; rate: number }[];
  onCreate: (data: { client: string; title: string; value: number; delivery: string; advance: number; product: string; itemId?: string }) => void;
}) {
  const [client, setClient] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [value, setValue] = React.useState('');
  const [delivery, setDelivery] = React.useState(today());
  const [advance, setAdvance] = React.useState('');
  const [itemId, setItemId] = React.useState('');

  const submit = () => {
    if (!client.trim() || !title.trim()) {
      toast.error('Client aur Title zaroori hai');
      return;
    }
    const sel = items.find((i) => i.id === itemId);
    const productName = sel?.name || 'Product 1';
    const v = parseInt(value) || (sel?.rate ?? 0);
    onCreate({
      client: client.trim(), title: title.trim(), value: v,
      delivery, advance: parseInt(advance) || 0,
      product: productName, itemId: itemId || undefined,
    });
    setClient(''); setTitle(''); setValue(''); setAdvance(''); setItemId('');
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="New Project"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={submit}>Create</Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Client"><Input value={client} onChange={(e) => setClient(e.target.value)} placeholder="ABC Pharma" /></Field>
        <Field label="Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Visual Aid + Cards" /></Field>
        <Field label="Item (from catalog)">
          <Select value={itemId} onValueChange={(v) => { setItemId(v); const it = items.find((i) => i.id === v); if (it) setValue(String(it.rate)); }}>
            <SelectTrigger><SelectValue placeholder="Select item or skip" /></SelectTrigger>
            <SelectContent>{items.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Value (₹)"><Input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="75000" /></Field>
        <Field label="Delivery"><Input type="date" value={delivery} onChange={(e) => setDelivery(e.target.value)} /></Field>
        <Field label="Advance (₹)"><Input type="number" value={advance} onChange={(e) => setAdvance(e.target.value)} placeholder="25000" /></Field>
      </div>
      <p className="text-xs text-muted-foreground">Tip: pick an item from the catalog to auto-fill the rate.</p>
    </Modal>
  );
}

// ============ Add Product Modal ============
function AddProductModal({
  open, onOpenChange, items, onAdd,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  items: { id: string; name: string; rate: number }[];
  onAdd: (p: { name: string; qty: number; rate: number; itemId?: string }) => void;
}) {
  const [itemId, setItemId] = React.useState('');
  const [name, setName] = React.useState('');
  const [qty, setQty] = React.useState('');
  const [rate, setRate] = React.useState('');

  const submit = () => {
    const n = name.trim();
    const q = parseInt(qty) || 0;
    const r = parseFloat(rate) || 0;
    if (!n || !q || !r) {
      toast.error('Sab fields bharo');
      return;
    }
    onAdd({ name: n, qty: q, rate: r, itemId: itemId || undefined });
    setItemId(''); setName(''); setQty(''); setRate('');
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Add Item"
      footer={<><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={submit}>Add</Button></>}
    >
      <Field label="Item (from catalog)">
        <Select value={itemId} onValueChange={(v) => {
          setItemId(v);
          const it = items.find((i) => i.id === v);
          if (it) { setName(it.name); setRate(String(it.rate)); }
        }}>
          <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
          <SelectContent>{items.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Reminder Card" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Qty"><Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="500" /></Field>
        <Field label="Rate (₹)"><Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="40" /></Field>
      </div>
    </Modal>
  );
}

// ============ Upload File Modal ============
function UploadFileModal({
  open, onOpenChange, onUpload,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUpload: (name: string) => void;
}) {
  const [name, setName] = React.useState('');
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Upload File"
      footer={<><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={() => {
          if (!name.trim()) { toast.error('File name likho'); return; }
          onUpload(name.trim()); setName('');
        }}>Upload</Button></>}
    >
      <Field label="File Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Design_v2.pptx" /></Field>
      <Field label="File"><Input type="file" /></Field>
    </Modal>
  );
}

// ============ Invoice Modal ============
function InvoiceModal({ open, onOpenChange, project }: { open: boolean; onOpenChange: (v: boolean) => void; project: Project }) {
  const sub = project.products.reduce((s, r) => s + r.qty * r.rate, 0);
  const gst = Math.round(sub * 0.18);
  const total = sub + gst;
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={`Invoice: ${project.id}`} size="lg"
      footer={<><Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        <Button className="bg-slate-900 hover:bg-slate-800" onClick={() => { toast.success('Printing...'); window.print(); }}>Print</Button></>}
    >
      <div className="flex justify-between mb-4">
        <div className="text-lg font-black">Karyam<span className="text-emerald-500"> Dessin</span></div>
        <div className="text-right">
          <div className="font-bold">INV-{project.id.slice(-4)}</div>
          <div className="text-[11px] text-muted-foreground">{fD(today())}</div>
        </div>
      </div>
      <DetailGrid items={[
        { label: 'Bill To', value: project.client },
        { label: 'Project', value: project.id },
      ]} />
      <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
        <thead><tr><Th>Item</Th><Th>Qty</Th><Th>Rate</Th><Th>Amount</Th></tr></thead>
        <tbody>
          {project.products.map((p, i) => (
            <tr key={i} className="hover:bg-muted/30">
              <Td>{p.name}</Td><Td>{p.qty}</Td><Td>{Rs(p.rate)}</Td><Td className="font-semibold">{Rs(p.qty * p.rate)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-right mt-3 p-3 rounded-lg bg-muted/50">
        <div className="text-xs my-1">Subtotal: {Rs(sub)}</div>
        <div className="text-xs my-1">GST 18%: {Rs(gst)}</div>
        <div className="text-lg font-black mt-1.5">Total: {Rs(total)}</div>
        <div className="text-xs text-emerald-600 mt-1">Advance: {Rs(project.advance)}</div>
        <div className="text-[15px] font-bold text-red-500 mt-0.5">Balance: {Rs(total - project.advance)}</div>
      </div>
    </Modal>
  );
}

// ============ Refund Modal ============
function RefundModal({ project, onClose, onRefund }: {
  project: Project;
  onClose: () => void;
  onRefund: (amt: number, mode: string, reason: string) => void;
}) {
  const [amount, setAmount] = React.useState(String(project.advance));
  const [mode, setMode] = React.useState('Bank Transfer');
  const [reason, setReason] = React.useState('');

  return (
    <Modal open onOpenChange={(v) => !v && onClose()} title={`Process Refund: ${project.id}`}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant="destructive" onClick={() => {
          const amt = parseInt(amount) || 0;
          if (amt <= 0 || amt > project.advance) { toast.error('Invalid amount'); return; }
          onRefund(amt, mode, reason.trim());
        }}>Process Refund</Button></>}
    >
      <DetailGrid items={[
        { label: 'Client', value: project.client },
        { label: 'Advance', value: Rs(project.advance) },
      ]} />
      <div className="grid grid-cols-2 gap-3">
        <Field label={`Refund Amount (max ${Rs(project.advance)})`}>
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Mode">
          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {['Bank Transfer', 'UPI', 'Cheque'].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Reason"><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why refund?" /></Field>
    </Modal>
  );
}
