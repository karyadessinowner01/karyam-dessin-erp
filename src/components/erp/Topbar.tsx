'use client';

import * as React from 'react';
import { Menu, Search, LogOut, RotateCw, ArrowUpToLine, ArrowDownToLine, FileJson, FileSpreadsheet, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { useERP } from '@/lib/erp/store';
import { NAV } from '@/lib/erp/constants';
import { exportToCSV } from '@/lib/erp/csv';

type ExportFormat = 'json' | 'csv';

export function Topbar({
  title, onMobileMenu, onGlobalSearch, onToggleSidebar, sidebarCollapsed,
}: {
  title: string;
  onMobileMenu: () => void;
  onGlobalSearch: (q: string) => void;
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
}) {
  const logout = useERP((s) => s.logout);
  const importData = useERP((s) => s.importData);
  const currentUser = useERP((s) => s.currentUser);
  const [q, setQ] = React.useState('');
  const [showExportModal, setShowExportModal] = React.useState(false);
  const [showImportModal, setShowImportModal] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const isOwner = currentUser?.role === 'owner';
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-3 sm:px-4 md:px-6 h-14 flex items-center justify-between gap-3 flex-shrink-0">
      <div className="flex items-center gap-2 sm:gap-3">
        <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={onMobileMenu}>
          <Menu className="h-5 w-5" />
        </Button>
        {onToggleSidebar && (
          <Button variant="ghost" size="icon" className="hidden md:flex h-8 w-8" onClick={onToggleSidebar} title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </Button>
        )}
        <div className="min-w-0">
          <div className="text-base sm:text-lg font-black tracking-tight leading-none truncate">{title}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5 hidden sm:block">{dateStr}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative hidden sm:block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => { setQ(e.target.value); onGlobalSearch(e.target.value); }}
            placeholder="Search..."
            className="pl-8 h-8 w-40 lg:w-56 text-xs"
          />
        </div>

        {/* Admin-only: Export + Import data */}
        {isOwner && (
          <>
            <Button variant="outline" size="sm" className="h-8 text-[11px] font-bold" onClick={() => setShowExportModal(true)} title="Export data">
              <ArrowUpToLine className="h-3 w-3 mr-1" /> Export
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-[11px] font-bold" onClick={() => setShowImportModal(true)} title="Import data">
              <ArrowDownToLine className="h-3 w-3 mr-1" /> Import
            </Button>
          </>
        )}

        {/* Refresh button */}
        <Button variant="outline" size="sm" className="h-8 text-[11px] font-bold" onClick={() => location.reload()} title="Refresh page">
          <RotateCw className="h-3 w-3 mr-1" /> Refresh
        </Button>

        <Button
          variant="outline" size="sm"
          className="h-8 text-[11px] font-bold hover:border-red-400 hover:text-red-500"
          onClick={async () => {
            const { auth, isFirebaseConfigured } = await import('@/lib/firebase');
            if (auth && isFirebaseConfigured()) {
              const { signOut } = await import('firebase/auth');
              try { await signOut(auth); } catch {}
            }
            logout();
          }}
        >
          <LogOut className="h-3.5 w-3.5 mr-1" /> Logout
        </Button>
      </div>

      {/* Export Modal */}
      <ExportModal open={showExportModal} onOpenChange={setShowExportModal} />

      {/* Import Modal */}
      <ImportModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        onImport={(data) => {
          importData(data);
          toast.success('Data imported successfully!');
          setTimeout(() => location.reload(), 500);
        }}
      />
    </div>
  );
}

// ============ Export Modal (with file type selector) ============
function ExportModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [format, setFormat] = React.useState<ExportFormat>('json');

  const handleExport = () => {
    const state = useERP.getState();
    const dateStr = new Date().toISOString().split('T')[0];

    if (format === 'json') {
      // Export everything as a single JSON backup file
      const exportable = {
        projects: state.projects,
        leads: state.leads,
        quotations: state.quotations,
        designs: state.designs,
        production: state.production,
        printJobs: state.printJobs,
        dispatches: state.dispatches,
        payments: state.payments,
        expenses: state.expenses,
        refunds: state.refunds,
        items: state.items,
        tickets: state.tickets,
        activities: state.activities,
        team: state.team,
        recycleBin: state.recycleBin,
        nextIds: state.nextIds,
        _exportedAt: new Date().toISOString(),
        _version: 'karyam-erp-v1',
      };
      const json = JSON.stringify(exportable, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `karyam-erp-backup-${dateStr}.json`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(`Exported as JSON: karyam-erp-backup-${dateStr}.json`);
    } else {
      // Export each collection as a separate CSV file (downloads payments + expenses + items + projects)
      const downloadCSV = (filename: string, rows: any[], columns: { key: string; label: string }[]) => {
        exportToCSV(filename, rows, columns);
      };

      downloadCSV(`projects-${dateStr}.csv`, state.projects, [
        { key: 'id', label: 'ID' }, { key: 'client', label: 'Client' }, { key: 'title', label: 'Title' },
        { key: 'value', label: 'Value' }, { key: 'stage', label: 'Stage' }, { key: 'delivery', label: 'Delivery' },
        { key: 'advance', label: 'Advance' }, { key: 'createdBy', label: 'Created By' }, { key: 'createdAt', label: 'Created' },
      ]);

      setTimeout(() => downloadCSV(`payments-${dateStr}.csv`, state.payments, [
        { key: 'id', label: 'ID' }, { key: 'date', label: 'Date' }, { key: 'projectId', label: 'Project' },
        { key: 'client', label: 'Client' }, { key: 'type', label: 'Type' }, { key: 'mode', label: 'Mode' },
        { key: 'amount', label: 'Amount' }, { key: 'reference', label: 'Reference' },
      ]), 300);

      setTimeout(() => downloadCSV(`expenses-${dateStr}.csv`, state.expenses, [
        { key: 'id', label: 'ID' }, { key: 'date', label: 'Date' }, { key: 'category', label: 'Category' },
        { key: 'desc', label: 'Description' }, { key: 'vendor', label: 'Vendor' },
        { key: 'amount', label: 'Amount' }, { key: 'reference', label: 'Reference' },
      ]), 600);

      setTimeout(() => downloadCSV(`items-${dateStr}.csv`, state.items, [
        { key: 'id', label: 'ID' }, { key: 'name', label: 'Name' }, { key: 'category', label: 'Category' },
        { key: 'hsn', label: 'HSN' }, { key: 'gstRate', label: 'GST %' }, { key: 'rate', label: 'Rate' },
        { key: 'stock', label: 'Stock' }, { key: 'minStock', label: 'Min Stock' },
      ]), 900);

      toast.success('Exported 4 CSV files: projects, payments, expenses, items');
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="text-base font-black flex items-center gap-2">
            <ArrowUpToLine className="h-4 w-4" /> Export Data
          </DialogTitle>
          <DialogDescription>Choose the file format for your data export.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <button
            onClick={() => setFormat('json')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
              format === 'json' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' : 'border-border hover:border-slate-300'
            }`}
          >
            <FileJson className={`h-8 w-8 ${format === 'json' ? 'text-emerald-500' : 'text-muted-foreground'}`} />
            <div className="flex-1">
              <div className="text-sm font-bold">JSON Backup</div>
              <div className="text-[11px] text-muted-foreground">Complete backup — all data in one file. Can be imported back.</div>
            </div>
            {format === 'json' && <div className="h-4 w-4 rounded-full bg-emerald-500" />}
          </button>

          <button
            onClick={() => setFormat('csv')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
              format === 'csv' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' : 'border-border hover:border-slate-300'
            }`}
          >
            <FileSpreadsheet className={`h-8 w-8 ${format === 'csv' ? 'text-emerald-500' : 'text-muted-foreground'}`} />
            <div className="flex-1">
              <div className="text-sm font-bold">CSV Spreadsheet</div>
              <div className="text-[11px] text-muted-foreground">Exports 4 CSV files (projects, payments, expenses, items) — opens in Excel.</div>
            </div>
            {format === 'csv' && <div className="h-4 w-4 rounded-full bg-emerald-500" />}
          </button>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={handleExport}>
            <ArrowUpToLine className="h-4 w-4" /> Export as {format.toUpperCase()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ Import Modal (with file type selector) ============
function ImportModal({
  open, onOpenChange, onImport,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImport: (data: any) => void;
}) {
  const [fileName, setFileName] = React.useState('');
  const [fileData, setFileData] = React.useState<any>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    if (!file.name.endsWith('.json')) {
      toast.error('Only JSON backup files can be imported. Use Export → JSON first.');
      setFileData(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!data || typeof data !== 'object') {
          toast.error('Invalid backup file');
          setFileData(null);
          return;
        }
        setFileData(data);
        toast.success(`File loaded: ${file.name}`);
      } catch (err) {
        toast.error('Failed to parse JSON — invalid file');
        setFileData(null);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImport = () => {
    if (!fileData) {
      toast.error('Please select a JSON backup file first');
      return;
    }
    if (!confirm('Importing will REPLACE all current data with the backup. Continue?')) return;
    onImport(fileData);
    setFileData(null);
    setFileName('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setFileData(null); setFileName(''); } }}>
      <DialogContent className="max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="text-base font-black flex items-center gap-2">
            <ArrowDownToLine className="h-4 w-4" /> Import Data
          </DialogTitle>
          <DialogDescription>Restore data from a previously exported JSON backup file.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* File type info */}
          <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-border bg-muted/30">
            <FileJson className="h-8 w-8 text-emerald-500" />
            <div className="flex-1">
              <div className="text-sm font-bold">JSON Backup File</div>
              <div className="text-[11px] text-muted-foreground">Only .json files exported from this app can be imported.</div>
            </div>
            <div className="h-4 w-4 rounded-full bg-emerald-500" />
          </div>

          {/* File picker */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button variant="outline" className="w-full h-10" onClick={() => fileInputRef.current?.click()}>
              <FileJson className="h-4 w-4 mr-2" /> {fileName || 'Choose JSON file...'}
            </Button>
          </div>

          {fileName && fileData && (
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300">
              <strong>Ready to import:</strong> {fileName}
              <div className="text-[10px] mt-0.5 text-muted-foreground">
                {fileData.projects ? `${fileData.projects.length} projects, ` : ''}
                {fileData.payments ? `${fileData.payments.length} payments, ` : ''}
                {fileData.items ? `${fileData.items.length} items` : ''}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={handleImport} disabled={!fileData}>
            <ArrowDownToLine className="h-4 w-4" /> Import Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function findPageTitle(page: string): string {
  for (const g of NAV) {
    for (const i of g.items) {
      if (i.k === page) return i.l;
    }
  }
  return page;
}
