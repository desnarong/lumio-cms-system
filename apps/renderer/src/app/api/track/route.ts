import { NextResponse } from 'next/server';
import { pageviewInputSchema } from '@lumio/shared';
import { collectPageview } from '../../../lib/content';
import { requestHost } from '../../../lib/request-host';

/**
 * Same-origin landing point for the page-view beacon (docs/design/05-admin-ia.md
 * "เติบโต › Analytics"). The visitor's browser posts here, and the handler
 * forwards to the API server-side, so the public page never talks to the API
 * cross-origin and no CORS or CSP relaxation is needed.
 */
export async function POST(request: Request): Promise<Response> {
  const host = await requestHost();
  const body = await request.json().catch(() => null);
  const parsed = pageviewInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  await collectPageview(host, parsed.data);
  return NextResponse.json({ ok: true });
}
