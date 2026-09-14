'use client';

import * as React from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { badgeClass, Rs } from '@/lib/erp/utils';

// ============ Stat Card ============
export function StatCard({
  label, value, tone = 'default', icon, trend,
}: {
  label: string;
  value: React.ReactNode;
  tone?: 'default' | 'primary' | 'accent' | 'danger' | 'warn';
  icon?: React.ReactNode;
  trend?: { value: string; direction: 'up' | 'down' | 'flat'; label?: string };
}) {
  const tones: Record<string, string> = {
    default: 'bg-card text-foreground border-border',
    primary: 'bg-slate-900 text-white border-transparent dark:bg-slate-800',
    accent: 'bg-emerald-500 text-white border-transparent',
    danger: 'bg-red-500 text-white border-transparent',
    warn: 'bg-amber-500 text-white border-transparent',
  };
  const trendColors: Record<string, string> = {
    up: tone === 'default' ? 'text-emerald-600 bg-blue-50 dark:bg-blue-950/30' : 'text-white bg-white/20',
    down: tone === 'default' ? 'text-red-600 bg-red-50 dark:bg-red-950/30' : 'text-white bg-white/20',
    flat: tone === 'default' ? 'text-slate-500 bg-slate-100 dark:bg-slate-800' : 'text-white bg-white/20',
  };
  return (
    <div className={cn('rounded-xl p-4 border shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 relative overflow-hidden group', tones[tone])}>
      {/* Decorative gradient blob */}
      <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {icon && <div className="mb-1.5 opacity-70">{icon}</div>}
          <div className="text-2xl font-black tracking-tight leading-tight">{value}</div>
          <div className={cn('text-[11px] font-semibold mt-0.5', tone === 'default' ? 'text-muted-foreground' : 'text-white/70')}>
            {label}
          </div>
        </div>
        {trend && (
          <div className={cn('inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold', trendColors[trend.direction])}>
            {trend.direction === 'up' ? '▲' : trend.direction === 'down' ? '▼' : '●'} {trend.value}
            {trend.label && <span className="opacity-70 ml-0.5">{trend.label}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

// ============ Status Badge ============
export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide', badgeClass(status))}>
      {status}
    </span>
  );
}

// ============ Empty State ============
export function EmptyState({ icon, message }: { icon?: React.ReactNode; message: string }) {
  return (
    <tr>
      <td colSpan={12} className="text-center py-12">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          {icon && <div className="opacity-40">{icon}</div>}
          <p className="text-sm">{message}</p>
        </div>
      </td>
    </tr>
  );
}

// ============ Section Header (with gradient accent bar) ============
export function SectionHeader({
  title, subtitle, actions, accent = 'emerald',
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  accent?: 'emerald' | 'blue' | 'amber' | 'purple' | 'rose' | 'slate';
}) {
  const accents: Record<string, string> = {
    emerald: 'from-emerald-500 to-teal-500',
    blue: 'from-blue-500 to-cyan-500',
    amber: 'from-amber-500 to-orange-500',
    purple: 'from-purple-500 to-fuchsia-500',
    rose: 'from-rose-500 to-pink-500',
    slate: 'from-slate-700 to-slate-900',
  };
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn('h-9 w-1.5 rounded-full bg-gradient-to-b', accents[accent])} />
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-black tracking-tight truncate">{title}</h1>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

// ============ Filter Chip (toggleable pill) ============
export function FilterChip({
  label, active, onClick, count, color,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border',
        active
          ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100 shadow-sm'
          : 'bg-card text-muted-foreground border-border hover:border-slate-300 hover:text-foreground',
      )}
    >
      {color && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />}
      {label}
      {count !== undefined && (
        <span className={cn(
          'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black',
          active ? 'bg-white/20' : 'bg-muted',
        )}>
          {count}
        </span>
      )}
    </button>
  );
}

// ============ Filter Bar (wraps chips + clear button) ============
export function FilterBar({
  label = 'Filters', children, onClear, showClear,
}: {
  label?: string;
  children: React.ReactNode;
  onClear?: () => void;
  showClear?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-border bg-muted/30 mb-4">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">{label}:</span>
      {children}
      {showClear && onClear && (
        <button
          onClick={onClear}
          className="ml-auto text-[11px] font-bold text-red-500 hover:text-red-600 hover:underline"
        >
          Clear all
        </button>
      )}
    </div>
  );
}

// ============ Table Shell ============
export function TableShell({
  title, search, onSearch, toolbar, children,
}: {
  title: string;
  search?: string;
  onSearch?: (v: string) => void;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm mb-5">
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 border-b border-border">
        <div className="text-sm font-bold">{title}</div>
        <div className="flex items-center gap-2 flex-wrap">
          {toolbar}
          {search !== undefined && onSearch && (
            <Input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search..."
              className="h-8 w-40 text-xs"
            />
          )}
        </div>
      </div>
      <ScrollArea className="max-h-[480px] overflow-auto">
        <table className="w-full border-collapse text-sm">{children}</table>
      </ScrollArea>
    </div>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={cn('bg-muted/50 px-3.5 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border', className)}>
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn('px-3.5 py-2.5 border-b border-border/50 text-[12.5px]', className)}>{children}</td>;
}

// ============ Modal (Dialog wrapper) ============
interface ModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ open, onOpenChange, title, description, children, footer, size = 'md' }: ModalProps) {
  // Use sm: prefix so these override the DialogContent default sm:max-w-lg.
  // Always w-full so the dialog fills its max-width (not shrink to content).
  const sizes = { sm: 'sm:max-w-md', md: 'sm:max-w-2xl', lg: 'sm:max-w-4xl', xl: 'sm:max-w-6xl' };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(sizes[size], 'max-h-[92vh] overflow-y-auto w-[95vw]')}
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle className="text-base font-black">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-3">{children}</div>
        {footer && <DialogFooter className="gap-2">{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}

// ============ Confirm Dialog ============
export function ConfirmDialog({
  open, onOpenChange, title, message, tone = 'danger', confirmLabel = 'Confirm', onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  message: React.ReactNode;
  tone?: 'danger' | 'warn' | 'primary';
  confirmLabel?: string;
  onConfirm: () => void;
}) {
  const tones = {
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    warn: 'bg-amber-500 hover:bg-amber-600 text-white',
    primary: 'bg-slate-900 hover:bg-slate-800 text-white',
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[95vw]" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="text-base font-black flex items-center gap-2">
            {tone === 'danger' && '⚠️'} {title}
          </DialogTitle>
        </DialogHeader>
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 p-4 text-sm text-amber-900 dark:text-amber-200">
          {message}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Back</Button>
          <Button className={tones[tone]} onClick={() => { onConfirm(); onOpenChange(false); }}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ Form Field helpers ============
export function Field({ label, desc, children, className }: { label: string; desc?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
      {desc && <p className="text-[10px] text-muted-foreground leading-tight">{desc}</p>}
    </div>
  );
}

export { Input, Textarea, Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Rs };
