import { NextResponse } from 'next/server';
import { FORM_HONEYPOT_FIELD } from '@lumio/shared';
import { submitForm } from '../../../lib/content';
import { formReturnPath } from '../../../lib/form-return';
import { requestHost } from '../../../lib/request-host';

export interface FormSubmitRouteProps {
  params: Promise<{ formId: string }>;
}

const redirectTo = (request: Request, target: string): Response =>
  NextResponse.redirect(new URL(target, request.url), 303);

/**
 * Receives a public form post and forwards it to the API (docs/design/12-api.md
 * 12.9). The block renders a plain HTML form, so this handler is what makes the
 * form work without shipping any JavaScript to the visitor. It always answers
 * with a 303 back to the page plus `#sent-<id>` or `#error-<id>`, which CSS
 * `:target` turns into the thank-you or error notice.
 */
export async function POST(request: Request, { params }: FormSubmitRouteProps): Promise<Response> {
  const { formId } = await params;
  const host = await requestHost();
  const back = formReturnPath(request.headers.get('referer'), host);

  const formData = await request.formData().catch(() => null);
  if (!formData) return redirectTo(request, `${back}#error-${formId}`);

  const data: Record<string, string> = {};
  let honeypot = '';
  for (const [key, value] of formData.entries()) {
    if (typeof value !== 'string') continue;
    if (key === FORM_HONEYPOT_FIELD) honeypot = value;
    else data[key] = value;
  }

  try {
    await submitForm(host, formId, { data, honeypot });
    return redirectTo(request, `${back}#sent-${formId}`);
  } catch {
    return redirectTo(request, `${back}#error-${formId}`);
  }
}
