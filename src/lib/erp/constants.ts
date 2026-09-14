import type { Role, Stage, ERPState, DeptKey, DeptStatusEntry, Reminder, Task, Note, ChecklistItem, TaxRate, HSNCode, CustomerGST, SupplierGST, LeadPriority, LeadStage, CallLog, EmailTemplate, EmailLog, Campaign, FieldVisit, Doctor, Chemist, WorkflowRule, CustomField, WhatsAppTemplate, WhatsAppLog, ChatMessage, QuickReply, FollowupItem, CRMOrder, CRMNotification, LeadStatusConfig, CRMCampaign } from './types';

/** Helper to build a per-department status record for seed projects */
function ds(marketing: DeptStatusEntry, designing: DeptStatusEntry, production: DeptStatusEntry, management: DeptStatusEntry): Record<DeptKey, DeptStatusEntry> {
  return { marketing, designing, production, management };
}
const D = (status: DeptStatusEntry['status'], updatedBy = 'Rahul Singh', note?: string): DeptStatusEntry => ({ status, updatedBy, note, updatedAt: today() });

// ===================== Navigation =====================
export interface NavItem {
  k: string;
  l: string;
  icon: string; // lucide icon name
}
export interface NavGroup {
  g: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    g: 'Main',
    items: [
      { k: 'dashboard', l: 'Dashboard', icon: 'LayoutDashboard' },
      { k: 'reminders', l: 'Reminders', icon: 'BellRing' },
      { k: 'projects', l: 'Projects', icon: 'FolderOpen' },
    ],
  },
  {
    g: 'Sales',
    items: [
      { k: 'leads', l: 'Leads', icon: 'UserPlus' },
      { k: 'pipeline', l: 'Sales Pipeline', icon: 'GitBranch' },
      { k: 'followups', l: 'Follow-ups', icon: 'CalendarClock' },
      { k: 'quotations', l: 'Quotations', icon: 'FileText' },
      { k: 'invoicing', l: 'GST Invoice', icon: 'Receipt' },
      { k: 'crmorders', l: 'Orders', icon: 'PackageCheck' },
      { k: 'customers', l: 'Customers 360', icon: 'Building2' },
    ],
  },
  {
    g: 'Communication',
    items: [
      { k: 'wainbox', l: 'WhatsApp Chat', icon: 'MessageSquare' },
      { k: 'whatsapp', l: 'WhatsApp CRM', icon: 'MessageCircle' },
      { k: 'calls', l: 'Call Management', icon: 'Phone' },
      { k: 'email', l: 'Email Center', icon: 'Mail' },
      { k: 'marketing', l: 'Marketing', icon: 'Megaphone' },
    ],
  },
  {
    g: 'Operations',
    items: [
      { k: 'design', l: 'Design', icon: 'Palette' },
      { k: 'production', l: 'Production', icon: 'Factory' },
      { k: 'dispatch', l: 'Dispatch', icon: 'Truck' },
      { k: 'fieldsales', l: 'Field Sales', icon: 'MapPin' },
    ],
  },
  {
    g: 'Departments',
    items: [
      { k: 'finance', l: 'Finance', icon: 'Coins' },
      { k: 'pharma', l: 'Pharma CRM', icon: 'Pill' },
    ],
  },
  {
    g: 'Admin',
    items: [
      { k: 'items', l: 'Items', icon: 'Package' },
      { k: 'tasks', l: 'Tasks', icon: 'ListChecks' },
      { k: 'notes', l: 'Notes', icon: 'StickyNote' },
      { k: 'workflows', l: 'Workflows', icon: 'Workflow' },
      { k: 'integrations', l: 'Integrations', icon: 'Plug' },
      { k: 'customization', l: 'Customization', icon: 'SlidersHorizontal' },
      { k: 'gstsettings', l: 'GST Settings', icon: 'Settings' },
      { k: 'settings', l: 'Settings', icon: 'SlidersHorizontal' },
      { k: 'reports', l: 'Reports', icon: 'BarChart3' },
      { k: 'perf', l: 'Performance', icon: 'TrendingUp' },
      { k: 'tickets', l: 'Tickets', icon: 'Ticket' },
      { k: 'team', l: 'Team', icon: 'Users' },
      { k: 'recycle', l: 'Recycle Bin', icon: 'Trash2' },
    ],
  },
];

// ===================== Role Permissions =====================
// 'reminders' is available to EVERY role (each user + the owner).
// 'tasks' & 'notes' are Owner + Management only (owner workspace).
export const ROLE_PAGES: Record<Role, string[]> = {
  owner: [
    'dashboard', 'reminders', 'projects', 'leads', 'pipeline', 'followups', 'quotations', 'invoicing', 'crmorders', 'customers',
    'wainbox', 'whatsapp', 'calls', 'email', 'marketing',
    'design', 'production', 'dispatch', 'fieldsales',
    'finance', 'pharma',
    'items', 'tasks', 'notes', 'workflows', 'integrations', 'customization', 'gstsettings', 'settings', 'reports', 'perf', 'tickets', 'team', 'recycle',
  ],
  management: [
    'dashboard', 'reminders', 'projects', 'leads', 'pipeline', 'followups', 'quotations', 'invoicing', 'crmorders', 'customers',
    'wainbox', 'whatsapp', 'calls', 'email', 'marketing',
    'design', 'production', 'dispatch', 'fieldsales',
    'finance', 'pharma',
    'items', 'tasks', 'notes', 'workflows', 'gstsettings', 'reports', 'perf', 'tickets', 'team',
  ],
  finance: [
    'dashboard', 'reminders', 'projects', 'quotations', 'invoicing', 'crmorders', 'customers',
    'whatsapp', 'email',
    'finance', 'items', 'reports', 'tickets',
  ],
  marketing: ['dashboard', 'reminders', 'projects', 'leads', 'pipeline', 'followups', 'quotations', 'crmorders', 'customers', 'wainbox', 'whatsapp', 'calls', 'email', 'marketing', 'fieldsales', 'tickets'],
  designer: ['dashboard', 'reminders', 'projects', 'design', 'tickets'],
  production: ['dashboard', 'reminders', 'projects', 'production', 'dispatch', 'fieldsales', 'tickets'],
};

/** All navigable page keys (used by the Settings permission matrix) */
export const ALL_PAGES = [
  'dashboard', 'reminders', 'projects', 'leads', 'pipeline', 'followups', 'quotations', 'invoicing', 'crmorders', 'customers',
  'wainbox', 'whatsapp', 'calls', 'email', 'marketing',
  'design', 'production', 'dispatch', 'fieldsales',
  'finance', 'pharma',
  'items', 'tasks', 'notes', 'workflows', 'integrations', 'customization', 'gstsettings', 'settings', 'reports', 'perf', 'tickets', 'team', 'recycle',
];

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner / Admin',
  management: 'Management Team',
  finance: 'Finance Team',
  marketing: 'Marketing / Sales',
  designer: 'Designer',
  production: 'Production / Dispatch',
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  owner: 'Full access — Cancel, Refund, Delete, Approve, Manage Permissions',
  management: 'All departments access — Approve projects, Manage team',
  finance: 'Transactions, Payments, Quotations, Invoices, Finance & Reports',
  marketing: 'Leads, Project intake',
  designer: 'Design assignments and approvals',
  production: 'Production queue and dispatch',
};

// ===================== Stage Config =====================
export interface StageConfig {
  key: Stage | 'design_approved';
  label: string;
  icon: string;
}

export const STAGES: StageConfig[] = [
  { key: 'marketing', label: 'Marketing', icon: 'Megaphone' },
  { key: 'designing', label: 'Designing', icon: 'Palette' },
  { key: 'production', label: 'Production', icon: 'Factory' },
  { key: 'management', label: 'Mgmt Review', icon: 'UserCog' },
  { key: 'completed', label: 'Completed', icon: 'CheckCircle2' },
];

export const STAGE_ORDER: Record<string, number> = {
  marketing: 0,
  designing: 1,
  design_approved: 1.5,
  production: 2,
  management: 3,
  completed: 4,
  cancelled: -1,
};

export const STAGE_LABELS: Record<string, string> = {
  marketing: 'Marketing',
  designing: 'Designing',
  design_approved: 'Design Approved',
  production: 'Production',
  management: 'Mgmt Review',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

// ===================== Badge maps =====================
// Maps status text -> tailwind classes for pill badges
export const STATUS_BADGES: Record<string, string> = {
  marketing: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
  designing: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  design_approved: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  production: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  management: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
  running: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  packing: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  ready: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
  'in transit': 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  sent: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  new: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
  'follow up': 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  'quotation sent': 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  won: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  lost: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  unassigned: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  'in progress': 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  'pending approval': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  revision: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  open: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  in_progress: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  closed: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

export const DEPT_BADGE: Record<string, string> = {
  marketing: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
  designer: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  production: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  management: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  finance: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  owner: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

export const DEPT_LABELS: Record<string, string> = {
  marketing: 'Marketing',
  designer: 'Design',
  production: 'Production',
  management: 'Management',
  finance: 'Finance',
  owner: 'Owner',
};

export const PRIORITY_DOT: Record<string, string> = {
  low: 'bg-slate-400',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
};

// ===================== Static option lists =====================
export const EXPENSE_CATEGORIES = ['Printing', 'Courier', 'Salary', 'Office Rent', 'Material', 'Misc'];

/** Chart colors for expense categories (used by Finance & Reports donut/legend) */
export const EXPENSE_CATEGORY_COLORS: Record<string, string> = {
  Printing: '#8b5cf6',      // purple
  Courier: '#06b6d4',       // cyan
  Salary: '#10b981',        // emerald
  'Office Rent': '#f59e0b', // amber
  Material: '#ec4899',      // pink
  Misc: '#64748b',          // slate
};

/** Chart colors for payment modes */
export const PAYMENT_MODE_COLORS: Record<string, string> = {
  'Bank Transfer': '#3b82f6', // blue
  UPI: '#10b981',             // emerald
  Cheque: '#f59e0b',          // amber
  Cash: '#ef4444',            // red
};
export const PAYMENT_TYPES = ['Advance', 'Mid', 'Final', 'Full'];
export const PAYMENT_MODES = ['Bank Transfer', 'UPI', 'Cheque', 'Cash'];
export const REFUND_MODES = ['Bank Transfer', 'UPI', 'Cheque'];
export const COURIERS = ['DTDC', 'FedEx', 'Delhivery', 'BlueDart', 'India Post'];
export const LEAD_SOURCES = ['Referral', 'Cold Call', 'Website', 'Exhibition', 'Social Media'];
export const ITEM_CATEGORIES = ['Visual Aid', 'Reminder Card', 'Leave Behind', 'Brochure', 'Packaging', 'Print Material', 'Other'];

/** Lead categories — classify leads by the kind of work / product they want. */
export const LEAD_CATEGORIES = ['Visual Aid', 'Brochure', 'Packaging', 'Cards', 'Printing', 'Design', 'General', 'Other'];

/** Lead priority options (Hot / Warm / Cold). */
export const LEAD_PRIORITIES: LeadPriority[] = ['Hot', 'Warm', 'Cold'];

/** Lead pipeline stages (Kanban). */
export const LEAD_STAGES: LeadStage[] = ['New', 'Contacted', 'Qualified', 'Quotation', 'Negotiation', 'Won', 'Lost'];

/** Standard reasons for losing a lead (used in the lead-lost dialog). */
export const LOST_REASONS = ['Price too high', 'Went to competitor', 'No response', 'Budget constraints', 'Requirement changed', 'Decision delayed', 'Other'];

export const ITEM_UNITS = ['pcs', 'set', 'box', 'pad', 'ream', 'kg', 'roll'];

// ===================== Lead status config (WhatsApp CRM style) =====================
// 9 system statuses mirroring the uploaded CRM — used by Lead Detail Panel quick actions
// and the Lead Status configuration page (system ones cannot be deleted).
export const LEAD_STATUS_CONFIGS: LeadStatusConfig[] = [
  { id: 'LS-0001', name: 'NEW_LEAD',       label: 'New Lead',        emoji: '🆕', color: 'slate',    position: 0, isSystem: true,  isWon: false, isLost: false, isQuickAction: false },
  { id: 'LS-0002', name: 'CONTACTED',      label: 'Contacted',       emoji: '📞', color: 'cyan',    position: 1, isSystem: true,  isWon: false, isLost: false, isQuickAction: false },
  { id: 'LS-0003', name: 'INTERESTED',     label: 'Interested',      emoji: '🔥', color: 'amber',   position: 2, isSystem: true,  isWon: false, isLost: false, isQuickAction: true  },
  { id: 'LS-0004', name: 'QUOTATION_SENT', label: 'Quotation Sent',  emoji: '📄', color: 'violet',  position: 3, isSystem: true,  isWon: false, isLost: false, isQuickAction: true  },
  { id: 'LS-0005', name: 'FOLLOW_UP',      label: 'Follow Up',       emoji: '⏰', color: 'orange',  position: 4, isSystem: true,  isWon: false, isLost: false, isQuickAction: true  },
  { id: 'LS-0006', name: 'NOT_INTERESTED', label: 'Not Interested',  emoji: '❌', color: 'rose',    position: 5, isSystem: true,  isWon: false, isLost: true,  isQuickAction: true  },
  { id: 'LS-0007', name: 'NOT_ORDERED',    label: 'Not Ordered',     emoji: '🚫', color: 'red',     position: 6, isSystem: true,  isWon: false, isLost: true,  isQuickAction: true  },
  { id: 'LS-0008', name: 'ORDER_CONFIRMED',label: 'Order Confirmed', emoji: '✅', color: 'emerald', position: 7, isSystem: true,  isWon: false, isLost: false, isQuickAction: true  },
  { id: 'LS-0009', name: 'CONVERTED',      label: 'Converted',       emoji: '🏆', color: 'green',   position: 8, isSystem: true,  isWon: true,  isLost: false, isQuickAction: false },
];

/** Tailwind classes per status color token — badge / dot / solid bg / text. */
export const STATUS_COLOR_CLASSES: Record<string, { badge: string; dot: string; bg: string; text: string }> = {
  slate:   { badge: 'bg-slate-100 text-slate-700 border-slate-200',   dot: 'bg-slate-500',   bg: 'bg-slate-500',   text: 'text-slate-600'   },
  cyan:    { badge: 'bg-cyan-100 text-cyan-700 border-cyan-200',      dot: 'bg-cyan-500',    bg: 'bg-cyan-500',    text: 'text-cyan-600'    },
  amber:   { badge: 'bg-amber-100 text-amber-700 border-amber-200',   dot: 'bg-amber-500',   bg: 'bg-amber-500',   text: 'text-amber-600'   },
  violet:  { badge: 'bg-violet-100 text-violet-700 border-violet-200',dot: 'bg-violet-500',  bg: 'bg-violet-500',  text: 'text-violet-600'  },
  orange:  { badge: 'bg-orange-100 text-orange-700 border-orange-200',dot: 'bg-orange-500',  bg: 'bg-orange-500',  text: 'text-orange-600'  },
  rose:    { badge: 'bg-rose-100 text-rose-700 border-rose-200',      dot: 'bg-rose-500',    bg: 'bg-rose-500',    text: 'text-rose-600'    },
  red:     { badge: 'bg-red-100 text-red-700 border-red-200',         dot: 'bg-red-500',     bg: 'bg-red-500',     text: 'text-red-600'     },
  emerald: { badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', bg: 'bg-emerald-500', text: 'text-emerald-600' },
  green:   { badge: 'bg-green-100 text-green-700 border-green-200',   dot: 'bg-green-500',   bg: 'bg-green-500',   text: 'text-green-600'   },
};

/** Solid background button classes per status color token (for quick-action buttons). */
export const STATUS_BUTTON_CLASSES: Record<string, string> = {
  slate:   'bg-slate-500 hover:bg-slate-600',
  cyan:    'bg-cyan-500 hover:bg-cyan-600',
  amber:   'bg-amber-500 hover:bg-amber-600',
  violet:  'bg-violet-500 hover:bg-violet-600',
  orange:  'bg-orange-500 hover:bg-orange-600',
  rose:    'bg-rose-500 hover:bg-rose-600',
  red:     'bg-red-500 hover:bg-red-600',
  emerald: 'bg-emerald-500 hover:bg-emerald-600',
  green:   'bg-green-500 hover:bg-green-600',
};

/** Resolve a status color token to its tailwind class set (falls back to slate). */
export function getStatusColor(color: string) {
  return STATUS_COLOR_CLASSES[color] ?? STATUS_COLOR_CLASSES.slate;
}

/** Resolve a status color token to a solid button class (falls back to slate). */
export function getButtonClass(color: string) {
  return STATUS_BUTTON_CLASSES[color] ?? STATUS_BUTTON_CLASSES.slate;
}

/** Normalize a phone number to E.164 (+91XXXXXXXXXX) — strips non-digits, defaults 10-digit numbers to India. */
export function normalizePhone(input: string): string {
  if (!input) return '';
  let raw = input.trim();
  // WhatsApp sometimes passes numbers like "919876543210" (no +) or "+919876543210"
  raw = raw.replace(/[^\d+]/g, '');
  if (raw.startsWith('+')) {
    raw = raw.slice(1);
  } else if (raw.startsWith('00')) {
    // international prefix 00
    raw = raw.slice(2);
  } else if (raw.length === 10) {
    // assume India default for 10-digit numbers
    raw = '91' + raw;
  }
  // ensure only digits remain
  raw = raw.replace(/\D/g, '');
  return '+' + raw;
}

/** Pretty-print a normalized phone number — +919876543210 → +91 98765 43210. */
export function formatPhoneDisplay(normalized: string): string {
  if (!normalized) return '';
  // +919876543210 -> +91 98765 43210
  const digits = normalized.replace(/\D/g, '');
  if (digits.length >= 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7, 12)}`;
  }
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5, 10)}`;
  }
  return normalized;
}

// ===================== Seed data =====================
const today = () => new Date().toISOString().split('T')[0];
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
};
const daysAhead = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};

export const SEED_TEAM = [
  { id: 1, name: 'Rahul Singh', dept: 'marketing' as Role, email: 'rahul@karyam.com', phone: '9876543210', active: true, userId: 'rahul', password: 'rahul123', loginRole: 'marketing' as Role },
  { id: 2, name: 'Priya Sharma', dept: 'designer' as Role, email: 'priya@karyam.com', phone: '9876543211', active: true, userId: 'priya', password: 'priya123', loginRole: 'designer' as Role },
  { id: 3, name: 'Amit Verma', dept: 'designer' as Role, email: 'amit@karyam.com', phone: '9876543212', active: true, userId: 'amit', password: 'amit123', loginRole: 'designer' as Role },
  { id: 4, name: 'Ramesh Kumar', dept: 'production' as Role, email: 'ramesh@karyam.com', phone: '9876543213', active: true, userId: 'ramesh', password: 'ramesh123', loginRole: 'production' as Role },
  { id: 5, name: 'Suresh Patel', dept: 'production' as Role, email: 'suresh@karyam.com', phone: '9876543214', active: true, userId: 'suresh', password: 'suresh123', loginRole: 'production' as Role },
  { id: 6, name: 'Vikram Joshi', dept: 'management' as Role, email: 'vikram@karyam.com', phone: '9876543215', active: true, userId: 'vikram', password: 'vikram123', loginRole: 'management' as Role },
  { id: 7, name: 'Neha Gupta', dept: 'management' as Role, email: 'neha@karyam.com', phone: '9876543216', active: true, userId: 'neha', password: 'neha123', loginRole: 'management' as Role },
  { id: 9, name: 'Anjali Mehta', dept: 'finance' as Role, email: 'anjali@karyam.com', phone: '9876543217', active: true, userId: 'anjali', password: 'anjali123', loginRole: 'finance' as Role },
  { id: 10, name: 'Karan Malhotra', dept: 'finance' as Role, email: 'karan@karyam.com', phone: '9876543218', active: true, userId: 'karan', password: 'karan123', loginRole: 'finance' as Role },
  { id: 8, name: 'Admin Owner', dept: 'owner' as Role, email: 'karyam.dessin@gmail.com', phone: '9876500000', active: true, userId: 'admin', password: 'admin123', loginRole: 'owner' as Role },
];

/** Default admin credentials (for the Google-login simulation + fallback) */
export const ADMIN_CREDENTIALS = { userId: 'admin', password: 'admin123', email: 'karyam.dessin@gmail.com' };

/** Default editable company profile — shown across the whole site (footer, invoices, quotations, login). */
export const DEFAULT_COMPANY_PROFILE = {
  name: 'Karyam Dessin',
  tagline: "Beyond Design – It's Pure Strategy",
  phone: '+91-9452879204',
  email: 'karyam.dessin@gmail.com',
  address: 'Lucknow, UP',
  footerText: '',
  logoText: 'KD',
  accentWord: 'Dessin',
};

/** Map HSN code → GST rate (%) for Indian pharmaceutical/printing goods */
export const HSN_GST_RATES: Record<string, number> = {
  '4911': 18, // Printed books, brochures, leaflets — 18%
  '4820': 18, // Paper stationery (folders) — 18%
  '4819': 18, // Cartons/boxes of paper — 18%
  '4821': 18, // Labels of paper — 18%
  '4818': 12, // Toilet paper, tissues — 12%
  '4901': 0,  // Books (no GST) — 0%
  '4902': 0,  // Newspapers — 0%
  '3401': 18, // Soap — 18%
  '3004': 12, // Pharmaceutical formulations — 12%
  '3003': 12, // Medicaments — 12%
  '3923': 18, // Plastic packaging — 18%
  '4011': 28, // Rubber tyres — 28%
  '8443': 18, // Printing machinery — 18%
};

/** Get GST rate for an HSN code (default 18% if not found) */
export function gstRateForHSN(hsn?: string): number {
  if (!hsn) return 18;
  return HSN_GST_RATES[hsn] ?? 18;
}

export const SEED_ITEMS = [
  { id: 'ITEM-0001', name: 'Visual Aid PPT', category: 'Visual Aid', unit: 'set', hsn: '4911', gstRate: 18, rate: 25000, cost: 12000, stock: 8, minStock: 5, description: 'Standard MR visual aid presentation set', createdAt: daysAgo(60), updatedAt: daysAgo(5) },
  { id: 'ITEM-0002', name: 'Reminder Card', category: 'Reminder Card', unit: 'pcs', hsn: '4911', gstRate: 18, rate: 40, cost: 18, stock: 12500, minStock: 2000, description: '5x7 reminder card, full color both sides', createdAt: daysAgo(50), updatedAt: daysAgo(3) },
  { id: 'ITEM-0003', name: 'Leave Behind Folder', category: 'Leave Behind', unit: 'pcs', hsn: '4820', gstRate: 18, rate: 85, cost: 42, stock: 3400, minStock: 500, description: 'A4 size die-cut folder with pocket', createdAt: daysAgo(45), updatedAt: daysAgo(7) },
  { id: 'ITEM-0004', name: 'Product Brochure', category: 'Brochure', unit: 'pcs', hsn: '4911', gstRate: 18, rate: 22, cost: 9, stock: 18000, minStock: 3000, description: 'Tri-fold 6 panel product brochure', createdAt: daysAgo(40), updatedAt: daysAgo(2) },
  { id: 'ITEM-0005', name: 'Pharma Box', category: 'Packaging', unit: 'pcs', hsn: '4819', gstRate: 18, rate: 14, cost: 6, stock: 22000, minStock: 5000, description: 'Standard medicine outer carton', createdAt: daysAgo(35), updatedAt: daysAgo(10) },
  { id: 'ITEM-0006', name: 'Sticker Label', category: 'Print Material', unit: 'roll', hsn: '4821', gstRate: 18, rate: 320, cost: 140, stock: 95, minStock: 30, description: '1 inch die-cut sticker roll', createdAt: daysAgo(30), updatedAt: daysAgo(1) },
  { id: 'ITEM-0007', name: 'Medicine Strip (sample)', category: 'Other', unit: 'pcs', hsn: '3004', gstRate: 12, rate: 5, cost: 2, stock: 50000, minStock: 10000, description: 'Pharmaceutical formulation — 12% GST slab', createdAt: daysAgo(20), updatedAt: daysAgo(2) },
];

/** Reminder categories used in the New / Edit reminder form */
export const REMINDER_CATEGORIES = ['Follow-up', 'Meeting', 'Payment', 'Delivery', 'Task', 'Custom'];

/** Seed reminders — spread across team members so each role has something to see.
 *  Owner gets oversight reminders; each team member gets personal ones. */
export const SEED_REMINDERS: Reminder[] = [
  // Owner — oversight reminders
  { id: 'REM-0001', title: 'Approve KD-0003 mgmt review', description: 'Mankind Pharma packaging redesign awaiting management approval.', dueDate: today(), dueTime: '16:00', priority: 'high', status: 'pending', category: 'Task', assignedTo: 'karyam.dessin@gmail.com', assignedToName: 'Admin Owner', createdBy: 'Admin Owner', createdAt: daysAgo(2), relatedProject: 'KD-0003' },
  { id: 'REM-0002', title: 'Review weekly sales pipeline', description: 'Check leads converted vs lost this week.', dueDate: daysAhead(1), priority: 'medium', status: 'pending', category: 'Meeting', assignedTo: 'karyam.dessin@gmail.com', assignedToName: 'Admin Owner', createdBy: 'Admin Owner', createdAt: daysAgo(1) },
  // Marketing — Rahul
  { id: 'REM-0003', title: 'Follow up with Abbott India', description: 'Lead L-0001 — call Suresh to schedule meeting.', dueDate: today(), dueTime: '11:00', priority: 'high', status: 'pending', category: 'Follow-up', assignedTo: 'rahul@karyam.com', assignedToName: 'Rahul Singh', createdBy: 'Rahul Singh', createdAt: daysAgo(1), relatedProject: undefined },
  // Designer — Priya
  { id: 'REM-0004', title: 'Submit Visual Aid PPT v2', description: 'KD-0001 SunPharma — 3rd slide redesign pending.', dueDate: daysAhead(2), priority: 'urgent', status: 'pending', category: 'Task', assignedTo: 'priya@karyam.com', assignedToName: 'Priya Sharma', createdBy: 'Priya Sharma', createdAt: daysAgo(2), relatedProject: 'KD-0001' },
  { id: 'REM-0005', title: 'Design review with Amit', description: 'Sync on Mankind Pharma box mockup.', dueDate: daysAgo(1), priority: 'medium', status: 'pending', category: 'Meeting', assignedTo: 'priya@karyam.com', assignedToName: 'Priya Sharma', createdBy: 'Priya Sharma', createdAt: daysAgo(3) },
  // Production — Ramesh
  { id: 'REM-0006', title: 'Check PrintMaster PJ-0001 status', description: 'Print job for KD-0002 brochures — expected delivery tomorrow.', dueDate: daysAhead(1), priority: 'medium', status: 'pending', category: 'Delivery', assignedTo: 'ramesh@karyam.com', assignedToName: 'Ramesh Kumar', createdBy: 'Ramesh Kumar', createdAt: daysAgo(1), relatedProject: 'KD-0002' },
  // Finance — Anjali
  { id: 'REM-0007', title: 'Send GST invoice to Dr Reddy Labs', description: 'KD-0004 completed — final invoice not yet raised.', dueDate: daysAgo(1), priority: 'high', status: 'pending', category: 'Payment', assignedTo: 'anjali@karyam.com', assignedToName: 'Anjali Mehta', createdBy: 'Anjali Mehta', createdAt: daysAgo(2), relatedProject: 'KD-0004' },
  { id: 'REM-0008', title: 'Reconcile June bank statement', description: 'Match UTRs against payments received.', dueDate: daysAhead(3), priority: 'low', status: 'pending', category: 'Task', assignedTo: 'anjali@karyam.com', assignedToName: 'Anjali Mehta', createdBy: 'Anjali Mehta', createdAt: daysAgo(1) },
  // Management — Vikram
  { id: 'REM-0009', title: 'Vendor payment due — PrintMaster', description: '₹22,000 printing bill pending for KD-0002.', dueDate: daysAhead(2), priority: 'high', status: 'pending', category: 'Payment', assignedTo: 'vikram@karyam.com', assignedToName: 'Vikram Joshi', createdBy: 'Vikram Joshi', createdAt: daysAgo(1) },
];

// ============ Tasks (with checklist) seed data ============
/** Helper to build a checklist item with a stable-ish id. */
function cl(id: string, text: string, done = false): ChecklistItem {
  return { id, text, done };
}

/** Task categories used in the New / Edit task form */
export const TASK_CATEGORIES = ['Operations', 'Sales', 'Finance', 'Procurement', 'HR', 'Strategy', 'Maintenance', 'Other'];

export const SEED_TASKS: Task[] = [
  {
    id: 'TASK-0001',
    title: 'Onboard new print vendor — ColorMax',
    description: 'Evaluate ColorMax as backup printer for KD-0002 volume. Collect samples + negotiate rates.',
    status: 'in_progress',
    priority: 'high',
    checklist: [
      cl('c1', 'Request sample prints (brochure + box)', true),
      cl('c2', 'Get rate card for 5k+ volumes', false),
      cl('c3', 'Verify GST registration + PAN', false),
      cl('c4', 'Sign vendor agreement', false),
    ],
    assignedTo: 'vikram@karyam.com',
    assignedToName: 'Vikram Joshi',
    dueDate: daysAhead(5),
    category: 'Procurement',
    createdBy: 'Admin Owner',
    createdAt: daysAgo(4),
    updatedAt: daysAgo(1),
  },
  {
    id: 'TASK-0002',
    title: 'Q3 sales target planning',
    description: 'Define quarterly targets per marketing rep and review pipeline.',
    status: 'todo',
    priority: 'urgent',
    checklist: [
      cl('c1', 'Pull last 3 quarters conversion data', false),
      cl('c2', 'Meet with Rahul for field feedback', false),
      cl('c3', 'Draft target sheet (per-rep)', false),
      cl('c4', 'Finalize + circulate', false),
    ],
    assignedTo: 'vikram@karyam.com',
    assignedToName: 'Vikram Joshi',
    dueDate: daysAhead(7),
    category: 'Strategy',
    createdBy: 'Admin Owner',
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },
  {
    id: 'TASK-0003',
    title: 'Renew office rent agreement',
    description: 'Current lease expires next month. Negotiate renewal with landlord.',
    status: 'blocked',
    priority: 'medium',
    checklist: [
      cl('c1', 'Draft renewal terms', true),
      cl('c2', 'Send to Shree Properties', true),
      cl('c3', 'Await landlord response on rent hike', false),
    ],
    assignedTo: 'neha@karyam.com',
    assignedToName: 'Neha Gupta',
    dueDate: daysAhead(10),
    category: 'Maintenance',
    createdBy: 'Admin Owner',
    createdAt: daysAgo(8),
    updatedAt: daysAgo(3),
  },
  {
    id: 'TASK-0004',
    title: 'Audit GST invoices for Q1',
    description: 'Reconcile issued invoices against payments + check HSN rate accuracy.',
    status: 'done',
    priority: 'high',
    checklist: [
      cl('c1', 'Collect all INV-0001 to INV-0008', true),
      cl('c2', 'Match against payments received', true),
      cl('c3', 'Verify HSN codes', true),
      cl('c4', 'File audit summary', true),
    ],
    assignedTo: 'anjali@karyam.com',
    assignedToName: 'Anjali Mehta',
    dueDate: daysAgo(5),
    category: 'Finance',
    createdBy: 'Admin Owner',
    createdAt: daysAgo(20),
    updatedAt: daysAgo(5),
    completedAt: daysAgo(5),
  },
];

// ============ Notes seed data ============
/** Available sticky-note colors (keys map to tailwind classes in the Notes component). */
export const NOTE_COLORS: { key: Note['color']; label: string; bg: string; border: string }[] = [
  { key: 'yellow', label: 'Yellow', bg: 'bg-amber-100 dark:bg-amber-950/40', border: 'border-amber-300 dark:border-amber-800' },
  { key: 'green', label: 'Green', bg: 'bg-emerald-100 dark:bg-emerald-950/40', border: 'border-emerald-300 dark:border-emerald-800' },
  { key: 'blue', label: 'Blue', bg: 'bg-sky-100 dark:bg-sky-950/40', border: 'border-sky-300 dark:border-sky-800' },
  { key: 'purple', label: 'Purple', bg: 'bg-purple-100 dark:bg-purple-950/40', border: 'border-purple-300 dark:border-purple-800' },
  { key: 'pink', label: 'Pink', bg: 'bg-pink-100 dark:bg-pink-950/40', border: 'border-pink-300 dark:border-pink-800' },
  { key: 'orange', label: 'Orange', bg: 'bg-orange-100 dark:bg-orange-950/40', border: 'border-orange-300 dark:border-orange-800' },
  { key: 'slate', label: 'Slate', bg: 'bg-slate-100 dark:bg-slate-800/60', border: 'border-slate-300 dark:border-slate-700' },
];

export const SEED_NOTES: Note[] = [
  {
    id: 'NOTE-0001',
    title: 'Vendor rate benchmarks',
    content: 'PrintMaster: ₹4.40/leaflet (5k)\nColorMax (sample): ₹4.10/leaflet (5k) — pending quality check\nQuickPrint: ₹4.80/leaflet\n\n→ ColorMax looks promising if samples pass.',
    color: 'yellow',
    pinned: true,
    tags: ['procurement', 'printing'],
    createdBy: 'Admin Owner',
    createdAt: daysAgo(6),
    updatedAt: daysAgo(2),
  },
  {
    id: 'NOTE-0002',
    title: 'Key client contacts',
    content: 'SunPharma — Suresh (Procurement) 98100...\nCipla — Anand (Marketing) 98100...\nDr Reddy — Ramesh (Finance) 98100...\nMankind — Meera (Design lead) 98100...',
    color: 'blue',
    pinned: true,
    tags: ['clients', 'contacts'],
    createdBy: 'Admin Owner',
    createdAt: daysAgo(15),
    updatedAt: daysAgo(15),
  },
  {
    id: 'NOTE-0003',
    title: 'Ideas — pharma expo stall',
    content: 'Expo in Mumbai (Sep). Ideas:\n• Live VA demo on tablet\n• Free reminder card samples\n• Lead capture QR → auto-create lead\nBudget ~₹1.5L — discuss with Vikram.',
    color: 'green',
    pinned: false,
    tags: ['marketing', 'expo', 'idea'],
    createdBy: 'Admin Owner',
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
  },
  {
    id: 'NOTE-0004',
    title: 'Cash flow memo',
    content: 'June was tight — salaries + rent ate into the SunPharma advance.\nKeep ≥₹2L buffer before committing new print runs.\nFollow up Dr Reddy final payment (₹0 due, but invoice not raised).',
    color: 'orange',
    pinned: false,
    tags: ['finance', 'cashflow'],
    createdBy: 'Admin Owner',
    createdAt: daysAgo(4),
    updatedAt: daysAgo(1),
  },
];

// ============ GST seed data (16-category comprehensive) ============
/** Section 3 — Tax Master: standard CGST/SGST/IGST/CESS rate lines. */
export const SEED_TAX_RATES: TaxRate[] = [
  { id: 'TX-1', name: 'CGST 9%', type: 'CGST', rate: 9 },
  { id: 'TX-2', name: 'SGST 9%', type: 'SGST', rate: 9 },
  { id: 'TX-3', name: 'IGST 18%', type: 'IGST', rate: 18 },
  { id: 'TX-4', name: 'CESS 0%', type: 'CESS', rate: 0 },
  { id: 'TX-5', name: 'CGST 2.5%', type: 'CGST', rate: 2.5 },
  { id: 'TX-6', name: 'SGST 2.5%', type: 'SGST', rate: 2.5 },
  { id: 'TX-7', name: 'IGST 5%', type: 'IGST', rate: 5 },
  { id: 'TX-8', name: 'CGST 6%', type: 'CGST', rate: 6 },
  { id: 'TX-9', name: 'SGST 6%', type: 'SGST', rate: 6 },
  { id: 'TX-10', name: 'IGST 12%', type: 'IGST', rate: 12 },
  { id: 'TX-11', name: 'CGST 14%', type: 'CGST', rate: 14 },
  { id: 'TX-12', name: 'SGST 14%', type: 'SGST', rate: 14 },
  { id: 'TX-13', name: 'IGST 28%', type: 'IGST', rate: 28 },
];

/** Standard GST tax-group slabs (used as a reference list in the Tax Master tab). */
export const GST_TAX_GROUPS = [0, 0.25, 3, 5, 12, 18, 28];

/** Section 4 — HSN/SAC Master: common printing / packaging / pharma codes. */
export const SEED_HSN_CODES: HSNCode[] = [
  { id: 'HSN-1', code: '4911', type: 'HSN', description: 'Printed books, brochures, leaflets & similar matter', gstRate: 18, uqc: 'PCS' },
  { id: 'HSN-2', code: '4820', type: 'HSN', description: 'Paper stationery — folders, forms, registers', gstRate: 18, uqc: 'PCS' },
  { id: 'HSN-3', code: '4819', type: 'HSN', description: 'Cartons, boxes & cases of paper/board', gstRate: 18, uqc: 'PCS' },
  { id: 'HSN-4', code: '4821', type: 'HSN', description: 'Labels of paper or paperboard', gstRate: 18, uqc: 'ROLL' },
  { id: 'HSN-5', code: '4818', type: 'HSN', description: 'Toilet paper, tissues, napkins', gstRate: 12, uqc: 'PCS' },
  { id: 'HSN-6', code: '4901', type: 'HSN', description: 'Printed books (no GST)', gstRate: 0, uqc: 'PCS' },
  { id: 'HSN-7', code: '3004', type: 'HSN', description: 'Pharmaceutical formulations', gstRate: 12, uqc: 'PCS' },
  { id: 'HSN-8', code: '3923', type: 'HSN', description: 'Plastic packaging — containers, boxes', gstRate: 18, uqc: 'PCS' },
  { id: 'HSN-9', code: '8443', type: 'HSN', description: 'Printing machinery & equipment', gstRate: 18, uqc: 'NOS' },
  { id: 'SAC-1', code: '9983', type: 'SAC', description: 'Printing & reproduction services', gstRate: 18, uqc: 'OTH' },
  { id: 'SAC-2', code: '9985', type: 'SAC', description: 'Packaging services', gstRate: 18, uqc: 'OTH' },
];

/** Section 6 — Customer GST Settings (seed — mirrors seed project clients, full company details). */
export const SEED_CUSTOMER_GST: CustomerGST[] = [
  {
    id: 'CG-1', name: 'SunPharma Ltd', companyName: 'Sun Pharmaceutical Industries Ltd',
    gstin: '27AAACS0688F1Z3', address: 'Sun House, CTS No. 201/B, Western Express Highway, Andheri (E)', city: 'Mumbai',
    state: 'Maharashtra', stateCode: '27', pincode: '400069', phone: '022-43294329', email: 'procurement@sunpharma.com',
    contactPerson: 'Suresh Iyer', registrationType: 'Regular', placeOfSupply: 'Maharashtra', reverseCharge: false, exportOrSez: false,
  },
  {
    id: 'CG-2', name: 'Cipla Pvt Ltd', companyName: 'Cipla Limited',
    gstin: '27AAACC1491L1Z7', address: 'Cipla House, Peninsula Business Park, Ganpatrao Kadam Marg, Lower Parel', city: 'Mumbai',
    state: 'Maharashtra', stateCode: '27', pincode: '400013', phone: '022-24963331', email: 'accounts@cipla.com',
    contactPerson: 'Anand Deshpande', registrationType: 'Regular', placeOfSupply: 'Maharashtra', reverseCharge: false, exportOrSez: false,
  },
  {
    id: 'CG-3', name: 'Mankind Pharma', companyName: 'Mankind Pharma Limited',
    gstin: '07AAACM4815L1Z3', address: '208, Okhla Industrial Estate, Phase-III', city: 'New Delhi',
    state: 'Delhi', stateCode: '07', pincode: '110020', phone: '011-40504050', email: 'marketing@mankindpharma.com',
    contactPerson: 'Meera Sharma', registrationType: 'Regular', placeOfSupply: 'Delhi', reverseCharge: false, exportOrSez: false,
  },
  {
    id: 'CG-4', name: 'Dr Reddy Labs', companyName: 'Dr. Reddy\u2019s Laboratories Ltd',
    gstin: '36AAACR7049L1Z5', address: '8-2-334, Survey No. 41, Bachupally Village, Qutubullapur Mandal', city: 'Hyderabad',
    state: 'Telangana', stateCode: '36', pincode: '500090', phone: '040-44346464', email: 'finance@drreddys.com',
    contactPerson: 'Ramesh Reddy', registrationType: 'Regular', placeOfSupply: 'Telangana', reverseCharge: false, exportOrSez: false,
  },
  {
    id: 'CG-5', name: 'Walk-in Client', companyName: 'Unregistered Customer',
    gstin: '', address: 'Counter sale', city: 'Lucknow',
    state: 'Uttar Pradesh', stateCode: '09', pincode: '226001', phone: '-', email: '-',
    contactPerson: '-', registrationType: 'Unregistered', placeOfSupply: 'Uttar Pradesh', reverseCharge: false, exportOrSez: false,
  },
];

/** Section 7 — Supplier GST Settings (seed). */
export const SEED_SUPPLIER_GST: SupplierGST[] = [
  { id: 'SG-1', name: 'PrintMaster India', gstin: '09AABCP1234M1Z2', registrationType: 'Regular', rcmApplicable: false },
  { id: 'SG-2', name: 'QuickPrint', gstin: '09AAFCQ5678K1Z9', registrationType: 'Regular', rcmApplicable: false },
  { id: 'SG-3', name: 'PaperLine Suppliers', gstin: '24AAACP9876L1Z1', registrationType: 'Regular', rcmApplicable: false },
  { id: 'SG-4', name: 'Shree Properties', gstin: '', registrationType: 'Unregistered', rcmApplicable: true },
  { id: 'SG-5', name: 'Local Transporter', gstin: '', registrationType: 'Unregistered', rcmApplicable: true },
];

// ============ CRM seed data (Paid-CRM feature set) ============
/** Call logs — Connected / No Answer / Meeting mix. */
export const SEED_CALL_LOGS: CallLog[] = [
  {
    id: 'CALL-0001', leadId: 'L-0001', customerName: 'Abbott India — Suresh',
    phone: '9810011223', type: 'call', direction: 'outgoing', outcome: 'Connected',
    durationSec: 240, notes: 'Discussed Visual Aid + Reminder Card requirement. Client wants meeting next week.',
    nextCallDate: daysAhead(2), by: 'Rahul Singh', at: `${daysAgo(1)}T10:30:00.000Z`,
  },
  {
    id: 'CALL-0002', customerId: 'CG-1', customerName: 'SunPharma Ltd — Suresh Iyer',
    phone: '022-43294329', type: 'call', direction: 'outgoing', outcome: 'No Answer',
    notes: 'Tried procurement desk — no response. Will retry tomorrow.',
    nextCallDate: daysAhead(1), by: 'Rahul Singh', at: `${daysAgo(0)}T14:15:00.000Z`,
  },
  {
    id: 'CALL-0003', leadId: 'L-0002', customerName: 'Lupin Pharma — Anand',
    phone: '9810044556', type: 'meeting', outcome: 'Connected',
    durationSec: 1800, notes: 'In-person meeting at their Mumbai office. Showed Visual Aid samples. Decision pending on quantity.',
    nextCallDate: daysAhead(5), by: 'Vikram Joshi', at: `${daysAgo(3)}T11:00:00.000Z`,
  },
];

/** Email templates — Welcome / Follow-up / Quotation. */
export const SEED_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'ET-0001', name: 'Welcome Email', category: 'Onboarding',
    subject: 'Welcome to Karyam Dessin, {name}!',
    body: 'Dear {name},\n\nThank you for choosing Karyam Dessin for your design and printing needs. We are excited to partner with you on your upcoming project.\n\nOur team will reach out shortly to discuss your requirements in detail.\n\nWarm regards,\nKaryam Dessin Team\n+91-9452879204 | karyam.dessin@gmail.com',
  },
  {
    id: 'ET-0002', name: 'Follow-up Email', category: 'Follow-up',
    subject: 'Following up on your enquiry — {name}',
    body: 'Dear {name},\n\nI hope this email finds you well. I wanted to follow up on the proposal we shared with you last week.\n\nPlease let us know if you have any questions or if you would like to proceed. We are happy to schedule a call at your convenience.\n\nBest regards,\nKaryam Dessin Team',
  },
  {
    id: 'ET-0003', name: 'Quotation Email', category: 'Sales',
    subject: 'Quotation from Karyam Dessin — {name}',
    body: 'Dear {name},\n\nPlease find attached the quotation for your requirement. The quotation is valid for 30 days from the date of issue.\n\nTerms: 50% advance with PO, 50% on delivery. Delivery within 15 working days of advance receipt.\n\nFor any clarifications, please reach out to us.\n\nRegards,\nKaryam Dessin Team',
  },
];

/** Email logs — sent emails. */
export const SEED_EMAIL_LOGS: EmailLog[] = [
  {
    id: 'EM-0001', to: 'suresh@abbott.com', subject: 'Following up on your enquiry — Suresh',
    body: 'Dear Suresh, Following up on the Visual Aid proposal shared last week...',
    templateId: 'ET-0002', status: 'opened', sentBy: 'Rahul Singh', sentAt: `${daysAgo(2)}T09:30:00.000Z`,
    openedAt: `${daysAgo(1)}T11:20:00.000Z`,
  },
  {
    id: 'EM-0002', to: 'anand@lupin.com', cc: 'vikram@karyam.com',
    subject: 'Quotation from Karyam Dessin — Lupin Pharma',
    body: 'Dear Anand, Please find attached the quotation for your packaging redesign requirement...',
    templateId: 'ET-0003', status: 'sent', sentBy: 'Rahul Singh', sentAt: `${daysAgo(4)}T15:45:00.000Z`,
  },
];

/** Marketing campaigns — Active / Completed / Draft mix. */
export const SEED_CAMPAIGNS: Campaign[] = [
  {
    id: 'CMP-0001', name: 'Q3 Pharma Outreach', channel: 'Email', status: 'Active',
    segment: 'Pharma Procurement Managers — West India', audienceCount: 240, sentCount: 240,
    openCount: 142, clickCount: 38, startDate: daysAgo(7), endDate: daysAhead(14),
    roi: 0, notes: 'Targeted email campaign to procurement heads at top-25 pharma companies.',
  },
  {
    id: 'CMP-0002', name: 'Visual Aid Launch 2025', channel: 'WhatsApp', status: 'Completed',
    segment: 'Existing pharma clients', audienceCount: 80, sentCount: 80, openCount: 64,
    clickCount: 22, startDate: daysAgo(45), endDate: daysAgo(20),
    roi: 3.2, notes: 'WhatsApp broadcast announcing new Visual Aid PPT format. Generated 6 enquiries.',
  },
  {
    id: 'CMP-0003', name: 'Reminder Card Promo', channel: 'Mixed', status: 'Draft',
    segment: 'Leads in Quotation stage', audienceCount: 12, startDate: daysAhead(3),
    notes: 'Mixed email + WhatsApp promo — bulk discount on Reminder Cards for orders above 10k qty.',
  },
];

/** Field visits — Doctor / Chemist / Customer mix. */
export const SEED_FIELD_VISITS: FieldVisit[] = [
  {
    id: 'FV-0001', visitType: 'Doctor', visitName: 'Dr. Anil Kumar — Apex Clinic',
    repName: 'Rahul Singh', repEmail: 'rahul@karyam.com',
    checkIn: `${daysAgo(1)}T10:00:00.000Z`, checkOut: `${daysAgo(1)}T10:45:00.000Z`,
    location: 'Apex Clinic, Hazratganj, Lucknow', latitude: 26.8467, longitude: 80.9462,
    productsDetailed: 'Visual Aid PPT, Reminder Card', samplesDistributed: 'Reminder Card samples x50',
    outcome: 'Doctor interested in Visual Aid for upcoming product launch', orderValue: 0,
    notes: 'Doctor asked for revised VA with new product images. Send draft by Friday.',
  },
  {
    id: 'FV-0002', visitType: 'Chemist', visitName: 'Apollo Pharmacy — Gomti Nagar',
    repName: 'Rahul Singh', repEmail: 'rahul@karyam.com',
    checkIn: `${daysAgo(1)}T12:00:00.000Z`, checkOut: `${daysAgo(1)}T12:30:00.000Z`,
    location: 'Apollo Pharmacy, Gomti Nagar, Lucknow', latitude: 26.8500, longitude: 80.9900,
    productsDetailed: 'Reminder Card display unit', outcome: 'Stockist agreed to display new cards',
    orderValue: 8500, notes: 'Order booked for 200 cards. Payment on delivery.',
  },
  {
    id: 'FV-0003', visitType: 'Customer', visitName: 'Cipla Pvt Ltd — Anand Deshpande',
    repName: 'Vikram Joshi', repEmail: 'vikram@karyam.com',
    checkIn: `${daysAgo(3)}T15:00:00.000Z`, checkOut: `${daysAgo(3)}T16:30:00.000Z`,
    location: 'Cipla House, Lower Parel, Mumbai', latitude: 19.0103, longitude: 72.8250,
    productsDetailed: 'Product Launch Kit review', outcome: 'Client approved design mockups',
    orderValue: 145000, notes: 'Final approval received for Product Launch Kit. Move to production.',
  },
];

/** Doctors — Pharma CRM (GP / Gyne / Ortho / Neuro; categories A/B/C). */
export const SEED_DOCTORS: Doctor[] = [
  {
    id: 'DR-0001', name: 'Dr. Anil Kumar', speciality: 'GP', degree: 'MBBS, MD',
    clinic: 'Apex Clinic', city: 'Lucknow', state: 'Uttar Pradesh', phone: '9876543201',
    email: 'dr.anil@apexclinic.in', category: 'A', allocatedTo: 'rahul@karyam.com',
    allocatedToName: 'Rahul Singh', visitFrequency: 'Weekly', brands: 'SunPharma, Cipla',
    potential: 250000, notes: 'High-prescriber GP. Prefers Visual Aid demos on Tuesdays.',
  },
  {
    id: 'DR-0002', name: 'Dr. Sunita Rao', speciality: 'Gyne', degree: 'MBBS, MS',
    hospital: 'Cloudnine Hospital', city: 'Mumbai', state: 'Maharashtra', phone: '9876543202',
    email: 'dr.sunita@cloudnine.in', category: 'B', allocatedTo: 'priya@karyam.com',
    allocatedToName: 'Priya Sharma', visitFrequency: 'Fortnightly', brands: 'Mankind, Lupin',
    potential: 120000, notes: 'Interested in gynaecology Visual Aid set. Visit on alternate Fridays.',
  },
  {
    id: 'DR-0003', name: 'Dr. Rajesh Nair', speciality: 'Ortho', degree: 'MBBS, MS (Ortho)',
    hospital: 'OrthoCare Speciality Hospital', city: 'Bengaluru', state: 'Karnataka',
    phone: '9876543203', email: 'dr.rajesh@orthocare.in', category: 'A',
    allocatedTo: 'rahul@karyam.com', allocatedToName: 'Rahul Singh', visitFrequency: 'Weekly',
    brands: 'Dr Reddy, Alkem', potential: 380000,
    notes: 'Top-prescriber ortho. Demands latest packaging design samples every visit.',
  },
  {
    id: 'DR-0004', name: 'Dr. Meera Krishnan', speciality: 'Neuro', degree: 'MBBS, DM (Neuro)',
    hospital: 'NeuroFortis Hospital', city: 'Chennai', state: 'Tamil Nadu', phone: '9876543204',
    email: 'dr.meera@neurofortis.in', category: 'C', allocatedTo: 'priya@karyam.com',
    allocatedToName: 'Priya Sharma', visitFrequency: 'Monthly', brands: 'Abbott, Zydus',
    potential: 60000, notes: 'Low-volume prescriber. Visit monthly for relationship maintenance.',
  },
];

/** Chemists / stockists — Pharma CRM. */
export const SEED_CHEMISTS: Chemist[] = [
  {
    id: 'CH-0001', name: 'Apollo Pharmacy', type: 'Chemist', owner: 'Mr. Suresh',
    address: 'Shop 12, Gomti Nagar Market', city: 'Lucknow', state: 'Uttar Pradesh',
    phone: '9876543301', email: 'apollo.gomti@apollolpharmacy.in',
    gstin: '09AAACA1234M1Z5', allocatedTo: 'rahul@karyam.com', allocatedToName: 'Rahul Singh',
    outstanding: 8500, notes: 'Reliable chemist. 7-day credit cycle.',
  },
  {
    id: 'CH-0002', name: 'MedPlus Distributors', type: 'Stockist', owner: 'Mr. Prakash',
    address: 'Plot 45, Transport Nagar', city: 'Lucknow', state: 'Uttar Pradesh',
    phone: '9876543302', email: 'orders@medplusdist.in',
    gstin: '09AAFCM5678N1Z2', allocatedTo: 'rahul@karyam.com', allocatedToName: 'Rahul Singh',
    outstanding: 48000, notes: 'Largest stockist in region. 15-day credit cycle.',
  },
  {
    id: 'CH-0003', name: 'Wellness Forever', type: 'Chemist', owner: 'Mrs. Kavita',
    address: '21, Hazratganj', city: 'Lucknow', state: 'Uttar Pradesh',
    phone: '9876543303', email: 'wellness.hzg@forever.in',
    gstin: '09AAACW9012P1Z8', allocatedTo: 'priya@karyam.com', allocatedToName: 'Priya Sharma',
    outstanding: 0, notes: 'Premium chemist chain. Prompt payments.',
  },
];

/** Workflow automation rules — all enabled. */
export const SEED_WORKFLOW_RULES: WorkflowRule[] = [
  {
    id: 'WF-0001', name: 'Auto-assign new leads', enabled: true, trigger: 'lead_created',
    condition: 'On any new lead creation',
    action: 'assign_salesperson', target: 'round_robin:marketing',
    notes: 'Round-robin assign new leads to active marketing reps.',
  },
  {
    id: 'WF-0002', name: 'Manager approval for high-value leads', enabled: true,
    trigger: 'high_value', condition: 'expectedOrderValue >= ₹1,00,000',
    action: 'alert_manager', target: 'management',
    notes: 'Notify management team when a lead crosses ₹1L expected value for prioritised follow-up.',
  },
  {
    id: 'WF-0003', name: 'Payment overdue reminder', enabled: true,
    trigger: 'payment_overdue', condition: 'project.due > 7 days AND outstanding > 0',
    action: 'send_email', target: 'customer',
    notes: 'Auto-send a payment-reminder email to the customer when an invoice is overdue by 7+ days.',
  },
  {
    id: 'WF-0004', name: 'Follow-up missed alert', enabled: true,
    trigger: 'followup_missed', condition: 'lead.followup < today AND status != Won/Lost',
    action: 'create_task', target: 'assignedTo',
    notes: 'Auto-create a follow-up task for the lead owner when the follow-up date is missed.',
  },
];

/** Custom fields — Lead / Customer / Project entities. */
export const SEED_CUSTOM_FIELDS: CustomField[] = [
  {
    id: 'CF-0001', entity: 'Lead', label: 'GST Number', type: 'text',
    required: false, defaultValue: '',
  },
  {
    id: 'CF-0002', entity: 'Customer', label: 'Credit Days', type: 'number',
    required: false, defaultValue: '30',
  },
  {
    id: 'CF-0003', entity: 'Project', label: 'Priority', type: 'select',
    options: 'Low,Medium,High,Urgent', required: false, defaultValue: 'Medium',
  },
];

/** Comprehensive default GST settings (all 16 categories). */
export const DEFAULT_GST_SETTINGS = {
  // 1. Company GST Details
  gstin: '', pan: '', legalName: 'Karyam Dessin', tradeName: 'Karyam Dessin',
  businessType: 'Proprietorship', registrationType: 'Regular' as const,
  state: 'Uttar Pradesh', stateCode: '09', placeOfSupply: 'Uttar Pradesh',
  // 2. GST Configuration
  compositionDealer: false, gstEnabled: true, financialYear: '2026-27',
  gstEffectiveDate: '2017-07-01', calculationMethod: 'exclusive' as const,
  roundOff: true, rcmEnabled: false, tdsTcsEnabled: false,
  // 8. Invoice Settings
  invoiceTypes: {
    taxInvoice: true, billOfSupply: false, debitNote: true, creditNote: true,
    exportInvoice: false, sezInvoice: false, rcmInvoice: false,
  },
  // 9. Place of Supply Rules
  posRules: {
    intraState: 'CGST + SGST', interState: 'IGST',
    exportRule: 'Zero Rated', sezRule: 'Zero Rated / LUT',
  },
  // 10. ITC
  itc: { allowed: true, blockedCredit: false, partialItc: false, reversal: false },
  // 11. RCM
  rcm: { rcmPurchase: false, selfInvoice: false, paymentVoucher: false, liabilityReport: false },
  // 12. E-Invoice
  eInvoice: { enabled: false, irpApiUrl: 'https://einvoice1.gst.gov.in', clientId: '', clientSecret: '', autoIrn: false, qrCode: true },
  // 13. E-Way Bill
  ewayBill: { enabled: false, apiUrl: 'https://ewaybillgst.gov.in', transporterId: '', transporterName: '', autoGenerate: false },
  // 14. Returns
  returns: { gstr1: true, gstr3b: true, gstr2bRecon: true, gstr9: false },
  // 16. Advanced
  multiGstin: false, branchWise: false, multiState: false, multipleVerticals: false,
  lockPeriod: '', amendments: false, autoCalc: true, manualOverride: false, auditLog: true,
  // Invoice numbering + bank
  invoicePrefix: 'KD-INV', invoiceStartNo: 1,
  bankName: '', bankAccount: '', bankIfsc: '', bankUpi: '',
};

// ============ WhatsApp CRM seed data ============
export const SEED_WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
  { id: 'WT-0001', name: 'Welcome New Lead', category: 'Welcome', body: 'Hello {{name}}! 🙏 Thank you for your interest in Karyam Dessin. We specialise in Visual Aids, Brochures, and Pharma Packaging. Our team will get back to you shortly. For any queries, call +91-9452879204.', autoSend: true, createdAt: daysAgo(30) },
  { id: 'WT-0002', name: 'Follow-up Reminder', category: 'Follow-up', body: 'Hi {{name}}, just a gentle reminder about our last conversation regarding your printing requirement. Shall we schedule a quick call this week? 📞', autoSend: false, createdAt: daysAgo(20) },
  { id: 'WT-0003', name: 'Quotation Shared', category: 'Quotation', body: 'Dear {{name}}, we have shared the quotation for your requirement. Please review and let us know if you have any questions. Valid for 30 days. Thank you! 📋', autoSend: false, createdAt: daysAgo(15) },
  { id: 'WT-0004', name: 'Payment Reminder', category: 'Payment', body: 'Dear {{name}}, this is a friendly reminder that your payment of ₹{{amount}} is due. Kindly process it at your earliest convenience. Thank you for your business! 💳', autoSend: false, createdAt: daysAgo(10) },
  { id: 'WT-0005', name: 'Invoice Shared', category: 'Invoice', body: 'Dear {{name}}, please find your invoice attached. Total amount: ₹{{amount}}. Due date: 15 days. For any clarifications, please contact us. 🧾', autoSend: false, createdAt: daysAgo(8) },
  { id: 'WT-0006', name: 'Thank You (Order Won)', category: 'Thank You', body: 'Thank you {{name}} for choosing Karyam Dessin! 🎉 We are excited to work on your project. Our team will start processing your order immediately. Stay tuned for updates!', autoSend: true, createdAt: daysAgo(5) },
  { id: 'WT-0007', name: 'Festive Greeting', category: 'Greeting', body: '🙏 {{name}} ji, wishing you and your family a very Happy Diwali! May this festival bring prosperity and success to your business. From all of us at Karyam Dessin. 🪔', autoSend: false, createdAt: daysAgo(3) },
];

export const SEED_WHATSAPP_LOGS: WhatsAppLog[] = [
  { id: 'WL-0001', toPhone: '9810011223', toName: 'Suresh (Abbott India)', body: 'Hello Suresh! 🙏 Thank you for your interest in Karyam Dessin. We specialise in Visual Aids, Brochures, and Pharma Packaging.', templateId: 'WT-0001', templateName: 'Welcome New Lead', type: 'message', status: 'sent', sentBy: 'Rahul Singh', sentAt: daysAgo(5) + 'T10:30:00' },
  { id: 'WL-0002', toPhone: '9810044556', toName: 'Anand (Lupin Pharma)', body: 'Dear Anand, we have shared the quotation for your packaging redesign requirement. Please review and let us know if you have any questions.', templateId: 'WT-0003', templateName: 'Quotation Shared', type: 'quotation', relatedId: 'QT-0001', status: 'sent', sentBy: 'Rahul Singh', sentAt: daysAgo(8) + 'T14:15:00' },
  { id: 'WL-0003', toPhone: '9810099900', toName: 'Rajesh (Alkem Labs)', body: 'Dear Rajesh, please find your invoice attached. Total amount: ₹1,80,000. Due date: 15 days.', templateId: 'WT-0005', templateName: 'Invoice Shared', type: 'invoice', relatedId: 'KD-0004', status: 'sent', sentBy: 'Anjali Mehta', sentAt: daysAgo(3) + 'T16:45:00' },
  { id: 'WL-0004', toPhone: '9810077889', toName: 'Meera (Zydus Cadila)', body: 'Hi Meera, just a gentle reminder about our last conversation regarding Reminder Cards. Shall we schedule a quick call this week? 📞', templateId: 'WT-0002', templateName: 'Follow-up Reminder', type: 'reminder', status: 'sent', sentBy: 'Rahul Singh', sentAt: daysAgo(1) + 'T11:00:00' },
];

// ============ WhatsApp Inbox (chat-style messaging) seed data ============
/** 7 chat messages spread across L-0001 (Abbott) and L-0002 (Lupin) — newest first. */
export const SEED_CHAT_MESSAGES: ChatMessage[] = [
  // L-0001 — Abbott India (Suresh) — 4 messages
  { id: 'CHAT-0001', leadId: 'L-0001', direction: 'IN',  messageType: 'text', body: 'Hi, I saw your Visual Aid sample. Do you also print Reminder Cards?', status: 'delivered', timestamp: `${daysAgo(2)}T09:45:00` },
  { id: 'CHAT-0002', leadId: 'L-0001', direction: 'OUT', messageType: 'text', body: 'Hello Suresh ji 🙏 Yes, we do Reminder Cards in 5x7 and A6 sizes. We can also bundle them with the Visual Aid.', status: 'sent', sentBy: 'Rahul Singh', timestamp: `${daysAgo(2)}T10:05:00` },
  { id: 'CHAT-0003', leadId: 'L-0001', direction: 'IN',  messageType: 'text', body: 'Good. Please share pricing for 10,000 cards + 1 Visual Aid PPT.', status: 'delivered', timestamp: `${daysAgo(1)}T15:20:00` },
  { id: 'CHAT-0004', leadId: 'L-0001', direction: 'OUT', messageType: 'text', body: 'Sharing the quotation now. 10,000 Reminder Cards @ ₹40/pc + Visual Aid PPT @ ₹25,000. Total ₹4,25,000 + GST. Delivery 12 days.', status: 'sent', sentBy: 'Rahul Singh', timestamp: `${daysAgo(1)}T16:00:00` },
  // L-0002 — Lupin Pharma (Anand) — 3 messages
  { id: 'CHAT-0005', leadId: 'L-0002', direction: 'IN',  messageType: 'text', body: 'Met you at Pharma Expo. Interested in packaging redesign.', status: 'delivered', timestamp: `${daysAgo(9)}T11:00:00` },
  { id: 'CHAT-0006', leadId: 'L-0002', direction: 'OUT', messageType: 'text', body: 'Hi Anand 🙏 Great meeting you! As discussed, we can redesign the pharma box with new brand colours. Sharing options shortly.', status: 'sent', sentBy: 'Rahul Singh', timestamp: `${daysAgo(9)}T13:30:00` },
  { id: 'CHAT-0007', leadId: 'L-0002', direction: 'IN',  messageType: 'text', body: 'Sounds good. Send me the quotation and timeline.', status: 'delivered', timestamp: `${daysAgo(8)}T10:15:00` },
];

/** 5 quick replies — pre-saved message snippets for fast WhatsApp responses. */
export const SEED_QUICK_REPLIES: QuickReply[] = [
  { id: 'QR-0001', title: 'Welcome Message',   message: 'Hello {customer_name},\nThank you for contacting Karyam Dessin. 🙏\nHow can we help you today?', category: 'Welcome' },
  { id: 'QR-0002', title: 'Price List',         message: 'Hi {customer_name}, our Visual Aid PPT starts from ₹25,000 and Reminder Cards from ₹40/pc. Bulk orders get special pricing. Would you like a custom quote?', category: 'Sales' },
  { id: 'QR-0003', title: 'Share Portfolio',    message: 'Hi {customer_name}, here is our latest portfolio: https://karyamdessin.com/portfolio. Let me know which designs you like! 🎨', category: 'Sales' },
  { id: 'QR-0004', title: 'Quotation Shared',   message: 'Hi {customer_name}, I have prepared your quotation. Please find the details attached. Valid for 30 days. Let me know if you need any changes. 📋', category: 'Sales' },
  { id: 'QR-0005', title: 'Payment Request',    message: 'Hi {customer_name}, please share the 50% advance to confirm your order. Bank: Karyam Dessin, HDFC, A/C 50200012345678, IFSC HDFC0001234. 💳', category: 'Payment' },
];

/** 4 follow-up items — 1 overdue, 1 today, 2 upcoming. */
export const SEED_FOLLOWUP_ITEMS: FollowupItem[] = [
  { id: 'FU-0001', leadId: 'L-0001', assignedTo: 'rahul@karyam.com', followupDate: daysAgo(1),            followupTime: '11:00', note: 'Call Suresh to confirm Visual Aid + Reminder Card bundle order.', status: 'OVERDUE',  createdAt: `${daysAgo(3)}T10:00:00` },
  { id: 'FU-0002', leadId: 'L-0002', assignedTo: 'rahul@karyam.com', followupDate: today(),               followupTime: '15:00', note: 'Follow up with Anand on the packaging redesign quotation.',       status: 'PENDING',  createdAt: `${daysAgo(2)}T09:30:00` },
  { id: 'FU-0003', leadId: 'L-0003', assignedTo: 'rahul@karyam.com', followupDate: daysAhead(2),          followupTime: '12:00', note: 'Send Meera (Zydus) the 10k Reminder Card sample.',                 status: 'PENDING',  createdAt: `${daysAgo(1)}T14:00:00` },
  { id: 'FU-0004', leadId: 'L-0005', assignedTo: 'rahul@karyam.com', followupDate: daysAhead(4),          followupTime: '16:30', note: 'Share Visual Aid PPT quote with Ravi (Sun Pharma).',              status: 'PENDING',  createdAt: `${daysAgo(1)}T16:30:00` },
];

/** 2 CRM orders — converted from leads. */
export const SEED_CRM_ORDERS: CRMOrder[] = [
  {
    id: 'ORD-0001', orderNumber: 'KD-ORD-5001', leadId: 'L-0004', quotationId: 'QT-0001',
    customerName: 'Alkem Labs — Rajesh', orderAmount: 180000, advanceReceived: 180000,
    orderDetails: 'Visual Aid PPT (1 set) for Alkem Labs annual cycle.', expectedDeliveryDate: daysAgo(3),
    notes: 'Full payment received as RTGS. Converted to KD-0004.', status: 'DELIVERED', confirmedBy: 'Rahul Singh',
    createdAt: `${daysAgo(40)}T11:00:00`,
  },
  {
    id: 'ORD-0002', orderNumber: 'KD-ORD-5002', leadId: 'L-0002', quotationId: 'QT-0001',
    customerName: 'Lupin Pharma — Anand', orderAmount: 145000, advanceReceived: 50000,
    orderDetails: 'Packaging redesign — 3,000 pharma boxes + 1,500 Leave Behind Folders.',
    expectedDeliveryDate: daysAhead(5), notes: '50% advance received. Balance on delivery.',
    status: 'IN_PROGRESS', confirmedBy: 'Vikram Joshi', createdAt: `${daysAgo(10)}T15:30:00`,
  },
];

/** 4 CRM notifications — bell preview seed (1 unread broadcast + 3 user-targeted). */
export const SEED_CRM_NOTIFICATIONS: CRMNotification[] = [
  { id: 'NOTIF-0001', userId: undefined,            type: 'NEW_LEAD',         title: 'New lead from Meta WhatsApp Ad',     description: 'Sun Pharma (Ravi) sent a WhatsApp enquiry.', leadId: 'L-0005', read: false, createdAt: `${daysAgo(1)}T09:30:00` },
  { id: 'NOTIF-0002', userId: 'rahul@karyam.com',   type: 'FOLLOWUP_DUE',     title: 'Follow-up due today',                description: 'Lupin Pharma (Anand) — packaging redesign follow-up at 3:00 PM.', leadId: 'L-0002', read: false, createdAt: `${today()}T08:00:00` },
  { id: 'NOTIF-0003', userId: 'rahul@karyam.com',   type: 'FOLLOWUP_OVERDUE', title: 'Follow-up overdue',                  description: 'Abbott India (Suresh) — call to confirm bundle order was due yesterday.', leadId: 'L-0001', read: false, createdAt: `${daysAgo(1)}T11:30:00` },
  { id: 'NOTIF-0004', userId: 'rahul@karyam.com',   type: 'CUSTOMER_REPLIED', title: 'Customer replied on WhatsApp',       description: 'Anand (Lupin Pharma) replied: "Sounds good. Send me the quotation and timeline."', leadId: 'L-0002', read: true,  createdAt: `${daysAgo(8)}T10:15:00` },
];

/** 9 system lead-status configs (mirrors LEAD_STATUS_CONFIGS). */
export const SEED_LEAD_STATUS_CONFIGS: LeadStatusConfig[] = LEAD_STATUS_CONFIGS.map((c) => ({ ...c }));

/** 2 CRM campaigns — Meta Ads / marketing campaign tracking. */
export const SEED_CRM_CAMPAIGNS: CRMCampaign[] = [
  { id: 'CMP-0001', campaignName: 'Diwali Visual Aid Promo',  source: 'Meta WhatsApp Ad', leadsCount: 8, createdAt: `${daysAgo(20)}T09:00:00` },
  { id: 'CMP-0002', campaignName: 'Pharma Expo 2025 Follow-up', source: 'WhatsApp',        leadsCount: 3, createdAt: `${daysAgo(12)}T11:00:00` },
];

export function buildSeedState(): ERPState {
  return {
    projects: [
      {
        id: 'KD-0001', client: 'SunPharma Ltd', title: 'Visual Aid + Reminder Cards',
        value: 95000, stage: 'designing', delivery: daysAhead(12), designer: 'Priya Sharma',
        advance: 30000, cancelled: false, refunded: false, createdBy: 'Rahul Singh', createdAt: daysAgo(8),
        products: [
          { name: 'Visual Aid PPT', qty: 1, rate: 25000, status: 'Designing', itemId: 'ITEM-0001' },
          { name: 'Reminder Card', qty: 1500, rate: 40, status: 'Marketing', itemId: 'ITEM-0002' },
        ],
        files: [
          { name: 'Brief.pdf', date: daysAgo(8), by: 'Rahul Singh' },
          { name: 'Logo.ai', date: daysAgo(7), by: 'Rahul Singh' },
        ],
        departmentStatus: ds(D('completed', 'Rahul Singh'), D('in_progress', 'Priya Sharma'), D('pending'), D('pending')),
        handoffLog: [],
      },
      {
        id: 'KD-0002', client: 'Cipla Pvt Ltd', title: 'Product Launch Kit',
        value: 145000, stage: 'production', delivery: daysAhead(5), designer: 'Amit Verma',
        advance: 50000, cancelled: false, refunded: false, createdBy: 'Rahul Singh', createdAt: daysAgo(15),
        products: [
          { name: 'Product Brochure', qty: 5000, rate: 22, status: 'Production', itemId: 'ITEM-0004' },
          { name: 'Leave Behind Folder', qty: 1500, rate: 85, status: 'Production', itemId: 'ITEM-0003' },
        ],
        files: [{ name: 'Final_Design.pdf', date: daysAgo(10), by: 'Amit Verma' }],
        departmentStatus: ds(D('completed', 'Rahul Singh'), D('completed', 'Amit Verma'), D('in_progress', 'Ramesh Kumar'), D('pending')),
        handoffLog: [],
      },
      {
        id: 'KD-0003', client: 'Mankind Pharma', title: 'Packaging Redesign',
        value: 62000, stage: 'management', delivery: daysAhead(2), designer: 'Priya Sharma',
        advance: 20000, cancelled: false, refunded: false, createdBy: 'Rahul Singh', createdAt: daysAgo(20),
        products: [{ name: 'Pharma Box', qty: 3000, rate: 14, status: 'Mgmt Review', itemId: 'ITEM-0005' }],
        files: [{ name: 'Mockup.pdf', date: daysAgo(12), by: 'Priya Sharma' }],
        departmentStatus: ds(D('completed', 'Rahul Singh'), D('completed', 'Priya Sharma'), D('completed', 'Ramesh Kumar'), D('in_progress', 'Vikram Joshi')),
        handoffLog: [],
      },
      {
        id: 'KD-0004', client: 'Dr Reddy Labs', title: 'Annual Visual Aid',
        value: 180000, stage: 'completed', delivery: daysAgo(3), designer: 'Amit Verma',
        advance: 180000, cancelled: false, refunded: false, createdBy: 'Rahul Singh', createdAt: daysAgo(40),
        products: [{ name: 'Visual Aid PPT', qty: 1, rate: 25000, status: 'Completed', itemId: 'ITEM-0001' }],
        files: [],
        departmentStatus: ds(D('completed'), D('completed'), D('completed'), D('completed')),
        handoffLog: [],
      },
    ],
    leads: [
      { id: 'L-0001', client: 'Abbott India', contact: 'Suresh', phone: '9810011223', email: 'suresh@abbott.com', source: 'Referral', requirement: 'Visual Aid, Cards', status: 'Follow Up', followup: today(), notes: 'Wants meeting next week', createdAt: daysAgo(5), category: 'Visual Aid', assignedTo: 'rahul@karyam.com', assignedToName: 'Rahul Singh', priority: 'Hot', expectedOrderValue: 95000, leadScore: 75, leadStage: 'Contacted', winProbability: 60, expectedCloseDate: daysAhead(14), city: 'Mumbai', state: 'Maharashtra', area: 'Andheri (E)' },
      { id: 'L-0002', client: 'Lupin Pharma', contact: 'Anand', phone: '9810044556', email: 'anand@lupin.com', source: 'Exhibition', requirement: 'Packaging Redesign', status: 'Quotation Sent', followup: daysAhead(2), notes: 'Met at Pharma Expo', createdAt: daysAgo(10), category: 'Packaging', assignedTo: 'rahul@karyam.com', assignedToName: 'Rahul Singh', priority: 'Hot', expectedOrderValue: 145000, leadScore: 80, leadStage: 'Quotation', winProbability: 70, expectedCloseDate: daysAhead(10), city: 'Mumbai', state: 'Maharashtra', area: 'Lower Parel' },
      { id: 'L-0003', client: 'Zydus Cadila', contact: 'Meera', phone: '9810077889', email: 'meera@zydus.com', source: 'Website', requirement: 'Reminder Cards 10k', status: 'New', followup: today(), notes: 'Bulk order possible', createdAt: daysAgo(2), category: 'Cards', priority: 'Warm', expectedOrderValue: 380000, leadScore: 50, leadStage: 'New', winProbability: 30, expectedCloseDate: daysAhead(30), city: 'Ahmedabad', state: 'Gujarat', area: 'Bodakdev' },
      { id: 'L-0004', client: 'Alkem Labs', contact: 'Rajesh', phone: '9810099900', email: 'rajesh@alkem.com', source: 'Cold Call', requirement: 'Brochures', status: 'Won', followup: daysAgo(3), notes: 'Converted to KD-0004', createdAt: daysAgo(45), category: 'Brochure', assignedTo: 'rahul@karyam.com', assignedToName: 'Rahul Singh', priority: 'Hot', expectedOrderValue: 180000, leadScore: 90, leadStage: 'Won', winProbability: 100, expectedCloseDate: daysAgo(3), city: 'Mumbai', state: 'Maharashtra', area: 'Goregaon (E)' },
      { id: 'L-0005', client: 'Sun Pharma', contact: 'Ravi', phone: '919876543210', email: 'ravi@sunpharma.com', source: 'Referral', requirement: 'Visual Aid PPT', status: 'New', followup: today(), notes: 'Wants a quote by next week', createdAt: daysAgo(1), category: 'Visual Aid', priority: 'Warm', expectedOrderValue: 25000, leadScore: 55, leadStage: 'New', winProbability: 35, expectedCloseDate: daysAhead(21), city: 'Mumbai', state: 'Maharashtra', area: 'Andheri (E)' },
      { id: 'L-0006', client: 'Glenmark Pharma', contact: 'Imran', phone: '9810023344', email: 'imran@glenmark.com', source: 'Cold Call', requirement: 'Visual Aid + Brochures', status: 'Lost', followup: daysAgo(8), notes: 'Quoted ₹85k, competitor quoted ₹62k.', createdAt: daysAgo(20), category: 'Visual Aid', priority: 'Cold', expectedOrderValue: 85000, leadScore: 25, leadStage: 'Lost', lostReason: 'Price too high', winProbability: 0, expectedCloseDate: daysAgo(8), city: 'Pune', state: 'Maharashtra', area: 'Kothrud' },
    ],
    quotations: [
      {
        id: 'QT-0001', client: 'Lupin Pharma', date: daysAgo(8),
        items: [
          { name: 'Visual Aid PPT', qty: 1, rate: 25000, itemId: 'ITEM-0001' },
          { name: 'Reminder Card', qty: 10000, rate: 40, itemId: 'ITEM-0002' },
        ],
        status: 'Sent', projectId: null, createdAt: daysAgo(8),
        gstEnabled: true,
        notes: 'Delivery within 15 days of approval. 50% advance, 50% on delivery.',
      },
      {
        id: 'QT-0002', client: 'Zydus Cadila', date: daysAgo(1),
        items: [{ name: 'Reminder Card', qty: 10000, rate: 38, itemId: 'ITEM-0002' }],
        status: 'Draft', projectId: null, createdAt: daysAgo(1),
        gstEnabled: false,
        notes: 'Without GST — quoted as composite supply.',
      },
    ],
    designs: [
      { projectId: 'KD-0001', client: 'SunPharma Ltd', product: 'Visual Aid PPT', designer: 'Priya Sharma', status: 'In Progress', due: daysAhead(5), createdAt: daysAgo(6) },
      { projectId: 'KD-0003', client: 'Mankind Pharma', product: 'Pharma Box', designer: 'Priya Sharma', status: 'Pending Approval', due: daysAgo(2), createdAt: daysAgo(15) },
    ],
    production: [
      { projectId: 'KD-0002', client: 'Cipla Pvt Ltd', product: 'Product Brochure', assigned: 'Ramesh Kumar', status: 'Running', start: daysAgo(4), completion: daysAhead(5), createdAt: daysAgo(8) },
      { projectId: 'KD-0004', client: 'Dr Reddy Labs', product: 'Visual Aid PPT', assigned: 'Suresh Patel', status: 'Completed', start: daysAgo(35), completion: daysAgo(5), createdAt: daysAgo(35) },
    ],
    printJobs: [
      { id: 'PJ-0001', projectId: 'KD-0002', vendor: 'PrintMaster', sent: daysAgo(4), expected: daysAhead(2), received: '-', cost: 22000, status: 'In Transit' },
      { id: 'PJ-0002', projectId: 'KD-0004', vendor: 'QuickPrint', sent: daysAgo(30), expected: daysAgo(20), received: daysAgo(18), cost: 18000, status: 'Received' },
    ],
    dispatches: [
      { id: 'DSP-0001', projectId: 'KD-0004', client: 'Dr Reddy Labs', address: 'Mumbai HQ', packedBy: 'Ramesh Kumar', date: daysAgo(4), status: 'Delivered', courier: 'BlueDart', tracking: 'BD1234567890', dispatched: daysAgo(4), expected: daysAgo(3), createdAt: daysAgo(5) },
    ],
    payments: [
      { id: 'PAY-0001', date: daysAgo(8), projectId: 'KD-0001', client: 'SunPharma Ltd', type: 'Advance', mode: 'Bank Transfer', amount: 30000, reference: 'UTR9821347', note: 'NEFT - HDFC Bank' },
      { id: 'PAY-0002', date: daysAgo(15), projectId: 'KD-0002', client: 'Cipla Pvt Ltd', type: 'Advance', mode: 'UPI', amount: 50000, reference: 'UPI-8847291', note: 'GPay' },
      { id: 'PAY-0003', date: daysAgo(20), projectId: 'KD-0003', client: 'Mankind Pharma', type: 'Advance', mode: 'Cheque', amount: 20000, reference: 'CHQ-0044112', note: 'ICICI Bank cheque' },
      { id: 'PAY-0004', date: daysAgo(40), projectId: 'KD-0004', client: 'Dr Reddy Labs', type: 'Full', mode: 'Bank Transfer', amount: 180000, reference: 'UTR5521903', note: 'RTGS - final settlement' },
    ],
    expenses: [
      { id: 'EXP-0001', date: daysAgo(5), category: 'Printing', desc: 'PrintMaster bill - KD-0002 brochures', amount: 22000, vendor: 'PrintMaster India', reference: 'INV-PM-2291' },
      { id: 'EXP-0002', date: daysAgo(10), category: 'Salary', desc: 'Designer payroll - June', amount: 85000, vendor: 'Internal Payroll', reference: 'PAYRL-06' },
      { id: 'EXP-0003', date: daysAgo(15), category: 'Courier', desc: 'BlueDart dispatch - KD-0004', amount: 1800, vendor: 'BlueDart', reference: 'BD-INV-7821' },
      { id: 'EXP-0004', date: daysAgo(30), category: 'Office Rent', desc: 'Monthly office rent - June', amount: 35000, vendor: 'Shree Properties', reference: 'RENT-06' },
      { id: 'EXP-0005', date: daysAgo(12), category: 'Material', desc: 'Cardboard stock for pharma boxes', amount: 14200, vendor: 'PaperLine Suppliers', reference: 'PL-INV-4492' },
      { id: 'EXP-0006', date: daysAgo(7), category: 'Printing', desc: 'QuickPrint - KD-0004 visual aid', amount: 18000, vendor: 'QuickPrint', reference: 'QP-INV-1184' },
    ],
    refunds: [],
    items: SEED_ITEMS,
    tickets: [
      {
        id: 'TKT-0001', subject: 'Design revision needed', description: 'Client wants 3rd slide redesigned with new product image.',
        priority: 'high', status: 'in_progress', relatedProject: 'KD-0001',
        raisedBy: { name: 'Rahul Singh', dept: 'marketing' }, assignedTo: { name: 'Priya Sharma', dept: 'designer' },
        createdAt: daysAgo(3),
        comments: [
          { by: { name: 'Rahul Singh', dept: 'marketing' }, text: 'Please share updated visual by tomorrow EOD', date: daysAgo(3), time: '14:32' },
          { by: { name: 'Priya Sharma', dept: 'designer' }, text: 'On it, will share by 6 PM', date: daysAgo(2), time: '10:15' },
        ],
      },
      {
        id: 'TKT-0002', subject: 'Material shortage', description: 'Cardboard stock running low for pharma box.',
        priority: 'urgent', status: 'open', relatedProject: 'KD-0003',
        raisedBy: { name: 'Ramesh Kumar', dept: 'production' }, assignedTo: { name: 'Unassigned', dept: 'management' },
        createdAt: daysAgo(1), comments: [],
      },
    ],
    activities: [
      { time: '14:32', activity: 'Ticket TKT-0001 raised', user: 'Rahul', project: 'KD-0001' },
      { time: '12:10', activity: 'Payment ₹30,000', user: 'Rahul', project: 'KD-0001' },
      { time: '11:05', activity: 'Sent to Design', user: 'Rahul', project: 'KD-0001' },
      { time: '09:30', activity: 'New Project: KD-0001', user: 'Rahul', project: 'KD-0001' },
    ],
    team: SEED_TEAM,
    recycleBin: [],
    reminders: SEED_REMINDERS,
    tasks: SEED_TASKS,
    notes: SEED_NOTES,
    gstInvoices: [],
    gstSettings: { ...DEFAULT_GST_SETTINGS },
    taxRates: SEED_TAX_RATES,
    hsnCodes: SEED_HSN_CODES,
    customerGst: SEED_CUSTOMER_GST,
    supplierGst: SEED_SUPPLIER_GST,
    // CRM collections (Paid-CRM feature set)
    callLogs: SEED_CALL_LOGS,
    emailTemplates: SEED_EMAIL_TEMPLATES,
    emailLogs: SEED_EMAIL_LOGS,
    campaigns: SEED_CAMPAIGNS,
    fieldVisits: SEED_FIELD_VISITS,
    doctors: SEED_DOCTORS,
    chemists: SEED_CHEMISTS,
    workflowRules: SEED_WORKFLOW_RULES,
    customFields: SEED_CUSTOM_FIELDS,
    whatsappTemplates: SEED_WHATSAPP_TEMPLATES,
    whatsappLogs: SEED_WHATSAPP_LOGS,
    // WhatsApp Inbox (chat-style) + Lead Detail Panel support collections
    chatMessages: SEED_CHAT_MESSAGES,
    quickReplies: SEED_QUICK_REPLIES,
    followupItems: SEED_FOLLOWUP_ITEMS,
    crmOrders: SEED_CRM_ORDERS,
    crmNotifications: SEED_CRM_NOTIFICATIONS,
    leadStatusConfigs: SEED_LEAD_STATUS_CONFIGS,
    crmCampaigns: SEED_CRM_CAMPAIGNS,
    nextIds: { proj: 5, lead: 7, quote: 3, ticket: 3, refund: 1, team: 9, item: 8, pay: 5, exp: 5, dispatch: 2, pj: 3, reminder: 10, task: 5, note: 5, taxRate: 14, hsn: 12, customerGst: 6, supplierGst: 6, callLog: 4, emailTemplate: 4, emailLog: 3, campaign: 4, fieldVisit: 4, doctor: 5, chemist: 4, workflowRule: 5, customField: 4, whatsappTemplate: 8, whatsappLog: 5, chatMessage: 10, quickReply: 6, followupItem: 5, crmOrder: 3, crmNotification: 5, leadStatusConfig: 10, crmCampaign: 3 },
    currentUser: null,
    companyProfile: { ...DEFAULT_COMPANY_PROFILE },
  };
}
