'use client';

import * as React from 'react';
import {
  ShieldCheck, RotateCcw, Lock, Info, Check, X, Building2, Save, Upload, RefreshCw, Database,
} from 'lucide-react';
import { toast } from 'sonner';
import { useERP } from '@/lib/erp/store';
import {
  NAV, ROLE_PAGES, ROLE_LABELS, ROLE_DESCRIPTIONS, ALL_PAGES,
  DEFAULT_COMPANY_PROFILE,
} from '@/lib/erp/constants';
import { SectionHeader, Field } from '../ui';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Role, CompanyProfile } from '@/lib/erp/types';

const ROLES: Role[] = ['owner', 'management', 'finance', 'marketing', 'designer', 'production'];

/** Human-readable label for each page key */
const PAGE_LABELS: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const g of NAV) for (const it of g.items) m[it.k] = it.l;
  return m;
})();

type SettingsTab = 'profile' | 'permissions' | 'data';

export function SettingsSection() {
  const currentUser = useERP((s) => s.currentUser);
  const isOwner = currentUser?.role === 'owner';
  const [tab, setTab] = React.useState<SettingsTab>('profile');

  if (!isOwner) {
    return (
      <div>
        <SectionHeader title="Settings" subtitle="Department access control & site configuration." accent="slate" />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Lock className="h-12 w-12 text-muted-foreground mb-3" />
          <h3 className="text-lg font-bold mb-1">Access Restricted</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Only the Owner / Admin can manage settings. Please contact your administrator if you need access changes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        title="Settings"
        subtitle="Configure your company profile (shown across the whole site) and control department permissions."
        accent="slate"
      />

      {/* Sub-navigation: single options */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button
          onClick={() => setTab('profile')}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border',
            tab === 'profile'
              ? 'bg-slate-900 text-white border-transparent'
              : 'bg-card text-foreground border-border hover:bg-muted/50',
          )}
        >
          <Building2 className="h-4 w-4" /> Company Profile
        </button>
        <button
          onClick={() => setTab('permissions')}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border',
            tab === 'permissions'
              ? 'bg-slate-900 text-white border-transparent'
              : 'bg-card text-foreground border-border hover:bg-muted/50',
          )}
        >
          <ShieldCheck className="h-4 w-4" /> Permission
        </button>
        <button
          onClick={() => setTab('data')}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border',
            tab === 'data'
              ? 'bg-slate-900 text-white border-transparent'
              : 'bg-card text-foreground border-border hover:bg-muted/50',
          )}
        >
          <Database className="h-4 w-4" /> Data
        </button>
      </div>

      {tab === 'profile' ? <CompanyProfileTab /> : tab === 'permissions' ? <PermissionsTab /> : <DataTab />}
    </div>
  );
}

// ============ Data Tab (owner-only — Reset demo data) ============
function DataTab() {
  const resetDemo = useERP((s) => s.resetDemo);
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="text-sm font-bold mb-1 flex items-center gap-2"><Database className="h-4 w-4 text-slate-600" /> Data Management</div>
      <p className="text-xs text-muted-foreground mb-4">Reset all ERP data (projects, leads, quotations, items, GST settings, reminders, tasks, notes) back to the default seed data. This is irreversible.</p>

      <div className="rounded-lg border-2 border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 p-4 flex items-start gap-3">
        <RefreshCw className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="text-sm font-bold text-red-700 dark:text-red-300">Reset All Demo Data</div>
          <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-0.5 mb-3">
            Wipes every record — projects, leads, quotations, invoices, items, payments, expenses, team, reminders, tasks, notes, GST settings — and restores the original seed data. <strong>Only the Owner can do this.</strong>
          </p>
          <Button
            variant="outline"
            className="border-red-400 text-red-600 hover:bg-red-100 dark:hover:bg-red-950/40"
            onClick={() => {
              if (confirm('Reset ALL demo data to defaults? This will erase every change you have made. This cannot be undone.')) {
                resetDemo();
                toast.success('Demo data reset. Reloading…');
                setTimeout(() => location.reload(), 800);
              }
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" /> Reset All Data
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============ Company Profile Tab ============
function CompanyProfileTab() {
  const companyProfile = useERP((s) => s.companyProfile) || DEFAULT_COMPANY_PROFILE;
  const updateCompanyProfile = useERP((s) => s.updateCompanyProfile);
  const resetCompanyProfile = useERP((s) => s.resetCompanyProfile);

  const [form, setForm] = React.useState<CompanyProfile>(companyProfile);
  React.useEffect(() => { setForm(companyProfile); }, [companyProfile]);

  const dirty = JSON.stringify(form) !== JSON.stringify(companyProfile);

  const set = <K extends keyof CompanyProfile>(k: K, v: CompanyProfile[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    updateCompanyProfile(form);
    toast.success('Company profile saved — applied across the whole site.');
  };

  const reset = () => {
    resetCompanyProfile();
    setForm(DEFAULT_COMPANY_PROFILE);
    toast.success('Company profile reset to defaults.');
  };

  // Handle logo image upload (PNG/JPEG → base64 data URL)
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      toast.error('Please upload a PNG or JPEG image.');
      e.target.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image too large. Max 2 MB.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({ ...f, logoImage: reader.result as string }));
      toast.success('Logo loaded — click Save to apply.');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };
  const removeLogoImage = () => {
    setForm((f) => ({ ...f, logoImage: undefined }));
  };

  // Build a live footer preview
  const footerPreview = form.footerText.trim()
    || `${form.name} | ${form.tagline} | ${form.email} | ${form.phone} | ${form.address}`;

  // Render name with accent word highlighted (matches AppShell footer style)
  const renderName = (name: string, accent: string) => {
    if (!accent) return name;
    const parts = name.split(new RegExp(`(${accent})`, 'i'));
    return parts.map((p, i) =>
      p.toLowerCase() === accent.toLowerCase()
        ? <span key={i} className="text-emerald-500">{p}</span>
        : p
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Editable form */}
      <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-emerald-500" /> Company Profile
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              These details appear in the app footer, invoices, quotations, and the Pro Invoice Tool.
            </p>
          </div>
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={reset}>
            <RotateCcw className="h-3 w-3" /> Reset
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="cp-name">Company Name</Label>
            <Input id="cp-name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Karyam Dessin" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cp-accent">Accent Word (highlighted in emerald)</Label>
            <Input id="cp-accent" value={form.accentWord} onChange={(e) => set('accentWord', e.target.value)} placeholder="Dessin" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="cp-tagline">Tagline</Label>
            <Input id="cp-tagline" value={form.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder="Beyond Design – It's Pure Strategy" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cp-phone">Phone</Label>
            <Input id="cp-phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91-9452879204" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cp-email">Email</Label>
            <Input id="cp-email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="karyam.dessin@gmail.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cp-address">Address</Label>
            <Input id="cp-address" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Lucknow, UP" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Logo (PNG / JPEG image — optional)</Label>
            <div className="flex items-center gap-3">
              {/* Preview */}
              <div className="h-14 w-14 rounded-lg border-2 border-border bg-muted/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {form.logoImage ? (
                  <img src={form.logoImage} alt="logo" className="h-full w-full object-cover" />
                ) : (
                  <span className="font-black text-slate-900 dark:text-slate-100 text-sm">{form.logoText || 'KD'}</span>
                )}
              </div>
              {/* Upload / Remove buttons */}
              <div className="flex flex-col gap-1.5 flex-1">
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/jpg" onChange={handleLogoUpload} className="hidden" />
                <Button type="button" variant="outline" size="sm" className="h-8 w-fit text-xs" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-3 w-3" /> Upload Logo (PNG/JPEG)
                </Button>
                {form.logoImage && (
                  <Button type="button" variant="ghost" size="sm" className="h-7 w-fit text-xs text-red-500" onClick={removeLogoImage}>
                    <X className="h-3 w-3" /> Remove Image
                  </Button>
                )}
                <span className="text-[10px] text-muted-foreground">Max 2 MB. When set, used in sidebar, invoices & quotation tools.</span>
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cp-logo">Logo Text (fallback when no image)</Label>
            <Input id="cp-logo" value={form.logoText} onChange={(e) => set('logoText', e.target.value)} placeholder="KD" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="cp-footer">Custom Footer Text (optional — leave empty to auto-build)</Label>
            <Textarea id="cp-footer" value={form.footerText} onChange={(e) => set('footerText', e.target.value)} placeholder="Leave empty to auto-build: Name | Tagline | Email | Phone | Address" rows={2} />
          </div>
        </div>

        <div className="flex items-center gap-2 mt-5">
          <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={save} disabled={!dirty}>
            <Save className="h-4 w-4" /> Save Changes
          </Button>
          {dirty && <span className="text-xs text-amber-600 font-semibold">Unsaved changes</span>}
        </div>
      </div>

      {/* Live preview */}
      <div className="rounded-xl border border-border bg-card p-5 h-fit">
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Info className="h-4 w-4 text-blue-500" /> Live Preview
        </h3>
        {/* Header preview */}
        <div className="rounded-lg bg-slate-900 text-white p-3 flex items-center gap-2.5 mb-3">
          <div className="h-9 w-9 rounded-lg bg-white flex items-center justify-center font-black text-slate-900 text-sm flex-shrink-0 overflow-hidden">
            {form.logoImage ? (
              <img src={form.logoImage} alt="logo" className="h-full w-full object-cover" />
            ) : (
              form.logoText || 'KD'
            )}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-black leading-tight">{renderName(form.name, form.accentWord)}</div>
            <div className="text-[9px] opacity-75 truncate">{form.tagline}</div>
          </div>
        </div>
        {/* Contact preview */}
        <div className="text-xs space-y-1 mb-3 text-muted-foreground">
          <div className="flex justify-between"><span>Phone:</span><span className="font-semibold text-foreground">{form.phone}</span></div>
          <div className="flex justify-between"><span>Email:</span><span className="font-semibold text-foreground truncate ml-2">{form.email}</span></div>
          <div className="flex justify-between"><span>Address:</span><span className="font-semibold text-foreground">{form.address}</span></div>
        </div>
        {/* Footer preview */}
        <div className="rounded-lg bg-slate-900 text-white/85 text-center p-2.5 text-[10px] leading-relaxed">
          {footerPreview}
        </div>
        <p className="text-[10px] text-muted-foreground mt-3">
          This profile is used in: app footer, GST invoice view, Pro Invoice Tool, and Quotation Tool.
        </p>
      </div>
    </div>
  );
}

// ============ Permissions Tab ============
function PermissionsTab() {
  const permissions = useERP((s) => s.permissions);
  const togglePermission = useERP((s) => s.togglePermission);
  const setRolePermissions = useERP((s) => s.setRolePermissions);
  const resetPermissions = useERP((s) => s.resetPermissions);

  const effectivePages = (role: Role): string[] => {
    const custom = permissions?.[role];
    return custom !== undefined ? custom : (ROLE_PAGES[role] || []);
  };

  const isOn = (role: Role, page: string) => effectivePages(role).includes(page);

  const handleToggle = (role: Role, page: string, on: boolean) => {
    if (role === 'owner' && !on && (page === 'dashboard' || page === 'settings')) {
      toast.error(`Cannot remove ${page === 'dashboard' ? 'Dashboard' : 'Settings'} from Owner.`);
      return;
    }
    togglePermission(role, page);
  };

  const handleResetRole = (role: Role) => {
    setRolePermissions(role, [...(ROLE_PAGES[role] || [])]);
    toast.success(`${ROLE_LABELS[role]} permissions reset to default.`);
  };

  const handleResetAll = () => {
    resetPermissions();
    toast.success('All permissions reset to system defaults.');
  };

  return (
    <div>
      {/* Info banner */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30 p-4 mb-5 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 dark:text-blue-200">
          <strong className="font-bold">How permissions work:</strong> Toggle a section ON for a department to grant access, OFF to hide it.
          The sidebar and page navigation update instantly for affected users on their next login / refresh.
          <span className="block mt-1 text-blue-700 dark:text-blue-300">
            Owner always retains access to <strong>Dashboard</strong> and <strong>Settings</strong> (locked).
          </span>
        </div>
        <div className="ml-auto">
          <Button variant="outline" size="sm" className="h-8" onClick={handleResetAll}>
            <RotateCcw className="h-3.5 w-3.5" /> Reset All
          </Button>
        </div>
      </div>

      {/* Permission matrix */}
      <div className="rounded-xl border border-border bg-card overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground sticky left-0 bg-muted/40 z-10 min-w-[180px]">
                  Section
                </th>
                {ROLES.map((r) => (
                  <th key={r} className="px-3 py-3 text-center min-w-[120px]">
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-bold text-xs">{ROLE_LABELS[r]}</span>
                      <span className="text-[10px] text-muted-foreground font-normal leading-tight">{ROLE_DESCRIPTIONS[r]}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_PAGES.map((page) => {
                const label = PAGE_LABELS[page] || page;
                return (
                  <tr key={page} className="border-b border-border/60 hover:bg-muted/20">
                    <td className="px-4 py-3 font-semibold sticky left-0 bg-card z-10">
                      {label}
                    </td>
                    {ROLES.map((r) => {
                      const on = isOn(r, page);
                      const locked = r === 'owner' && (page === 'dashboard' || page === 'settings');
                      return (
                        <td key={r} className="px-3 py-3 text-center">
                          <div className="flex items-center justify-center">
                            {locked ? (
                              <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30">
                                <Lock className="h-3 w-3" /> Always
                              </Badge>
                            ) : (
                              <Switch
                                checked={on}
                                onCheckedChange={(v) => handleToggle(r, page, v)}
                                aria-label={`${label} for ${ROLE_LABELS[r]}`}
                              />
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-role summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ROLES.map((r) => {
          const pages = effectivePages(r);
          const custom = permissions?.[r] !== undefined;
          return (
            <div key={r} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-bold text-sm flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    {ROLE_LABELS[r]}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{pages.length} sections accessible</div>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleResetRole(r)}>
                  <RotateCcw className="h-3 w-3" /> Reset
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {pages.length === 0 ? (
                  <span className="text-xs text-muted-foreground italic">No access (will see dashboard only)</span>
                ) : (
                  pages.map((p) => (
                    <Badge key={p} variant="secondary" className="text-[10px] gap-1">
                      <Check className="h-2.5 w-2.5 text-emerald-500" />
                      {PAGE_LABELS[p] || p}
                    </Badge>
                  ))
                )}
              </div>
              {custom ? (
                <div className="mt-3 pt-2 border-t border-border text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                  <Info className="h-3 w-3" /> Customized by Owner
                </div>
              ) : (
                <div className="mt-3 pt-2 border-t border-border text-[10px] text-muted-foreground font-semibold">
                  System default
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Hidden sections indicator */}
      <div className="mt-6 rounded-xl border border-border bg-muted/20 p-4">
        <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
          <X className="h-4 w-4 text-red-500" /> Finance terms visibility check
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Sales (Marketing), Design, and Production teams should NOT see finance-related sections. Current status:
        </p>
        <div className="flex flex-wrap gap-2">
          {(['marketing', 'designer', 'production'] as Role[]).map((r) => {
            const pages = effectivePages(r);
            const financeLeak = pages.filter((p) => ['finance', 'reports', 'invoicing', 'gstsettings', 'recycle'].includes(p));
            return (
              <Badge
                key={r}
                variant="outline"
                className={financeLeak.length === 0
                  ? 'gap-1 text-emerald-700 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30'
                  : 'gap-1 text-red-700 border-red-300 bg-red-50 dark:bg-red-950/30'}
              >
                {financeLeak.length === 0 ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                {ROLE_LABELS[r]}: {financeLeak.length === 0 ? 'Clean — no finance terms' : `Sees: ${financeLeak.join(', ')}`}
              </Badge>
            );
          })}
        </div>
      </div>
    </div>
  );
}
