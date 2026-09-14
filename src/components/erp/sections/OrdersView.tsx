'use client';

import * as React from 'react';
import {
  Plus, PackageCheck, IndianRupee, Truck, FileText, CheckCircle2,
  Trash2, Pencil, X, ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { useERP } from '@/lib/erp/store';
import { Rs, fD, today, matchSearch } from '@/lib/erp/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  SectionHeader, TableShell, Th, Td, EmptyState, Modal, ConfirmDialog,
  Field, StatCard, FilterBar, FilterChip,
} from '../ui';
import { LeadDetailPanel } from './LeadDetailPanel';

// ============================================================================
// Local CRMOrder type — defensive. Task ID 1 adds this to types.ts + store.ts.
// Until then we cast via `(s as any)` so this file lints cleanly.
// ============================================================================

type CRMOrderStatus = 'Confirmed' | 'In Progress' | 'Delivered' | 'Cancelled';

interface CRMOrder {
  id: string;
  orderNumber: string;
  leadId?: string;
  customerName: string;
  orderAmount: number;
  advanceReceived: number;
  status: CRMOrderStatus;
  confirmedBy: string;
  createdAt: string;
  expectedDelivery?: string;
  orderDetails?: string;
  notes?: string;
}

const ORDER_STATUSES: CRMOrderStatus[] = ['Confirmed', 'In Progress', 'Delivered', 'Cancelled'];

const STATUS_BADGE: Record<CRMOrderStatus, string> = {
  Confirmed: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900',
  'In Progress': 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900',
  Delivered: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900',
  Cancelled: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900',
};

// ============================================================================
// Main view
// ============================================================================

export function OrdersView() {
  const leads = useERP((s) => s.leads);
  const currentUser = useERP((s) => s.currentUser);
  const orders = useERP((s) => s.crmOrders) || [];
  const createCRMOrder = useERP((s) => s.createCRMOrder);
  const updateCRMOrder = useERP((s) => s.updateCRMOrder);
  const deleteCRMOrder = useERP((s) => s.deleteCRMOrder);

  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [showNew, setShowNew] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<CRMOrder | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<CRMOrder | null>(null);
  const [openLeadId, setOpenLeadId] = React.useState<string | null>(null);

  // Stats
  const totalOrders = orders.length;
  const totalValue = orders.reduce((s, o) => s + (o.orderAmount || 0), 0);
  const confirmedCount = orders.filter((o) => o.status === 'Confirmed').length;
  const deliveredCount = orders.filter((o) => o.status === 'Delivered').length;

  // Filter
  const filtered = orders
    .filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (!search) return true;
      const text = `${o.id} ${o.orderNumber} ${o.customerName} ${o.confirmedBy} ${o.notes || ''} ${o.orderDetails || ''}`;
      return matchSearch(text, search);
    })
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  const handleCreate = (data: Partial<CRMOrder>) => {
    if (!createCRMOrder) {
      toast.error('Order creation not ready (store action missing)');
      return;
    }
    createCRMOrder(data);
    toast.success('Order created');
    setShowNew(false);
  };

  const handleUpdate = (id: string, patch: Partial<CRMOrder>) => {
    if (!updateCRMOrder) {
      toast.error('Order update not ready (store action missing)');
      return;
    }
    updateCRMOrder(id, patch);
    toast.success('Order updated');
    setEditTarget(null);
  };

  const handleDelete = (id: string) => {
    if (!deleteCRMOrder) {
      toast.error('Order delete not ready (store action missing)');
      return;
    }
    deleteCRMOrder(id);
    toast.success('Order deleted');
    setConfirmDelete(null);
  };

  const statusCounts: Record<string, number> = { all: orders.length };
  ORDER_STATUSES.forEach((s) => {
    statusCounts[s] = orders.filter((o) => o.status === s).length;
  });

  return (
    <div>
      <SectionHeader
        title="Orders"
        subtitle="Confirm and track every closed-deal order with advance & balance."
        accent="emerald"
        actions={
          <Button onClick={() => setShowNew(true)} className="h-9 bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4" /> New Order
          </Button>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard
          label="Total Orders"
          value={totalOrders}
          tone="primary"
          icon={<PackageCheck className="h-4 w-4" />}
        />
        <StatCard
          label="Total Value"
          value={Rs(totalValue)}
          tone="accent"
          icon={<IndianRupee className="h-4 w-4" />}
        />
        <StatCard
          label="Confirmed"
          value={confirmedCount}
          tone={confirmedCount > 0 ? 'warn' : 'default'}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <StatCard
          label="Delivered"
          value={deliveredCount}
          tone={deliveredCount > 0 ? 'accent' : 'default'}
          icon={<Truck className="h-4 w-4" />}
        />
      </div>

      {/* Status filter chips */}
      <FilterBar label="Status">
        <FilterChip
          label="All"
          active={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
          count={statusCounts.all}
        />
        {ORDER_STATUSES.map((s) => (
          <FilterChip
            key={s}
            label={s}
            active={statusFilter === s}
            onClick={() => setStatusFilter(s)}
            count={statusCounts[s] || 0}
          />
        ))}
        {(statusFilter !== 'all' || search) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] ml-auto"
            onClick={() => { setStatusFilter('all'); setSearch(''); }}
          >
            <X className="h-3 w-3 mr-1" /> Clear
          </Button>
        )}
      </FilterBar>

      {/* Orders table */}
      <TableShell
        title={`Orders (${filtered.length})`}
        search={search}
        onSearch={setSearch}
      >
        <thead>
          <tr>
            <Th>Order #</Th>
            <Th>Customer</Th>
            <Th className="text-right">Amount</Th>
            <Th className="text-right">Advance</Th>
            <Th className="text-right">Balance</Th>
            <Th>Status</Th>
            <Th className="hidden md:table-cell">Confirmed By</Th>
            <Th className="hidden lg:table-cell">Delivery</Th>
            <Th>Created</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <EmptyState
              icon={<PackageCheck className="h-10 w-10" />}
              message={orders.length === 0 ? 'No orders yet. Click "New Order" to confirm one.' : 'No orders match the current filter.'}
            />
          ) : (
            filtered.map((o) => {
              const balance = (o.orderAmount || 0) - (o.advanceReceived || 0);
              return (
                <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                  <Td>
                    <div className="font-bold text-foreground">{o.orderNumber || o.id}</div>
                    {o.orderDetails && (
                      <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                        {o.orderDetails}
                      </div>
                    )}
                  </Td>
                  <Td>
                    <div className="font-semibold">{o.customerName}</div>
                    {o.leadId && (
                      <button
                        onClick={() => setOpenLeadId(o.leadId!)}
                        className="text-[11px] text-emerald-700 hover:underline inline-flex items-center gap-0.5"
                      >
                        View Lead <ArrowRight className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </Td>
                  <Td className="text-right font-bold tabular-nums">{Rs(o.orderAmount)}</Td>
                  <Td className="text-right tabular-nums text-emerald-700 dark:text-emerald-400">
                    {Rs(o.advanceReceived)}
                  </Td>
                  <Td className="text-right tabular-nums text-rose-700 dark:text-rose-400 font-semibold">
                    {Rs(balance)}
                  </Td>
                  <Td>
                    <Badge variant="outline" className={cn('text-[10px] font-bold', STATUS_BADGE[o.status])}>
                      {o.status}
                    </Badge>
                  </Td>
                  <Td className="hidden md:table-cell text-xs">{o.confirmedBy || '—'}</Td>
                  <Td className="hidden lg:table-cell text-xs text-muted-foreground">
                    {o.expectedDelivery ? fD(o.expectedDelivery) : '—'}
                  </Td>
                  <Td className="text-xs text-muted-foreground">{fD(o.createdAt?.split('T')[0])}</Td>
                  <Td>
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => setEditTarget(o)}
                        title="Edit order"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700"
                        onClick={() => setConfirmDelete(o)}
                        title="Delete order"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </Td>
                </tr>
              );
            })
          )}
        </tbody>
      </TableShell>

      {/* New / Edit order modal */}
      <OrderModal
        open={showNew || !!editTarget}
        initial={editTarget}
        leads={leads}
        defaultConfirmedBy={currentUser?.name || ''}
        onOpenChange={(o) => {
          if (!o) {
            setShowNew(false);
            setEditTarget(null);
          }
        }}
        onSubmit={(data) => {
          if (editTarget) handleUpdate(editTarget.id, data);
          else handleCreate(data);
        }}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title="Delete Order"
        tone="danger"
        confirmLabel="Delete"
        message={
          <>
            You're about to delete order <b>{confirmDelete?.orderNumber || confirmDelete?.id}</b> for{' '}
            <b>{confirmDelete?.customerName}</b> ({Rs(confirmDelete?.orderAmount || 0)}). This cannot be undone.
          </>
        }
        onConfirm={() => confirmDelete && handleDelete(confirmDelete.id)}
      />

      {/* Slide-out lead detail panel */}
      <LeadDetailPanel leadId={openLeadId} onClose={() => setOpenLeadId(null)} />
    </div>
  );
}

// ============================================================================
// New / Edit Order Modal
// ============================================================================

interface OrderModalProps {
  open: boolean;
  initial: CRMOrder | null;
  leads: { id: string; client: string; contact: string; phone: string }[];
  defaultConfirmedBy: string;
  onOpenChange: (v: boolean) => void;
  onSubmit: (data: Partial<CRMOrder>) => void;
}

function OrderModal({
  open, initial, leads, defaultConfirmedBy, onOpenChange, onSubmit,
}: OrderModalProps) {
  const isEdit = !!initial;

  const [leadId, setLeadId] = React.useState('');
  const [customerName, setCustomerName] = React.useState('');
  const [orderAmount, setOrderAmount] = React.useState<string>('');
  const [advanceReceived, setAdvanceReceived] = React.useState<string>('');
  const [expectedDelivery, setExpectedDelivery] = React.useState('');
  const [status, setStatus] = React.useState<CRMOrderStatus>('Confirmed');
  const [orderDetails, setOrderDetails] = React.useState('');
  const [notes, setNotes] = React.useState('');

  // Reset / hydrate when opened
  React.useEffect(() => {
    if (!open) return;
    if (initial) {
      setLeadId(initial.leadId || '');
      setCustomerName(initial.customerName || '');
      setOrderAmount(String(initial.orderAmount || ''));
      setAdvanceReceived(String(initial.advanceReceived || ''));
      setExpectedDelivery(initial.expectedDelivery || '');
      setStatus(initial.status || 'Confirmed');
      setOrderDetails(initial.orderDetails || '');
      setNotes(initial.notes || '');
    } else {
      setLeadId('');
      setCustomerName('');
      setOrderAmount('');
      setAdvanceReceived('');
      setExpectedDelivery('');
      setStatus('Confirmed');
      setOrderDetails('');
      setNotes('');
    }
  }, [open, initial]);

  // Auto-fill customer name when a lead is picked
  const handleLeadPick = (id: string) => {
    setLeadId(id);
    if (!id) return;
    const l = leads.find((x) => x.id === id);
    if (l && !customerName) setCustomerName(l.client || l.contact || '');
  };

  const amt = Number(orderAmount) || 0;
  const adv = Number(advanceReceived) || 0;
  const balance = amt - adv;

  const handleSubmit = () => {
    if (!customerName.trim()) {
      toast.error('Customer name is required');
      return;
    }
    if (amt <= 0) {
      toast.error('Order amount must be greater than 0');
      return;
    }
    if (adv > amt) {
      toast.error('Advance cannot exceed order amount');
      return;
    }
    const payload: Partial<CRMOrder> = {
      leadId: leadId || undefined,
      customerName: customerName.trim(),
      orderAmount: amt,
      advanceReceived: adv,
      expectedDelivery: expectedDelivery || undefined,
      status,
      orderDetails: orderDetails.trim() || undefined,
      notes: notes.trim() || undefined,
      confirmedBy: defaultConfirmedBy,
    };
    onSubmit(payload);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? `Edit Order ${initial?.orderNumber || ''}` : 'Confirm New Order'}
      description="Convert a lead (or a direct customer) into a tracked order with advance & balance."
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} className="bg-emerald-600 hover:bg-emerald-700">
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            {isEdit ? 'Save Changes' : 'Confirm Order'}
          </Button>
        </>
      }
    >
      {/* Lead picker (optional) */}
      <Field label="Link to Lead (optional)" desc="Pick an existing lead to auto-fill the customer name.">
        <Select value={leadId || '__NONE__'} onValueChange={(v) => handleLeadPick(v === '__NONE__' ? '' : v)}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Choose a lead…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__NONE__">— Direct Order (no lead) —</SelectItem>
            {leads.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.id} · {l.client || l.contact} {l.phone ? `· ${l.phone}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Customer Name" desc="Required. Used as the order's customer.">
        <Input
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="e.g. Acme Pharma Pvt Ltd"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Order Amount (₹)">
          <Input
            type="number"
            min="0"
            value={orderAmount}
            onChange={(e) => setOrderAmount(e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field label="Advance Received (₹)">
          <Input
            type="number"
            min="0"
            value={advanceReceived}
            onChange={(e) => setAdvanceReceived(e.target.value)}
            placeholder="0"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Expected Delivery">
          <Input
            type="date"
            value={expectedDelivery}
            onChange={(e) => setExpectedDelivery(e.target.value)}
          />
        </Field>
        <Field label="Balance (auto)" desc="Order Amount − Advance">
          <div className="h-9 px-3 rounded-md border bg-muted/40 text-sm font-bold tabular-nums flex items-center text-rose-700 dark:text-rose-400">
            {Rs(balance)}
          </div>
        </Field>
      </div>

      <Field label="Status">
        <Select value={status} onValueChange={(v) => setStatus(v as CRMOrderStatus)}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Order Details" desc="What was ordered — items, qty, design specs.">
        <Textarea
          value={orderDetails}
          onChange={(e) => setOrderDetails(e.target.value)}
          placeholder="e.g. 2 Designer Sarees — Red & Blue, size M"
          rows={2}
        />
      </Field>

      <Field label="Notes (optional)">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional notes for this order…"
          rows={2}
        />
      </Field>

      {!isEdit && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900 p-2.5 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 shrink-0" />
          Order will be confirmed by <b>{defaultConfirmedBy || 'current user'}</b> on {fD(today())}.
        </div>
      )}
    </Modal>
  );
}
