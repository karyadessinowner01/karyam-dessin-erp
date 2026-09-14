import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/server/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function normalizeRecipient(value: string) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 10) digits = `91${digits}`;
  return digits;
}

async function requireFirebaseUser(request: NextRequest) {
  const header = request.headers.get('authorization') || '';
  const [, token] = header.match(/^Bearer\s+(.+)$/i) || [];
  if (!token) return null;

  try {
    return await verifyFirebaseIdToken(token);
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const user = await requireFirebaseUser(request);
  if (!user) {
    return NextResponse.json(
      { ok: false, configured: false, error: 'firebase_admin_or_user_auth_missing' },
      { status: 401 },
    );
  }

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const apiVersion = process.env.WHATSAPP_API_VERSION || 'v24.0';

  if (!accessToken || !phoneNumberId) {
    return NextResponse.json(
      { ok: false, configured: false, error: 'whatsapp_cloud_api_not_configured' },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const to = normalizeRecipient(body?.toPhone);
  const text = String(body?.body || '').trim();

  if (!to || !text) {
    return NextResponse.json(
      { ok: false, configured: true, error: 'recipient_and_message_required' },
      { status: 400 },
    );
  }

  const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: {
        preview_url: false,
        body: text,
      },
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    return NextResponse.json(
      { ok: false, configured: true, error: 'meta_whatsapp_send_failed', details: result },
      { status: response.status },
    );
  }

  return NextResponse.json({ ok: true, configured: true, result });
}
