'use client';

import * as React from 'react';
import {
  Save, Building2, Receipt, Banknote, Settings as SettingsIcon, CheckCircle2,
  Plus, Trash2, Pencil, X, Tag, FileText, FileSpreadsheet, Download, ShieldCheck, Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { useERP } from '@/lib/erp/store';
import { DEFAULT_GST_SETTINGS, GST_TAX_GROUPS } from '@/lib/erp/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { SectionHeader, Field, StatCard, Modal } from '../ui';
import type {
  GSTSettings as GSTSettingsType, TaxRate, HSNCode, CustomerGST, SupplierGST,
} from '@/lib/erp/types';

/**
 * Merge stored GST settings with defaults so every nested object (invoiceTypes,
 * posRules, itc, rcm, eInvoice, ewayBill, returns) always exists — even if the
 * user's persisted localStorage was saved before these nested fields were added.
 * This fixes the "Invoice Types / Place of Supply not opening" bug where stale
 * persisted data had `undefined` for nested objects.
 */
function mergeGstDefaults(s?: GSTSettingsType | null): GSTSettingsType {
  const d = DEFAULT_GST_SETTINGS;
  if (!s) return { ...d };
  return {
    ...d, ...s,
    invoiceTypes: { ...d.invoiceTypes, ...(s.invoiceTypes || {}) },
    posRules: { ...d.posRules, ...(s.posRules || {}) },
    itc: { ...d.itc, ...(s.itc || {}) },
    rcm: { ...d.rcm, ...(s.rcm || {}) },
    eInvoice: { ...d.eInvoice, ...(s.eInvoice || {}) },
    ewayBill: { ...d.ewayBill, ...(s.ewayBill || {}) },
    returns: { ...d.returns, ...(s.returns || {}) },
  } as GSTSettingsType;
}

/** Hook that returns fully-merged GST settings (always has all nested objects). */
function useGstSettings(): GSTSettingsType {
  const raw = useERP((s) => s.gstSettings);
  return React.useMemo(() => mergeGstDefaults(raw as GSTSettingsType | null | undefined), [raw]);
}

const INDIAN_STATES = [
  { code: '01', name: 'Jammu & Kashmir' }, { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' }, { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' }, { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' }, { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' }, { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' }, { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' }, { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' }, { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' }, { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' }, { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' }, { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' }, { code: '24', name: 'Gujarat' },
  { code: '27', name: 'Maharashtra' }, { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' }, { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' }, { code: '34', name: 'Puducherry' },
  { code: '36', name: 'Telangana' }, { code: '37', name: 'Andhra Pradesh' },
];

const TABS = [
  { k: 'company', l: '1. Company GST', icon: Building2 },
  { k: 'config', l: '2. GST Config', icon: SettingsIcon },
  { k: 'tax', l: '3. Tax Master', icon: Receipt },
  { k: 'hsn', l: '4. HSN/SAC', icon: Tag },
  { k: 'product', l: '5. Product GST', icon: PackageIcon },
  { k: 'customer', l: '6. Customer GST', icon: UsersIcon },
  { k: 'supplier', l: '7. Supplier GST', icon: TruckIcon },
  { k: 'invoice', l: '8. Invoice Types', icon: FileText },
  { k: 'pos', l: '9. Place of Supply', icon: MapPinIcon },
  { k: 'itc', l: '10. ITC', icon: ShieldCheck },
  { k: 'rcm', l: '11. RCM', icon: RefreshCwIcon },
  { k: 'einvoice', l: '12. E-Invoice', icon: FileText },
  { k: 'eway', l: '13. E-Way Bill', icon: TruckIcon },
  { k: 'returns', l: '14. GST Returns', icon: FileSpreadsheet },
  { k: 'reports', l: '15. GST Reports', icon: Download },
  { k: 'advanced', l: '16. Advanced', icon: SettingsIcon },
] as const;

type TabKey = typeof TABS[number]['k'];

function PackageIcon() { return <Tag className="h-4 w-4" />; }
function UsersIcon() { return <Building2 className="h-4 w-4" />; }
function TruckIcon() { return <FileText className="h-4 w-4" />; }
function MapPinIcon() { return <Building2 className="h-4 w-4" />; }
function RefreshCwIcon() { return <ShieldCheck className="h-4 w-4" />; }

export function GSTSettings() {
  const settings = useGstSettings();
  const updateGSTSettings = useERP((s) => s.updateGSTSettings);
  const gstInvoices = useERP((s) => s.gstInvoices) || [];
  const [activeTab, setActiveTab] = React.useState<TabKey>('company');

  const gstinValid = settings.gstin ? /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(settings.gstin) : false;

  return (
    <div>
      <SectionHeader
        title="GST Settings"
        subtitle="Comprehensive GST configuration — 16 editable categories covering company details, tax master, HSN, e-invoice, e-way bill, returns & more."
        accent="emerald"
      />

      {/* Status cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="GSTIN Status" value={settings.gstin ? (gstinValid ? 'Valid' : 'Invalid') : 'Not Set'} tone={settings.gstin && gstinValid ? 'accent' : 'warn'} icon={<Receipt className="h-4 w-4" />} />
        <StatCard label="GST Enabled" value={settings.gstEnabled ? 'Yes' : 'No'} tone={settings.gstEnabled ? 'accent' : 'default'} icon={<SettingsIcon className="h-4 w-4" />} />
        <StatCard label="Total Invoices" value={gstInvoices.length} tone="primary" icon={<FileText className="h-4 w-4" />} />
        <StatCard label="Registration" value={settings.registrationType} icon={<Building2 className="h-4 w-4" />} />
      </div>

      {/* Tab bar — horizontally scrollable */}
      <div className="mb-5 -mx-1 overflow-x-auto">
        <div className="flex gap-1.5 px-1 min-w-max pb-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.k;
            return (
              <button
                key={t.k}
                onClick={() => setActiveTab(t.k)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold whitespace-nowrap transition-all border',
                  active
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                    : 'bg-card text-muted-foreground border-border hover:border-emerald-300 hover:text-foreground',
                )}
              >
                <Icon />
                {t.l}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'company' && <CompanyTab />}
      {activeTab === 'config' && <ConfigTab />}
      {activeTab === 'tax' && <TaxMasterTab />}
      {activeTab === 'hsn' && <HSNMasterTab />}
      {activeTab === 'product' && <ProductGstTab />}
      {activeTab === 'customer' && <CustomerGstTab />}
      {activeTab === 'supplier' && <SupplierGstTab />}
      {activeTab === 'invoice' && <InvoiceTypesTab />}
      {activeTab === 'pos' && <PosRulesTab />}
      {activeTab === 'itc' && <ItcTab />}
      {activeTab === 'rcm' && <RcmTab />}
      {activeTab === 'einvoice' && <EInvoiceTab />}
      {activeTab === 'eway' && <EwayTab />}
      {activeTab === 'returns' && <ReturnsTab />}
      {activeTab === 'reports' && <ReportsTab />}
      {activeTab === 'advanced' && <AdvancedTab />}
    </div>
  );
}

// ============ Shared: toggle row + settings card ============
function Card({ title, icon, children, onSave }: { title: string; icon: React.ReactNode; children: React.ReactNode; onSave?: () => void }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 mb-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-bold flex items-center gap-2 text-emerald-600">{icon}{title}</div>
        {onSave && (
          <Button size="sm" className="h-8 bg-emerald-500 hover:bg-emerald-600" onClick={onSave}><Save className="h-3.5 w-3.5 mr-1" /> Save</Button>
        )}
      </div>
      {children}
    </div>
  );
}

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-border/50 last:border-0">
      <div className="min-w-0">
        <div className="text-[13px] font-bold">{label}</div>
        {desc && <div className="text-[11px] text-muted-foreground">{desc}</div>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

// ============ Tab 1: Company GST Details ============
function CompanyTab() {
  const settings = useGstSettings();
  const update = useERP((s) => s.updateGSTSettings);
  const [form, setForm] = React.useState<GSTSettingsType>(settings);
  // Re-sync local form if the store changes elsewhere (e.g. another tab edits company fields)
  React.useEffect(() => { setForm(settings); }, [settings]);
  const set = (k: keyof GSTSettingsType, v: any) => setForm((p) => ({ ...p, [k]: v }));
  const gstinValid = form.gstin ? /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(form.gstin) : false;

  const handleState = (name: string) => {
    const st = INDIAN_STATES.find((s) => s.name === name);
    set('state', name); set('stateCode', st?.code || ''); set('placeOfSupply', name);
  };

  // Only save the Company-GST-specific fields — NOT the whole form (avoids overwriting
  // nested objects like invoiceTypes/posRules with stale snapshots).
  const save = () => {
    update({
      legalName: form.legalName, tradeName: form.tradeName, gstin: form.gstin, pan: form.pan,
      businessType: form.businessType, registrationType: form.registrationType,
      state: form.state, stateCode: form.stateCode, placeOfSupply: form.placeOfSupply,
    });
    toast.success('Company GST details saved');
  };

  return (
    <Card title="Company GST Details" icon={<Building2 className="h-4 w-4" />} onSave={save}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Legal Name"><Input value={form.legalName} onChange={(e) => set('legalName', e.target.value)} /></Field>
        <Field label="Trade Name"><Input value={form.tradeName} onChange={(e) => set('tradeName', e.target.value)} /></Field>
        <Field label="GSTIN">
          <div className="relative">
            <Input value={form.gstin} onChange={(e) => set('gstin', e.target.value.toUpperCase())} placeholder="09AAAAA0000A1Z5" maxLength={15} className={cn('font-mono', form.gstin && (gstinValid ? 'border-emerald-400' : 'border-red-400'))} />
            {form.gstin && <div className="absolute right-3 top-1/2 -translate-y-1/2">{gstinValid ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <span className="text-xs text-red-500">Invalid</span>}</div>}
          </div>
        </Field>
        <Field label="PAN Number"><Input value={form.pan} onChange={(e) => set('pan', e.target.value.toUpperCase())} placeholder="AAAAA0000A" className="font-mono" maxLength={10} /></Field>
        <Field label="Business Type">
          <Select value={form.businessType} onValueChange={(v) => set('businessType', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {['Proprietorship', 'Partnership', 'Private Limited', 'Public Limited', 'LLP', 'HUF', 'Trust', 'Government'].map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Registration Type">
          <Select value={form.registrationType} onValueChange={(v) => set('registrationType', v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {['Regular', 'Composition', 'SEZ', 'Casual Taxable Person'].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="State">
          <Select value={form.state} onValueChange={handleState}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{INDIAN_STATES.map((s) => <SelectItem key={s.code} value={s.name}>{s.code} - {s.name}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="State Code"><Input value={form.stateCode} readOnly className="font-mono bg-muted/50" /></Field>
        <Field label="Place of Supply"><Input value={form.placeOfSupply} onChange={(e) => set('placeOfSupply', e.target.value)} /></Field>
      </div>
    </Card>
  );
}

// ============ Tab 2: GST Configuration ============
function ConfigTab() {
  const settings = useGstSettings();
  const update = useERP((s) => s.updateGSTSettings);
  const [form, setForm] = React.useState<GSTSettingsType>(settings);
  React.useEffect(() => { setForm(settings); }, [settings]);
  const set = (k: keyof GSTSettingsType, v: any) => setForm((p) => ({ ...p, [k]: v }));
  // Only save config fields — not nested objects.
  const save = () => {
    update({
      gstEnabled: form.gstEnabled, compositionDealer: form.compositionDealer,
      financialYear: form.financialYear, gstEffectiveDate: form.gstEffectiveDate,
      calculationMethod: form.calculationMethod, roundOff: form.roundOff,
      rcmEnabled: form.rcmEnabled, tdsTcsEnabled: form.tdsTcsEnabled,
    });
    toast.success('GST configuration saved');
  };

  return (
    <Card title="GST Configuration" icon={<SettingsIcon className="h-4 w-4" />} onSave={save}>
      <div className="space-y-1">
        <ToggleRow label="GST Enabled" desc="Master switch — turn GST calculation on/off across the app" checked={form.gstEnabled} onChange={(v) => set('gstEnabled', v)} />
        <ToggleRow label="Composition Dealer" desc={form.compositionDealer ? 'Yes — Composition Scheme (1% or 5% tax)' : 'No — Regular Dealer (full GST)'} checked={form.compositionDealer} onChange={(v) => set('compositionDealer', v)} />
        <ToggleRow label="Round Off Settings" desc="Round off final invoice totals to nearest rupee" checked={form.roundOff} onChange={(v) => set('roundOff', v)} />
        <ToggleRow label="Reverse Charge (RCM) Enabled" desc="Enable Reverse Charge Mechanism for applicable purchases" checked={form.rcmEnabled} onChange={(v) => set('rcmEnabled', v)} />
        <ToggleRow label="TDS/TCS under GST" desc="Enable Tax Deducted at Source / Tax Collected at Source tracking" checked={form.tdsTcsEnabled} onChange={(v) => set('tdsTcsEnabled', v)} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <Field label="Financial Year">
          <Select value={form.financialYear} onValueChange={(v) => set('financialYear', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{['2024-25', '2025-26', '2026-27', '2027-28'].map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="GST Effective Date"><Input type="date" value={form.gstEffectiveDate} onChange={(e) => set('gstEffectiveDate', e.target.value)} /></Field>
        <Field label="GST Calculation Method">
          <Select value={form.calculationMethod} onValueChange={(v) => set('calculationMethod', v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="exclusive">Exclusive (tax added on top)</SelectItem>
              <SelectItem value="inclusive">Inclusive (tax included in price)</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
    </Card>
  );
}

// ============ Tab 3: Tax Master ============
function TaxMasterTab() {
  const rates = useERP((s) => s.taxRates) || [];
  const createTaxRate = useERP((s) => s.createTaxRate);
  const updateTaxRate = useERP((s) => s.updateTaxRate);
  const deleteTaxRate = useERP((s) => s.deleteTaxRate);
  const [edit, setEdit] = React.useState<TaxRate | null>(null);
  const [showNew, setShowNew] = React.useState(false);

  return (
    <Card title="Tax Master — CGST / SGST / IGST / CESS Rates & Tax Groups" icon={<Receipt className="h-4 w-4" />}>
      {/* Tax groups reference */}
      <div className="mb-4 p-3 rounded-lg bg-muted/30 border border-border">
        <div className="text-[11px] font-bold text-muted-foreground uppercase mb-2">Standard GST Tax Groups (slabs)</div>
        <div className="flex flex-wrap gap-1.5">
          {GST_TAX_GROUPS.map((g) => (
            <Badge key={g} variant="outline" className="text-xs font-bold">{g}%</Badge>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-bold">Tax Rate Lines ({rates.length})</div>
        <Button size="sm" className="h-8 bg-emerald-500 hover:bg-emerald-600" onClick={() => setShowNew(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Add Rate</Button>
      </div>
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40"><tr><th className="text-left px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground">Name</th><th className="text-left px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground">Type</th><th className="text-left px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground">Rate</th><th className="text-right px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground">Actions</th></tr></thead>
          <tbody>
            {rates.map((r) => (
              <tr key={r.id} className="border-t border-border/50 hover:bg-muted/20">
                <td className="px-3 py-2 font-semibold">{r.name}</td>
                <td className="px-3 py-2"><Badge variant="outline" className={cn('text-[10px] font-bold', r.type === 'CGST' ? 'text-blue-600' : r.type === 'SGST' ? 'text-emerald-600' : r.type === 'IGST' ? 'text-purple-600' : 'text-orange-600')}>{r.type}</Badge></td>
                <td className="px-3 py-2 font-bold">{r.rate}%</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => setEdit(r)} className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-950/40 text-blue-500 mr-1"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => { if (confirm(`Delete ${r.name}?`)) { deleteTaxRate(r.id); toast.success('Tax rate deleted'); } }} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-950/40 text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                </td>
              </tr>
            ))}
            {rates.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-muted-foreground text-xs">No tax rates. Click "Add Rate" to create one.</td></tr>}
          </tbody>
        </table>
      </div>

      {(showNew || edit) && (
        <TaxRateForm existing={edit} onClose={() => { setShowNew(false); setEdit(null); }} onSave={(data) => {
          if (edit) { updateTaxRate(edit.id, data); toast.success('Tax rate updated'); }
          else { createTaxRate(data); toast.success('Tax rate added'); }
          setShowNew(false); setEdit(null);
        }} />
      )}
    </Card>
  );
}

function TaxRateForm({ existing, onClose, onSave }: { existing: TaxRate | null; onClose: () => void; onSave: (d: Omit<TaxRate, 'id'>) => void }) {
  const [name, setName] = React.useState(existing?.name || '');
  const [type, setType] = React.useState<TaxRate['type']>(existing?.type || 'CGST');
  const [rate, setRate] = React.useState(String(existing?.rate ?? ''));
  return (
    <Modal open onOpenChange={(v) => !v && onClose()} title={existing ? 'Edit Tax Rate' : 'New Tax Rate'} size="sm"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button className="bg-emerald-500 hover:bg-emerald-600" disabled={!name.trim() || !rate} onClick={() => onSave({ name: name.trim(), type, rate: parseFloat(rate) || 0 })}><Save className="h-4 w-4 mr-1" /> Save</Button></>}>
      <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. CGST 9%" autoFocus /></Field>
      <Field label="Type">
        <Select value={type} onValueChange={(v) => setType(v as TaxRate['type'])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['CGST', 'SGST', 'IGST', 'CESS'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
      </Field>
      <Field label="Rate (%)"><Input type="number" step="0.25" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="9" /></Field>
    </Modal>
  );
}

// ============ Tab 4: HSN/SAC Master ============
function HSNMasterTab() {
  const codes = useERP((s) => s.hsnCodes) || [];
  const createHSN = useERP((s) => s.createHSN);
  const updateHSN = useERP((s) => s.updateHSN);
  const deleteHSN = useERP((s) => s.deleteHSN);
  const [edit, setEdit] = React.useState<HSNCode | null>(null);
  const [showNew, setShowNew] = React.useState(false);

  return (
    <Card title="HSN/SAC Master" icon={<Tag className="h-4 w-4" />}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-bold">Codes ({codes.length})</div>
        <Button size="sm" className="h-8 bg-emerald-500 hover:bg-emerald-600" onClick={() => setShowNew(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Add Code</Button>
      </div>
      <div className="rounded-lg border border-border overflow-hidden max-h-[480px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 sticky top-0"><tr><th className="text-left px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground">Code</th><th className="text-left px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground">Type</th><th className="text-left px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground">Description</th><th className="text-left px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground">GST</th><th className="text-left px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground">UQC</th><th className="text-right px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground">Actions</th></tr></thead>
          <tbody>
            {codes.map((h) => (
              <tr key={h.id} className="border-t border-border/50 hover:bg-muted/20">
                <td className="px-3 py-2 font-mono font-bold">{h.code}</td>
                <td className="px-3 py-2"><Badge variant="outline" className={cn('text-[10px] font-bold', h.type === 'HSN' ? 'text-blue-600' : 'text-purple-600')}>{h.type}</Badge></td>
                <td className="px-3 py-2 text-xs max-w-[280px] truncate">{h.description}</td>
                <td className="px-3 py-2 font-bold">{h.gstRate}%</td>
                <td className="px-3 py-2 text-xs">{h.uqc}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => setEdit(h)} className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-950/40 text-blue-500 mr-1"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => { if (confirm(`Delete ${h.code}?`)) { deleteHSN(h.id); toast.success('HSN code deleted'); } }} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-950/40 text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                </td>
              </tr>
            ))}
            {codes.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-muted-foreground text-xs">No HSN/SAC codes.</td></tr>}
          </tbody>
        </table>
      </div>
      {(showNew || edit) && (
        <HSNForm existing={edit} onClose={() => { setShowNew(false); setEdit(null); }} onSave={(d) => {
          if (edit) { updateHSN(edit.id, d); toast.success('HSN code updated'); }
          else { createHSN(d); toast.success('HSN code added'); }
          setShowNew(false); setEdit(null);
        }} />
      )}
    </Card>
  );
}

function HSNForm({ existing, onClose, onSave }: { existing: HSNCode | null; onClose: () => void; onSave: (d: Omit<HSNCode, 'id'>) => void }) {
  const [code, setCode] = React.useState(existing?.code || '');
  const [type, setType] = React.useState<HSNCode['type']>(existing?.type || 'HSN');
  const [description, setDescription] = React.useState(existing?.description || '');
  const [gstRate, setGstRate] = React.useState(String(existing?.gstRate ?? '18'));
  const [uqc, setUqc] = React.useState(existing?.uqc || 'PCS');
  return (
    <Modal open onOpenChange={(v) => !v && onClose()} title={existing ? 'Edit HSN/SAC Code' : 'New HSN/SAC Code'} size="md"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button className="bg-emerald-500 hover:bg-emerald-600" disabled={!code.trim()} onClick={() => onSave({ code: code.trim(), type, description: description.trim(), gstRate: parseFloat(gstRate) || 0, uqc })}><Save className="h-4 w-4 mr-1" /> Save</Button></>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Code"><Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="4911" className="font-mono" autoFocus /></Field>
        <Field label="Type"><Select value={type} onValueChange={(v) => setType(v as HSNCode['type'])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="HSN">HSN (Goods)</SelectItem><SelectItem value="SAC">SAC (Services)</SelectItem></SelectContent></Select></Field>
        <Field label="Description" className="col-span-2"><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Printed brochures, leaflets" /></Field>
        <Field label="GST Rate (%)"><Select value={gstRate} onValueChange={setGstRate}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{GST_TAX_GROUPS.map((g) => <SelectItem key={g} value={String(g)}>{g}%</SelectItem>)}</SelectContent></Select></Field>
        <Field label="UQC (Unit)"><Select value={uqc} onValueChange={setUqc}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['PCS', 'NOS', 'SET', 'BOX', 'KG', 'ROLL', 'OTH'].map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select></Field>
      </div>
    </Modal>
  );
}

// ============ Tab 5: Product GST Settings ============
function ProductGstTab() {
  const items = useERP((s) => s.items);
  const updateItem = useERP((s) => s.updateItem);
  const hsnCodes = useERP((s) => s.hsnCodes) || [];

  return (
    <Card title="Product GST Settings — per-item HSN, GST Rate, Tax Inclusive/Exclusive, CESS, ITC" icon={<Tag className="h-4 w-4" />}>
      <div className="rounded-lg border border-border overflow-hidden max-h-[520px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 sticky top-0"><tr><th className="text-left px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground">Item</th><th className="text-left px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground">HSN</th><th className="text-left px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground">GST %</th><th className="text-left px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground">CESS</th><th className="text-left px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground">ITC</th></tr></thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-t border-border/50 hover:bg-muted/20">
                <td className="px-3 py-2"><div className="font-semibold text-xs">{it.name}</div><div className="text-[10px] text-muted-foreground">{it.id}</div></td>
                <td className="px-3 py-2">
                  <Select value={it.hsn || ''} onValueChange={(v) => { const h = hsnCodes.find((x) => x.code === v); updateItem(it.id, { hsn: v, gstRate: h?.gstRate ?? it.gstRate }); }}>
                    <SelectTrigger className="h-7 w-24 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>{hsnCodes.map((h) => <SelectItem key={h.id} value={h.code}>{h.code}</SelectItem>)}</SelectContent>
                  </Select>
                </td>
                <td className="px-3 py-2">
                  <Select value={String(it.gstRate ?? 18)} onValueChange={(v) => updateItem(it.id, { gstRate: parseFloat(v) })}>
                    <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{GST_TAX_GROUPS.map((g) => <SelectItem key={g} value={String(g)}>{g}%</SelectItem>)}</SelectContent>
                  </Select>
                </td>
                <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">—</Badge></td>
                <td className="px-3 py-2"><Badge variant="outline" className="text-[10px] font-bold text-emerald-600">Eligible</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground">HSN auto-applies the matching GST rate. Changes save instantly.</div>
    </Card>
  );
}

// ============ Tab 6: Customer GST ============
function CustomerGstTab() {
  const list = useERP((s) => s.customerGst) || [];
  const create = useERP((s) => s.createCustomerGst);
  const update = useERP((s) => s.updateCustomerGst);
  const del = useERP((s) => s.deleteCustomerGst);
  const [edit, setEdit] = React.useState<CustomerGST | null>(null);
  const [showNew, setShowNew] = React.useState(false);

  const [view, setView] = React.useState<CustomerGST | null>(null);

  return (
    <Card title="Customer GST Settings — full company details per customer" icon={<Building2 className="h-4 w-4" />}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-bold">Customers ({list.length})</div>
        <Button size="sm" className="h-8 bg-emerald-500 hover:bg-emerald-600" onClick={() => setShowNew(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Add Customer</Button>
      </div>
      <div className="rounded-lg border border-border overflow-hidden max-h-[480px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 sticky top-0"><tr><th className="text-left px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground">Customer</th><th className="text-left px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground">GSTIN</th><th className="text-left px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground">Contact</th><th className="text-left px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground">Reg Type</th><th className="text-left px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground">State</th><th className="text-left px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground">RCM</th><th className="text-right px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground">Actions</th></tr></thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} className="border-t border-border/50 hover:bg-muted/20">
                <td className="px-3 py-2">
                  <div className="font-semibold text-xs">{c.name}</div>
                  {c.companyName && c.companyName !== c.name && <div className="text-[10px] text-muted-foreground">{c.companyName}</div>}
                </td>
                <td className="px-3 py-2 font-mono text-xs">{c.gstin || '—'}</td>
                <td className="px-3 py-2 text-xs">
                  {c.phone && c.phone !== '-' ? <div>{c.phone}</div> : <span className="text-muted-foreground">—</span>}
                  {c.email && c.email !== '-' && <div className="text-[10px] text-muted-foreground">{c.email}</div>}
                </td>
                <td className="px-3 py-2"><Badge variant="outline" className="text-[10px] font-bold">{c.registrationType}</Badge></td>
                <td className="px-3 py-2 text-xs">{c.stateCode} - {c.state}</td>
                <td className="px-3 py-2">{c.reverseCharge ? <Badge className="text-[10px] bg-amber-500">RCM</Badge> : <span className="text-muted-foreground text-xs">—</span>}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => setView(c)} className="p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-950/40 text-emerald-500 mr-1" title="View details"><Eye className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setEdit(c)} className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-950/40 text-blue-500 mr-1" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => { if (confirm(`Delete ${c.name}?`)) { del(c.id); toast.success('Customer GST deleted'); } }} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-950/40 text-red-500" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-muted-foreground text-xs">No customers yet.</td></tr>}
          </tbody>
        </table>
      </div>
      {(showNew || edit) && (
        <CustomerForm existing={edit} onClose={() => { setShowNew(false); setEdit(null); }} onSave={(d) => {
          if (edit) { update(edit.id, d); toast.success('Customer updated'); }
          else { create(d); toast.success('Customer added'); }
          setShowNew(false); setEdit(null);
        }} />
      )}
      {view && <CustomerDetail customer={view} onClose={() => setView(null)} onEdit={() => { setEdit(view); setView(null); }} />}
    </Card>
  );
}

// ============ Customer Detail Modal (full company details) ============
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0">
      <div className="text-[10px] font-bold uppercase text-muted-foreground w-32 flex-shrink-0 mt-0.5">{label}</div>
      <div className="text-xs font-semibold flex-1 break-words">{value || '—'}</div>
    </div>
  );
}

function CustomerDetail({ customer: c, onClose, onEdit }: { customer: CustomerGST; onClose: () => void; onEdit: () => void }) {
  return (
    <Modal open onOpenChange={(v) => !v && onClose()} title="Customer Company Details" description={c.name} size="md"
      footer={<><Button variant="outline" onClick={onClose}>Close</Button><Button className="bg-emerald-500 hover:bg-emerald-600" onClick={onEdit}><Pencil className="h-4 w-4 mr-1" /> Edit</Button></>}>
      <div className="rounded-lg border border-border bg-muted/20 p-4">
        <div className="text-sm font-black mb-3 text-emerald-600 flex items-center gap-2"><Building2 className="h-4 w-4" /> {c.companyName || c.name}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
          <DetailRow label="Display Name" value={c.name} />
          <DetailRow label="Company Name" value={c.companyName} />
          <DetailRow label="GSTIN" value={c.gstin} />
          <DetailRow label="Registration Type" value={c.registrationType} />
          <DetailRow label="Address" value={c.address} />
          <DetailRow label="City" value={c.city} />
          <DetailRow label="State" value={`${c.stateCode} - ${c.state}`} />
          <DetailRow label="Pincode" value={c.pincode} />
          <DetailRow label="Phone" value={c.phone} />
          <DetailRow label="Email" value={c.email} />
          <DetailRow label="Contact Person" value={c.contactPerson} />
          <DetailRow label="Place of Supply" value={c.placeOfSupply} />
          <DetailRow label="Reverse Charge" value={c.reverseCharge ? 'Yes' : 'No'} />
          <DetailRow label="Export / SEZ" value={c.exportOrSez ? 'Yes' : 'No'} />
        </div>
      </div>
    </Modal>
  );
}

function CustomerForm({ existing, onClose, onSave }: { existing: CustomerGST | null; onClose: () => void; onSave: (d: Omit<CustomerGST, 'id'>) => void }) {
  const [f, setF] = React.useState<Omit<CustomerGST, 'id'>>({
    name: existing?.name || '',
    companyName: existing?.companyName || '',
    gstin: existing?.gstin || '',
    address: existing?.address || '',
    city: existing?.city || '',
    state: existing?.state || 'Uttar Pradesh', stateCode: existing?.stateCode || '09',
    pincode: existing?.pincode || '',
    phone: existing?.phone || '',
    email: existing?.email || '',
    contactPerson: existing?.contactPerson || '',
    registrationType: existing?.registrationType || 'Regular',
    placeOfSupply: existing?.placeOfSupply || 'Uttar Pradesh',
    reverseCharge: existing?.reverseCharge || false,
    exportOrSez: existing?.exportOrSez || false,
  });
  const set = (k: keyof typeof f, v: any) => setF((p) => ({ ...p, [k]: v }));
  const handleState = (name: string) => { const st = INDIAN_STATES.find((s) => s.name === name); set('state', name); set('stateCode', st?.code || ''); set('placeOfSupply', name); };
  return (
    <Modal open onOpenChange={(v) => !v && onClose()} title={existing ? 'Edit Customer GST' : 'New Customer GST'} description="Capture the customer's full company details — used in invoices & GST returns." size="lg"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button className="bg-emerald-500 hover:bg-emerald-600" disabled={!f.name.trim()} onClick={() => onSave(f)}><Save className="h-4 w-4 mr-1" /> Save</Button></>}>
      {/* Company identity section */}
      <div className="rounded-lg border border-border bg-muted/20 p-3 mb-3">
        <div className="text-[11px] font-bold uppercase text-emerald-600 mb-2 flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> Company Details</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Display Name *"><Input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. SunPharma Ltd" autoFocus /></Field>
          <Field label="Legal Company Name"><Input value={f.companyName} onChange={(e) => set('companyName', e.target.value)} placeholder="e.g. Sun Pharmaceutical Industries Ltd" /></Field>
          <Field label="GSTIN"><Input value={f.gstin} onChange={(e) => set('gstin', e.target.value.toUpperCase())} placeholder="27AAACS0688F1Z3" className="font-mono" maxLength={15} /></Field>
          <Field label="Registration Type"><Select value={f.registrationType} onValueChange={(v) => set('registrationType', v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['Regular', 'Composition', 'SEZ', 'Unregistered', 'Export'].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></Field>
        </div>
      </div>

      {/* Address section */}
      <div className="rounded-lg border border-border bg-muted/20 p-3 mb-3">
        <div className="text-[11px] font-bold uppercase text-emerald-600 mb-2 flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> Address</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Address (Street / Area)" className="md:col-span-2"><Input value={f.address} onChange={(e) => set('address', e.target.value)} placeholder="Sun House, Western Express Highway, Andheri (E)" /></Field>
          <Field label="City"><Input value={f.city} onChange={(e) => set('city', e.target.value)} placeholder="Mumbai" /></Field>
          <Field label="Pincode"><Input value={f.pincode} onChange={(e) => set('pincode', e.target.value)} placeholder="400069" className="font-mono" maxLength={6} /></Field>
          <Field label="State"><Select value={f.state} onValueChange={handleState}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{INDIAN_STATES.map((s) => <SelectItem key={s.code} value={s.name}>{s.code} - {s.name}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Place of Supply"><Input value={f.placeOfSupply} onChange={(e) => set('placeOfSupply', e.target.value)} /></Field>
        </div>
      </div>

      {/* Contact section */}
      <div className="rounded-lg border border-border bg-muted/20 p-3 mb-3">
        <div className="text-[11px] font-bold uppercase text-emerald-600 mb-2 flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Contact</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Contact Person"><Input value={f.contactPerson} onChange={(e) => set('contactPerson', e.target.value)} placeholder="Suresh Iyer" /></Field>
          <Field label="Phone"><Input value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="022-43294329" /></Field>
          <Field label="Email" className="md:col-span-2"><Input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="procurement@sunpharma.com" /></Field>
        </div>
      </div>

      {/* GST flags */}
      <div className="rounded-lg border border-border bg-muted/20 p-3">
        <div className="text-[11px] font-bold uppercase text-emerald-600 mb-2 flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> GST Flags</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          <ToggleRow label="Reverse Charge Applicable" checked={f.reverseCharge} onChange={(v) => set('reverseCharge', v)} />
          <ToggleRow label="Export / SEZ Customer" checked={f.exportOrSez} onChange={(v) => set('exportOrSez', v)} />
        </div>
      </div>
    </Modal>
  );
}

// ============ Tab 7: Supplier GST ============
function SupplierGstTab() {
  const list = useERP((s) => s.supplierGst) || [];
  const create = useERP((s) => s.createSupplierGst);
  const update = useERP((s) => s.updateSupplierGst);
  const del = useERP((s) => s.deleteSupplierGst);
  const [edit, setEdit] = React.useState<SupplierGST | null>(null);
  const [showNew, setShowNew] = React.useState(false);

  return (
    <Card title="Supplier GST Settings" icon={<TruckIcon />}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-bold">Suppliers ({list.length})</div>
        <Button size="sm" className="h-8 bg-emerald-500 hover:bg-emerald-600" onClick={() => setShowNew(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Add Supplier</Button>
      </div>
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40"><tr><th className="text-left px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground">Name</th><th className="text-left px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground">GSTIN</th><th className="text-left px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground">Reg Type</th><th className="text-left px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground">RCM</th><th className="text-right px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground">Actions</th></tr></thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id} className="border-t border-border/50 hover:bg-muted/20">
                <td className="px-3 py-2 font-semibold text-xs">{s.name}</td>
                <td className="px-3 py-2 font-mono text-xs">{s.gstin || '—'}</td>
                <td className="px-3 py-2"><Badge variant="outline" className="text-[10px] font-bold">{s.registrationType}</Badge></td>
                <td className="px-3 py-2">{s.rcmApplicable ? <Badge className="text-[10px] bg-amber-500">RCM</Badge> : <span className="text-muted-foreground text-xs">—</span>}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => setEdit(s)} className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-950/40 text-blue-500 mr-1"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => { if (confirm(`Delete ${s.name}?`)) { del(s.id); toast.success('Supplier deleted'); } }} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-950/40 text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(showNew || edit) && (
        <SupplierForm existing={edit} onClose={() => { setShowNew(false); setEdit(null); }} onSave={(d) => {
          if (edit) { update(edit.id, d); toast.success('Supplier updated'); }
          else { create(d); toast.success('Supplier added'); }
          setShowNew(false); setEdit(null);
        }} />
      )}
    </Card>
  );
}

function SupplierForm({ existing, onClose, onSave }: { existing: SupplierGST | null; onClose: () => void; onSave: (d: Omit<SupplierGST, 'id'>) => void }) {
  const [f, setF] = React.useState<Omit<SupplierGST, 'id'>>({ name: existing?.name || '', gstin: existing?.gstin || '', registrationType: existing?.registrationType || 'Regular', rcmApplicable: existing?.rcmApplicable || false });
  const set = (k: keyof typeof f, v: any) => setF((p) => ({ ...p, [k]: v }));
  return (
    <Modal open onOpenChange={(v) => !v && onClose()} title={existing ? 'Edit Supplier GST' : 'New Supplier GST'} size="sm"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button className="bg-emerald-500 hover:bg-emerald-600" disabled={!f.name.trim()} onClick={() => onSave(f)}><Save className="h-4 w-4 mr-1" /> Save</Button></>}>
      <Field label="Name"><Input value={f.name} onChange={(e) => set('name', e.target.value)} autoFocus /></Field>
      <Field label="GSTIN"><Input value={f.gstin} onChange={(e) => set('gstin', e.target.value.toUpperCase())} placeholder="09AABCP1234M1Z2" className="font-mono" maxLength={15} /></Field>
      <Field label="Registration Type"><Select value={f.registrationType} onValueChange={(v) => set('registrationType', v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['Regular', 'Composition', 'SEZ', 'Unregistered'].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></Field>
      <div className="mt-2"><ToggleRow label="RCM Applicable" checked={f.rcmApplicable} onChange={(v) => set('rcmApplicable', v)} /></div>
    </Modal>
  );
}

// ============ Tab 8: Invoice Types ============
function InvoiceTypesTab() {
  const settings = useGstSettings();
  const update = useERP((s) => s.updateGSTSettings);
  const it = settings.invoiceTypes;
  const toggle = (k: keyof GSTSettingsType['invoiceTypes'], v: boolean) => update({ invoiceTypes: { ...it, [k]: v } } as any);
  return (
    <Card title="Invoice Settings — enabled invoice types" icon={<FileText className="h-4 w-4" />}>
      <div className="space-y-1">
        <ToggleRow label="Tax Invoice" desc="Standard GST tax invoice" checked={it.taxInvoice} onChange={(v) => toggle('taxInvoice', v)} />
        <ToggleRow label="Bill of Supply" desc="For composition / exempt supplies (no GST)" checked={it.billOfSupply} onChange={(v) => toggle('billOfSupply', v)} />
        <ToggleRow label="Debit Note" desc="Debit note for price escalation" checked={it.debitNote} onChange={(v) => toggle('debitNote', v)} />
        <ToggleRow label="Credit Note" desc="Credit note for returns / adjustments" checked={it.creditNote} onChange={(v) => toggle('creditNote', v)} />
        <ToggleRow label="Export Invoice" desc="Zero-rated export invoice (with/without payment)" checked={it.exportInvoice} onChange={(v) => toggle('exportInvoice', v)} />
        <ToggleRow label="SEZ Invoice" desc="Special Economic Zone invoice" checked={it.sezInvoice} onChange={(v) => toggle('sezInvoice', v)} />
        <ToggleRow label="RCM Invoice" desc="Reverse Charge Mechanism invoice" checked={it.rcmInvoice} onChange={(v) => toggle('rcmInvoice', v)} />
      </div>
    </Card>
  );
}

// ============ Tab 9: Place of Supply Rules ============
function PosRulesTab() {
  const settings = useGstSettings();
  const update = useERP((s) => s.updateGSTSettings);
  const r = settings.posRules;
  const set = (k: keyof GSTSettingsType['posRules'], v: string) => update({ posRules: { ...r, [k]: v } } as any);
  return (
    <Card title="Place of Supply Rules" icon={<MapPinIcon />}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Intra-State Supply" desc="Same state → CGST + SGST"><Input value={r.intraState} onChange={(e) => set('intraState', e.target.value)} /></Field>
        <Field label="Inter-State Supply" desc="Different state → IGST"><Input value={r.interState} onChange={(e) => set('interState', e.target.value)} /></Field>
        <Field label="Export" desc="Zero-rated supply"><Input value={r.exportRule} onChange={(e) => set('exportRule', e.target.value)} /></Field>
        <Field label="SEZ" desc="SEZ supply"><Input value={r.sezRule} onChange={(e) => set('sezRule', e.target.value)} /></Field>
      </div>
      <div className="mt-3 text-[11px] text-muted-foreground">Changes save instantly.</div>
    </Card>
  );
}

// ============ Tab 10: ITC ============
function ItcTab() {
  const settings = useGstSettings();
  const update = useERP((s) => s.updateGSTSettings);
  const itc = settings.itc;
  const toggle = (k: keyof GSTSettingsType['itc'], v: boolean) => update({ itc: { ...itc, [k]: v } } as any);
  return (
    <Card title="Input Tax Credit (ITC)" icon={<ShieldCheck className="h-4 w-4" />}>
      <div className="space-y-1">
        <ToggleRow label="ITC Allowed" desc="Claim input tax credit on eligible purchases" checked={itc.allowed} onChange={(v) => toggle('allowed', v)} />
        <ToggleRow label="Blocked Credit" desc="Track blocked credits (motor vehicles, etc.)" checked={itc.blockedCredit} onChange={(v) => toggle('blockedCredit', v)} />
        <ToggleRow label="Partial ITC" desc="Track partial ITC on common expenses" checked={itc.partialItc} onChange={(v) => toggle('partialItc', v)} />
        <ToggleRow label="ITC Reversal" desc="Enable ITC reversal tracking (Rule 42/43)" checked={itc.reversal} onChange={(v) => toggle('reversal', v)} />
      </div>
    </Card>
  );
}

// ============ Tab 11: RCM ============
function RcmTab() {
  const settings = useGstSettings();
  const update = useERP((s) => s.updateGSTSettings);
  const rcm = settings.rcm;
  const toggle = (k: keyof GSTSettingsType['rcm'], v: boolean) => update({ rcm: { ...rcm, [k]: v } } as any);
  return (
    <Card title="Reverse Charge Mechanism (RCM)" icon={<RefreshCwIcon />}>
      <div className="space-y-1">
        <ToggleRow label="RCM Purchase" desc="Track RCM on purchases from unregistered suppliers" checked={rcm.rcmPurchase} onChange={(v) => toggle('rcmPurchase', v)} />
        <ToggleRow label="Self Invoice" desc="Generate self-invoice for RCM purchases" checked={rcm.selfInvoice} onChange={(v) => toggle('selfInvoice', v)} />
        <ToggleRow label="Payment Voucher" desc="Generate payment voucher under RCM" checked={rcm.paymentVoucher} onChange={(v) => toggle('paymentVoucher', v)} />
        <ToggleRow label="RCM Liability Report" desc="Generate RCM liability report" checked={rcm.liabilityReport} onChange={(v) => toggle('liabilityReport', v)} />
      </div>
    </Card>
  );
}

// ============ Tab 12: E-Invoice ============
function EInvoiceTab() {
  const settings = useGstSettings();
  const update = useERP((s) => s.updateGSTSettings);
  const ei = settings.eInvoice;
  const [form, setForm] = React.useState(ei);
  React.useEffect(() => setForm(ei), [ei]);
  const set = (k: keyof GSTSettingsType['eInvoice'], v: any) => setForm((p) => ({ ...p, [k]: v }));
  const save = () => { update({ eInvoice: form } as any); toast.success('E-Invoice settings saved'); };
  return (
    <Card title="E-Invoice Settings (IRP)" icon={<FileText className="h-4 w-4" />} onSave={save}>
      <div className="space-y-1 mb-4">
        <ToggleRow label="E-Invoice Enabled" desc="Enable IRN generation via IRP" checked={form.enabled} onChange={(v) => set('enabled', v)} />
        <ToggleRow label="Auto IRN Generation" desc="Auto-generate IRN when invoice is created" checked={form.autoIrn} onChange={(v) => set('autoIrn', v)} />
        <ToggleRow label="QR Code" desc="Print QR code on invoices" checked={form.qrCode} onChange={(v) => set('qrCode', v)} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="IRP API URL" className="md:col-span-2"><Input value={form.irpApiUrl} onChange={(e) => set('irpApiUrl', e.target.value)} className="font-mono text-xs" /></Field>
        <Field label="Client ID"><Input value={form.clientId} onChange={(e) => set('clientId', e.target.value)} className="font-mono text-xs" /></Field>
        <Field label="Client Secret"><Input type="password" value={form.clientSecret} onChange={(e) => set('clientSecret', e.target.value)} className="font-mono text-xs" /></Field>
      </div>
      <div className="mt-3 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-[10px] text-amber-700 dark:text-amber-300">⚠ Credentials are stored locally in this demo. In production, store in a secure secrets manager.</div>
    </Card>
  );
}

// ============ Tab 13: E-Way Bill ============
function EwayTab() {
  const settings = useGstSettings();
  const update = useERP((s) => s.updateGSTSettings);
  const ew = settings.ewayBill;
  const [form, setForm] = React.useState(ew);
  React.useEffect(() => setForm(ew), [ew]);
  const set = (k: keyof GSTSettingsType['ewayBill'], v: any) => setForm((p) => ({ ...p, [k]: v }));
  const save = () => { update({ ewayBill: form } as any); toast.success('E-Way Bill settings saved'); };
  return (
    <Card title="E-Way Bill Settings" icon={<TruckIcon />} onSave={save}>
      <div className="space-y-1 mb-4">
        <ToggleRow label="E-Way Bill Enabled" desc="Enable e-way bill generation" checked={form.enabled} onChange={(v) => set('enabled', v)} />
        <ToggleRow label="Auto Generate E-Way Bill" desc="Auto-generate when invoice value > ₹50,000" checked={form.autoGenerate} onChange={(v) => set('autoGenerate', v)} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="API URL" className="md:col-span-2"><Input value={form.apiUrl} onChange={(e) => set('apiUrl', e.target.value)} className="font-mono text-xs" /></Field>
        <Field label="Transporter ID"><Input value={form.transporterId} onChange={(e) => set('transporterId', e.target.value)} className="font-mono text-xs" placeholder="09AAACC1234M1Z5" /></Field>
        <Field label="Transporter Name"><Input value={form.transporterName} onChange={(e) => set('transporterName', e.target.value)} /></Field>
      </div>
      <div className="mt-3 text-[11px] text-muted-foreground">Part-A (invoice + transporter details) and Part-B (vehicle number) are captured per-consignment during dispatch.</div>
    </Card>
  );
}

// ============ Tab 14: GST Returns ============
function ReturnsTab() {
  const settings = useGstSettings();
  const update = useERP((s) => s.updateGSTSettings);
  const r = settings.returns;
  const toggle = (k: keyof GSTSettingsType['returns'], v: boolean) => update({ returns: { ...r, [k]: v } } as any);
  return (
    <Card title="GST Return Settings" icon={<FileSpreadsheet className="h-4 w-4" />}>
      <div className="space-y-1">
        <ToggleRow label="GSTR-1" desc="Outward supplies return (monthly/quarterly)" checked={r.gstr1} onChange={(v) => toggle('gstr1', v)} />
        <ToggleRow label="GSTR-3B" desc="Summary return with tax payment" checked={r.gstr3b} onChange={(v) => toggle('gstr3b', v)} />
        <ToggleRow label="GSTR-2B Reconciliation" desc="Auto-reconcile ITC with GSTR-2B" checked={r.gstr2bRecon} onChange={(v) => toggle('gstr2bRecon', v)} />
        <ToggleRow label="GSTR-9" desc="Annual return" checked={r.gstr9} onChange={(v) => toggle('gstr9', v)} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" onClick={() => toast.success('JSON export started (demo)')}><Download className="h-3.5 w-3.5 mr-1" /> Export JSON</Button>
        <Button variant="outline" size="sm" onClick={() => toast.success('Excel export started (demo)')}><FileSpreadsheet className="h-3.5 w-3.5 mr-1" /> Export Excel</Button>
      </div>
    </Card>
  );
}

// ============ Tab 15: GST Reports ============
function ReportsTab() {
  const reports = [
    { name: 'Sales Register', desc: 'All outward supplies with GST breakdown' },
    { name: 'Purchase Register', desc: 'All inward supplies with ITC' },
    { name: 'GST Summary', desc: 'Total CGST/SGST/IGST collected & paid' },
    { name: 'HSN Summary', desc: 'HSN-wise sales summary for GSTR-1' },
    { name: 'Tax Liability', desc: 'Net tax payable after ITC' },
    { name: 'ITC Report', desc: 'Input tax credit claimed' },
    { name: 'RCM Report', desc: 'Reverse charge liability & payment' },
    { name: 'GST Audit Report', desc: 'Annual reconciliation for audit' },
  ];
  return (
    <Card title="GST Reports" icon={<Download className="h-4 w-4" />}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {reports.map((r) => (
          <div key={r.name} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20 hover:border-emerald-300 transition-all">
            <div className="min-w-0">
              <div className="text-[13px] font-bold">{r.name}</div>
              <div className="text-[11px] text-muted-foreground">{r.desc}</div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toast.success(`${r.name}: JSON export started (demo)`)}><Download className="h-3 w-3" /></Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toast.success(`${r.name}: Excel export started (demo)`)}><FileSpreadsheet className="h-3 w-3" /></Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ============ Tab 16: Advanced ============
function AdvancedTab() {
  const settings = useGstSettings();
  const update = useERP((s) => s.updateGSTSettings);
  const [form, setForm] = React.useState(settings);
  React.useEffect(() => setForm(settings), [settings]);
  const set = (k: keyof GSTSettingsType, v: any) => setForm((p) => ({ ...p, [k]: v }));
  // Only save advanced + invoice-numbering fields — NOT nested objects.
  const save = () => {
    update({
      multiGstin: form.multiGstin, branchWise: form.branchWise, multiState: form.multiState,
      multipleVerticals: form.multipleVerticals, lockPeriod: form.lockPeriod,
      amendments: form.amendments, autoCalc: form.autoCalc, manualOverride: form.manualOverride,
      auditLog: form.auditLog, invoicePrefix: form.invoicePrefix, invoiceStartNo: form.invoiceStartNo,
      bankName: form.bankName, bankAccount: form.bankAccount, bankIfsc: form.bankIfsc, bankUpi: form.bankUpi,
    });
    toast.success('Advanced settings saved');
  };
  return (
    <Card title="Advanced Settings" icon={<SettingsIcon className="h-4 w-4" />} onSave={save}>
      <div className="space-y-1 mb-4">
        <ToggleRow label="Multi GSTIN Support" desc="Multiple GSTINs for different branches/states" checked={form.multiGstin} onChange={(v) => set('multiGstin', v)} />
        <ToggleRow label="Branch-wise GST" desc="Track GST separately per branch" checked={form.branchWise} onChange={(v) => set('branchWise', v)} />
        <ToggleRow label="Multi-State Operations" desc="Operations across multiple states" checked={form.multiState} onChange={(v) => set('multiState', v)} />
        <ToggleRow label="Multiple Business Verticals" desc="Separate GST tracking per vertical" checked={form.multipleVerticals} onChange={(v) => set('multipleVerticals', v)} />
        <ToggleRow label="Amendment Entries" desc="Allow amendment entries for filed returns" checked={form.amendments} onChange={(v) => set('amendments', v)} />
        <ToggleRow label="Auto GST Calculation" desc="Auto-calculate CGST/SGST/IGST on invoices" checked={form.autoCalc} onChange={(v) => set('autoCalc', v)} />
        <ToggleRow label="Manual GST Override" desc="Allow manual GST rate override (with permission)" checked={form.manualOverride} onChange={(v) => set('manualOverride', v)} />
        <ToggleRow label="GST Audit Log" desc="Log all GST-related changes for audit" checked={form.auditLog} onChange={(v) => set('auditLog', v)} />
      </div>
      <Field label="GST Lock Period" desc="Prevent edits to GST data before this date (YYYY-MM)">
        <Input value={form.lockPeriod} onChange={(e) => set('lockPeriod', e.target.value)} placeholder="2026-03" className="font-mono" />
      </Field>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Field label="Invoice Prefix"><Input value={form.invoicePrefix} onChange={(e) => set('invoicePrefix', e.target.value.toUpperCase())} className="font-mono" /></Field>
        <Field label="Starting Number"><Input type="number" value={form.invoiceStartNo} onChange={(e) => set('invoiceStartNo', parseInt(e.target.value) || 1)} /></Field>
      </div>
    </Card>
  );
}
