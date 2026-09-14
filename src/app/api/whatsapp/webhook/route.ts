import { NextRequest, NextResponse } from 'next/server';
import { mergeWhatsAppWebhookIntoERP } from '@/lib/server/erp-cloud-state';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  const params = request.nextUrl.searchParams;
  const mode = params.get('hub.mode');
  const verifyToken = params.get('hub.verify_token');
  const challenge = params.get('hub.challenge');

  if (mode === 'subscribe' && token && verifyToken === token && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ ok: false, error: 'webhook_verification_failed' }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  if (!payload) {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  try {
    const result = await mergeWhatsAppWebhookIntoERP(payload);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('[WhatsApp webhook] Failed to persist incoming message', error);
    return NextResponse.json(
      { ok: false, error: 'webhook_received_but_not_saved' },
      { status: 500 },
    );
  }
}
