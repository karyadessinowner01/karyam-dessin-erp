import { FieldValue } from 'firebase-admin/firestore';
import { buildSeedState } from '@/lib/erp/constants';
import type { ChatMessage, CRMNotification, ERPState, Lead } from '@/lib/erp/types';
import { getAdminDb } from './firebase-admin';

const ERP_COLLECTION = 'erp-data';
const ERP_DOCUMENT_ID = 'karyam-dessin-blank-20260915';
const STATE_VERSION = 0;

interface PersistedERPState {
  state?: Partial<ERPState>;
  version?: number;
}

interface IncomingWhatsAppMessage {
  from: string;
  name?: string;
  body: string;
  messageType: ChatMessage['messageType'];
  messageId?: string;
  timestamp: string;
}

function gId(prefix: string, n: number): string {
  return `${prefix}-${String(n).padStart(4, '0')}`;
}

function isoFromUnixSeconds(value: string | number | undefined): string {
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds > 0) {
    return new Date(seconds * 1000).toISOString();
  }
  return new Date().toISOString();
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function phoneDigits(value: string): string {
  return String(value || '').replace(/\D/g, '');
}

function normalizePhone(value: string): string {
  let digits = phoneDigits(value);
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 10) digits = `91${digits}`;
  return digits ? `+${digits}` : '';
}

function buildInitialState(): ERPState {
  return buildSeedState();
}

async function readState(): Promise<ERPState> {
  const db = getAdminDb();
  if (!db) throw new Error('Firebase Admin is not configured');

  const snap = await db.collection(ERP_COLLECTION).doc(ERP_DOCUMENT_ID).get();
  const raw = snap.data()?.state;
  if (typeof raw !== 'string') return buildInitialState();

  try {
    const parsed = JSON.parse(raw) as PersistedERPState;
    return {
      ...buildInitialState(),
      ...(parsed.state || {}),
    };
  } catch {
    return buildInitialState();
  }
}

async function writeState(state: ERPState) {
  const db = getAdminDb();
  if (!db) throw new Error('Firebase Admin is not configured');

  await db.collection(ERP_COLLECTION).doc(ERP_DOCUMENT_ID).set(
    {
      state: JSON.stringify({ state, version: STATE_VERSION }),
      uid: 'whatsapp-cloud-api',
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

function extractMessages(payload: unknown): IncomingWhatsAppMessage[] {
  const output: IncomingWhatsAppMessage[] = [];
  const entries = (payload as { entry?: unknown[] })?.entry || [];

  for (const entry of entries) {
    const changes = (entry as { changes?: unknown[] })?.changes || [];
    for (const change of changes) {
      const value = (change as { value?: Record<string, unknown> })?.value;
      if (!value) continue;

      const contacts = Array.isArray(value.contacts) ? value.contacts : [];
      const contactNames = new Map<string, string>();
      for (const contact of contacts) {
        const c = contact as { wa_id?: string; profile?: { name?: string } };
        if (c.wa_id && c.profile?.name) contactNames.set(c.wa_id, c.profile.name);
      }

      const messages = Array.isArray(value.messages) ? value.messages : [];
      for (const message of messages) {
        const m = message as {
          from?: string;
          id?: string;
          timestamp?: string;
          type?: string;
          text?: { body?: string };
          image?: { caption?: string };
          document?: { caption?: string; filename?: string };
          audio?: unknown;
        };
        if (!m.from) continue;

        const type = m.type || 'text';
        const messageType: ChatMessage['messageType'] =
          type === 'image' || type === 'audio' || type === 'document' ? type : 'text';
        const body =
          m.text?.body ||
          m.image?.caption ||
          m.document?.caption ||
          m.document?.filename ||
          `[${type} message received]`;

        output.push({
          from: normalizePhone(m.from),
          name: contactNames.get(m.from),
          body,
          messageType,
          messageId: m.id,
          timestamp: isoFromUnixSeconds(m.timestamp),
        });
      }
    }
  }

  return output;
}

function findLead(leads: Lead[], phone: string) {
  const incomingDigits = phoneDigits(phone);
  return leads.find((lead) => phoneDigits(lead.phone).endsWith(incomingDigits.slice(-10)));
}

function upsertLeadForMessage(state: ERPState, incoming: IncomingWhatsAppMessage) {
  const existing = findLead(state.leads || [], incoming.from);
  if (existing) return existing;

  const nextLeadId = state.nextIds?.lead ?? 1;
  const name = incoming.name || incoming.from || 'WhatsApp Lead';
  const lead: Lead = {
    id: gId('L', nextLeadId),
    client: name,
    contact: name,
    phone: incoming.from,
    email: '',
    source: 'WhatsApp',
    requirement: incoming.body,
    status: 'New',
    followup: today(),
    notes: `Auto-created from WhatsApp Cloud API${incoming.messageId ? ` (${incoming.messageId})` : ''}.`,
    createdAt: today(),
    category: 'Other',
    priority: 'Warm',
    expectedOrderValue: 0,
    leadScore: 50,
    leadStage: 'New',
    winProbability: 20,
    lastMessage: incoming.body,
    unreadCount: 1,
    lastActivityAt: incoming.timestamp,
  };

  state.leads = [lead, ...(state.leads || [])];
  state.nextIds = { ...(state.nextIds || {}), lead: nextLeadId + 1 };
  return lead;
}

export async function mergeWhatsAppWebhookIntoERP(payload: unknown) {
  const messages = extractMessages(payload);
  if (messages.length === 0) return { saved: false, received: 0 };

  const state = await readState();
  state.nextIds = { ...(state.nextIds || {}) };
  state.leads = [...(state.leads || [])];
  state.chatMessages = [...(state.chatMessages || [])];
  state.crmNotifications = [...(state.crmNotifications || [])];
  state.activities = [...(state.activities || [])];

  for (const incoming of messages) {
    if (incoming.messageId && state.chatMessages.some((msg) => msg.id === incoming.messageId)) {
      continue;
    }

    const lead = upsertLeadForMessage(state, incoming);
    const chatId = gId('CHAT', state.nextIds.chatMessage ?? 1);
    const notificationId = gId('NOTIF', state.nextIds.crmNotification ?? 1);
    const chat: ChatMessage = {
      id: incoming.messageId || chatId,
      leadId: lead.id,
      direction: 'IN',
      messageType: incoming.messageType,
      body: incoming.body,
      status: 'delivered',
      timestamp: incoming.timestamp,
    };
    state.chatMessages = [chat, ...state.chatMessages];
    state.nextIds.chatMessage = (state.nextIds.chatMessage ?? 1) + 1;

    state.leads = state.leads.map((item) =>
      item.id === lead.id
        ? {
            ...item,
            lastMessage: incoming.body,
            unreadCount: (item.unreadCount ?? 0) + 1,
            lastActivityAt: incoming.timestamp,
          }
        : item,
    );

    const notification: CRMNotification = {
      id: notificationId,
      type: 'CUSTOMER_REPLIED',
      title: 'Customer replied on WhatsApp',
      description: `${lead.client}: "${incoming.body.slice(0, 120)}"`,
      leadId: lead.id,
      read: false,
      createdAt: incoming.timestamp,
    };
    state.crmNotifications = [notification, ...state.crmNotifications];
    state.nextIds.crmNotification = (state.nextIds.crmNotification ?? 1) + 1;

    state.activities = [
      {
        time: new Date(incoming.timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
        activity: `WhatsApp message received from ${lead.client}`,
        user: 'WhatsApp',
        project: lead.id,
      },
      ...state.activities,
    ];
  }

  await writeState(state);
  return { saved: true, received: messages.length };
}
