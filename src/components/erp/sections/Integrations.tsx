'use client';

import * as React from 'react';
import {
  MessageSquare, Mail, Calendar, Facebook, Globe, Phone,
  Calculator, CreditCard, Boxes, Package, ShoppingCart,
  HardDrive, Smartphone, FileSpreadsheet, Webhook, Plug,
  CheckCircle2, Clock, Power, Settings2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SectionHeader, StatCard } from '../ui';

type IntegrationStatus = 'connected' | 'available' | 'coming_soon';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  /** Accent colour used for the icon tile + status glow. */
  accent: 'emerald' | 'amber' | 'rose' | 'purple' | 'blue' | 'slate' | 'teal' | 'orange' | 'pink' | 'indigo' | 'cyan' | 'lime' | 'yellow' | 'fuchsia' | 'sky';
  status: IntegrationStatus;
  category: string;
}

const ACCENT_BG: Record<Integration['accent'], string> = {
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  rose: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  teal: 'bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300',
  pink: 'bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300',
  indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
  cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300',
  lime: 'bg-lime-100 text-lime-700 dark:bg-lime-950/60 dark:text-lime-300',
  yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/60 dark:text-yellow-300',
  fuchsia: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/60 dark:text-fuchsia-300',
  sky: 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300',
};

const STATUS_META: Record<IntegrationStatus, { label: string; badge: string; dot: string }> = {
  connected: {
    label: 'Connected',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900',
    dot: 'bg-emerald-500',
  },
  available: {
    label: 'Available',
    badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-400',
  },
  coming_soon: {
    label: 'Coming Soon',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-900',
    dot: 'bg-amber-500',
  },
};

const INTEGRATIONS: Integration[] = [
  {
    id: 'whatsapp',
    name: 'WhatsApp Business API',
    description: 'Send quotations, payment reminders & order updates on WhatsApp directly from the ERP.',
    icon: <MessageSquare className="h-6 w-6" />,
    accent: 'emerald',
    status: 'available',
    category: 'Communication',
  },
  {
    id: 'gmail',
    name: 'Gmail / Outlook',
    description: 'Two-way email sync — every conversation with a client lands inside the lead & customer timeline.',
    icon: <Mail className="h-6 w-6" />,
    accent: 'rose',
    status: 'available',
    category: 'Communication',
  },
  {
    id: 'gcal',
    name: 'Google Calendar',
    description: 'Push follow-ups, meetings & visit schedules to your team calendar automatically.',
    icon: <Calendar className="h-6 w-6" />,
    accent: 'blue',
    status: 'available',
    category: 'Productivity',
  },
  {
    id: 'fb-ads',
    name: 'Facebook / Instagram Lead Ads',
    description: 'Auto-import leads from your paid ad campaigns into the CRM pipeline instantly.',
    icon: <Facebook className="h-6 w-6" />,
    accent: 'indigo',
    status: 'available',
    category: 'Lead Sources',
  },
  {
    id: 'web-forms',
    name: 'Website Forms',
    description: 'Embed a form on your site — every submission creates a lead in real-time.',
    icon: <Globe className="h-6 w-6" />,
    accent: 'cyan',
    status: 'available',
    category: 'Lead Sources',
  },
  {
    id: 'cloud-telephony',
    name: 'Cloud Telephony',
    description: 'Auto-log incoming & outgoing calls, record conversations, route calls to the right rep.',
    icon: <Phone className="h-6 w-6" />,
    accent: 'orange',
    status: 'available',
    category: 'Communication',
  },
  {
    id: 'accounting',
    name: 'Tally / Zoho Books / QuickBooks',
    description: 'Sync invoices, payments & journal entries with your accounting software in one click.',
    icon: <Calculator className="h-6 w-6" />,
    accent: 'amber',
    status: 'available',
    category: 'Finance',
  },
  {
    id: 'payment-gw',
    name: 'Payment Gateway',
    description: 'Razorpay / PayU / Stripe — accept advance & balance payments online, auto-record in ERP.',
    icon: <CreditCard className="h-6 w-6" />,
    accent: 'purple',
    status: 'available',
    category: 'Finance',
  },
  {
    id: 'erp',
    name: 'ERP',
    description: 'Bi-directional sync with SAP / Oracle / Microsoft Dynamics for orders, stock & invoices.',
    icon: <Boxes className="h-6 w-6" />,
    accent: 'slate',
    status: 'coming_soon',
    category: 'Operations',
  },
  {
    id: 'inventory',
    name: 'Inventory System',
    description: 'Real-time stock updates across warehouses — never oversell or run out of paper stock.',
    icon: <Package className="h-6 w-6" />,
    accent: 'teal',
    status: 'available',
    category: 'Operations',
  },
  {
    id: 'ecommerce',
    name: 'Shopify / WooCommerce',
    description: 'Pull online orders from your store, push dispatch & tracking back automatically.',
    icon: <ShoppingCart className="h-6 w-6" />,
    accent: 'lime',
    status: 'available',
    category: 'Sales',
  },
  {
    id: 'cloud-storage',
    name: 'Google Drive / Dropbox',
    description: 'Attach design files, artwork & artwork approvals from your cloud storage to projects.',
    icon: <HardDrive className="h-6 w-6" />,
    accent: 'sky',
    status: 'connected',
    category: 'Storage',
  },
  {
    id: 'sms-gateway',
    name: 'SMS Gateway',
    description: 'Send bulk SMS — payment reminders, dispatch alerts & festival greetings to clients.',
    icon: <Smartphone className="h-6 w-6" />,
    accent: 'pink',
    status: 'connected',
    category: 'Communication',
  },
  {
    id: 'sheets',
    name: 'Excel / Google Sheets',
    description: 'Import leads, items & customers from spreadsheets. Export any report with one click.',
    icon: <FileSpreadsheet className="h-6 w-6" />,
    accent: 'emerald',
    status: 'connected',
    category: 'Productivity',
  },
  {
    id: 'webhooks',
    name: 'API & Webhooks',
    description: 'Build custom integrations — REST API + webhooks for any event in the ERP lifecycle.',
    icon: <Webhook className="h-6 w-6" />,
    accent: 'fuchsia',
    status: 'available',
    category: 'Developer',
  },
];

export function Integrations() {
  const [filter, setFilter] = React.useState<'all' | IntegrationStatus>('all');

  const connectedCount = INTEGRATIONS.filter((i) => i.status === 'connected').length;
  const availableCount = INTEGRATIONS.filter((i) => i.status === 'available').length;
  const comingSoonCount = INTEGRATIONS.filter((i) => i.status === 'coming_soon').length;

  const list = INTEGRATIONS.filter((i) => filter === 'all' || i.status === filter);

  const handleAction = (i: Integration) => {
    if (i.status === 'connected') {
      toast.success(`${i.name} disconnected`, { description: 'You can reconnect anytime from this panel.' });
    } else if (i.status === 'available') {
      toast.success(`Connecting to ${i.name}…`, { description: 'OAuth / API key flow would open here in production.' });
    } else {
      toast.info(`${i.name} is coming soon`, { description: 'We will notify you when this integration is ready.' });
    }
  };

  return (
    <div>
      <SectionHeader
        title="Integrations"
        subtitle="Connect Karyam ERP with the tools your team already uses — communication, finance, storage & more."
        accent="purple"
        actions={
          <Badge variant="outline" className="h-9 px-3 gap-1.5 text-xs font-bold">
            <Plug className="h-3.5 w-3.5" /> {INTEGRATIONS.length} available
          </Badge>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Integrations" value={INTEGRATIONS.length} tone="primary" icon={<Plug className="h-4 w-4" />} />
        <StatCard label="Connected" value={connectedCount} tone="accent" icon={<CheckCircle2 className="h-4 w-4" />} />
        <StatCard label="Available" value={availableCount} icon={<Power className="h-4 w-4" />} />
        <StatCard label="Coming Soon" value={comingSoonCount} tone="warn" icon={<Clock className="h-4 w-4" />} />
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status:</span>
        {(['all', 'connected', 'available', 'coming_soon'] as const).map((s) => {
          const label = s === 'all' ? 'All' : STATUS_META[s].label;
          const count = s === 'all' ? INTEGRATIONS.length : INTEGRATIONS.filter((i) => i.status === s).length;
          const isActive = filter === s;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border',
                isActive
                  ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100 shadow-sm'
                  : 'bg-card text-muted-foreground border-border hover:border-slate-300 hover:text-foreground',
              )}
            >
              {s !== 'all' && <span className={cn('h-2 w-2 rounded-full', STATUS_META[s].dot)} />}
              {label}
              <span className={cn(
                'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black',
                isActive ? 'bg-white/20' : 'bg-muted',
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Integration cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((i) => {
          const meta = STATUS_META[i.status];
          const isComingSoon = i.status === 'coming_soon';
          const isConnected = i.status === 'connected';
          return (
            <div
              key={i.id}
              className={cn(
                'group relative rounded-xl border bg-card shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 overflow-hidden',
                isConnected ? 'border-emerald-200 dark:border-emerald-900' : 'border-border',
              )}
            >
              {/* Connected glow strip */}
              {isConnected && (
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500" />
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center', ACCENT_BG[i.accent])}>
                    {i.icon}
                  </div>
                  <Badge variant="outline" className={cn('text-[10px] font-bold gap-1', meta.badge)}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
                    {meta.label}
                  </Badge>
                </div>

                <h3 className="text-sm font-black tracking-tight">{i.name}</h3>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 mt-0.5">{i.category}</p>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed line-clamp-3 min-h-[3rem]">{i.description}</p>

                <div className="mt-3 flex items-center gap-2">
                  {isConnected ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs flex-1"
                        onClick={() => toast.info(`Opening ${i.name} configuration…`, { description: 'Settings panel would open here.' })}
                      >
                        <Settings2 className="h-3.5 w-3.5" /> Configure
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => handleAction(i)}
                      >
                        <Power className="h-3.5 w-3.5" /> Disconnect
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      className={cn(
                        'h-8 text-xs flex-1',
                        isComingSoon
                          ? 'bg-amber-500 hover:bg-amber-600 text-white'
                          : 'bg-slate-900 hover:bg-slate-800 text-white',
                      )}
                      disabled={isComingSoon}
                      onClick={() => handleAction(i)}
                    >
                      {isComingSoon ? (
                        <><Clock className="h-3.5 w-3.5" /> Notify Me</>
                      ) : (
                        <><Plug className="h-3.5 w-3.5" /> Connect</>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {list.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
          <Plug className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No integrations match this filter.</p>
        </div>
      )}
    </div>
  );
}
