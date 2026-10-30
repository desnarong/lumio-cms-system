import { NextResponse } from 'next/server';
import { clearedReaderCookie } from '../../../lib/reader';

/** Forgets the reader session on this device. */
export async function POST(request: Request): Promise<Response> {
  const response = NextResponse.redirect(new URL('/membership', request.url), 303);
  response.cookies.set(clearedReaderCookie());
  return response;
}
