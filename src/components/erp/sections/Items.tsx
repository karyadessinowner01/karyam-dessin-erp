'use client';

import * as React from 'react';
import {
  Plus, Pencil, Trash2, Package, AlertTriangle, TrendingUp, TrendingDown,
  PackageCheck, Search, RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { useERP } from '@/lib/erp/store';
import { ITEM_CATEGORIES, ITEM_UNITS } from '@/lib/erp/constants';
import { Rs, matchSearch, fD } from '@/lib/erp/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  SectionHeader, TableShell, Th, Td, EmptyState, StatusBadge,
  Modal, ConfirmDialog, Field, StatCard,
} from '../ui';
import type { Item } from '@/lib/erp/types';

export function Items() {
  const items = useERP((s) => s.items);
  const currentUser = useERP((s) => s.currentUser);
  const createItem = useERP((s) => s.createItem);
  const updateItem = useERP((s) => s.updateItem);
  const deleteItem = useERP((s) => s.deleteItem);
  const adjustStock = useERP((s) => s.adjustStock);

  const canManage = currentUser?.role === 'owner' || currentUser?.role === 'management';

  const [search, setSearch] = React.useState('');
  const [filterCat, setFilterCat] = React.useState('all');
  const [showForm, setShowForm] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<Item | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<Item | null>(null);
  const [adjustTarget, setAdjustTarget] = React.useState<Item | null>(null);

  const filtered = items.filter((i) =>
    (filterCat === 'all' || i.category === filterCat) &&
    matchSearch(`${i.id} ${i.name} ${i.category} ${i.hsn || ''}`, search),
  );

  const lowStock = items.filter((i) => i.stock <= i.minStock);
  const totalStockValue = items.reduce((s, i) => s + i.stock * i.cost, 0);
  const totalRetailValue = items.reduce((s, i) => s + i.stock * i.rate, 0);
  const totalSku = items.length;

  const categories = Array.from(new Set(items.map((i) => i.category)));

  return (
    <div>
      <SectionHeader
        title="Items Catalog"
        subtitle="Track inventory items — easier than tracking raw product names."
        accent="emerald"
        actions={canManage && (
          <Button onClick={() => { setEditTarget(null); setShowForm(true); }} className="h-9 bg-slate-900 hover:bg-slate-800">
            <Plus className="h-4 w-4" /> New Item
          </Button>
        )}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total SKUs" value={totalSku} tone="primary" icon={<Package className="h-4 w-4" />} />
        <StatCard label="Stock Value (Cost)" value={Rs(totalStockValue)} icon={<TrendingDown className="h-4 w-4" />} />
        <StatCard label="Stock Value (Retail)" value={Rs(totalRetailValue)} tone="accent" icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Low Stock Alerts" value={lowStock.length} tone={lowStock.length ? 'warn' : 'default'} icon={<AlertTriangle className="h-4 w-4" />} />
      </div>

      {lowStock.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 p-3.5 mb-5 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-bold text-amber-800 dark:text-amber-300">Low stock alert</div>
            <div className="text-amber-700 dark:text-amber-400 mt-0.5">
              {lowStock.map((i) => `${i.name} (${i.stock} ${i.unit})`).join(', ')} — reorder soon.
            </div>
          </div>
        </div>
      )}

      <TableShell
        title={`All Items (${items.length})`}
        search={search}
        onSearch={setSearch}
        toolbar={
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="All categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      >
        <thead>
          <tr>
            <Th>ID</Th><Th>Name</Th><Th>Category</Th><Th>HSN</Th>
            <Th>Unit</Th><Th>Rate</Th><Th>Cost</Th><Th>Stock</Th><Th>Min</Th><Th>Status</Th><Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <EmptyState icon={<Package className="h-8 w-8" />} message="No items yet. Click 'New Item' to create one." />
          ) : filtered.map((it) => {
            const low = it.stock <= it.minStock;
            return (
              <tr key={it.id} className={`hover:bg-muted/30 ${low ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}`}>
                <Td className="font-mono text-xs text-muted-foreground">{it.id}</Td>
                <Td className="font-bold">{it.name}</Td>
                <Td><StatusBadge status={it.category} /></Td>
                <Td className="text-muted-foreground">{it.hsn || '-'}</Td>
                <Td>{it.unit}</Td>
                <Td className="font-semibold">{Rs(it.rate)}</Td>
                <Td className="text-muted-foreground">{Rs(it.cost)}</Td>
                <Td className={low ? 'font-bold text-amber-600' : 'font-bold'}>{it.stock.toLocaleString('en-IN')}</Td>
                <Td className="text-muted-foreground">{it.minStock.toLocaleString('en-IN')}</Td>
                <Td>
                  {low ? <StatusBadge status="pending" /> : <StatusBadge status="approved" />}
                </Td>
                <Td>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setAdjustTarget(it)} title="Adjust stock">
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                    {canManage && (
                      <>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditTarget(it); setShowForm(true); }} title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50" onClick={() => setConfirmDelete(it)} title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </TableShell>

      {/* New / Edit Item */}
      <ItemFormModal
        open={showForm}
        onOpenChange={setShowForm}
        editTarget={editTarget}
        onSubmit={(data) => {
          if (editTarget) {
            updateItem(editTarget.id, data);
            toast.success('Item updated');
          } else {
            createItem(data);
            toast.success('Item created');
          }
          setShowForm(false);
        }}
      />

      {/* Adjust Stock */}
      {adjustTarget && (
        <AdjustStockModal item={adjustTarget} onClose={() => setAdjustTarget(null)} onApply={(delta) => {
          adjustStock(adjustTarget.id, delta);
          toast.success(`Stock ${delta > 0 ? '+' : ''}${delta} applied`);
          setAdjustTarget(null);
        }} />
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title={`Delete ${confirmDelete?.name}?`}
        message="Item moved to Recycle Bin — admin can restore later."
        confirmLabel="Delete"
        onConfirm={() => { if (confirmDelete) { deleteItem(confirmDelete.id); toast.error('Item deleted'); } }}
      />
    </div>
  );
}

function ItemFormModal({
  open, onOpenChange, editTarget, onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editTarget: Item | null;
  onSubmit: (data: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>) => void;
}) {
  const [name, setName] = React.useState('');
  const [category, setCategory] = React.useState(ITEM_CATEGORIES[0]);
  const [unit, setUnit] = React.useState(ITEM_UNITS[0]);
  const [hsn, setHsn] = React.useState('');
  const [rate, setRate] = React.useState('');
  const [cost, setCost] = React.useState('');
  const [stock, setStock] = React.useState('');
  const [minStock, setMinStock] = React.useState('');
  const [description, setDescription] = React.useState('');

  React.useEffect(() => {
    if (open) {
      if (editTarget) {
        setName(editTarget.name);
        setCategory(editTarget.category);
        setUnit(editTarget.unit);
        setHsn(editTarget.hsn || '');
        setRate(String(editTarget.rate));
        setCost(String(editTarget.cost));
        setStock(String(editTarget.stock));
        setMinStock(String(editTarget.minStock));
        setDescription(editTarget.description || '');
      } else {
        setName(''); setCategory(ITEM_CATEGORIES[0]); setUnit(ITEM_UNITS[0]);
        setHsn(''); setRate(''); setCost(''); setStock('0'); setMinStock('0'); setDescription('');
      }
    }
  }, [open, editTarget]);

  const submit = () => {
    if (!name.trim()) { toast.error('Name zaroori'); return; }
    onSubmit({
      name: name.trim(),
      category, unit, hsn: hsn.trim(),
      rate: parseFloat(rate) || 0,
      cost: parseFloat(cost) || 0,
      stock: parseInt(stock) || 0,
      minStock: parseInt(minStock) || 0,
      description: description.trim(),
    });
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={editTarget ? `Edit ${editTarget.name}` : 'New Item'} size="lg"
      footer={<><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={submit}>{editTarget ? 'Save' : 'Create'}</Button></>}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Item Name" className="col-span-2"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Visual Aid PPT" /></Field>
        <Field label="Category">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ITEM_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Unit">
          <Select value={unit} onValueChange={setUnit}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ITEM_UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="HSN Code"><Input value={hsn} onChange={(e) => setHsn(e.target.value)} placeholder="4911" /></Field>
        <Field label="Min Stock Level"><Input type="number" value={minStock} onChange={(e) => setMinStock(e.target.value)} placeholder="500" /></Field>
        <Field label="Selling Rate (₹)"><Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="25000" /></Field>
        <Field label="Cost Rate (₹)"><Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="12000" /></Field>
        <Field label="Current Stock" className="col-span-2"><Input type="number" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" /></Field>
        <Field label="Description" className="col-span-2"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional notes about this item" /></Field>
      </div>
      {rate && cost && parseFloat(rate) > 0 && parseFloat(cost) > 0 && (
        <div className="text-xs text-muted-foreground p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
          <PackageCheck className="inline h-3.5 w-3.5 mr-1.5 text-emerald-600" />
          Margin per unit: <strong className="text-emerald-700 dark:text-emerald-400">{Rs(parseFloat(rate) - parseFloat(cost))}</strong>
          {' '}({(((parseFloat(rate) - parseFloat(cost)) / parseFloat(rate)) * 100).toFixed(1)}%)
        </div>
      )}
    </Modal>
  );
}

function AdjustStockModal({ item, onClose, onApply }: {
  item: Item;
  onClose: () => void;
  onApply: (delta: number) => void;
}) {
  const [type, setType] = React.useState<'in' | 'out'>('in');
  const [qty, setQty] = React.useState('');

  const delta = (parseInt(qty) || 0) * (type === 'in' ? 1 : -1);

  return (
    <Modal open onOpenChange={onClose} title={`Adjust Stock: ${item.name}`}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={() => onApply(delta)}>Apply</Button></>}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3.5 rounded-xl border border-border bg-muted/30 mb-3">
        <div><div className="text-[10px] font-bold uppercase text-muted-foreground">Current Stock</div><div className="text-sm font-bold">{item.stock.toLocaleString('en-IN')} {item.unit}</div></div>
        <div><div className="text-[10px] font-bold uppercase text-muted-foreground">Min Level</div><div className="text-sm font-bold">{item.minStock.toLocaleString('en-IN')}</div></div>
        <div><div className="text-[10px] font-bold uppercase text-muted-foreground">After Adjust</div><div className="text-sm font-bold text-emerald-600">{Math.max(0, item.stock + delta).toLocaleString('en-IN')}</div></div>
        <div><div className="text-[10px] font-bold uppercase text-muted-foreground">Updated</div><div className="text-sm font-bold">{fD(new Date().toISOString().split('T')[0])}</div></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Movement Type">
          <Select value={type} onValueChange={(v: 'in' | 'out') => setType(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="in">Stock In (+)</SelectItem>
              <SelectItem value="out">Stock Out (−)</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Quantity"><Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="100" /></Field>
      </div>
    </Modal>
  );
}
