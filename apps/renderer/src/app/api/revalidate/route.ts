import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { decideRevalidate } from '../../../lib/revalidate';

/**
 * Rebuild hook called by the API worker after a publish
 * (docs/design/10-architecture.md 10.4). Protected by a shared secret.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = await request.json().catch(() => null);
  const decision = decideRevalidate({
    secret: process.env.REVALIDATE_SECRET,
    provided: request.headers.get('x-lumio-revalidate-secret'),
    body,
  });

  if (!decision.ok) {
    const status = decision.reason === 'forbidden' ? 403 : 400;
    return NextResponse.json({ error: decision.reason }, { status });
  }

  for (const path of decision.paths) {
    revalidatePath(path);
  }
  // The per-host data cache is tagged, so one publish clears only that site
  // (docs/design/10-architecture.md 10.4).
  if (decision.host) revalidateTag(`site:${decision.host}`);

  return NextResponse.json({
    data: { revalidated: decision.paths, host: decision.host ?? null },
  });
}
