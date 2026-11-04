import { DEMO_EMAIL, DEMO_PASSWORD } from '../helpers';

/** Seeded demo shop; the owner is the same account the back-office tests use. */
const API = process.env.E2E_API_URL ?? 'http://127.0.0.1:49100/api/v1';
const SITE_ID = process.env.E2E_SITE_ID ?? '00000000-0000-4000-8000-0000000000a1';

export interface PaymentFlags {
  promptpay: boolean;
  cod: boolean;
  card: boolean;
  bbl: boolean;
}

interface OrderRow {
  id: string;
  number: string;
  status: string;
  customerName: string;
}

export interface ShopOwner {
  payments: () => Promise<PaymentFlags>;
  setPayments: (flags: PaymentFlags) => Promise<void>;
  orders: () => Promise<OrderRow[]>;
  cancel: (orderId: string) => Promise<void>;
}

const unwrap = async <T>(response: Response): Promise<T> => {
  if (!response.ok) throw new Error(`${response.url} answered ${response.status}`);
  return ((await response.json()) as { data: T }).data;
};

/** Signs in as the shop owner so a spec can prepare and clean up its own data. */
export const signInAsOwner = async (): Promise<ShopOwner> => {
  const login = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
  });
  const { accessToken } = await unwrap<{ accessToken: string }>(login);
  const headers = {
    authorization: `Bearer ${accessToken}`,
    'x-site-id': SITE_ID,
    'content-type': 'application/json',
  };

  return {
    payments: async () =>
      (
        await unwrap<{ payments: PaymentFlags }>(
          await fetch(`${API}/commerce/settings`, { headers }),
        )
      ).payments,
    setPayments: async (payments) => {
      await unwrap(
        await fetch(`${API}/commerce/settings`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ payments }),
        }),
      );
    },
    orders: async () => unwrap<OrderRow[]>(await fetch(`${API}/orders?pageSize=50`, { headers })),
    cancel: async (orderId) => {
      await unwrap(
        await fetch(`${API}/orders/${orderId}/status`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ status: 'cancelled' }),
        }),
      );
    },
  };
};
