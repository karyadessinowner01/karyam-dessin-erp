'use client';

import * as React from 'react';
import {
  Plus, Pencil, Trash2, Stethoscope, Pill, Building2,
  Phone, MapPin, Award, TrendingUp, Store,
} from 'lucide-react';
import { toast } from 'sonner';
import { useERP } from '@/lib/erp/store';
import { Rs, matchSearch } from '@/lib/erp/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  SectionHeader, TableShell, Th, Td, EmptyState,
  Modal, ConfirmDialog, Field, StatCard, FilterBar, FilterChip,
} from '../ui';
import type { Doctor, Chemist } from '@/lib/erp/types';

const DOCTOR_CATEGORIES: Doctor['category'][] = ['A', 'B', 'C'];
const CHEMIST_TYPES: Chemist['type'][] = ['Chemist', 'Stockist'];
const VISIT_FREQUENCIES = ['Weekly', 'Fortnightly', 'Monthly', 'Quarterly'];

const CATEGORY_BADGE: Record<string, string> = {
  A: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  B: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  C: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

const TYPE_BADGE: Record<Chemist['type'], string> = {
  Chemist: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  Stockist: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
};

export function PharmaCRM() {
  const doctors = useERP((s) => s.doctors) ?? [];
  const chemists = useERP((s) => s.chemists) ?? [];
  const team = useERP((s) => s.team);
  const createDoctor = useERP((s) => s.createDoctor);
  const updateDoctor = useERP((s) => s.updateDoctor);
  const deleteDoctor = useERP((s) => s.deleteDoctor);
  const createChemist = useERP((s) => s.createChemist);
  const updateChemist = useERP((s) => s.updateChemist);
  const deleteChemist = useERP((s) => s.deleteChemist);

  const [tab, setTab] = React.useState<'doctors' | 'chemists'>('doctors');

  // ===== Doctor state =====
  const [docSearch, setDocSearch] = React.useState('');
  const [docSpecFilter, setDocSpecFilter] = React.useState<string>('all');
  const [docCatFilter, setDocCatFilter] = React.useState<string>('all');
  const [showNewDoctor, setShowNewDoctor] = React.useState(false);
  const [editDoctor, setEditDoctor] = React.useState<Doctor | null>(null);
  const [confirmDeleteDoctor, setConfirmDeleteDoctor] = React.useState<Doctor | null>(null);

  // ===== Chemist state =====
  const [chSearch, setChSearch] = React.useState('');
  const [chTypeFilter, setChTypeFilter] = React.useState<string>('all');
  const [showNewChemist, setShowNewChemist] = React.useState(false);
  const [editChemist, setEditChemist] = React.useState<Chemist | null>(null);
  const [confirmDeleteChemist, setConfirmDeleteChemist] = React.useState<Chemist | null>(null);

  const activeTeam = team.filter((m) => m.active);
  const specs = React.useMemo(
    () => Array.from(new Set(doctors.map((d) => d.speciality).filter(Boolean))).sort(),
    [doctors],
  );

  // ===== Doctor filter =====
  const filteredDoctors = doctors.filter((d) => {
    if (!matchSearch(
      `${d.id} ${d.name} ${d.speciality} ${d.degree || ''} ${d.hospital || ''} ${d.clinic || ''} ${d.city} ${d.state} ${d.allocatedToName || ''} ${d.brands || ''}`,
      docSearch,
    )) return false;
    if (docSpecFilter !== 'all' && d.speciality !== docSpecFilter) return false;
    if (docCatFilter !== 'all' && (d.category || 'Uncategorized') !== docCatFilter) return false;
    return true;
  });

  // ===== Chemist filter =====
  const filteredChemists = chemists.filter((c) => {
    if (!matchSearch(
      `${c.id} ${c.name} ${c.type} ${c.owner || ''} ${c.city} ${c.state} ${c.phone} ${c.gstin || ''} ${c.allocatedToName || ''}`,
      chSearch,
    )) return false;
    if (chTypeFilter !== 'all' && c.type !== chTypeFilter) return false;
    return true;
  });

  // ===== Stats =====
  const totalDoctors = doctors.length;
  const totalChemists = chemists.length;
  const aCategoryDoctors = doctors.filter((d) => d.category === 'A').length;
  const totalPotential = doctors.reduce((s, d) => s + (d.potential || 0), 0);

  const docSpecCount = (sp: string) => doctors.filter((d) => d.speciality === sp).length;
  const docCatCount = (cat: string) => doctors.filter((d) => (d.category || 'Uncategorized') === cat).length;
  const chTypeCount = (t: string) => chemists.filter((c) => c.type === t).length;

  const docHasFilter = docSpecFilter !== 'all' || docCatFilter !== 'all';
  const chHasFilter = chTypeFilter !== 'all';

  return (
    <div>
      <SectionHeader
        title="Pharma CRM"
        subtitle="Doctor & Chemist master with allocations, categories and outstanding."
        accent="blue"
        actions={
          tab === 'doctors' ? (
            <Button onClick={() => setShowNewDoctor(true)} className="h-9 bg-slate-900 hover:bg-slate-800">
              <Plus className="h-4 w-4" /> New Doctor
            </Button>
          ) : (
            <Button onClick={() => setShowNewChemist(true)} className="h-9 bg-slate-900 hover:bg-slate-800">
              <Plus className="h-4 w-4" /> New Chemist
            </Button>
          )
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Doctors" value={totalDoctors} tone="primary" icon={<Stethoscope className="h-4 w-4" />} />
        <StatCard label="Total Chemists" value={totalChemists} icon={<Store className="h-4 w-4" />} />
        <StatCard label="A-Category Doctors" value={aCategoryDoctors} tone="accent" icon={<Award className="h-4 w-4" />} />
        <StatCard label="Total Potential" value={Rs(totalPotential)} icon={<TrendingUp className="h-4 w-4" />} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'doctors' | 'chemists')} className="mb-4">
        <TabsList>
          <TabsTrigger value="doctors" className="gap-1.5"><Stethoscope className="h-3.5 w-3.5" /> Doctors ({totalDoctors})</TabsTrigger>
          <TabsTrigger value="chemists" className="gap-1.5"><Pill className="h-3.5 w-3.5" /> Chemists ({totalChemists})</TabsTrigger>
        </TabsList>

        {/* ============ DOCTORS TAB ============ */}
        <TabsContent value="doctors">
          <FilterBar
            label="Filters"
            onClear={() => { setDocSpecFilter('all'); setDocCatFilter('all'); }}
            showClear={docHasFilter}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Speciality:</span>
            <FilterChip label="All" active={docSpecFilter === 'all'} onClick={() => setDocSpecFilter('all')} count={totalDoctors} />
            {specs.map((sp) => (
              <FilterChip key={sp} label={sp} active={docSpecFilter === sp} onClick={() => setDocSpecFilter(sp)} count={docSpecCount(sp)} />
            ))}
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-2">Category:</span>
            <FilterChip label="All" active={docCatFilter === 'all'} onClick={() => setDocCatFilter('all')} />
            {DOCTOR_CATEGORIES.map((c) => (
              <FilterChip key={c} label={c} active={docCatFilter === c} onClick={() => setDocCatFilter(c)} count={docCatCount(c)} />
            ))}
            <FilterChip label="Uncategorized" active={docCatFilter === 'Uncategorized'} onClick={() => setDocCatFilter('Uncategorized')} count={docCatCount('Uncategorized')} />
          </FilterBar>

          <TableShell title="Doctors Master" search={docSearch} onSearch={setDocSearch}>
            <thead>
              <tr>
                <Th>Name</Th><Th>Speciality</Th><Th>Degree</Th><Th>Hospital / Clinic</Th><Th>City</Th>
                <Th>Category</Th><Th>Allocated To</Th><Th>Visit Freq.</Th><Th>Brands</Th><Th className="text-right">Potential</Th><Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filteredDoctors.length === 0 ? (
                <EmptyState icon={<Stethoscope className="h-8 w-8" />} message="No doctors yet — add your first doctor." />
              ) : filteredDoctors.map((d) => (
                <tr key={d.id} className="hover:bg-muted/30">
                  <Td>
                    <div className="font-bold">{d.name}</div>
                    {d.phone && <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><Phone className="h-2.5 w-2.5" />{d.phone}</div>}
                  </Td>
                  <Td><Badge variant="outline" className="text-[10px] font-bold">{d.speciality}</Badge></Td>
                  <Td>{d.degree || <span className="text-muted-foreground text-xs">—</span>}</Td>
                  <Td className="max-w-[180px]">
                    <div className="truncate text-xs">{d.hospital || d.clinic || '—'}</div>
                  </Td>
                  <Td><div className="flex items-center gap-1 text-xs"><MapPin className="h-3 w-3 text-muted-foreground" />{d.city}</div></Td>
                  <Td>{d.category ? <Badge className={cn('text-[10px] font-bold', CATEGORY_BADGE[d.category])}>{d.category}</Badge> : <span className="text-muted-foreground text-xs">—</span>}</Td>
                  <Td>{d.allocatedToName ? <Badge className="text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">{d.allocatedToName}</Badge> : <span className="text-muted-foreground text-xs italic">Unallocated</span>}</Td>
                  <Td>{d.visitFrequency ? <span className="text-xs">{d.visitFrequency}</span> : <span className="text-muted-foreground text-xs">—</span>}</Td>
                  <Td className="max-w-[160px] truncate text-xs">{d.brands || '—'}</Td>
                  <Td className="text-right tabular-nums font-bold">{d.potential ? Rs(d.potential) : '—'}</Td>
                  <Td>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setEditDoctor(d)} title="Edit"><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50" onClick={() => setConfirmDeleteDoctor(d)} title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </TabsContent>

        {/* ============ CHEMISTS TAB ============ */}
        <TabsContent value="chemists">
          <FilterBar
            label="Filters"
            onClear={() => setChTypeFilter('all')}
            showClear={chHasFilter}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Type:</span>
            <FilterChip label="All" active={chTypeFilter === 'all'} onClick={() => setChTypeFilter('all')} count={totalChemists} />
            {CHEMIST_TYPES.map((t) => (
              <FilterChip key={t} label={t} active={chTypeFilter === t} onClick={() => setChTypeFilter(t)} count={chTypeCount(t)} />
            ))}
          </FilterBar>

          <TableShell title="Chemists & Stockists Master" search={chSearch} onSearch={setChSearch}>
            <thead>
              <tr>
                <Th>Name</Th><Th>Type</Th><Th>Owner</Th><Th>City</Th><Th>Phone</Th>
                <Th>GSTIN</Th><Th>Allocated To</Th><Th className="text-right">Outstanding</Th><Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filteredChemists.length === 0 ? (
                <EmptyState icon={<Pill className="h-8 w-8" />} message="No chemists yet — add your first chemist." />
              ) : filteredChemists.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30">
                  <Td>
                    <div className="font-bold">{c.name}</div>
                    {c.owner && <div className="text-[10px] text-muted-foreground">Owner: {c.owner}</div>}
                  </Td>
                  <Td><Badge className={cn('text-[10px] font-bold gap-1', TYPE_BADGE[c.type])}>{c.type === 'Chemist' ? <Pill className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}{c.type}</Badge></Td>
                  <Td>{c.owner || <span className="text-muted-foreground text-xs">—</span>}</Td>
                  <Td><div className="flex items-center gap-1 text-xs"><MapPin className="h-3 w-3 text-muted-foreground" />{c.city}</div></Td>
                  <Td><div className="flex items-center gap-1 text-xs"><Phone className="h-3 w-3 text-muted-foreground" />{c.phone || '—'}</div></Td>
                  <Td className="text-xs font-mono">{c.gstin || <span className="text-muted-foreground">—</span>}</Td>
                  <Td>{c.allocatedToName ? <Badge className="text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">{c.allocatedToName}</Badge> : <span className="text-muted-foreground text-xs italic">Unallocated</span>}</Td>
                  <Td className="text-right tabular-nums font-bold">
                    {c.outstanding ? (
                      <span className={cn(c.outstanding > 50000 ? 'text-red-600' : 'text-amber-600')}>{Rs(c.outstanding)}</span>
                    ) : <span className="text-muted-foreground">—</span>}
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setEditChemist(c)} title="Edit"><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50" onClick={() => setConfirmDeleteChemist(c)} title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </TabsContent>
      </Tabs>

      {/* ============ DOCTOR MODALS ============ */}
      <DoctorModal
        open={showNewDoctor}
        onOpenChange={setShowNewDoctor}
        title="New Doctor"
        activeTeam={activeTeam}
        onSubmit={(data) => {
          createDoctor?.(data);
          toast.success('Doctor added');
          setShowNewDoctor(false);
        }}
      />
      {editDoctor && (
        <DoctorModal
          open
          onOpenChange={(v) => !v && setEditDoctor(null)}
          title={`Edit Doctor: ${editDoctor.name}`}
          initial={editDoctor}
          activeTeam={activeTeam}
          onSubmit={(data) => {
            updateDoctor?.(editDoctor.id, data);
            toast.success('Doctor updated');
            setEditDoctor(null);
          }}
        />
      )}
      <ConfirmDialog
        open={!!confirmDeleteDoctor}
        onOpenChange={(v) => !v && setConfirmDeleteDoctor(null)}
        title="Delete Doctor?"
        message={`"${confirmDeleteDoctor?.name}" will be permanently removed from the master.`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirmDeleteDoctor) {
            deleteDoctor?.(confirmDeleteDoctor.id);
            toast.error('Doctor deleted');
          }
        }}
      />

      {/* ============ CHEMIST MODALS ============ */}
      <ChemistModal
        open={showNewChemist}
        onOpenChange={setShowNewChemist}
        title="New Chemist"
        activeTeam={activeTeam}
        onSubmit={(data) => {
          createChemist?.(data);
          toast.success('Chemist added');
          setShowNewChemist(false);
        }}
      />
      {editChemist && (
        <ChemistModal
          open
          onOpenChange={(v) => !v && setEditChemist(null)}
          title={`Edit Chemist: ${editChemist.name}`}
          initial={editChemist}
          activeTeam={activeTeam}
          onSubmit={(data) => {
            updateChemist?.(editChemist.id, data);
            toast.success('Chemist updated');
            setEditChemist(null);
          }}
        />
      )}
      <ConfirmDialog
        open={!!confirmDeleteChemist}
        onOpenChange={(v) => !v && setConfirmDeleteChemist(null)}
        title="Delete Chemist?"
        message={`"${confirmDeleteChemist?.name}" will be permanently removed from the master.`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirmDeleteChemist) {
            deleteChemist?.(confirmDeleteChemist.id);
            toast.error('Chemist deleted');
          }
        }}
      />
    </div>
  );
}

// ============ Doctor Modal ============
function DoctorModal({
  open, onOpenChange, onSubmit, initial, title, activeTeam,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (data: Omit<Doctor, 'id'>) => void;
  initial?: Doctor;
  title: string;
  activeTeam: { id: string; name: string; email: string; dept: string }[];
}) {
  const [name, setName] = React.useState('');
  const [speciality, setSpeciality] = React.useState('GP');
  const [degree, setDegree] = React.useState('');
  const [hospital, setHospital] = React.useState('');
  const [clinic, setClinic] = React.useState('');
  const [city, setCity] = React.useState('');
  const [state, setState] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [category, setCategory] = React.useState<Doctor['category'] | ''>('B');
  const [allocatedTo, setAllocatedTo] = React.useState('');
  const [visitFrequency, setVisitFrequency] = React.useState('Weekly');
  const [brands, setBrands] = React.useState('');
  const [potential, setPotential] = React.useState('');
  const [notes, setNotes] = React.useState('');

  React.useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? '');
    setSpeciality(initial?.speciality ?? 'GP');
    setDegree(initial?.degree ?? '');
    setHospital(initial?.hospital ?? '');
    setClinic(initial?.clinic ?? '');
    setCity(initial?.city ?? '');
    setState(initial?.state ?? '');
    setPhone(initial?.phone ?? '');
    setEmail(initial?.email ?? '');
    setCategory(initial?.category ?? 'B');
    setAllocatedTo(initial?.allocatedTo ?? '');
    setVisitFrequency(initial?.visitFrequency ?? 'Weekly');
    setBrands(initial?.brands ?? '');
    setPotential(initial?.potential != null ? String(initial.potential) : '');
    setNotes(initial?.notes ?? '');
  }, [open, initial]);

  const submit = () => {
    if (!name.trim()) { toast.error('Doctor name is required'); return; }
    if (!speciality.trim()) { toast.error('Speciality is required'); return; }
    if (!city.trim()) { toast.error('City is required'); return; }
    const rep = activeTeam.find((m) => m.email === allocatedTo);
    onSubmit({
      name: name.trim(),
      speciality: speciality.trim(),
      degree: degree.trim() || undefined,
      hospital: hospital.trim() || undefined,
      clinic: clinic.trim() || undefined,
      city: city.trim(),
      state: state.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      category: (category || undefined) as Doctor['category'],
      allocatedTo: allocatedTo || undefined,
      allocatedToName: rep?.name,
      visitFrequency: visitFrequency || undefined,
      brands: brands.trim() || undefined,
      potential: potential ? Number(potential) : undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-slate-900 hover:bg-slate-800" onClick={submit}>{initial ? 'Save Changes' : 'Add Doctor'}</Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Doctor Name" className="col-span-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dr. Rajesh Sharma" />
        </Field>
        <Field label="Speciality">
          <Input value={speciality} onChange={(e) => setSpeciality(e.target.value)} placeholder="GP / Gyne / Ortho / Neuro" />
        </Field>
        <Field label="Degree">
          <Input value={degree} onChange={(e) => setDegree(e.target.value)} placeholder="MBBS, MD" />
        </Field>
        <Field label="Hospital">
          <Input value={hospital} onChange={(e) => setHospital(e.target.value)} placeholder="Apollo Hospital" />
        </Field>
        <Field label="Clinic">
          <Input value={clinic} onChange={(e) => setClinic(e.target.value)} placeholder="Sharma Clinic" />
        </Field>
        <Field label="City">
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Mumbai" />
        </Field>
        <Field label="State">
          <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="Maharashtra" />
        </Field>
        <Field label="Phone">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" />
        </Field>
        <Field label="Email">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="rajesh@apollo.com" />
        </Field>
        <Field label="Category">
          <Select value={category || 'none'} onValueChange={(v) => setCategory(v === 'none' ? '' : v as Doctor['category'])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Uncategorized</SelectItem>
              {DOCTOR_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Allocated To (MR)">
          <Select value={allocatedTo || 'none'} onValueChange={setAllocatedTo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Unallocated</SelectItem>
              {activeTeam.map((m) => <SelectItem key={m.id} value={m.email}>{m.name} · {m.dept}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Visit Frequency">
          <Select value={visitFrequency} onValueChange={setVisitFrequency}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {VISIT_FREQUENCIES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Brands / Products" className="col-span-2">
          <Input value={brands} onChange={(e) => setBrands(e.target.value)} placeholder="Brand A, Brand B" />
        </Field>
        <Field label="Potential (₹)">
          <Input type="number" min="0" value={potential} onChange={(e) => setPotential(e.target.value)} placeholder="0" />
        </Field>
        <Field label="Notes" className="col-span-2">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Prescribing habits, key insights…" rows={2} />
        </Field>
      </div>
    </Modal>
  );
}

// ============ Chemist Modal ============
function ChemistModal({
  open, onOpenChange, onSubmit, initial, title, activeTeam,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (data: Omit<Chemist, 'id'>) => void;
  initial?: Chemist;
  title: string;
  activeTeam: { id: string; name: string; email: string; dept: string }[];
}) {
  const [name, setName] = React.useState('');
  const [type, setType] = React.useState<Chemist['type']>('Chemist');
  const [owner, setOwner] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [city, setCity] = React.useState('');
  const [state, setState] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [gstin, setGstin] = React.useState('');
  const [allocatedTo, setAllocatedTo] = React.useState('');
  const [outstanding, setOutstanding] = React.useState('');
  const [notes, setNotes] = React.useState('');

  React.useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? '');
    setType(initial?.type ?? 'Chemist');
    setOwner(initial?.owner ?? '');
    setAddress(initial?.address ?? '');
    setCity(initial?.city ?? '');
    setState(initial?.state ?? '');
    setPhone(initial?.phone ?? '');
    setEmail(initial?.email ?? '');
    setGstin(initial?.gstin ?? '');
    setAllocatedTo(initial?.allocatedTo ?? '');
    setOutstanding(initial?.outstanding != null ? String(initial.outstanding) : '');
    setNotes(initial?.notes ?? '');
  }, [open, initial]);

  const submit = () => {
    if (!name.trim()) { toast.error('Chemist name is required'); return; }
    if (!city.trim()) { toast.error('City is required'); return; }
    const rep = activeTeam.find((m) => m.email === allocatedTo);
    onSubmit({
      name: name.trim(),
      type,
      owner: owner.trim() || undefined,
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      gstin: gstin.trim().toUpperCase() || undefined,
      allocatedTo: allocatedTo || undefined,
      allocatedToName: rep?.name,
      outstanding: outstanding ? Number(outstanding) : undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-slate-900 hover:bg-slate-800" onClick={submit}>{initial ? 'Save Changes' : 'Add Chemist'}</Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name" className="col-span-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="MedPlus Pharmacy" />
        </Field>
        <Field label="Type">
          <Select value={type} onValueChange={(v) => setType(v as Chemist['type'])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CHEMIST_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Owner">
          <Input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Owner name" />
        </Field>
        <Field label="Address" className="col-span-2">
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Shop 12, MG Road" />
        </Field>
        <Field label="City"><Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Mumbai" /></Field>
        <Field label="State"><Input value={state} onChange={(e) => setState(e.target.value)} placeholder="Maharashtra" /></Field>
        <Field label="Phone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" /></Field>
        <Field label="Email"><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="medplus@email.com" /></Field>
        <Field label="GSTIN"><Input value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} placeholder="27ABCDE1234F1Z5" className="font-mono" /></Field>
        <Field label="Allocated To (MR)">
          <Select value={allocatedTo || 'none'} onValueChange={setAllocatedTo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Unallocated</SelectItem>
              {activeTeam.map((m) => <SelectItem key={m.id} value={m.email}>{m.name} · {m.dept}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Outstanding (₹)">
          <Input type="number" min="0" value={outstanding} onChange={(e) => setOutstanding(e.target.value)} placeholder="0" />
        </Field>
        <Field label="Notes" className="col-span-2">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment terms, credit notes…" rows={2} />
        </Field>
      </div>
    </Modal>
  );
}
