'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { firestoreStorage, setCurrentUserUid, onRemoteUpdate, startRealtimeSync, stopRealtimeSync, isApplyingRemoteUpdate } from './firestore-storage';
import type {
  ERPState, User, Project, Lead, Quotation, DesignAssignment,
  ProductionJob, PrintJob, Dispatch, Payment, Expense, Refund,
  Item, Ticket, Activity, TeamMember, RecycleEntry, RecyclableType,
  Stage, QuotationItem, DeptKey, DeptStatus, DeptStatusEntry, HandoffEvent, Role,
  GSTInvoice, Reminder, ReminderPriority, ReminderStatus,
  Task, TaskStatus, ChecklistItem, Note, NoteColor,
  TaxRate, HSNCode, CustomerGST, SupplierGST,
  CallLog, EmailTemplate, EmailLog, Campaign, FieldVisit,
  Doctor, Chemist, WorkflowRule, CustomField, LeadPriority, LeadStage,
  WhatsAppTemplate, WhatsAppLog,
  ChatMessage, QuickReply, FollowupItem, CRMOrder, CRMNotification,
  LeadStatusConfig, CRMCampaign,
} from './types';
import { buildSeedState, ROLE_PAGES, DEFAULT_COMPANY_PROFILE } from './constants';
import { gId, today, now, activityNow } from './utils';

interface ERPActions {
  login: (user: User) => void;
  logout: () => void;

  addActivity: (activity: string, project?: string) => void;

  // Projects
  createProject: (p: {
    client: string; title: string; value: number; delivery: string;
    advance: number; product: string; itemId?: string;
  }) => string;
  cancelProject: (id: string) => void;
  refundProject: (id: string, amount: number, mode: string, reason: string) => void;
  deleteProject: (id: string) => void;
  flowTo: (id: string, newStage: Stage) => void;
  addProjectProduct: (projectId: string, p: { name: string; qty: number; rate: number; itemId?: string }) => void;
  addProjectFile: (projectId: string, name: string) => void;
  /** Update a specific department's work status on a project (each dept can mark its own part done) */
  updateDepartmentStatus: (projectId: string, dept: DeptKey, status: DeptStatus, note?: string) => void;
  /** Any department can forward/reassign the project directly to Management for review */
  forwardToManagement: (projectId: string, note?: string) => void;
  /** Owner/Management can reassign the project to any other department */
  reassignToDepartment: (projectId: string, dept: DeptKey, note?: string) => void;
  /** Append a handoff event to the project's handoff log */
  logHandoff: (projectId: string, evt: Omit<HandoffEvent, 'id' | 'at' | 'by'>) => void;

  // Leads
  createLead: (l: Omit<Lead, 'id' | 'createdAt' | 'status'>) => void;
  updateLeadStatus: (id: string, status: string) => void;
  /** Generic lead update — used for priority / score / lostReason / stage / etc. */
  updateLead: (id: string, patch: Partial<Lead>) => void;
  /** Assign a lead to a team member (manual pick). Pass empty string to unassign. */
  assignLead: (id: string, teamMemberEmail: string) => void;
  convertLead: (id: string) => void;
  deleteLead: (id: string) => void;

  // Quotations
  createQuotation: (data: {
    client: string; date: string; items: QuotationItem[];
    gstEnabled?: boolean; notes?: string;
    advanceAmount?: number; advanceMode?: string; advanceReference?: string;
  }) => string;
  updateQuotation: (id: string, patch: Partial<Pick<Quotation, 'client' | 'date' | 'items' | 'status' | 'gstEnabled' | 'notes'>>) => void;
  updateQuotationStatus: (id: string, status: string) => void;
  deleteQuotation: (id: string) => void;
  convertQuotationToProject: (id: string) => string | null;

  // Design
  assignDesign: (projectId: string, product: string, designer: string, due: string) => void;
  updateDesignStatus: (projectId: string, status: string) => void;

  // Production
  assignProduction: (projectId: string, assigned: string, completion: string) => void;
  updateProductionStatus: (projectId: string, status: string) => void;
  createPrintJob: (j: Omit<PrintJob, 'id'>) => void;

  // Dispatch
  createDispatch: (projectId: string) => void;
  dispatchItem: (projectId: string, courier: string, tracking: string, expected: string, amount: number) => void;
  updateDispatchStatus: (projectId: string, status: string) => void;

  // Finance
  createPayment: (p: { projectId: string; amount: number; type: string; mode: string; reference?: string; note?: string; date?: string }) => void;
  updatePayment: (id: string, patch: Partial<Payment>) => void;
  deletePayment: (id: string) => void;
  createExpense: (category: string, amount: number, desc: string, vendor?: string, reference?: string, date?: string) => void;
  updateExpense: (id: string, patch: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;

  // Items (NEW)
  createItem: (i: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateItem: (id: string, patch: Partial<Item>) => void;
  deleteItem: (id: string) => void;
  adjustStock: (id: string, delta: number) => void;

  // Tickets
  createTicket: (t: {
    subject: string; description: string; priority: Ticket['priority'];
    relatedProject: string | null; assignedDept: string;
  }) => void;
  updateTicketStatus: (id: string, status: Ticket['status']) => void;
  reassignTicket: (id: string, dept: string, reason: string) => void;
  addTicketComment: (id: string, text: string) => void;

  // Team
  addTeamMember: (m: { name: string; dept: TeamMember['dept']; phone: string; email: string; userId: string; password: string; loginRole: TeamMember['loginRole'] }) => void;
  updateTeamMember: (id: number, patch: Partial<TeamMember>) => void;
  deleteTeamMember: (id: number) => void;

  // Reminders (per-user + owner oversight)
  /** Create a reminder. Owner/management can assign to any team member; others auto-assign to self. */
  createReminder: (r: {
    title: string; description?: string; dueDate: string; dueTime?: string;
    priority: ReminderPriority; category: string;
    assignedTo: string; relatedProject?: string;
  }) => void;
  updateReminder: (id: string, patch: Partial<Reminder>) => void;
  deleteReminder: (id: string) => void;
  toggleReminderDone: (id: string) => void;
  snoozeReminder: (id: string, untilDate: string) => void;
  clearCompletedReminders: (assignedToEmail?: string) => void;

  // Tasks (with checklist) — Owner/Management workspace
  createTask: (t: {
    title: string; description?: string; priority: ReminderPriority;
    status?: TaskStatus; assignedTo?: string; dueDate?: string;
    category?: string; relatedProject?: string; checklist?: ChecklistItem[];
  }) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  updateTaskStatus: (id: string, status: TaskStatus) => void;
  deleteTask: (id: string) => void;
  addChecklistItem: (taskId: string, text: string) => void;
  updateChecklistItem: (taskId: string, itemId: string, patch: Partial<ChecklistItem>) => void;
  deleteChecklistItem: (taskId: string, itemId: string) => void;

  // Notes (sticky notes) — Owner/Management workspace
  createNote: (n: { title: string; content: string; color?: NoteColor; tags?: string[] }) => void;
  updateNote: (id: string, patch: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  togglePinNote: (id: string) => void;

  // GST master data — Tax Rates / HSN-SAC / Customer GST / Supplier GST
  createTaxRate: (t: Omit<TaxRate, 'id'>) => void;
  updateTaxRate: (id: string, patch: Partial<TaxRate>) => void;
  deleteTaxRate: (id: string) => void;
  createHSN: (h: Omit<HSNCode, 'id'>) => void;
  updateHSN: (id: string, patch: Partial<HSNCode>) => void;
  deleteHSN: (id: string) => void;
  createCustomerGst: (c: Omit<CustomerGST, 'id'>) => void;
  updateCustomerGst: (id: string, patch: Partial<CustomerGST>) => void;
  deleteCustomerGst: (id: string) => void;
  createSupplierGst: (s: Omit<SupplierGST, 'id'>) => void;
  updateSupplierGst: (id: string, patch: Partial<SupplierGST>) => void;
  deleteSupplierGst: (id: string) => void;

  // CRM — Call logs (Call Management)
  createCallLog: (c: Omit<CallLog, 'id'>) => void;
  deleteCallLog: (id: string) => void;

  // CRM — Email templates + email sending (Email Management)
  createEmailTemplate: (t: Omit<EmailTemplate, 'id'>) => void;
  updateEmailTemplate: (id: string, patch: Partial<EmailTemplate>) => void;
  deleteEmailTemplate: (id: string) => void;
  /** Send an email — creates an EmailLog entry with status='sent'. */
  sendEmail: (e: { to: string; cc?: string; subject: string; body: string; templateId?: string }) => void;

  // CRM — Marketing campaigns (Marketing Automation)
  createCampaign: (c: Omit<Campaign, 'id'>) => void;
  updateCampaign: (id: string, patch: Partial<Campaign>) => void;
  deleteCampaign: (id: string) => void;

  // CRM — Field sales / MR visits (Field Sales Tracking)
  createFieldVisit: (v: Omit<FieldVisit, 'id'>) => void;
  deleteFieldVisit: (id: string) => void;

  // CRM — Doctors (Pharma CRM)
  createDoctor: (d: Omit<Doctor, 'id'>) => void;
  updateDoctor: (id: string, patch: Partial<Doctor>) => void;
  deleteDoctor: (id: string) => void;

  // CRM — Chemists / stockists (Pharma CRM)
  createChemist: (c: Omit<Chemist, 'id'>) => void;
  updateChemist: (id: string, patch: Partial<Chemist>) => void;
  deleteChemist: (id: string) => void;

  // CRM — Workflow rules (Automation)
  createWorkflowRule: (r: Omit<WorkflowRule, 'id'>) => void;
  updateWorkflowRule: (id: string, patch: Partial<WorkflowRule>) => void;
  deleteWorkflowRule: (id: string) => void;

  // CRM — Custom fields (Customization)
  createCustomField: (f: Omit<CustomField, 'id'>) => void;
  updateCustomField: (id: string, patch: Partial<CustomField>) => void;
  deleteCustomField: (id: string) => void;

  // WhatsApp CRM (messaging + templates + log)
  createWhatsAppTemplate: (t: Omit<WhatsAppTemplate, 'id' | 'createdAt'>) => void;
  updateWhatsAppTemplate: (id: string, patch: Partial<WhatsAppTemplate>) => void;
  deleteWhatsAppTemplate: (id: string) => void;
  /** Send a WhatsApp message — opens wa.me link + logs to whatsappLogs. */
  sendWhatsAppMessage: (msg: { toPhone: string; toName: string; body: string; templateId?: string; templateName?: string; type?: WhatsAppLog['type']; relatedId?: string }) => void;
  /** Bulk send — opens wa.me for each recipient + logs. */
  bulkWhatsApp: (recipients: { phone: string; name: string }[], body: string) => number;

  // ============ WhatsApp Inbox (chat-style messaging) ============
  /** Send a chat message to a lead (direction=OUT, status=sent). Updates lead's lastMessage + lastActivityAt. */
  sendChatMessage: (leadId: string, body: string) => void;
  /** Simulate an inbound chat message from a lead (direction=IN, status=delivered). Increments lead's unreadCount. */
  receiveChatMessage: (leadId: string, body: string) => void;
  /** Mark all unread inbound messages of a lead as read — sets unreadCount=0. */
  markLeadRead: (leadId: string) => void;

  // ============ Quick Replies (WhatsApp snippet library) ============
  createQuickReply: (q: Omit<QuickReply, 'id'>) => void;
  updateQuickReply: (id: string, patch: Partial<QuickReply>) => void;
  deleteQuickReply: (id: string) => void;

  // ============ CRM Follow-up Items (per-lead, status tracked) ============
  createFollowupItem: (f: Omit<FollowupItem, 'id' | 'createdAt' | 'status' | 'completedAt'>) => void;
  /** Mark a follow-up as completed (sets status=COMPLETED + completedAt=now). */
  completeFollowupItem: (id: string) => void;
  deleteFollowupItem: (id: string) => void;

  // ============ CRM Orders (converted from lead/quotation) ============
  createCRMOrder: (o: Omit<CRMOrder, 'id' | 'createdAt'>) => void;
  updateCRMOrder: (id: string, patch: Partial<CRMOrder>) => void;
  deleteCRMOrder: (id: string) => void;

  // ============ CRM Notifications (notification bell) ============
  createNotification: (n: Omit<CRMNotification, 'id' | 'createdAt' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  deleteNotification: (id: string) => void;

  // ============ Lead Status Config (custom statuses — system ones cannot be deleted) ============
  createLeadStatusConfig: (s: Omit<LeadStatusConfig, 'id'>) => void;
  updateLeadStatusConfig: (id: string, patch: Partial<LeadStatusConfig>) => void;
  deleteLeadStatusConfig: (id: string) => void;

  // ============ CRM Campaigns (Meta Ads / marketing campaign tracking) ============
  createCRMCampaign: (c: Omit<CRMCampaign, 'id' | 'createdAt'>) => void;
  deleteCRMCampaign: (id: string) => void;


  // Auth — credential-based login (looks up team members by userId + password)
  loginWithCredentials: (userId: string, password: string) => boolean;
  // Auth by email + password (for local mode when Firebase not configured)
  loginWithEmail: (email: string, password: string) => boolean;

  // Recycle Bin (NEW)
  restoreFromBin: (recycleId: string) => void;
  permanentlyDelete: (recycleId: string) => void;
  emptyBin: () => void;

  // Permissions (Owner-controlled per-role page access)
  setRolePermissions: (role: Role, pages: string[]) => void;
  togglePermission: (role: Role, page: string) => void;
  resetPermissions: () => void;

  // Company Profile (editable site-wide branding / contact / footer)
  updateCompanyProfile: (patch: Partial<import('./types').CompanyProfile>) => void;
  resetCompanyProfile: () => void;

  resetDemo: () => void;
  importData: (data: Partial<ERPState>) => void;
  createGSTInvoice: (data: Omit<GSTInvoice, 'id' | 'createdAt'>) => void;
  updateGSTInvoice: (id: string, patch: Partial<GSTInvoice>) => void;
  deleteGSTInvoice: (id: string) => void;
  updateGSTSettings: (patch: Partial<import('./types').GSTSettings>) => void;
}

const moveToBin = (
  state: ERPState,
  type: RecyclableType,
  originalId: string,
  snapshot: any,
): RecycleEntry[] => {
  const entry: RecycleEntry = {
    recycleId: gId('RB', (state.recycleBin.length + 1)),
    type,
    originalId,
    snapshot,
    deletedAt: today(),
    deletedBy: state.currentUser?.name || 'Unknown',
  };
  return [entry, ...state.recycleBin];
};

/** Build a fresh default per-department status record for a new project */
export function defaultDeptStatus(): Record<DeptKey, DeptStatusEntry> {
  return {
    marketing: { status: 'in_progress' },
    designing: { status: 'pending' },
    production: { status: 'pending' },
    management: { status: 'pending' },
  };
}

/** Map a user role to its corresponding department key */
export function mapRoleToDept(role: Role | undefined): DeptKey {
  switch (role) {
    case 'marketing': return 'marketing';
    case 'designer': return 'designing';
    case 'production': return 'production';
    case 'management':
    case 'owner': return 'management';
    default: return 'management';
  }
}

export const useERP = create<ERPState & ERPActions>()(
  persist(
    (set, get) => ({
      ...buildSeedState(),

      login: (user) => set({ currentUser: user }),
      logout: () => set({ currentUser: null }),

      addActivity: (activity, project = '-') =>
        set((s) => ({
          activities: [
            { time: now(), activity, user: activityNow(s.currentUser?.name || 'System'), project },
            ...s.activities,
          ].slice(0, 50),
        })),

      // ============ PROJECTS ============
      createProject: ({ client, title, value, delivery, advance, product, itemId }) => {
        const id = gId('KD', get().nextIds.proj);
        const newProject: Project = {
          id,
          client,
          title,
          value,
          stage: 'marketing',
          delivery,
          designer: '-',
          advance,
          cancelled: false,
          refunded: false,
          products: [{ name: product, qty: 1, rate: value, status: 'Marketing', itemId }],
          files: [],
          createdBy: get().currentUser?.name || 'Unknown',
          createdAt: today(),
          departmentStatus: defaultDeptStatus(),
          handoffLog: [],
        };
        set((s) => ({
          projects: [newProject, ...s.projects],
          nextIds: { ...s.nextIds, proj: s.nextIds.proj + 1 },
        }));
        get().addActivity(`New Project: ${id}`, id);
        return id;
      },

      cancelProject: (id) => {
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, cancelled: true, stage: 'cancelled' as Stage } : p,
          ),
        }));
        get().addActivity('Project Cancelled', id);
      },

      refundProject: (id, amount, mode, reason) => {
        const p = get().projects.find((x) => x.id === id);
        if (!p) return;
        const refund: Refund = {
          id: gId('REF', get().nextIds.refund),
          date: today(),
          projectId: id,
          client: p.client,
          amount,
          mode,
          reason,
        };
        set((s) => ({
          refunds: [refund, ...s.refunds],
          projects: s.projects.map((x) => (x.id === id ? { ...x, refunded: true } : x)),
          nextIds: { ...s.nextIds, refund: s.nextIds.refund + 1 },
        }));
        get().addActivity(`Refund ${Rs(amount)}`, id);
      },

      deleteProject: (id) => {
        const p = get().projects.find((x) => x.id === id);
        if (!p) return;
        set((s) => ({
          projects: s.projects.filter((x) => x.id !== id),
          designs: s.designs.filter((x) => x.projectId !== id),
          production: s.production.filter((x) => x.projectId !== id),
          dispatches: s.dispatches.filter((x) => x.projectId !== id),
          payments: s.payments.filter((x) => x.projectId !== id),
          recycleBin: moveToBin(s, 'project', id, p),
        }));
        get().addActivity('Project Deleted', id);
      },

      flowTo: (id, newStage) => {
        const p = get().projects.find((x) => x.id === id);
        if (!p) return;
        const old = p.stage;
        const user = get().currentUser;
        // Update stage and sync departmentStatus for the new stage
        set((s) => ({
          projects: s.projects.map((x) => {
            if (x.id !== id) return x;
            const ds = x.departmentStatus || defaultDeptStatus();
            // Mark the source department as completed (if it's a department stage)
            const sourceDept: DeptKey | null =
              old === 'marketing' ? 'marketing'
              : old === 'designing' || old === 'design_approved' ? 'designing'
              : old === 'production' ? 'production'
              : old === 'management' ? 'management'
              : null;
            const targetDept: DeptKey | null =
              newStage === 'marketing' ? 'marketing'
              : newStage === 'designing' ? 'designing'
              : newStage === 'production' ? 'production'
              : newStage === 'management' ? 'management'
              : null;
            const newDs = { ...ds };
            if (sourceDept && sourceDept !== targetDept) {
              newDs[sourceDept] = {
                status: 'completed',
                note: ds[sourceDept]?.note,
                updatedBy: user?.name || 'Unknown',
                updatedAt: today(),
              };
            }
            if (targetDept) {
              newDs[targetDept] = {
                status: 'in_progress',
                note: ds[targetDept]?.note,
                updatedBy: user?.name || 'Unknown',
                updatedAt: today(),
              };
            }
            return { ...x, stage: newStage, departmentStatus: newDs };
          }),
        }));

        if (newStage === 'designing') {
          const exists = get().designs.find((d) => d.projectId === id);
          if (!exists) {
            const design: DesignAssignment = {
              projectId: id,
              client: p.client,
              product: p.products.length ? p.products[0].name : '-',
              designer: 'Unassigned',
              status: 'Unassigned',
              due: p.delivery,
              createdAt: today(),
            };
            set((s) => ({ designs: [design, ...s.designs] }));
          }
          get().addActivity(`Sent to Design (${old} → Designing)`, id);
        } else if (newStage === 'production') {
          const exists = get().production.find((d) => d.projectId === id);
          if (!exists) {
            const job: ProductionJob = {
              projectId: id,
              client: p.client,
              product: p.products.length ? p.products[0].name : '-',
              assigned: 'Unassigned',
              status: 'Pending',
              start: '-',
              completion: p.delivery,
              createdAt: today(),
            };
            set((s) => ({ production: [job, ...s.production] }));
          }
          get().addActivity(`Sent to Production (${old} → Production)`, id);
        } else if (newStage === 'management') {
          get().addActivity(`Sent to Management (${old} → Mgmt Review)`, id);
        } else if (newStage === 'completed') {
          // Mark all departments completed on final completion
          set((s) => ({
            projects: s.projects.map((x) => {
              if (x.id !== id) return x;
              const ds = x.departmentStatus || defaultDeptStatus();
              const completed: Record<DeptKey, DeptStatusEntry> = {
                marketing: { ...ds.marketing, status: 'completed', updatedAt: today(), updatedBy: user?.name || 'Unknown' },
                designing: { ...ds.designing, status: 'completed', updatedAt: today(), updatedBy: user?.name || 'Unknown' },
                production: { ...ds.production, status: 'completed', updatedAt: today(), updatedBy: user?.name || 'Unknown' },
                management: { ...ds.management, status: 'completed', updatedAt: today(), updatedBy: user?.name || 'Unknown' },
              };
              return { ...x, departmentStatus: completed };
            }),
          }));
          get().addActivity('Project Completed', id);
        }
      },

      addProjectProduct: (projectId, { name, qty, rate, itemId }) => {
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  products: [...p.products, { name, qty, rate, status: p.stage === 'marketing' ? 'Marketing' : 'Pending', itemId }],
                  value: p.value + qty * rate,
                }
              : p,
          ),
        }));
      },

      addProjectFile: (projectId, name) => {
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? { ...p, files: [...p.files, { name, date: today(), by: s.currentUser?.name || 'Unknown' }] }
              : p,
          ),
        }));
      },

      // ============ DEPARTMENT STATUS & FORWARDING (NEW) ============
      logHandoff: (projectId, evt) => {
        const entry: HandoffEvent = {
          ...evt,
          id: gId('HF', (get().projects.find((p) => p.id === projectId)?.handoffLog?.length || 0) + 1),
          by: get().currentUser?.name || 'Unknown',
          at: new Date().toISOString(),
        };
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? { ...p, handoffLog: [entry, ...(p.handoffLog || [])] }
              : p,
          ),
        }));
      },

      updateDepartmentStatus: (projectId, dept, status, note) => {
        const user = get().currentUser;
        set((s) => ({
          projects: s.projects.map((p) => {
            if (p.id !== projectId) return p;
            const ds = p.departmentStatus || defaultDeptStatus();
            return {
              ...p,
              departmentStatus: {
                ...ds,
                [dept]: {
                  status,
                  note: note || ds[dept]?.note,
                  updatedBy: user?.name || 'Unknown',
                  updatedAt: today(),
                },
              },
            };
          }),
        }));
        get().logHandoff(projectId, {
          from: dept,
          to: dept,
          action: 'status_update',
          note: `${dept} status → ${status}${note ? `: ${note}` : ''}`,
        });
        get().addActivity(`${dept} marked ${status}`, projectId);
      },

      forwardToManagement: (projectId, note) => {
        const p = get().projects.find((x) => x.id === projectId);
        if (!p) return;
        const old = p.stage;
        // Mark the forwarding department as completed
        const forwarderDept = mapRoleToDept(get().currentUser?.role);
        get().updateDepartmentStatus(projectId, forwarderDept, 'completed', note);
        // Move the project stage to management
        set((s) => ({
          projects: s.projects.map((x) => (x.id === projectId ? { ...x, stage: 'management' as Stage } : x)),
        }));
        get().logHandoff(projectId, {
          from: forwarderDept,
          to: 'management',
          action: 'forwarded',
          note: note || `Forwarded from ${forwarderDept} to Management`,
        });
        get().addActivity(`Forwarded to Management (${old} → Mgmt Review)`, projectId);
      },

      reassignToDepartment: (projectId, dept, note) => {
        const p = get().projects.find((x) => x.id === projectId);
        if (!p) return;
        const old = p.stage;
        const newStage: Stage = dept === 'marketing' ? 'marketing'
          : dept === 'designing' ? 'designing'
          : dept === 'production' ? 'production'
          : 'management';
        // Set the target department back to in_progress
        set((s) => ({
          projects: s.projects.map((x) => {
            if (x.id !== projectId) return x;
            const ds = x.departmentStatus || defaultDeptStatus();
            return {
              ...x,
              stage: newStage,
              departmentStatus: {
                ...ds,
                [dept]: { status: 'in_progress', note: note || ds[dept]?.note, updatedBy: get().currentUser?.name || 'Unknown', updatedAt: today() },
              },
            };
          }),
        }));
        get().logHandoff(projectId, {
          from: old,
          to: dept,
          action: 'reassigned',
          note: note || `Reassigned to ${dept}`,
        });
        get().addActivity(`Reassigned to ${dept} (${old} → ${newStage})`, projectId);
      },

      // ============ LEADS ============
      createLead: (l) => {
        const id = gId('L', get().nextIds.lead);
        const now = new Date().toISOString();
        const newLead: Lead = { ...l, id, status: 'New', createdAt: today(), lastActivityAt: now, unreadCount: 0, lastMessage: 'New lead created' };
        set((s) => ({ leads: [newLead, ...s.leads], nextIds: { ...s.nextIds, lead: s.nextIds.lead + 1 } }));
        get().addActivity(`New Lead: ${id}`);
      },

      updateLeadStatus: (id, status) =>
        set((s) => ({ leads: s.leads.map((l) => (l.id === id ? { ...l, status } : l)) })),

      updateLead: (id, patch) => {
        set((s) => ({
          leads: s.leads.map((l) => (l.id === id ? { ...l, ...patch } : l)),
        }));
        get().addActivity(`Lead ${id} updated`);
      },

      assignLead: (id, teamMemberEmail) => {
        const member = get().team.find((m) => m.email.toLowerCase() === teamMemberEmail.trim().toLowerCase());
        set((s) => ({
          leads: s.leads.map((l) =>
            l.id === id
              ? {
                  ...l,
                  assignedTo: teamMemberEmail || undefined,
                  assignedToName: teamMemberEmail ? (member?.name || teamMemberEmail) : undefined,
                }
              : l,
          ),
        }));
        if (teamMemberEmail) get().addActivity(`Lead ${id} assigned to ${member?.name || teamMemberEmail}`);
        else get().addActivity(`Lead ${id} unassigned`);
      },

      convertLead: (id) => {
        const l = get().leads.find((x) => x.id === id);
        if (!l) return;
        const projId = get().createProject({
          client: l.client,
          title: l.requirement,
          value: 0,
          delivery: today(),
          advance: 0,
          product: 'Product 1',
        });
        get().updateLeadStatus(id, 'Won');
        get().addActivity(`Lead converted to ${projId}`, id);
      },

      deleteLead: (id) => {
        const l = get().leads.find((x) => x.id === id);
        if (!l) return;
        set((s) => ({
          leads: s.leads.filter((x) => x.id !== id),
          recycleBin: moveToBin(s, 'lead', id, l),
        }));
      },

      // ============ QUOTATIONS ============
      createQuotation: ({ client, date, items, gstEnabled = true, notes, advanceAmount, advanceMode, advanceReference }) => {
        const id = gId('QT', get().nextIds.quote);
        const q: Quotation = {
          id, client, date, items, status: 'Draft', projectId: null, createdAt: today(),
          gstEnabled, notes,
          advanceAmount: advanceAmount || undefined,
          advanceMode: advanceMode || undefined,
          advanceReference: advanceReference || undefined,
        };
        set((s) => ({ quotations: [q, ...s.quotations], nextIds: { ...s.nextIds, quote: s.nextIds.quote + 1 } }));
        get().addActivity(`Quotation ${id} created`);

        // Auto-create a lead if no lead exists for this client (so it appears in WhatsApp Chat too)
        const existingLead = get().leads.find((l) => l.client === client);
        if (!existingLead) {
          const now = new Date().toISOString();
          const leadId = gId('L', get().nextIds.lead);
          const newLead: Lead = {
            id: leadId, client, contact: client.split(' ')[0], phone: '', email: '',
            source: 'Quotation', requirement: items.map(i => i.name).join(', ') || 'Quotation enquiry',
            status: 'Quotation Sent', followup: today(), notes: `Auto-created from quotation ${id}`,
            createdAt: today(), category: 'General', leadStage: 'Quotation', priority: 'Warm',
            lastActivityAt: now, unreadCount: 0, lastMessage: `Quotation ${id} created`,
          };
          set((s) => ({ leads: [newLead, ...s.leads], nextIds: { ...s.nextIds, lead: s.nextIds.lead + 1 } }));
        }

        // If an advance payment was recorded, auto-convert to project + record payment
        if (advanceAmount && advanceAmount > 0) {
          const projId = get().convertQuotationToProject(id);
          if (projId) {
            get().createPayment({
              projectId: projId, amount: advanceAmount,
              type: 'Advance', mode: advanceMode || 'Bank Transfer',
              reference: advanceReference,
              note: `Advance against ${id}`,
            });
          }
        }
        return id;
      },

      updateQuotation: (id, patch) => {
        set((s) => ({
          quotations: s.quotations.map((q) => (q.id === id ? { ...q, ...patch } : q)),
        }));
        get().addActivity(`Quotation ${id} updated`);
      },

      updateQuotationStatus: (id, status) => {
        set((s) => ({ quotations: s.quotations.map((q) => (q.id === id ? { ...q, status } : q)) }));
        // If approved and not yet linked to a project, offer auto-conversion
        // (we do NOT auto-convert here — user can click "Convert to Project" button)
      },

      convertQuotationToProject: (id) => {
        const q = get().quotations.find((x) => x.id === id);
        if (!q) return null;
        if (q.projectId) return q.projectId; // already converted
        const projId = gId('KD', get().nextIds.proj);
        const sub = q.items.reduce((s, i) => s + i.qty * i.rate, 0);
        const gst = q.gstEnabled !== false ? Math.round(sub * 0.18) : 0;
        const total = sub + gst;
        const newProject: Project = {
          id: projId,
          client: q.client,
          title: `From Quotation ${q.id}`,
          value: total,
          stage: 'marketing',
          delivery: today(),
          designer: '-',
          advance: 0,
          cancelled: false,
          refunded: false,
          products: q.items.map((it) => ({
            name: it.name, qty: it.qty, rate: it.rate, status: 'Marketing', itemId: it.itemId,
          })),
          files: [],
          createdBy: get().currentUser?.name || 'Unknown',
          createdAt: today(),
          departmentStatus: defaultDeptStatus(),
          handoffLog: [],
        };
        set((s) => ({
          projects: [newProject, ...s.projects],
          quotations: s.quotations.map((x) => (x.id === id ? { ...x, projectId: projId, status: 'Approved' } : x)),
          nextIds: { ...s.nextIds, proj: s.nextIds.proj + 1 },
        }));
        get().addActivity(`Quotation ${id} → Project ${projId}`, projId);
        return projId;
      },

      deleteQuotation: (id) => {
        const q = get().quotations.find((x) => x.id === id);
        if (!q) return;
        set((s) => ({
          quotations: s.quotations.filter((x) => x.id !== id),
          recycleBin: moveToBin(s, 'quotation', id, q),
        }));
      },

      // ============ DESIGN ============
      assignDesign: (projectId, product, designer, due) => {
        const existing = get().designs.find((d) => d.projectId === projectId);
        const proj = get().projects.find((p) => p.id === projectId);
        if (existing) {
          set((s) => ({
            designs: s.designs.map((d) =>
              d.projectId === projectId
                ? {
                    ...d,
                    product,
                    designer,
                    due,
                    status: designer === 'Unassigned' ? 'Unassigned' : 'In Progress',
                  }
                : d,
            ),
          }));
        } else {
          const design: DesignAssignment = {
            projectId,
            client: proj?.client || '-',
            product,
            designer,
            status: designer === 'Unassigned' ? 'Unassigned' : 'In Progress',
            due,
            createdAt: today(),
          };
          set((s) => ({ designs: [design, ...s.designs] }));
        }
      },

      updateDesignStatus: (projectId, status) => {
        set((s) => ({
          designs: s.designs.map((d) => (d.projectId === projectId ? { ...d, status } : d)),
        }));
        if (status === 'Completed') {
          const p = get().projects.find((x) => x.id === projectId);
          if (p && p.stage === 'designing') {
            get().flowTo(projectId, 'production');
          }
        }
      },

      // ============ PRODUCTION ============
      assignProduction: (projectId, assigned, completion) => {
        const existing = get().production.find((p) => p.projectId === projectId);
        const proj = get().projects.find((p) => p.id === projectId);
        if (existing) {
          set((s) => ({
            production: s.production.map((p) =>
              p.projectId === projectId
                ? {
                    ...p,
                    assigned,
                    completion,
                    status: assigned === 'Unassigned' ? 'Pending' : 'Running',
                    start: assigned !== 'Unassigned' && p.start === '-' ? today() : p.start,
                  }
                : p,
            ),
          }));
        } else {
          const job: ProductionJob = {
            projectId,
            client: proj?.client || '-',
            product: '-',
            assigned,
            status: assigned === 'Unassigned' ? 'Pending' : 'Running',
            start: assigned !== 'Unassigned' ? today() : '-',
            completion,
            createdAt: today(),
          };
          set((s) => ({ production: [job, ...s.production] }));
        }
      },

      updateProductionStatus: (projectId, status) =>
        set((s) => ({
          production: s.production.map((p) => (p.projectId === projectId ? { ...p, status } : p)),
        })),

      createPrintJob: (j) => {
        const id = gId('PJ', get().nextIds.pj);
        set((s) => ({ printJobs: [{ ...j, id }, ...s.printJobs], nextIds: { ...s.nextIds, pj: s.nextIds.pj + 1 } }));
      },

      // ============ DISPATCH ============
      createDispatch: (projectId) => {
        const proj = get().projects.find((p) => p.id === projectId);
        if (!proj) return;
        const id = gId('DSP', get().nextIds.dispatch);
        const d: Dispatch = {
          id,
          projectId,
          client: proj.client,
          address: '-',
          packedBy: '-',
          date: today(),
          status: 'Ready',
          createdAt: today(),
        };
        set((s) => ({ dispatches: [d, ...s.dispatches], nextIds: { ...s.nextIds, dispatch: s.nextIds.dispatch + 1 } }));
      },

      dispatchItem: (projectId, courier, tracking, expected, amount) => {
        set((s) => ({
          dispatches: s.dispatches.map((d) =>
            d.projectId === projectId
              ? { ...d, courier, tracking, dispatched: today(), expected, status: 'In Transit', amount }
              : d,
          ),
        }));
        const proj = get().projects.find((p) => p.id === projectId);
        if (proj && proj.stage === 'production') {
          get().flowTo(projectId, 'completed');
        }
        get().addActivity(`Dispatched via ${courier} (₹${amount})`, projectId);
      },

      updateDispatchStatus: (projectId, status) => {
        set((s) => ({
          dispatches: s.dispatches.map((d) =>
            d.projectId === projectId ? { ...d, status } : d,
          ),
        }));
        // If marked Delivered, also complete the project if it was in production
        if (status === 'Delivered') {
          const proj = get().projects.find((p) => p.id === projectId);
          if (proj && proj.stage === 'production') {
            get().flowTo(projectId, 'completed');
          }
        }
        get().addActivity(`Dispatch ${projectId} → ${status}`, projectId);
      },

      // ============ FINANCE ============
      createPayment: ({ projectId, amount, type, mode, reference, note, date }) => {
        const proj = get().projects.find((p) => p.id === projectId);
        if (!proj) return;
        const id = gId('PAY', get().nextIds.pay);
        const payment: Payment = {
          id, date: date || today(), projectId, client: proj.client, type, mode, amount,
          reference: reference || undefined,
          note: note || undefined,
        };
        set((s) => ({
          payments: [payment, ...s.payments],
          projects: s.projects.map((p) => (p.id === projectId ? { ...p, advance: p.advance + amount } : p)),
          nextIds: { ...s.nextIds, pay: s.nextIds.pay + 1 },
        }));
        get().addActivity(`Payment ${Rs(amount)}`, projectId);
      },

      updatePayment: (id, patch) => {
        const old = get().payments.find((x) => x.id === id);
        if (!old) return;
        // If amount changed, adjust the project's advance accordingly
        if (patch.amount !== undefined && patch.amount !== old.amount) {
          const diff = patch.amount - old.amount;
          set((s) => ({
            projects: s.projects.map((p) => (p.id === old.projectId ? { ...p, advance: p.advance + diff } : p)),
          }));
        }
        set((s) => ({
          payments: s.payments.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        }));
        get().addActivity(`Payment ${id} updated`);
      },

      deletePayment: (id) => {
        const p = get().payments.find((x) => x.id === id);
        if (!p) return;
        set((s) => ({
          payments: s.payments.filter((x) => x.id !== id),
          recycleBin: moveToBin(s, 'payment', id, p),
        }));
      },

      createExpense: (category, amount, desc, vendor, reference, date) => {
        const id = gId('EXP', get().nextIds.exp);
        const e: Expense = {
          id, date: date || today(), category, desc: desc || '-', amount,
          vendor: vendor || undefined,
          reference: reference || undefined,
        };
        set((s) => ({ expenses: [e, ...s.expenses], nextIds: { ...s.nextIds, exp: s.nextIds.exp + 1 } }));
        get().addActivity(`Expense ${Rs(amount)} (${category})`);
      },

      updateExpense: (id, patch) => {
        set((s) => ({
          expenses: s.expenses.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        }));
        get().addActivity(`Expense ${id} updated`);
      },

      deleteExpense: (id) => {
        const e = get().expenses.find((x) => x.id === id);
        if (!e) return;
        set((s) => ({
          expenses: s.expenses.filter((x) => x.id !== id),
          recycleBin: moveToBin(s, 'expense', id, e),
        }));
      },

      // ============ ITEMS (NEW) ============
      createItem: (i) => {
        const id = gId('ITEM', get().nextIds.item);
        const item: Item = { ...i, id, createdAt: today(), updatedAt: today() };
        set((s) => ({ items: [item, ...s.items], nextIds: { ...s.nextIds, item: s.nextIds.item + 1 } }));
        get().addActivity(`New Item: ${i.name}`);
      },

      updateItem: (id, patch) => {
        set((s) => ({
          items: s.items.map((it) => (it.id === id ? { ...it, ...patch, updatedAt: today() } : it)),
        }));
      },

      deleteItem: (id) => {
        const it = get().items.find((x) => x.id === id);
        if (!it) return;
        set((s) => ({
          items: s.items.filter((x) => x.id !== id),
          recycleBin: moveToBin(s, 'item', id, it),
        }));
      },

      adjustStock: (id, delta) => {
        set((s) => ({
          items: s.items.map((it) =>
            it.id === id ? { ...it, stock: Math.max(0, it.stock + delta), updatedAt: today() } : it,
          ),
        }));
      },

      // ============ TICKETS ============
      createTicket: ({ subject, description, priority, relatedProject, assignedDept }) => {
        const id = gId('TKT', get().nextIds.ticket);
        const t: Ticket = {
          id, subject, description, priority, status: 'open',
          relatedProject, createdAt: today(),
          raisedBy: { name: get().currentUser?.name || 'Unknown', dept: get().currentUser?.role || 'owner' },
          assignedTo: { name: 'Unassigned', dept: assignedDept },
          comments: [],
        };
        set((s) => ({ tickets: [t, ...s.tickets], nextIds: { ...s.nextIds, ticket: s.nextIds.ticket + 1 } }));
        get().addActivity(`Ticket ${id} raised`);
      },

      updateTicketStatus: (id, status) =>
        set((s) => ({ tickets: s.tickets.map((t) => (t.id === id ? { ...t, status } : t)) })),

      reassignTicket: (id, dept, reason) =>
        set((s) => ({
          tickets: s.tickets.map((t) =>
            t.id === id
              ? {
                  ...t,
                  assignedTo: { name: 'Unassigned', dept },
                  status: t.status === 'resolved' ? 'in_progress' : t.status,
                  comments: [
                    ...t.comments,
                    {
                      by: { name: s.currentUser?.name || 'System', dept: s.currentUser?.role || 'owner' },
                      text: `Reassigned to ${dept}. Reason: ${reason || 'N/A'}`,
                      date: today(), time: now(),
                    },
                  ],
                }
              : t,
          ),
        })),

      addTicketComment: (id, text) =>
        set((s) => ({
          tickets: s.tickets.map((t) =>
            t.id === id
              ? {
                  ...t,
                  status: t.status === 'open' ? 'in_progress' : t.status,
                  comments: [
                    ...t.comments,
                    {
                      by: { name: s.currentUser?.name || 'System', dept: s.currentUser?.role || 'owner' },
                      text, date: today(), time: now(),
                    },
                  ],
                }
              : t,
          ),
        })),

      // ============ TEAM ============
      addTeamMember: ({ name, dept, phone, email, userId, password, loginRole }) => {
        const id = get().nextIds.team;
        const m: TeamMember = {
          id, name, dept,
          email: email || '-', phone: phone || '-', active: true,
          userId: userId || undefined,
          password: password || undefined,
          loginRole: loginRole || dept,
        };
        set((s) => ({ team: [...s.team, m], nextIds: { ...s.nextIds, team: s.nextIds.team + 1 } }));
      },

      updateTeamMember: (id, patch) => {
        set((s) => ({
          team: s.team.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        }));
      },

      deleteTeamMember: (id) => {
        const m = get().team.find((x) => x.id === id);
        if (!m) return;
        set((s) => ({
          team: s.team.filter((x) => x.id !== id),
          recycleBin: moveToBin(s, 'team', String(id), m),
        }));
      },

      // ============ REMINDERS (per-user + owner oversight) ============
      createReminder: ({ title, description, dueDate, dueTime, priority, category, assignedTo, relatedProject }) => {
        const id = gId('REM', get().nextIds.reminder ?? 1);
        const creator = get().currentUser;
        // Resolve assignee name from team list (fallback to creator name)
        const member = get().team.find((m) => m.email.toLowerCase() === assignedTo.toLowerCase());
        const reminder: Reminder = {
          id,
          title: title.trim(),
          description: description?.trim() || undefined,
          dueDate,
          dueTime: dueTime || undefined,
          priority,
          status: 'pending',
          category,
          assignedTo,
          assignedToName: member?.name || creator?.name || 'Unknown',
          createdBy: creator?.name || 'Unknown',
          createdAt: today(),
          relatedProject: relatedProject || undefined,
        };
        set((s) => ({
          reminders: [reminder, ...(s.reminders || [])],
          nextIds: { ...s.nextIds, reminder: (s.nextIds.reminder ?? 1) + 1 },
        }));
        get().addActivity(`Reminder created: ${reminder.title}`);
      },

      updateReminder: (id, patch) => {
        set((s) => ({
          reminders: (s.reminders || []).map((r) => {
            if (r.id !== id) return r;
            const next = { ...r, ...patch };
            // If assignee email changed, refresh the assignee name too
            if (patch.assignedTo && patch.assignedTo !== r.assignedTo) {
              const m = s.team.find((x) => x.email.toLowerCase() === patch.assignedTo!.toLowerCase());
              if (m) next.assignedToName = m.name;
            }
            return next;
          }),
        }));
      },

      deleteReminder: (id) => {
        set((s) => ({
          // Reminders are personal/ephemeral todos — hard-delete (not recycled).
          reminders: (s.reminders || []).filter((r) => r.id !== id),
        }));
      },

      toggleReminderDone: (id) => {
        set((s) => ({
          reminders: (s.reminders || []).map((r) => {
            if (r.id !== id) return r;
            const done = r.status === 'done';
            return {
              ...r,
              status: done ? 'pending' : ('done' as ReminderStatus),
              completedAt: done ? undefined : today(),
              // unsnooze if it was snoozed
              snoozedUntil: done ? r.snoozedUntil : undefined,
            };
          }),
        }));
      },

      snoozeReminder: (id, untilDate) => {
        set((s) => ({
          reminders: (s.reminders || []).map((r) =>
            r.id === id ? { ...r, status: 'snoozed' as ReminderStatus, snoozedUntil: untilDate } : r,
          ),
        }));
      },

      clearCompletedReminders: (assignedToEmail) => {
        set((s) => ({
          reminders: (s.reminders || []).filter((r) => {
            if (r.status !== 'done') return true;
            // If a specific user scope is given, only clear their completed reminders
            if (assignedToEmail && r.assignedTo.toLowerCase() !== assignedToEmail.toLowerCase()) return true;
            return false;
          }),
        }));
      },

      // ============ TASKS (with checklist) — Owner/Management workspace ============
      createTask: ({ title, description, priority, status, assignedTo, dueDate, category, relatedProject, checklist }) => {
        const id = gId('TASK', get().nextIds.task ?? 1);
        const creator = get().currentUser;
        const member = assignedTo
          ? get().team.find((m) => m.email.toLowerCase() === assignedTo.toLowerCase())
          : undefined;
        const task: Task = {
          id,
          title: title.trim(),
          description: description?.trim() || undefined,
          status: status || 'todo',
          priority,
          checklist: checklist || [],
          assignedTo: assignedTo || undefined,
          assignedToName: member?.name,
          dueDate: dueDate || undefined,
          category: category || undefined,
          createdBy: creator?.name || 'Unknown',
          createdAt: today(),
          updatedAt: today(),
          relatedProject: relatedProject || undefined,
        };
        set((s) => ({
          tasks: [task, ...(s.tasks || [])],
          nextIds: { ...s.nextIds, task: (s.nextIds.task ?? 1) + 1 },
        }));
        get().addActivity(`Task created: ${task.title}`);
      },

      updateTask: (id, patch) => {
        set((s) => ({
          tasks: (s.tasks || []).map((t) => {
            if (t.id !== id) return t;
            const next = { ...t, ...patch, updatedAt: today() };
            // If assignee email changed, refresh the assignee name too
            if (patch.assignedTo !== undefined && patch.assignedTo !== t.assignedTo) {
              if (!patch.assignedTo) {
                next.assignedTo = undefined;
                next.assignedToName = undefined;
              } else {
                const m = s.team.find((x) => x.email.toLowerCase() === patch.assignedTo!.toLowerCase());
                if (m) next.assignedToName = m.name;
              }
            }
            // If status flipped to done (and wasn't), stamp completedAt
            if (patch.status === 'done' && t.status !== 'done') next.completedAt = today();
            // If status flipped away from done, clear completedAt
            if (patch.status && patch.status !== 'done') next.completedAt = undefined;
            return next;
          }),
        }));
      },

      updateTaskStatus: (id, status) => {
        set((s) => ({
          tasks: (s.tasks || []).map((t) => {
            if (t.id !== id) return t;
            return {
              ...t,
              status,
              updatedAt: today(),
              completedAt: status === 'done' ? (t.completedAt || today()) : undefined,
            };
          }),
        }));
        get().addActivity(`Task ${id} → ${status}`);
      },

      deleteTask: (id) => {
        set((s) => ({
          // Tasks are workspace todos — hard-delete (not recycled).
          tasks: (s.tasks || []).filter((t) => t.id !== id),
        }));
      },

      addChecklistItem: (taskId, text) => {
        set((s) => ({
          tasks: (s.tasks || []).map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  updatedAt: today(),
                  checklist: [...t.checklist, { id: 'cl-' + Date.now(), text: text.trim(), done: false }],
                }
              : t,
          ),
        }));
      },

      updateChecklistItem: (taskId, itemId, patch) => {
        set((s) => ({
          tasks: (s.tasks || []).map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  updatedAt: today(),
                  checklist: t.checklist.map((c) => (c.id === itemId ? { ...c, ...patch } : c)),
                }
              : t,
          ),
        }));
      },

      deleteChecklistItem: (taskId, itemId) => {
        set((s) => ({
          tasks: (s.tasks || []).map((t) =>
            t.id === taskId
              ? { ...t, updatedAt: today(), checklist: t.checklist.filter((c) => c.id !== itemId) }
              : t,
          ),
        }));
      },

      // ============ NOTES (sticky notes) — Owner/Management workspace ============
      createNote: ({ title, content, color, tags }) => {
        const id = gId('NOTE', get().nextIds.note ?? 1);
        const note: Note = {
          id,
          title: title.trim() || 'Untitled',
          content,
          color: color || 'yellow',
          pinned: false,
          tags: tags || [],
          createdBy: get().currentUser?.name || 'Unknown',
          createdAt: today(),
          updatedAt: today(),
        };
        set((s) => ({
          notes: [note, ...(s.notes || [])],
          nextIds: { ...s.nextIds, note: (s.nextIds.note ?? 1) + 1 },
        }));
        get().addActivity(`Note created: ${note.title}`);
      },

      updateNote: (id, patch) => {
        set((s) => ({
          notes: (s.notes || []).map((n) => (n.id === id ? { ...n, ...patch, updatedAt: today() } : n)),
        }));
      },

      deleteNote: (id) => {
        set((s) => ({
          notes: (s.notes || []).filter((n) => n.id !== id),
        }));
      },

      togglePinNote: (id) => {
        set((s) => ({
          notes: (s.notes || []).map((n) => (n.id === id ? { ...n, pinned: !n.pinned, updatedAt: today() } : n)),
        }));
      },

      // ============ GST MASTER DATA (Tax Rates / HSN-SAC / Customer GST / Supplier GST) ============
      createTaxRate: (t) => {
        const id = gId('TX', get().nextIds.taxRate ?? 1);
        set((s) => ({
          taxRates: [...(s.taxRates || []), { ...t, id }],
          nextIds: { ...s.nextIds, taxRate: (s.nextIds.taxRate ?? 1) + 1 },
        }));
      },
      updateTaxRate: (id, patch) => {
        set((s) => ({ taxRates: (s.taxRates || []).map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
      },
      deleteTaxRate: (id) => {
        set((s) => ({ taxRates: (s.taxRates || []).filter((t) => t.id !== id) }));
      },
      createHSN: (h) => {
        const id = gId('HSN', get().nextIds.hsn ?? 1);
        set((s) => ({
          hsnCodes: [...(s.hsnCodes || []), { ...h, id }],
          nextIds: { ...s.nextIds, hsn: (s.nextIds.hsn ?? 1) + 1 },
        }));
      },
      updateHSN: (id, patch) => {
        set((s) => ({ hsnCodes: (s.hsnCodes || []).map((h) => (h.id === id ? { ...h, ...patch } : h)) }));
      },
      deleteHSN: (id) => {
        set((s) => ({ hsnCodes: (s.hsnCodes || []).filter((h) => h.id !== id) }));
      },
      createCustomerGst: (c) => {
        const id = gId('CG', get().nextIds.customerGst ?? 1);
        set((s) => ({
          customerGst: [...(s.customerGst || []), { ...c, id }],
          nextIds: { ...s.nextIds, customerGst: (s.nextIds.customerGst ?? 1) + 1 },
        }));
      },
      updateCustomerGst: (id, patch) => {
        set((s) => ({ customerGst: (s.customerGst || []).map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
      },
      deleteCustomerGst: (id) => {
        set((s) => ({ customerGst: (s.customerGst || []).filter((c) => c.id !== id) }));
      },
      createSupplierGst: (sp) => {
        const id = gId('SG', get().nextIds.supplierGst ?? 1);
        set((s) => ({
          supplierGst: [...(s.supplierGst || []), { ...sp, id }],
          nextIds: { ...s.nextIds, supplierGst: (s.nextIds.supplierGst ?? 1) + 1 },
        }));
      },
      updateSupplierGst: (id, patch) => {
        set((s) => ({ supplierGst: (s.supplierGst || []).map((sp) => (sp.id === id ? { ...sp, ...patch } : sp)) }));
      },
      deleteSupplierGst: (id) => {
        set((s) => ({ supplierGst: (s.supplierGst || []).filter((sp) => sp.id !== id) }));
      },

      // ============ CRM — Call logs (Call Management) ============
      createCallLog: (c) => {
        const id = gId('CALL', get().nextIds.callLog ?? 1);
        set((s) => ({
          callLogs: [{ ...c, id }, ...(s.callLogs || [])],
          nextIds: { ...s.nextIds, callLog: (s.nextIds.callLog ?? 1) + 1 },
        }));
        get().addActivity(`Call logged: ${c.customerName}`);
      },
      deleteCallLog: (id) => {
        set((s) => ({ callLogs: (s.callLogs || []).filter((c) => c.id !== id) }));
      },

      // ============ CRM — Email templates + email sending (Email Management) ============
      createEmailTemplate: (t) => {
        const id = gId('ET', get().nextIds.emailTemplate ?? 1);
        set((s) => ({
          emailTemplates: [{ ...t, id }, ...(s.emailTemplates || [])],
          nextIds: { ...s.nextIds, emailTemplate: (s.nextIds.emailTemplate ?? 1) + 1 },
        }));
        get().addActivity(`Email template created: ${t.name}`);
      },
      updateEmailTemplate: (id, patch) => {
        set((s) => ({ emailTemplates: (s.emailTemplates || []).map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
      },
      deleteEmailTemplate: (id) => {
        set((s) => ({ emailTemplates: (s.emailTemplates || []).filter((t) => t.id !== id) }));
      },
      sendEmail: ({ to, cc, subject, body, templateId }) => {
        const id = gId('EM', get().nextIds.emailLog ?? 1);
        const log: EmailLog = {
          id, to, cc: cc || undefined, subject, body,
          templateId: templateId || undefined,
          status: 'sent',
          sentBy: get().currentUser?.name || 'Unknown',
          sentAt: new Date().toISOString(),
        };
        set((s) => ({
          emailLogs: [log, ...(s.emailLogs || [])],
          nextIds: { ...s.nextIds, emailLog: (s.nextIds.emailLog ?? 1) + 1 },
        }));
        get().addActivity(`Email sent to ${to}`);
      },

      // ============ CRM — Marketing campaigns (Marketing Automation) ============
      createCampaign: (c) => {
        const id = gId('CMP', get().nextIds.campaign ?? 1);
        set((s) => ({
          campaigns: [{ ...c, id }, ...(s.campaigns || [])],
          nextIds: { ...s.nextIds, campaign: (s.nextIds.campaign ?? 1) + 1 },
        }));
        get().addActivity(`Campaign created: ${c.name}`);
      },
      updateCampaign: (id, patch) => {
        set((s) => ({ campaigns: (s.campaigns || []).map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
      },
      deleteCampaign: (id) => {
        set((s) => ({ campaigns: (s.campaigns || []).filter((c) => c.id !== id) }));
      },

      // ============ CRM — Field sales / MR visits (Field Sales Tracking) ============
      createFieldVisit: (v) => {
        const id = gId('FV', get().nextIds.fieldVisit ?? 1);
        set((s) => ({
          fieldVisits: [{ ...v, id }, ...(s.fieldVisits || [])],
          nextIds: { ...s.nextIds, fieldVisit: (s.nextIds.fieldVisit ?? 1) + 1 },
        }));
        get().addActivity(`Field visit logged: ${v.visitName}`);
      },
      deleteFieldVisit: (id) => {
        set((s) => ({ fieldVisits: (s.fieldVisits || []).filter((v) => v.id !== id) }));
      },

      // ============ CRM — Doctors (Pharma CRM) ============
      createDoctor: (d) => {
        const id = gId('DR', get().nextIds.doctor ?? 1);
        set((s) => ({
          doctors: [{ ...d, id }, ...(s.doctors || [])],
          nextIds: { ...s.nextIds, doctor: (s.nextIds.doctor ?? 1) + 1 },
        }));
        get().addActivity(`Doctor added: ${d.name}`);
      },
      updateDoctor: (id, patch) => {
        set((s) => ({ doctors: (s.doctors || []).map((d) => (d.id === id ? { ...d, ...patch } : d)) }));
      },
      deleteDoctor: (id) => {
        set((s) => ({ doctors: (s.doctors || []).filter((d) => d.id !== id) }));
      },

      // ============ CRM — Chemists / stockists (Pharma CRM) ============
      createChemist: (c) => {
        const id = gId('CH', get().nextIds.chemist ?? 1);
        set((s) => ({
          chemists: [{ ...c, id }, ...(s.chemists || [])],
          nextIds: { ...s.nextIds, chemist: (s.nextIds.chemist ?? 1) + 1 },
        }));
        get().addActivity(`Chemist added: ${c.name}`);
      },
      updateChemist: (id, patch) => {
        set((s) => ({ chemists: (s.chemists || []).map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
      },
      deleteChemist: (id) => {
        set((s) => ({ chemists: (s.chemists || []).filter((c) => c.id !== id) }));
      },

      // ============ CRM — Workflow rules (Automation) ============
      createWorkflowRule: (r) => {
        const id = gId('WF', get().nextIds.workflowRule ?? 1);
        set((s) => ({
          workflowRules: [{ ...r, id }, ...(s.workflowRules || [])],
          nextIds: { ...s.nextIds, workflowRule: (s.nextIds.workflowRule ?? 1) + 1 },
        }));
        get().addActivity(`Workflow rule created: ${r.name}`);
      },
      updateWorkflowRule: (id, patch) => {
        set((s) => ({ workflowRules: (s.workflowRules || []).map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
      },
      deleteWorkflowRule: (id) => {
        set((s) => ({ workflowRules: (s.workflowRules || []).filter((r) => r.id !== id) }));
      },

      // ============ CRM — Custom fields (Customization) ============
      createCustomField: (f) => {
        const id = gId('CF', get().nextIds.customField ?? 1);
        set((s) => ({
          customFields: [{ ...f, id }, ...(s.customFields || [])],
          nextIds: { ...s.nextIds, customField: (s.nextIds.customField ?? 1) + 1 },
        }));
        get().addActivity(`Custom field created: ${f.label}`);
      },
      updateCustomField: (id, patch) => {
        set((s) => ({ customFields: (s.customFields || []).map((f) => (f.id === id ? { ...f, ...patch } : f)) }));
      },
      deleteCustomField: (id) => {
        set((s) => ({ customFields: (s.customFields || []).filter((f) => f.id !== id) }));
      },

      // ============ WHATSAPP CRM (messaging + templates + log) ============
      createWhatsAppTemplate: (t) => {
        const id = gId('WT', get().nextIds.whatsappTemplate ?? 1);
        const tmpl: WhatsAppTemplate = { ...t, id, createdAt: today() };
        set((s) => ({
          whatsappTemplates: [tmpl, ...(s.whatsappTemplates || [])],
          nextIds: { ...s.nextIds, whatsappTemplate: (s.nextIds.whatsappTemplate ?? 1) + 1 },
        }));
        get().addActivity(`WhatsApp template created: ${tmpl.name}`);
      },
      updateWhatsAppTemplate: (id, patch) => {
        set((s) => ({ whatsappTemplates: (s.whatsappTemplates || []).map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
      },
      deleteWhatsAppTemplate: (id) => {
        set((s) => ({ whatsappTemplates: (s.whatsappTemplates || []).filter((t) => t.id !== id) }));
      },
      sendWhatsAppMessage: (msg) => {
        const id = gId('WL', get().nextIds.whatsappLog ?? 1);
        const log: WhatsAppLog = {
          id,
          toPhone: msg.toPhone,
          toName: msg.toName,
          body: msg.body,
          templateId: msg.templateId,
          templateName: msg.templateName,
          type: msg.type || 'message',
          relatedId: msg.relatedId,
          status: 'sent',
          sentBy: get().currentUser?.name || 'Unknown',
          sentAt: new Date().toISOString(),
        };
        // Open wa.me link with pre-filled text
        const phone = msg.toPhone.replace(/\D/g, '');
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg.body)}`;
        if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener,noreferrer');
        set((s) => ({
          whatsappLogs: [log, ...(s.whatsappLogs || [])],
          nextIds: { ...s.nextIds, whatsappLog: (s.nextIds.whatsappLog ?? 1) + 1 },
        }));
        get().addActivity(`WhatsApp sent to ${msg.toName}`);
      },
      bulkWhatsApp: (recipients, body) => {
        let count = 0;
        recipients.forEach((r, idx) => {
          const personalized = body.replace(/{{name}}/g, r.name);
          // Stagger the window.open calls slightly so the browser doesn't block them all
          setTimeout(() => {
            const phone = r.phone.replace(/\D/g, '');
            const url = `https://wa.me/${phone}?text=${encodeURIComponent(personalized)}`;
            if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener,noreferrer');
          }, idx * 400);
          const id = gId('WL', (get().nextIds.whatsappLog ?? 1) + idx);
          const log: WhatsAppLog = {
            id, toPhone: r.phone, toName: r.name, body: personalized,
            type: 'bulk', status: 'sent',
            sentBy: get().currentUser?.name || 'Unknown',
            sentAt: new Date().toISOString(),
          };
          set((s) => ({ whatsappLogs: [log, ...(s.whatsappLogs || [])] }));
          count += 1;
        });
        set((s) => ({ nextIds: { ...s.nextIds, whatsappLog: (s.nextIds.whatsappLog ?? 1) + recipients.length } }));
        get().addActivity(`Bulk WhatsApp sent to ${count} recipients`);
        return count;
      },

      // ============ WHATSAPP INBOX (chat-style messaging) ============
      sendChatMessage: (leadId, body) => {
        const id = gId('CHAT', get().nextIds.chatMessage ?? 1);
        const msg: ChatMessage = {
          id,
          leadId,
          direction: 'OUT',
          messageType: 'text',
          body,
          status: 'sent',
          sentBy: get().currentUser?.name || 'Unknown',
          timestamp: new Date().toISOString(),
        };
        set((s) => ({
          chatMessages: [msg, ...(s.chatMessages || [])],
          leads: s.leads.map((l) => l.id === leadId ? { ...l, lastMessage: body, lastActivityAt: msg.timestamp } : l),
          nextIds: { ...s.nextIds, chatMessage: (s.nextIds.chatMessage ?? 1) + 1 },
        }));
        get().addActivity(`WhatsApp reply sent to lead ${leadId}`, leadId);
      },
      receiveChatMessage: (leadId, body) => {
        const id = gId('CHAT', get().nextIds.chatMessage ?? 1);
        const msg: ChatMessage = {
          id,
          leadId,
          direction: 'IN',
          messageType: 'text',
          body,
          status: 'delivered',
          timestamp: new Date().toISOString(),
        };
        set((s) => ({
          chatMessages: [msg, ...(s.chatMessages || [])],
          leads: s.leads.map((l) => l.id === leadId ? { ...l, lastMessage: body, unreadCount: (l.unreadCount ?? 0) + 1, lastActivityAt: msg.timestamp } : l),
          nextIds: { ...s.nextIds, chatMessage: (s.nextIds.chatMessage ?? 1) + 1 },
        }));
      },
      markLeadRead: (leadId) => {
        set((s) => ({ leads: s.leads.map((l) => l.id === leadId ? { ...l, unreadCount: 0 } : l) }));
      },

      // ============ QUICK REPLIES (WhatsApp snippet library) ============
      createQuickReply: (q) => {
        const id = gId('QR', get().nextIds.quickReply ?? 1);
        const reply: QuickReply = { ...q, id };
        set((s) => ({
          quickReplies: [reply, ...(s.quickReplies || [])],
          nextIds: { ...s.nextIds, quickReply: (s.nextIds.quickReply ?? 1) + 1 },
        }));
        get().addActivity(`Quick reply created: ${q.title}`);
      },
      updateQuickReply: (id, patch) => {
        set((s) => ({ quickReplies: (s.quickReplies || []).map((q) => (q.id === id ? { ...q, ...patch } : q)) }));
      },
      deleteQuickReply: (id) => {
        set((s) => ({ quickReplies: (s.quickReplies || []).filter((q) => q.id !== id) }));
      },

      // ============ CRM FOLLOW-UP ITEMS (per-lead, status tracked) ============
      createFollowupItem: (f) => {
        const id = gId('FU', get().nextIds.followupItem ?? 1);
        const item: FollowupItem = {
          ...f,
          id,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
        };
        set((s) => ({
          followupItems: [item, ...(s.followupItems || [])],
          nextIds: { ...s.nextIds, followupItem: (s.nextIds.followupItem ?? 1) + 1 },
        }));
        get().addActivity(`Follow-up scheduled for lead ${f.leadId}`, f.leadId);
      },
      completeFollowupItem: (id) => {
        set((s) => ({
          followupItems: (s.followupItems || []).map((f) =>
            f.id === id ? { ...f, status: 'COMPLETED', completedAt: new Date().toISOString() } : f,
          ),
        }));
        get().addActivity(`Follow-up ${id} completed`);
      },
      deleteFollowupItem: (id) => {
        set((s) => ({ followupItems: (s.followupItems || []).filter((f) => f.id !== id) }));
      },

      // ============ CRM ORDERS (converted from lead/quotation) ============
      createCRMOrder: (o) => {
        const id = gId('ORD', get().nextIds.crmOrder ?? 1);
        const order: CRMOrder = { ...o, id, createdAt: new Date().toISOString() };
        set((s) => ({
          crmOrders: [order, ...(s.crmOrders || [])],
          nextIds: { ...s.nextIds, crmOrder: (s.nextIds.crmOrder ?? 1) + 1 },
        }));
        get().addActivity(`CRM order ${o.orderNumber} confirmed for ${o.customerName}`);
      },
      updateCRMOrder: (id, patch) => {
        set((s) => ({ crmOrders: (s.crmOrders || []).map((o) => (o.id === id ? { ...o, ...patch } : o)) }));
      },
      deleteCRMOrder: (id) => {
        set((s) => ({ crmOrders: (s.crmOrders || []).filter((o) => o.id !== id) }));
      },

      // ============ CRM NOTIFICATIONS (notification bell) ============
      createNotification: (n) => {
        const id = gId('NOTIF', get().nextIds.crmNotification ?? 1);
        const notif: CRMNotification = {
          ...n,
          id,
          read: false,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({
          crmNotifications: [notif, ...(s.crmNotifications || [])],
          nextIds: { ...s.nextIds, crmNotification: (s.nextIds.crmNotification ?? 1) + 1 },
        }));
      },
      markNotificationRead: (id) => {
        set((s) => ({
          crmNotifications: (s.crmNotifications || []).map((n) => (n.id === id ? { ...n, read: true } : n)),
        }));
      },
      markAllNotificationsRead: () => {
        set((s) => ({
          crmNotifications: (s.crmNotifications || []).map((n) => ({ ...n, read: true })),
        }));
      },
      deleteNotification: (id) => {
        set((s) => ({ crmNotifications: (s.crmNotifications || []).filter((n) => n.id !== id) }));
      },

      // ============ LEAD STATUS CONFIG (custom statuses — system ones cannot be deleted) ============
      createLeadStatusConfig: (cfg) => {
        const id = gId('LS', get().nextIds.leadStatusConfig ?? 1);
        const conf: LeadStatusConfig = { ...cfg, id };
        set((s) => ({
          leadStatusConfigs: [...(s.leadStatusConfigs || []), conf].sort((a, b) => a.position - b.position),
          nextIds: { ...s.nextIds, leadStatusConfig: (s.nextIds.leadStatusConfig ?? 1) + 1 },
        }));
        get().addActivity(`Lead status created: ${cfg.label}`);
      },
      updateLeadStatusConfig: (id, patch) => {
        set((s) => ({
          leadStatusConfigs: (s.leadStatusConfigs || [])
            .map((c) => (c.id === id ? { ...c, ...patch } : c))
            .sort((a, b) => a.position - b.position),
        }));
      },
      deleteLeadStatusConfig: (id) => {
        // System statuses cannot be deleted — guard here as well.
        set((s) => ({
          leadStatusConfigs: (s.leadStatusConfigs || []).filter((c) => c.id !== id || c.isSystem),
        }));
      },

      // ============ CRM CAMPAIGNS (Meta Ads / marketing campaign tracking) ============
      createCRMCampaign: (c) => {
        const id = gId('CMP', get().nextIds.crmCampaign ?? 1);
        const camp: CRMCampaign = { ...c, id, createdAt: new Date().toISOString() };
        set((s) => ({
          crmCampaigns: [camp, ...(s.crmCampaigns || [])],
          nextIds: { ...s.nextIds, crmCampaign: (s.nextIds.crmCampaign ?? 1) + 1 },
        }));
        get().addActivity(`CRM campaign created: ${c.campaignName}`);
      },
      deleteCRMCampaign: (id) => {
        set((s) => ({ crmCampaigns: (s.crmCampaigns || []).filter((c) => c.id !== id) }));
      },

      // ============ AUTH — credential-based login ============
      loginWithCredentials: (userId, password) => {
        const member = get().team.find(
          (m) => m.active && m.userId && m.userId.toLowerCase() === userId.trim().toLowerCase() && m.password === password,
        );
        if (!member) return false;
        const role: Role = (member.loginRole || member.dept) as Role;
        get().login({ name: member.name, email: member.email, role });
        return true;
      },

      // Auth by email + password (for local mode when Firebase not configured)
      loginWithEmail: (email, password) => {
        const member = get().team.find(
          (m) => m.active && m.email.toLowerCase() === email.trim().toLowerCase() && m.password === password,
        );
        if (!member) return false;
        const role: Role = (member.loginRole || member.dept) as Role;
        get().login({ name: member.name, email: member.email, role });
        return true;
      },

      // ============ RECYCLE BIN ============
      restoreFromBin: (recycleId) => {
        const entry = get().recycleBin.find((e) => e.recycleId === recycleId);
        if (!entry) return;
        const s = entry.snapshot;
        set((state) => {
          const update: Partial<ERPState> = {
            recycleBin: state.recycleBin.filter((e) => e.recycleId !== recycleId),
          };
          switch (entry.type) {
            case 'project':
              update.projects = [s as Project, ...state.projects];
              break;
            case 'lead':
              update.leads = [s as Lead, ...state.leads];
              break;
            case 'quotation':
              update.quotations = [s as Quotation, ...state.quotations];
              break;
            case 'item':
              update.items = [s as Item, ...state.items];
              break;
            case 'payment':
              update.payments = [s as Payment, ...state.payments];
              break;
            case 'expense':
              update.expenses = [s as Expense, ...state.expenses];
              break;
            case 'team':
              update.team = [...state.team, s as TeamMember];
              break;
          }
          return update;
        });
        get().addActivity(`Restored ${entry.type} ${entry.originalId} from Recycle Bin`);
      },

      permanentlyDelete: (recycleId) =>
        set((s) => ({ recycleBin: s.recycleBin.filter((e) => e.recycleId !== recycleId) })),

      emptyBin: () => set({ recycleBin: [] }),

      // ============ Permissions (Owner-controlled per-role page access) ============
      setRolePermissions: (role, pages) => set((s) => ({
        permissions: { ...(s.permissions || {}), [role]: pages } as any,
      } as any)),

      togglePermission: (role, page) => set((s) => {
        const current = s.permissions?.[role] ?? ROLE_PAGES[role] ?? [];
        const has = current.includes(page);
        const next = has ? current.filter((p) => p !== page) : [...current, page];
        return { permissions: { ...(s.permissions || {}), [role]: next } } as any;
      }),

      resetPermissions: () => set({ permissions: undefined } as any),

      // ============ Company Profile (editable site-wide) ============
      updateCompanyProfile: (patch) => set((s) => ({
        companyProfile: { ...(s.companyProfile || DEFAULT_COMPANY_PROFILE), ...patch },
      } as any)),
      resetCompanyProfile: () => set({ companyProfile: { ...DEFAULT_COMPANY_PROFILE } } as any),

      resetDemo: () => set({ ...buildSeedState() }),

      importData: (data) => {
        // Merge imported data, keeping currentUser intact
        const current = get().currentUser;
        set({
          ...buildSeedState(),
          ...data,
          currentUser: current,
        } as any);
        get().addActivity('Data imported from backup');
      },

      createGSTInvoice: (data) => {
        const id = gId('INV', (get() as any).nextIds?.gstInv || 1);
        const inv: GSTInvoice = { ...data, id, createdAt: today() };
        set((s) => ({ gstInvoices: [inv, ...(s.gstInvoices || [])] } as any));
        get().addActivity(`GST Invoice ${id} created`);
      },
      updateGSTInvoice: (id, patch) => {
        set((s) => ({ gstInvoices: (s.gstInvoices || []).map((inv: any) => (inv.id === id ? { ...inv, ...patch } : inv)) } as any));
      },
      deleteGSTInvoice: (id) => {
        set((s) => ({ gstInvoices: (s.gstInvoices || []).filter((x: any) => x.id !== id) } as any));
      },
      updateGSTSettings: (patch) => {
        set((s) => {
          const base = s.gstSettings || ({} as any);
          // Deep-merge nested objects so partial patches (e.g. just invoiceTypes) don't wipe siblings.
          const merged: any = { ...base, ...patch };
          const nestedKeys = ['invoiceTypes', 'posRules', 'itc', 'rcm', 'eInvoice', 'ewayBill', 'returns'];
          for (const k of nestedKeys) {
            if (patch[k as keyof typeof patch]) {
              merged[k] = { ...(base[k] || {}), ...(patch[k as keyof typeof patch] as object) };
            }
          }
          return { gstSettings: merged } as any;
        });
      },
    }),
    {
      name: 'karyam-erp-v2-fresh',
      // Use Firestore storage adapter (falls back to localStorage when Firebase not configured)
      storage: createJSONStorage(() => firestoreStorage as any),
      partialize: (s) => {
        const { currentUser, ...stateWithoutSession } = s as ERPState & ERPActions;
        return stateWithoutSession as ERPState & ERPActions;
      },
      skipHydration: false,
    },
  ),
);

/** Compute the effective allowed pages for a role: owner-defined permissions override the defaults. */
export function getEffectivePages(role: Role): string[] {
  const custom = useERP.getState().permissions?.[role];
  if (custom && Array.isArray(custom)) return custom;
  return ROLE_PAGES[role] || [];
}

// ============ Real-time sync setup ============
// When a remote update arrives from Firestore, merge it into the local store
onRemoteUpdate((remoteState) => {
  // Only update if we're not the one who wrote it
  if (isApplyingRemoteUpdate()) {
    const current = useERP.getState();
    // Merge remote state (keep currentUser local — it's not persisted)
    useERP.setState({
      ...remoteState,
      currentUser: current.currentUser,
    } as any, false);
  }
});

// Export helpers for the auth flow to call
export { setCurrentUserUid, startRealtimeSync, stopRealtimeSync };

// Avoid unused import warning — Rs is used inside activity strings
function Rs(n: number) {
  return '\u20B9' + Number(n || 0).toLocaleString('en-IN');
}
