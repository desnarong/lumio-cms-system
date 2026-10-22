import { NextResponse } from 'next/server';
import { MAX_SLIP_BYTES, parseBaht } from '@lumio/shared';
import { requestHost } from '../../../../lib/request-host';
import { requestLocale } from '../../../../lib/request-locale';
import { submitSlip } from '../../../../lib/shop';

const MIME_BY_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Turns the buyer's file upload into the data URL the API expects. The API
 * sniffs the bytes again, so a renamed file cannot pretend to be an image.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await context.params;
  const orderPath = `/order/${encodeURIComponent(token)}`;
  const fail = (reason: string): Response =>
    NextResponse.redirect(new URL(`${orderPath}?slip=${reason}`, request.url), 303);

  const form = await request.formData().catch(() => null);
  if (!form) return fail('error');

  const amount = parseBaht(String(form.get('amount') ?? ''));
  const reference = String(form.get('reference') ?? '').trim();
  const file = form.get('slip');
  if (amount === null || reference === '' || !(file instanceof File)) return fail('error');
  if (file.size === 0 || file.size > MAX_SLIP_BYTES) return fail('too-large');
  if (!MIME_BY_EXTENSION[file.type]) return fail('type');

  const base64 = Buffer.from(await file.arrayBuffer()).toString('base64');
  try {
    const host = await requestHost();
    const locale = await requestLocale();
    const result = await submitSlip(
      host,
      token,
      { amount, reference, image: `data:${file.type};base64,${base64}` },
      locale,
    );
    return NextResponse.redirect(
      new URL(`${orderPath}?slip=${result.autoVerified ? 'verified' : 'review'}`, request.url),
      303,
    );
  } catch {
    return fail('error');
  }
}
