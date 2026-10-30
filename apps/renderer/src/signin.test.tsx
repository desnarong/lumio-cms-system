import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SIGN_IN_NOTICES, SignInPanel } from './components/SignInPanel';

const saved = [
  { number: 'LM-261022-AB12CD', token: 'token-1', createdAt: '2026-10-22T03:00:00.000Z' },
];

describe('SignInPanel', () => {
  it('asks for an order number and a contact on a first visit', () => {
    const html = renderToStaticMarkup(<SignInPanel saved={[]} />);

    expect(html).toContain('เข้าสู่ระบบด้วยคำสั่งซื้อ');
    expect(html).toContain('name="number"');
    expect(html).toContain('name="contact"');
    expect(html).toContain('action="/signin/lookup"');
    expect(html).not.toContain('คำสั่งซื้อที่เปิดไว้บนเครื่องนี้');
  });

  it('lists the orders this device already opened', () => {
    const html = renderToStaticMarkup(<SignInPanel saved={saved} />);

    expect(html).toContain('LM-261022-AB12CD');
    expect(html).toContain('href="/order/token-1"');
    expect(html).toContain('22/10/2026');
    expect(html).toContain('action="/signin/signout"');
    expect(html).toContain('ออกจากระบบ');
  });

  it('keeps the lookup form available while signed in', () => {
    const html = renderToStaticMarkup(<SignInPanel saved={saved} />);
    expect(html).toContain('action="/signin/lookup"');
  });

  it('explains what went wrong without leaking whether an order exists', () => {
    const html = renderToStaticMarkup(<SignInPanel saved={[]} error="not-found" />);

    expect(html).toContain(SIGN_IN_NOTICES['not-found'] ?? '');
    expect(html).toContain('role="alert"');
  });

  it('falls back to the not-found message for an unknown code', () => {
    const html = renderToStaticMarkup(<SignInPanel saved={[]} error="weird" />);
    expect(html).toContain(SIGN_IN_NOTICES['not-found'] ?? '');
  });

  it('has exactly one primary action', () => {
    const html = renderToStaticMarkup(<SignInPanel saved={saved} />);
    expect(html.match(/shop-button shop-button--large/g) ?? []).toHaveLength(1);
  });
});
