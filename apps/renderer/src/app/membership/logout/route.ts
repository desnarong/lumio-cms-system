import { NextResponse } from 'next/server';
import { clearedReaderCookie } from '../../../lib/reader';
import { publicUrl } from '../../../lib/public-url';

/** Forgets the reader session on this device. */
export async function POST(request: Request): Promise<Response> {
  const response = NextResponse.redirect(publicUrl('/membership', request), 303);
  response.cookies.set(clearedReaderCookie());
  return response;
}
