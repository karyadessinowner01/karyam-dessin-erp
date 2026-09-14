'use client';

import * as React from 'react';
import { Plus, Trash2, Mail, Phone, Users, Pencil, KeyRound, UserCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useERP } from '@/lib/erp/store';
import { DEPT_LABELS, DEPT_BADGE } from '@/lib/erp/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SectionHeader, Modal, Field, EmptyState, ConfirmDialog, StatusBadge } from '../ui';
import type { Role, TeamMember } from '@/lib/erp/types';

const DEPTS: Role[] = ['marketing', 'designer', 'production', 'finance', 'management', 'owner'];

export function Team() {
  const team = useERP((s) => s.team);
  const projects = useERP((s) => s.projects);
  const designs = useERP((s) => s.designs);
  const currentUser = useERP((s) => s.currentUser);
  const addTeamMember = useERP((s) => s.addTeamMember);
  const updateTeamMember = useERP((s) => s.updateTeamMember);
  const deleteTeamMember = useERP((s) => s.deleteTeamMember);

  // Compute designer stats: assigned parties, assigned pages, completed pages
  const getDesignerStats = (memberName: string) => {
    const assignedProjects = projects.filter(p => p.designer === memberName && !p.cancelled);
    const assignedParties = assignedProjects.length;
    const completedProjects = assignedProjects.filter(p => p.stage === 'completed');
    // Count pages from project products (if pages field exists) — fallback to product count
    const assignedPages = assignedProjects.reduce((sum, p) => sum + (p.products?.reduce((s, pr) => s + (pr.qty || 0), 0) || 0), 0);
    const completedPages = completedProjects.reduce((sum, p) => sum + (p.products?.reduce((s, pr) => s + (pr.qty || 0), 0) || 0), 0);
    const pendingDesigns = designs.filter(d => d.designer === memberName && d.status !== 'Completed').length;
    return { assignedParties, assignedPages, completedPages, pendingDesigns, totalProjects: assignedProjects.length, completedCount: completedProjects.length };
  };

  const isOM = currentUser?.role === 'owner' || currentUser?.role === 'management';
  const isOwner = currentUser?.role === 'owner';

  const [showAdd, setShowAdd] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<TeamMember | null>(null);
  const [delTarget, setDelTarget] = React.useState<TeamMember | null>(null);

  return (
    <div>
      <SectionHeader
        title="Team Management"
        subtitle="Add, edit, and assign login credentials + roles to each team member."
        accent="slate"
        actions={isOM && (
          <Button onClick={() => setShowAdd(true)} className="h-9 bg-slate-900 hover:bg-slate-800">
            <Plus className="h-4 w-4" /> Add Member
          </Button>
        )}
      />

      {DEPTS.map((d) => {
        const members = team.filter((m) => m.dept === d);
        if (!members.length) return null;
        return (
          <div key={d} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${DEPT_BADGE[d]}`}>
                {DEPT_LABELS[d]}
              </span>
              <span className="text-xs text-muted-foreground">({members.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {members.map((m) => (
                <div key={m.id} className="rounded-xl border border-border bg-card p-4 relative shadow-sm hover:shadow-md transition-all">
                  {(isOwner || (isOM && currentUser?.name === m.name)) && (
                    <div className="absolute top-2 right-2 flex gap-0.5">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditTarget(m)} title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {isOwner && (
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50" onClick={() => setDelTarget(m)} title="Remove">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-lg bg-slate-900 dark:bg-slate-700 text-white flex items-center justify-center font-bold">
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate">{m.name}</div>
                      <div className="text-[11px] text-muted-foreground">{DEPT_LABELS[m.dept]}</div>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3 w-3 flex-shrink-0" /> <span className="truncate">{m.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3 w-3 flex-shrink-0" /> {m.phone}
                    </div>
                  </div>

                  {/* Designer stats: assigned parties + pages + completed pages */}
                  {m.dept === 'designer' && (() => {
                    const stats = getDesignerStats(m.name);
                    return (
                      <div className="mt-3 pt-3 border-t border-border/60 grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 px-2.5 py-1.5 text-center">
                          <div className="text-sm font-black text-blue-600 dark:text-blue-400">{stats.assignedParties}</div>
                          <div className="text-[9px] font-bold uppercase text-muted-foreground">Assigned Parties</div>
                        </div>
                        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1.5 text-center">
                          <div className="text-sm font-black text-amber-600 dark:text-amber-400">{stats.pendingDesigns}</div>
                          <div className="text-[9px] font-bold uppercase text-muted-foreground">Pending Designs</div>
                        </div>
                        <div className="rounded-lg bg-purple-50 dark:bg-purple-950/30 px-2.5 py-1.5 text-center">
                          <div className="text-sm font-black text-purple-600 dark:text-purple-400">{stats.assignedPages}</div>
                          <div className="text-[9px] font-bold uppercase text-muted-foreground">Assigned Pages</div>
                        </div>
                        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1.5 text-center">
                          <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">{stats.completedPages}</div>
                          <div className="text-[9px] font-bold uppercase text-muted-foreground">Completed Pages</div>
                        </div>
                      </div>
                    );
                  })()}
                  {m.userId && (
                    <div className="flex items-center gap-2 text-muted-foreground mt-1.5">
                      <UserCircle className="h-3 w-3 flex-shrink-0" /> <span className="font-mono">{m.userId}</span>
                    </div>
                  )}
                  {m.userId && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <KeyRound className="h-3 w-3 flex-shrink-0" /> <span className="font-mono">{'•'.repeat(m.password?.length || 6)}</span>
                    </div>
                  )}
                  {m.loginRole && m.loginRole !== m.dept && (
                    <div className="mt-2">
                      <StatusBadge status={`Login role: ${DEPT_LABELS[m.loginRole] || m.loginRole}`} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {team.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground text-sm">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
          No team members yet. Click "Add Member" to create one.
        </div>
      )}

      {/* Add Member */}
      <MemberFormModal
        open={showAdd}
        onOpenChange={setShowAdd}
        editTarget={null}
        onSubmit={(data) => {
          addTeamMember(data);
          toast.success('Member added!');
          setShowAdd(false);
        }}
      />

      {/* Edit Member */}
      {editTarget && (
        <MemberFormModal
          open
          onOpenChange={(v) => !v && setEditTarget(null)}
          editTarget={editTarget}
          onSubmit={(data) => {
            updateTeamMember(editTarget.id, data);
            toast.success('Member updated!');
            setEditTarget(null);
          }}
        />
      )}

      <ConfirmDialog
        open={!!delTarget}
        onOpenChange={(v) => !v && setDelTarget(null)}
        title="Remove Member?"
        message={`${delTarget?.name} will be removed from the team (moved to Recycle Bin). Their login will be disabled.`}
        confirmLabel="Remove"
        onConfirm={() => { if (delTarget) { deleteTeamMember(delTarget.id); toast.error('Member removed'); } }}
      />
    </div>
  );
}

// ============ Member Form Modal (Add + Edit) ============
function MemberFormModal({
  open, onOpenChange, editTarget, onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editTarget: TeamMember | null;
  onSubmit: (data: { name: string; dept: Role; phone: string; email: string; userId: string; password: string; loginRole: Role }) => void;
}) {
  const [name, setName] = React.useState('');
  const [dept, setDept] = React.useState<Role>('marketing');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [userId, setUserId] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loginRole, setLoginRole] = React.useState<Role>('marketing');
  const [showPwd, setShowPwd] = React.useState(false);
  const team = useERP((s) => s.team);

  React.useEffect(() => {
    if (open) {
      if (editTarget) {
        setName(editTarget.name);
        setDept(editTarget.dept);
        setPhone(editTarget.phone);
        setEmail(editTarget.email);
        setUserId(editTarget.userId || '');
        setPassword(editTarget.password || '');
        setLoginRole(editTarget.loginRole || editTarget.dept);
      } else {
        setName(''); setDept('marketing'); setPhone(''); setEmail('');
        setUserId(''); setPassword(''); setLoginRole('marketing');
      }
    }
  }, [open, editTarget]);

  const submit = () => {
    if (!name.trim()) { toast.error('Name zaroori'); return; }
    if (!userId.trim()) { toast.error('User ID zaroori (for login)'); return; }
    if (!password.trim() || password.length < 4) { toast.error('Password min 4 characters'); return; }
    // Check userId uniqueness (skip self when editing)
    const dup = team.find((m) => m.userId?.toLowerCase() === userId.trim().toLowerCase() && m.id !== editTarget?.id);
    if (dup) { toast.error(`User ID "${userId}" already taken by ${dup.name}`); return; }
    onSubmit({
      name: name.trim(), dept, phone: phone.trim(), email: email.trim(),
      userId: userId.trim(), password, loginRole,
    });
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={editTarget ? `Edit Member: ${editTarget.name}` : 'Add Team Member'} size="lg"
      footer={<><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={submit}>
          {editTarget ? 'Save Changes' : 'Add Member'}
        </Button></>}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Full Name" className="col-span-2"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" /></Field>
        <Field label="Department">
          <Select value={dept} onValueChange={(v) => { setDept(v as Role); setLoginRole(v as Role); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {DEPTS.map((d) => <SelectItem key={d} value={d}>{DEPT_LABELS[d]}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Phone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" /></Field>
      </div>
      <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@karyam.com" /></Field>

      {/* Login Credentials */}
      <div className="mt-2 p-3 rounded-xl border border-border bg-muted/30">
        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
          <KeyRound className="h-3.5 w-3.5" /> Login Credentials
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="User ID">
            <Input value={userId} onChange={(e) => setUserId(e.target.value.replace(/\s/g, '').toLowerCase())} placeholder="e.g. rahul" className="font-mono" />
          </Field>
          <Field label="Password">
            <div className="relative">
              <Input type={showPwd ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="min 4 characters" className="pr-9" />
              <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
        </div>
        <Field label="Login Role (controls what this user can see)">
          <Select value={loginRole} onValueChange={(v) => setLoginRole(v as Role)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(['owner', 'management', 'finance', 'marketing', 'designer', 'production'] as Role[]).map((r) => (
                <SelectItem key={r} value={r}>{DEPT_LABELS[r]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
    </Modal>
  );
}
