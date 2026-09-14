// ===================== ERP Domain Types =====================

export type Role = 'owner' | 'management' | 'finance' | 'marketing' | 'designer' | 'production';

export type Stage =
  | 'marketing'
  | 'designing'
  | 'design_approved'
  | 'production'
  | 'management'
  | 'completed'
  | 'cancelled';

export interface User {
  name: string;
  email: string;
  role: Role;
}

export interface ProjectProduct {
  name: string;
  qty: number;
  rate: number;
  status: string;
  itemId?: string;
}

export interface ProjectFile {
  name: string;
  date: string;
  by: string;
}

export type DeptStatus = 'pending' | 'in_progress' | 'completed' | 'rejected';
export type DeptKey = 'marketing' | 'designing' | 'production' | 'management';

export interface DeptStatusEntry {
  status: DeptStatus;
  note?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface Project {
  id: string;
  client: string;
  title: string;
  value: number;
  stage: Stage;
  delivery: string;
  designer: string;
  advance: number;
  cancelled: boolean;
  refunded: boolean;
  products: ProjectProduct[];
  files: ProjectFile[];
  createdBy: string;
  createdAt: string;
  /** Per-department work status — each dept can mark its own part done / forward to mgmt */
  departmentStatus?: Record<DeptKey, DeptStatusEntry>;
  /** Optional comment log for hand-offs & reassignments */
  handoffLog?: HandoffEvent[];
}

export interface HandoffEvent {
  id: string;
  from: string;
  to: string;
  action: string; // 'completed' | 'forwarded' | 'reassigned' | 'status_update'
  note: string;
  by: string;
  at: string; // ISO date
}

export type LeadPriority = 'Hot' | 'Warm' | 'Cold';
export type LeadStage = 'New' | 'Contacted' | 'Qualified' | 'Quotation' | 'Negotiation' | 'Won' | 'Lost';

export interface Lead {
  id: string;
  client: string;
  contact: string;
  phone: string;
  email: string;
  source: string;
  requirement: string;
  status: string;
  followup: string;
  notes?: string;
  createdAt: string;
  /** Lead category — Visual Aid, Brochure, Packaging, Cards, Other, etc. */
  category?: string;
  /** Email of the team member this lead is assigned to (for manual picking/assignment). */
  assignedTo?: string;
  assignedToName?: string;
  /** Lead priority — Hot / Warm / Cold. */
  priority?: LeadPriority;
  /** Expected order value (₹). */
  expectedOrderValue?: number;
  /** Lead score 0-100 (AI/manual). Higher = more likely to convert. */
  leadScore?: number;
  /** Reason for losing the deal (when status = Lost). */
  lostReason?: string;
  /** Pipeline stage for the sales pipeline Kanban. */
  leadStage?: LeadStage;
  /** Win probability 0-100%. */
  winProbability?: number;
  /** Expected closing date (YYYY-MM-DD). */
  expectedCloseDate?: string;
  /** City of the lead. */
  city?: string;
  /** State of the lead. */
  state?: string;
  /** Area / locality. */
  area?: string;
  /** WhatsApp inbox — last chat message body (preview). */
  lastMessage?: string;
  /** WhatsApp inbox — unread inbound message count. */
  unreadCount?: number;
  /** ISO datetime of last activity (message / call / status change). */
  lastActivityAt?: string;
  /** Campaign id (Meta Ads / marketing campaign tracking). */
  campaignId?: string;
  /** Campaign name (denormalized for display). */
  campaignName?: string;
}

export interface QuotationItem {
  name: string;
  qty: number;
  rate: number;
  itemId?: string;
  /** Per-item GST rate (%) — copied from the Item's gstRate when item is selected */
  gstRate?: number;
  /** Number of pages (for printing/design work — e.g. 16-page brochure, 8-page visual aid) */
  pages?: number;
}

export interface Quotation {
  id: string;
  client: string;
  date: string;
  items: QuotationItem[];
  status: string;
  projectId: string | null;
  createdAt: string;
  /** Whether GST @18% is applied to this quotation (default true) */
  gstEnabled?: boolean;
  /** Optional note / terms on the quotation */
  notes?: string;
  /** Advance payment recorded at quotation creation time (auto-converts to project + payment) */
  advanceAmount?: number;
  advanceMode?: string;
  advanceReference?: string;
}

export interface DesignAssignment {
  projectId: string;
  client: string;
  product: string;
  designer: string;
  status: string;
  due: string;
  createdAt: string;
}

export interface ProductionJob {
  projectId: string;
  client: string;
  product: string;
  assigned: string;
  status: string;
  start: string;
  completion: string;
  createdAt: string;
}

export interface PrintJob {
  id: string;
  projectId: string;
  vendor: string;
  sent: string;
  expected: string;
  received: string;
  cost: number;
  status: string;
}

export interface Dispatch {
  id: string;
  projectId: string;
  client: string;
  address: string;
  packedBy: string;
  date: string;
  status: string;
  courier?: string;
  tracking?: string;
  dispatched?: string;
  /** Dispatch/courier charge amount */
  amount?: number;
  expected?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  date: string;
  projectId: string;
  client: string;
  type: string;
  mode: string;
  amount: number;
  reference?: string; // UTR / cheque no / transaction id
  note?: string;
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  desc: string;
  amount: number;
  vendor?: string; // who was paid
  reference?: string; // bill no / invoice no
}

export interface Refund {
  id: string;
  date: string;
  projectId: string;
  client: string;
  amount: number;
  mode: string;
  reason: string;
}

export interface Item {
  id: string;
  name: string;
  category: string;
  unit: string;
  hsn?: string;
  /** GST rate (%) applicable based on HSN — 0, 5, 12, 18, or 28. Default 18. */
  gstRate?: number;
  rate: number;
  cost: number;
  stock: number;
  minStock: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TicketComment {
  by: { name: string; dept: string };
  text: string;
  date: string;
  time: string;
}

export interface Ticket {
  id: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  relatedProject: string | null;
  raisedBy: { name: string; dept: string };
  assignedTo: { name: string; dept: string };
  createdAt: string;
  comments: TicketComment[];
}

export interface TeamMember {
  id: number;
  name: string;
  dept: Role;
  email: string;
  phone: string;
  active: boolean;
  /** Login credentials — assigned at member creation time */
  userId?: string;
  password?: string;
  /** Explicit role override (defaults to dept) */
  loginRole?: Role;
}

export interface Activity {
  time: string;
  activity: string;
  user: string;
  project: string;
}

export type RecyclableType =
  | 'project'
  | 'lead'
  | 'quotation'
  | 'item'
  | 'payment'
  | 'expense'
  | 'team'
  | 'ticket'
  | 'invoice';

export interface GSTInvoiceItem {
  description: string;
  hsn: string;
  qty: number;
  rate: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
}

export interface GSTInvoice {
  id: string;
  date: string;
  clientName: string;
  company: string;
  gstin: string;
  address: string;
  placeOfSupply: string;
  isInterstate: boolean;
  items: GSTInvoiceItem[];
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  grandTotal: number;
  amountInWords: string;
  status: string;
  createdAt: string;
  /** Bill type — Tax Invoice / Bill of Supply / Debit Note / Credit Note / Export Invoice / SEZ Invoice / RCM Invoice (driven by GST Settings). */
  billType?: string;
}

export interface RecycleEntry {
  recycleId: string;
  type: RecyclableType;
  originalId: string;
  snapshot: any;
  deletedAt: string;
  deletedBy: string;
}

// ============ Reminders (per-user + owner oversight) ============
export type ReminderPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ReminderStatus = 'pending' | 'done' | 'snoozed';

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  /** Due date — YYYY-MM-DD */
  dueDate: string;
  /** Optional due time — HH:MM (24h) */
  dueTime?: string;
  priority: ReminderPriority;
  status: ReminderStatus;
  /** Category label — Follow-up, Meeting, Payment, Delivery, Task, Custom */
  category: string;
  /** Email of the user this reminder belongs to (assignee). */
  assignedTo: string;
  assignedToName: string;
  /** Name of the user who created the reminder. */
  createdBy: string;
  createdAt: string;
  /** Set when status flips to 'done'. */
  completedAt?: string;
  /** Snooze target date — set when status === 'snoozed'. */
  snoozedUntil?: string;
  /** Optional related project id. */
  relatedProject?: string;
}

// ============ GST Settings (comprehensive — 16 editable categories) ============
export type GSTRegistrationType = 'Regular' | 'Composition' | 'SEZ' | 'Casual Taxable Person';
export type GSTCalcMethod = 'exclusive' | 'inclusive';

/** Section 3 — Tax Master: individual tax rate lines + GST tax-group slabs. */
export interface TaxRate {
  id: string;
  name: string;
  type: 'CGST' | 'SGST' | 'IGST' | 'CESS';
  rate: number;
}

/** Section 4 — HSN/SAC Master. */
export interface HSNCode {
  id: string;
  code: string;
  type: 'HSN' | 'SAC';
  description: string;
  gstRate: number;
  uqc: string; // Unit of Measurement (UQC)
}

/** Section 6 — Customer GST Settings (per-customer GST profile + full company details). */
export interface CustomerGST {
  id: string;
  name: string;
  /** Company / legal name of the customer's business. */
  companyName: string;
  gstin: string;
  /** Full billing address (street, area, landmark). */
  address: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  phone: string;
  email: string;
  /** Contact person at the customer's company. */
  contactPerson: string;
  registrationType: 'Regular' | 'Composition' | 'SEZ' | 'Unregistered' | 'Export';
  placeOfSupply: string;
  reverseCharge: boolean;
  exportOrSez: boolean;
  /** Customer category — e.g. Pharma, Corporate, Retail, Distributor. */
  customerCategory?: string;
  /** Credit limit (₹) — max outstanding allowed. */
  creditLimit?: number;
  /** Current outstanding balance (₹). */
  outstanding?: number;
  /** Last interaction date (YYYY-MM-DD). */
  lastInteraction?: string;
  /** Customer-facing notes. */
  customerNotes?: string;
}

/** Section 7 — Supplier GST Settings (per-supplier GST profile). */
export interface SupplierGST {
  id: string;
  name: string;
  gstin: string;
  registrationType: 'Regular' | 'Composition' | 'SEZ' | 'Unregistered';
  rcmApplicable: boolean;
}

export interface GSTSettings {
  // 1. Company GST Details
  gstin: string;
  pan: string;
  legalName: string;
  tradeName: string;
  businessType: string;
  registrationType: GSTRegistrationType;
  state: string;
  stateCode: string;
  placeOfSupply: string;

  // 2. GST Configuration
  compositionDealer: boolean;
  gstEnabled: boolean;
  financialYear: string;
  gstEffectiveDate: string;
  calculationMethod: GSTCalcMethod;
  roundOff: boolean;
  rcmEnabled: boolean;
  tdsTcsEnabled: boolean;

  // 8. Invoice Settings — which invoice types are enabled
  invoiceTypes: {
    taxInvoice: boolean;
    billOfSupply: boolean;
    debitNote: boolean;
    creditNote: boolean;
    exportInvoice: boolean;
    sezInvoice: boolean;
    rcmInvoice: boolean;
  };

  // 9. Place of Supply Rules
  posRules: {
    intraState: string;
    interState: string;
    exportRule: string;
    sezRule: string;
  };

  // 10. Input Tax Credit (ITC)
  itc: {
    allowed: boolean;
    blockedCredit: boolean;
    partialItc: boolean;
    reversal: boolean;
  };

  // 11. Reverse Charge Mechanism (RCM)
  rcm: {
    rcmPurchase: boolean;
    selfInvoice: boolean;
    paymentVoucher: boolean;
    liabilityReport: boolean;
  };

  // 12. E-Invoice Settings
  eInvoice: {
    enabled: boolean;
    irpApiUrl: string;
    clientId: string;
    clientSecret: string;
    autoIrn: boolean;
    qrCode: boolean;
  };

  // 13. E-Way Bill Settings
  ewayBill: {
    enabled: boolean;
    apiUrl: string;
    transporterId: string;
    transporterName: string;
    autoGenerate: boolean;
  };

  // 14. GST Return Settings
  returns: {
    gstr1: boolean;
    gstr3b: boolean;
    gstr2bRecon: boolean;
    gstr9: boolean;
  };

  // 16. Advanced Settings
  multiGstin: boolean;
  branchWise: boolean;
  multiState: boolean;
  multipleVerticals: boolean;
  lockPeriod: string;
  amendments: boolean;
  autoCalc: boolean;
  manualOverride: boolean;
  auditLog: boolean;

  // Invoice numbering + bank (kept from original)
  invoicePrefix: string;
  invoiceStartNo: number;
  bankName: string;
  bankAccount: string;
  bankIfsc: string;
  bankUpi: string;
}

// ============ Tasks (with checklist) — Owner/Management workspace ============
export type TaskStatus = 'todo' | 'in_progress' | 'on_hold' | 'blocked' | 'done';

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: ReminderPriority; // reuse low/medium/high/urgent
  /** Sub-task checklist — each item can be ticked off. */
  checklist: ChecklistItem[];
  /** Optional assignee (team member email). */
  assignedTo?: string;
  assignedToName?: string;
  /** Optional due date — YYYY-MM-DD. */
  dueDate?: string;
  category?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  relatedProject?: string;
}

// ============ Notes (sticky notes) — Owner/Management workspace ============
export type NoteColor = 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'orange' | 'slate';

export interface Note {
  id: string;
  title: string;
  content: string;
  color: NoteColor;
  pinned: boolean;
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ============ CRM collections (Paid-CRM feature set) ============

/** Call log entry (Call Management). */
export interface CallLog {
  id: string;
  leadId?: string;
  customerId?: string;
  customerName: string;
  phone: string;
  /** call / meeting / etc. */
  type: 'call' | 'meeting';
  direction?: 'outgoing' | 'incoming' | 'missed';
  outcome?: 'Connected' | 'Busy' | 'No Answer' | 'Voicemail';
  durationSec?: number;
  notes?: string;
  /** Schedule next call (YYYY-MM-DD). */
  nextCallDate?: string;
  by: string;
  at: string; // ISO datetime
}

/** Email template + email log (Email Management). */
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category?: string;
}
export interface EmailLog {
  id: string;
  to: string;
  cc?: string;
  subject: string;
  body: string;
  templateId?: string;
  status: 'sent' | 'opened' | 'clicked' | 'bounced';
  sentBy: string;
  sentAt: string;
  openedAt?: string;
}

/** Marketing campaign (Marketing Automation). */
export interface Campaign {
  id: string;
  name: string;
  channel: 'Email' | 'SMS' | 'WhatsApp' | 'Mixed';
  status: 'Draft' | 'Active' | 'Completed' | 'Paused';
  segment?: string;
  audienceCount?: number;
  sentCount?: number;
  openCount?: number;
  clickCount?: number;
  startDate?: string;
  endDate?: string;
  roi?: number;
  notes?: string;
}

/** Field sales / MR visit entry (Field Sales Tracking). */
export interface FieldVisit {
  id: string;
  /** doctor / chemist / customer name visited. */
  visitType: 'Doctor' | 'Chemist' | 'Customer' | 'Stockist';
  visitName: string;
  /** Team member who did the visit. */
  repName: string;
  repEmail: string;
  checkIn: string; // ISO datetime
  checkOut?: string;
  /** GPS coordinates. */
  latitude?: number;
  longitude?: number;
  location?: string;
  /** Products detailed / samples distributed. */
  productsDetailed?: string;
  samplesDistributed?: string;
  outcome?: string;
  /** Order booked (₹). */
  orderValue?: number;
  notes?: string;
}

/** Doctor master (Pharma CRM). */
export interface Doctor {
  id: string;
  name: string;
  speciality: string; // GP, Gyne, Ortho, Neuro, ENT, etc.
  degree?: string;
  hospital?: string;
  clinic?: string;
  city: string;
  state: string;
  phone: string;
  email?: string;
  /** Category — A / B / C based on potential. */
  category?: 'A' | 'B' | 'C';
  /** MR email this doctor is allocated to. */
  allocatedTo?: string;
  allocatedToName?: string;
  /** Visit frequency — e.g. Weekly, Fortnightly, Monthly. */
  visitFrequency?: string;
  /** Products/brands mapped. */
  brands?: string;
  /** Potential value (₹). */
  potential?: number;
  notes?: string;
}

/** Chemist / stockist master (Pharma CRM). */
export interface Chemist {
  id: string;
  name: string;
  type: 'Chemist' | 'Stockist';
  owner?: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email?: string;
  gstin?: string;
  /** Allocated MR. */
  allocatedTo?: string;
  allocatedToName?: string;
  /** Outstanding balance (₹). */
  outstanding?: number;
  notes?: string;
}

/** Workflow automation rule. */
export interface WorkflowRule {
  id: string;
  name: string;
  enabled: boolean;
  /** Trigger event — e.g. lead_created, quotation_created, payment_overdue, followup_missed. */
  trigger: string;
  /** Human-readable condition. */
  condition?: string;
  /** Action — e.g. assign_salesperson, send_email, alert_manager, create_task. */
  action: string;
  /** Who the action targets (email or role). */
  target?: string;
  notes?: string;
}

/** Custom field definition (Customization). */
export interface CustomField {
  id: string;
  /** Which entity this field belongs to — Lead / Customer / Project / etc. */
  entity: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'checkbox';
  options?: string; // comma-separated for select
  required?: boolean;
  defaultValue?: string;
}

/** WhatsApp message template (CRM-style WhatsApp messaging). */
export interface WhatsAppTemplate {
  id: string;
  name: string;
  /** Category — Welcome, Follow-up, Quotation, Payment Reminder, etc. */
  category: string;
  /** Message body with optional {{name}}, {{company}}, {{amount}} placeholders. */
  body: string;
  /** Whether this is an auto-send template (e.g. auto-welcome on new lead). */
  autoSend?: boolean;
  createdAt: string;
}

/** WhatsApp message log entry (conversation history). */
export interface WhatsAppLog {
  id: string;
  /** Recipient phone number (E.164 or local). */
  toPhone: string;
  /** Recipient name (customer/lead/contact). */
  toName: string;
  /** Message body sent. */
  body: string;
  /** Template used (if any). */
  templateId?: string;
  templateName?: string;
  /** What was sent — message / quotation / invoice / reminder / bulk. */
  type: 'message' | 'quotation' | 'invoice' | 'reminder' | 'bulk';
  /** Related entity id (lead id, quotation id, invoice id). */
  relatedId?: string;
  /** Delivery status — since wa.me can't track real status, this is 'sent' (opened in WhatsApp). */
  status: 'sent' | 'delivered' | 'read' | 'failed';
  sentBy: string;
  sentAt: string;
}

// ============ WhatsApp CRM (chat-style messaging) ============

/** A chat message in a WhatsApp conversation (IN = received, OUT = sent). */
export interface ChatMessage {
  id: string;
  leadId: string;
  direction: 'IN' | 'OUT';
  messageType: 'text' | 'image' | 'audio' | 'document' | 'template';
  body: string;
  status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
  sentBy?: string;
  timestamp: string; // ISO datetime
}

/** Quick reply — pre-saved message snippet for fast WhatsApp responses. */
export interface QuickReply {
  id: string;
  title: string;
  message: string;
  category: string;
}

/** CRM follow-up item (per-lead, with status tracking). */
export interface FollowupItem {
  id: string;
  leadId: string;
  assignedTo?: string;
  followupDate: string; // YYYY-MM-DD
  followupTime?: string; // HH:mm
  note?: string;
  status: 'PENDING' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED';
  completedAt?: string;
  createdAt: string;
}

/** CRM order (converted from a lead/quotation). */
export interface CRMOrder {
  id: string;
  orderNumber: string;
  leadId: string;
  quotationId?: string;
  customerName: string;
  orderAmount: number;
  advanceReceived: number;
  orderDetails?: string;
  expectedDeliveryDate?: string;
  notes?: string;
  status: 'CONFIRMED' | 'IN_PROGRESS' | 'DELIVERED' | 'CANCELLED';
  confirmedBy: string;
  createdAt: string;
}

/** Notification for the notification bell. */
export interface CRMNotification {
  id: string;
  userId?: string; // null = broadcast to all
  type: 'NEW_LEAD' | 'LEAD_ASSIGNED' | 'FOLLOWUP_DUE' | 'FOLLOWUP_OVERDUE' | 'CUSTOMER_REPLIED' | 'QUOTATION_DUE';
  title: string;
  description?: string;
  leadId?: string;
  read: boolean;
  createdAt: string;
}

/** Lead status configuration (custom statuses with colors, emojis, quick actions). */
export interface LeadStatusConfig {
  id: string;
  name: string;
  label: string;
  emoji: string;
  color: string; // slate, cyan, amber, violet, orange, rose, red, emerald, green
  position: number;
  isSystem: boolean;
  isWon: boolean;
  isLost: boolean;
  isQuickAction: boolean;
}

/** CRM campaign (Meta Ads / marketing campaign tracking). */
export interface CRMCampaign {
  id: string;
  campaignName: string;
  source: string; // Meta WhatsApp Ad | Meta Lead Form | WhatsApp | Manual
  leadsCount: number;
  createdAt: string;
}

// ============ ERP State ============
export interface ERPState {
  projects: Project[];
  leads: Lead[];
  quotations: Quotation[];
  designs: DesignAssignment[];
  production: ProductionJob[];
  printJobs: PrintJob[];
  dispatches: Dispatch[];
  payments: Payment[];
  expenses: Expense[];
  refunds: Refund[];
  items: Item[];
  tickets: Ticket[];
  reminders?: Reminder[];
  tasks?: Task[];
  notes?: Note[];
  activities: Activity[];
  team: TeamMember[];
  recycleBin: RecycleEntry[];
  gstInvoices?: GSTInvoice[];
  gstSettings?: GSTSettings;
  taxRates?: TaxRate[];
  hsnCodes?: HSNCode[];
  customerGst?: CustomerGST[];
  supplierGst?: SupplierGST[];
  // CRM collections (Paid-CRM feature set)
  callLogs?: CallLog[];
  emailTemplates?: EmailTemplate[];
  emailLogs?: EmailLog[];
  campaigns?: Campaign[];
  fieldVisits?: FieldVisit[];
  doctors?: Doctor[];
  chemists?: Chemist[];
  workflowRules?: WorkflowRule[];
  customFields?: CustomField[];
  // WhatsApp CRM (messaging + templates + log)
  whatsappTemplates?: WhatsAppTemplate[];
  whatsappLogs?: WhatsAppLog[];
  // WhatsApp Inbox (chat-style) + Lead Detail Panel support collections
  chatMessages?: ChatMessage[];
  quickReplies?: QuickReply[];
  followupItems?: FollowupItem[];
  crmOrders?: CRMOrder[];
  crmNotifications?: CRMNotification[];
  leadStatusConfigs?: LeadStatusConfig[];
  crmCampaigns?: CRMCampaign[];
  nextIds: Record<string, number>;
  currentUser: User | null;
  /** Owner-controlled per-role page access overrides. When present for a role, used instead of ROLE_PAGES default. */
  permissions?: Record<Role, string[]>;
  /** Editable company profile (name, tagline, contact, footer) — used across the whole site. */
  companyProfile?: CompanyProfile;
}

/** Editable company profile shown across the entire app (footer, invoices, quotations, login). */
export interface CompanyProfile {
  name: string;        // "Karyam Dessin"
  tagline: string;     // "Beyond Design – It's Pure Strategy"
  phone: string;       // "+91-9452879204"
  email: string;       // "karyam.dessin@gmail.com"
  address: string;     // "Lucknow, UP"
  footerText: string;  // custom footer line (empty = auto-build from name + tagline + contact)
  logoText: string;    // "KD"
  accentWord: string;  // the second word highlighted in emerald (e.g. "Dessin")
  /** Optional logo image as a base64 data URL (PNG/JPEG). When set, used instead of logoText. */
  logoImage?: string;
}
