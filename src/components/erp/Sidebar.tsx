'use client';

import * as React from 'react';
import {
  LayoutDashboard, FolderOpen, UserPlus, FileText, Palette, Factory,
  Truck, Coins, Ticket, Users, Package, BarChart3, Trash2, Receipt, Settings,
  SlidersHorizontal, Megaphone, UserCog, CheckCircle2, BellRing,
  ListChecks, StickyNote, MessageCircle, Phone, Mail, MapPin, GitBranch,
  Building2, Pill, Workflow, Plug, ChevronLeft, ChevronRight,
  MessageSquare, CalendarClock, PackageCheck, TrendingUp, type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useERP } from '@/lib/erp/store';
import { NAV, ROLE_PAGES, ROLE_LABELS } from '@/lib/erp/constants';

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard, FolderOpen, UserPlus, FileText, Palette, Factory,
  Truck, Coins, Ticket, Users, Package, BarChart3, Trash2, Receipt, Settings,
  SlidersHorizontal, Megaphone, UserCog, CheckCircle2, BellRing,
  ListChecks, StickyNote,
  MessageCircle, Phone, Mail, MapPin, GitBranch, Building2, Pill, Workflow, Plug,
  MessageSquare, CalendarClock, PackageCheck, TrendingUp,
};

/** Render a company name with the accent word highlighted */
function renderName(name: string, accent: string, accentClass = 'text-emerald-400') {
  if (!accent) return name;
  const parts = name.split(new RegExp(`(${accent})`, 'i'));
  return parts.map((p, i) =>
    p.toLowerCase() === accent.toLowerCase()
      ? <span key={i} className={accentClass}>{p}</span>
      : p
  );
}

export function Sidebar({
  currentPage, onNavigate, mobileOpen, onMobileOpenChange, collapsed, onToggleCollapse,
}: {
  currentPage: string;
  onNavigate: (page: string) => void;
  mobileOpen: boolean;
  onMobileOpenChange: (v: boolean) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const currentUser = useERP((s) => s.currentUser);
  const team = useERP((s) => s.team);
  const tickets = useERP((s) => s.tickets);
  const reminders = useERP((s) => s.reminders || []);
  const permissions = useERP((s) => s.permissions);
  const companyProfile = useERP((s) => s.companyProfile);

  if (!currentUser) return null;
  const rolePerms = permissions?.[currentUser.role];
  let pages: string[] = rolePerms !== undefined ? rolePerms : (ROLE_PAGES[currentUser.role] || []);
  if (currentUser.role === 'owner' && !pages.includes('settings')) pages.push('settings');
  const openTickets = tickets.filter((t) => t.status === 'open' || t.status === 'in_progress').length;

  const canSeeAllReminders = currentUser.role === 'owner' || currentUser.role === 'management';
  const todayStr = new Date().toISOString().split('T')[0];
  const myReminders = canSeeAllReminders
    ? reminders
    : reminders.filter((r) => r.assignedTo.toLowerCase() === (currentUser.email || '').toLowerCase());
  const dueReminderCount = myReminders.filter(
    (r) => r.status !== 'done' && r.dueDate <= todayStr,
  ).length;

  const initials = currentUser.name.charAt(0).toUpperCase();
  const roleLabel = ROLE_LABELS[currentUser.role];

  // Width: expanded = 260px, collapsed = 68px
  const sidebarWidth = collapsed ? 'w-[68px]' : 'w-[260px]';

  const content = (
    <div className={cn(
      'flex flex-col h-full bg-slate-900 dark:bg-slate-950 text-white min-h-0 overflow-hidden transition-all duration-300',
      sidebarWidth,
    )}>
      {/* Brand / Logo — clickable to toggle collapse */}
      <button
        onClick={onToggleCollapse}
        className="px-4 py-4 border-b border-white/[0.12] flex items-center gap-3 flex-shrink-0 hover:bg-white/[0.03] transition-colors w-full"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {companyProfile?.logoImage ? (
          <img src={companyProfile.logoImage} alt="logo" className="h-9 w-9 rounded-lg object-cover flex-shrink-0 mx-auto" />
        ) : (
          <span className={cn(
            'h-9 w-9 rounded-lg bg-white flex items-center justify-center font-black text-slate-900 text-lg flex-shrink-0 transition-all',
            collapsed && 'mx-auto',
          )}>{companyProfile?.logoText || 'KD'}</span>
        )}
        {!collapsed && (
          <div className="flex-1 min-w-0 text-left">
            <div className="text-[15px] font-black tracking-tight truncate">
              {renderName(companyProfile?.name || 'Karyam Dessin', companyProfile?.accentWord || 'Dessin')}
            </div>
            <div className="text-[9px] text-white/40 uppercase tracking-wider">ERP · CRM</div>
          </div>
        )}
        {!collapsed && <ChevronLeft className="h-4 w-4 text-white/30 flex-shrink-0" />}
      </button>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2.5 sidebar-nav-scroll min-h-0">
        {NAV.map((g) => {
          const visible = g.items.filter((i) => pages.includes(i.k));
          if (!visible.length) return null;
          return (
            <div key={g.g} className="mb-1">
              {!collapsed && (
                <div className="px-3.5 py-2 text-[9px] text-white/25 uppercase tracking-[1.5px] font-bold whitespace-nowrap">
                  {g.g}
                </div>
              )}
              {collapsed && <div className="my-2 mx-2 border-t border-white/[0.08]" />}
              {visible.map((i) => {
                const Icon = ICONS[i.icon] || LayoutDashboard;
                const active = currentPage === i.k;
                let badge = 0;
                if (i.k === 'tickets' && openTickets > 0) badge = openTickets;
                else if (i.k === 'reminders' && dueReminderCount > 0) badge = dueReminderCount;
                const badgeTone = i.k === 'reminders' ? 'bg-amber-500/25 text-amber-200' : 'bg-red-500/20 text-red-300';
                return (
                  <button
                    key={i.k}
                    onClick={() => { onNavigate(i.k); onMobileOpenChange(false); }}
                    title={collapsed ? i.l : undefined}
                    className={cn(
                      'relative w-full flex items-center gap-2.5 rounded-lg text-[13px] font-semibold transition-all mb-0.5',
                      collapsed ? 'justify-center px-0 py-2.5' : 'px-3.5 py-2.5 whitespace-nowrap',
                      active
                        ? 'bg-emerald-500/20 text-white'
                        : 'text-white/45 hover:text-white/85 hover:bg-white/[0.06]',
                    )}
                  >
                    {active && !collapsed && (
                      <motion.div
                        layoutId="active-pill"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] bg-emerald-400 rounded-r"
                        transition={{ duration: 0.2 }}
                      />
                    )}
                    {active && collapsed && (
                      <motion.div
                        layoutId="active-pill-collapsed"
                        className="absolute inset-0 rounded-lg bg-emerald-500/20"
                        transition={{ duration: 0.2 }}
                      />
                    )}
                    <Icon className={cn('h-[18px] w-[18px] flex-shrink-0', active && 'text-emerald-300')} />
                    {!collapsed && <span className="text-left whitespace-nowrap">{i.l}</span>}
                    {badge > 0 && !collapsed && (
                      <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-auto', badgeTone)}>
                        {badge}
                      </span>
                    )}
                    {badge > 0 && collapsed && (
                      <span className={cn('absolute -top-0.5 -right-0.5 text-[8px] font-bold px-1 py-0.5 rounded-full', badgeTone)}>
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* User card */}
      <div className="p-2.5 border-t border-white/[0.06] flex-shrink-0">
        <div className={cn('flex items-center gap-2.5 rounded-lg', collapsed && 'justify-center')}>
          <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-[12px] text-white flex-shrink-0">
            {initials}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold truncate">{currentUser.name}</div>
              <div className="text-[9px] text-white/35 uppercase tracking-[1px]">{roleLabel}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop — collapsible sidebar */}
      <aside className="hidden md:block flex-shrink-0 h-screen sticky top-0 z-30">
        {content}
      </aside>

      {/* Mobile sheet */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => onMobileOpenChange(false)} />
          <motion.div
            initial={{ x: -260 }}
            animate={{ x: 0 }}
            className="absolute left-0 top-0 bottom-0"
          >
            <div className="w-[260px] h-full">
              {content}
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
