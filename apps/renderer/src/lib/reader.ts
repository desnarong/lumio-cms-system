import { cookies } from 'next/headers';
import type {
  MembershipCheckout,
  PublicMembershipPlan,
  ReaderLoginInput,
  ReaderRegisterInput,
  ReaderSession,
  ReaderSessionResponse,
} from '@lumio/shared';
import { getPublicApi } from './content';

/** Cookie that carries the reader session; httpOnly so scripts cannot read it. */
export const READER_COOKIE = 'lumio_reader';
export const READER_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

export interface ReaderCookie {
  name: string;
  value: string;
  maxAge: number;
  path: string;
  httpOnly: boolean;
  sameSite: 'lax';
}

export const readerCookie = (token: string): ReaderCookie => ({
  name: READER_COOKIE,
  value: token,
  maxAge: READER_COOKIE_MAX_AGE,
  path: '/',
  httpOnly: true,
  sameSite: 'lax',
});

export const clearedReaderCookie = (): ReaderCookie => ({
  ...readerCookie(''),
  maxAge: 0,
});

/** Token of the signed-in reader, or null for a visitor. */
export const readReaderToken = async (): Promise<string | null> => {
  const value = (await cookies()).get(READER_COOKIE)?.value;
  return value && value.length > 0 ? value : null;
};

export const loadMembershipPlans = (host: string): Promise<PublicMembershipPlan[]> =>
  getPublicApi().listMembershipPlans(host);

/** The reader's own profile; a stale cookie is treated as signed out. */
export const loadReaderSession = async (
  host: string,
  token: string | null,
): Promise<ReaderSession | null> => {
  if (!token) return null;
  try {
    return await getPublicApi().readerProfile(host, token);
  } catch {
    return null;
  }
};

export const registerReader = (
  host: string,
  input: ReaderRegisterInput,
): Promise<ReaderSessionResponse> => getPublicApi().registerReader(host, input);

export const loginReader = (
  host: string,
  input: ReaderLoginInput,
): Promise<ReaderSessionResponse> => getPublicApi().loginReader(host, input);

export const startReaderCheckout = (
  host: string,
  token: string,
  planId: string,
): Promise<MembershipCheckout | null> => getPublicApi().readerCheckout(host, token, planId);

export const forgotReaderPassword = (host: string, email: string): Promise<void> =>
  getPublicApi().forgotReaderPassword(host, email);

export const resetReaderPassword = (host: string, token: string, password: string): Promise<void> =>
  getPublicApi().resetReaderPassword(host, token, password);

export const verifyReaderEmail = (host: string, token: string): Promise<ReaderSession> =>
  getPublicApi().verifyReaderEmail(host, token);
