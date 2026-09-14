'use client';

import * as React from 'react';
import { useERP } from '@/lib/erp/store';
import { ROLE_PAGES, DEFAULT_COMPANY_PROFILE } from '@/lib/erp/constants';
import { LoginPage } from './LoginPage';
import { Sidebar } from './Sidebar';
import { Topbar, findPageTitle } from './Topbar';
import { Dashboard } from './sections/Dashboard';
import { Projects } from './sections/Projects';
import { Leads } from './sections/Leads';
import { Quotations } from './sections/Quotations';
import { Design } from './sections/Design';
import { Production } from './sections/Production';
import { DispatchSection } from './sections/Dispatch';
import { Finance } from './sections/Finance';
import { Invoicing } from './sections/Invoicing';
import { GSTSettings } from './sections/GSTSettings';
import { Items } from './sections/Items';
import { Reports } from './sections/Reports';
import { RecycleBin } from './sections/RecycleBin';
import { Reminders } from './sections/Reminders';
import { Tasks } from './sections/Tasks';
import { Notes } from './sections/Notes';
import { Tickets } from './sections/Tickets';
import { Team } from './sections/Team';
import { SettingsSection } from './sections/Settings';
import { WhatsAppCRM } from './sections/WhatsAppCRM';
import { WhatsAppInbox } from './sections/WhatsAppInbox';
import { SalesPipeline } from './sections/SalesPipeline';
import { Customer360 } from './sections/Customer360';
import { CallManagement } from './sections/CallManagement';
import { EmailCenter } from './sections/EmailCenter';
import { Marketing } from './sections/Marketing';
import { FieldSales } from './sections/FieldSales';
import { PharmaCRM } from './sections/PharmaCRM';
import { Workflows } from './sections/Workflows';
import { Integrations } from './sections/Integrations';
import { Customization } from './sections/Customization';
import { PerformanceReports } from './sections/PerformanceReports';
import { FollowupsView } from './sections/FollowupsView';
import { OrdersView } from './sections/OrdersView';
import { LeadDetailPanel } from './sections/LeadDetailPanel';
import { toast } from 'sonner';

export function AppShell() {
  const currentUser = useERP((s) => s.currentUser);
  const permissions = useERP((s) => s.permissions);
  const companyProfile = useERP((s) => s.companyProfile) || DEFAULT_COMPANY_PROFILE;
  const [mounted, setMounted] = React.useState(false);
  const [page, setPage] = React.useState('dashboard');
  const [mobileNav, setMobileNav] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [detailLeadId, setDetailLeadId] = React.useState<string | null>(null);
  const [detailTab, setDetailTab] = React.useState<string | undefined>(undefined);

  React.useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">Loading ERP…</div>;
  }

  if (!currentUser) {
    return <LoginPage />;
  }

  const rolePerms = permissions?.[currentUser.role];
  const allowed: string[] = rolePerms !== undefined ? rolePerms : (ROLE_PAGES[currentUser.role] || []);
  if (currentUser.role === 'owner' && !allowed.includes('settings')) {
    allowed.push('settings');
  }

  const effectivePage = allowed.includes(page) ? page : 'dashboard';

  const navigate = (p: string) => {
    if (!allowed.includes(p)) {
      toast.error('Access denied');
      return;
    }
    setPage(p);
    setSearchQuery('');
  };

  const renderPage = () => {
    switch (effectivePage) {
      case 'dashboard': return <Dashboard />;
      case 'reminders': return <Reminders />;
      case 'projects': return <Projects />;
      case 'leads': return <Leads />;
      case 'pipeline': return <SalesPipeline />;
      case 'followups': return <FollowupsView />;
      case 'customers': return <Customer360 />;
      case 'wainbox': return <WhatsAppInbox onOpenLead={(id) => setDetailLeadId(id)} onOpenLeadTab={(id, tab) => { setDetailLeadId(id); setDetailTab(tab); }} onNavigate={(p) => navigate(p)} />;
      case 'whatsapp': return <WhatsAppCRM />;
      case 'calls': return <CallManagement />;
      case 'email': return <EmailCenter />;
      case 'marketing': return <Marketing />;
      case 'fieldsales': return <FieldSales />;
      case 'pharma': return <PharmaCRM />;
      case 'workflows': return <Workflows />;
      case 'integrations': return <Integrations />;
      case 'customization': return <Customization />;
      case 'quotations': return <Quotations />;
      case 'design': return <Design />;
      case 'production': return <Production />;
      case 'dispatch': return <DispatchSection />;
      case 'finance': return <Finance />;
      case 'invoicing': return <Invoicing />;
      case 'crmorders': return <OrdersView />;
      case 'gstsettings': return <GSTSettings />;
      case 'items': return <Items />;
      case 'tasks': return <Tasks />;
      case 'notes': return <Notes />;
      case 'settings': return <SettingsSection />;
      case 'reports': return <Reports />;
      case 'perf': return <PerformanceReports />;
      case 'recycle': return <RecycleBin />;
      case 'tickets': return <Tickets />;
      case 'team': return <Team />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen flex bg-muted/20 overflow-x-hidden">
      <Sidebar
        currentPage={effectivePage}
        onNavigate={navigate}
        mobileOpen={mobileNav}
        onMobileOpenChange={setMobileNav}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
      />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Topbar
          title={findPageTitle(effectivePage)}
          onMobileMenu={() => setMobileNav(true)}
          onGlobalSearch={setSearchQuery}
          onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
          sidebarCollapsed={sidebarCollapsed}
        />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8 w-full">
          {renderPage()}
        </main>
        <footer className="border-t border-border bg-card px-4 md:px-6 py-3 text-center text-xs text-muted-foreground flex-shrink-0">
          {(() => {
            const name = companyProfile.name || 'Karyam Dessin';
            const accent = companyProfile.accentWord || 'Dessin';
            const parts = name.split(new RegExp(`(${accent})`, 'i'));
            return (
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {parts.map((p, i) => p.toLowerCase() === accent.toLowerCase()
                  ? <span key={i} className="text-emerald-500">{p}</span>
                  : p)}
              </span>
            );
          })()}
          {' '}ERP · {(companyProfile.footerText?.trim())
            ? companyProfile.footerText
            : `${companyProfile.tagline} · ${companyProfile.email} · ${companyProfile.phone} · ${companyProfile.address}`}
        </footer>
      </div>
      {/* Lead Detail Panel — slide-out overlay triggered from Leads/Inbox */}
      <LeadDetailPanel leadId={detailLeadId} initialTab={detailTab} onClose={() => { setDetailLeadId(null); setDetailTab(undefined); }} />
    </div>
  );
}
