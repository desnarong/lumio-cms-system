import { describe, expect, it } from 'vitest';
import { createDemoCommerceApi } from './demo.js';

describe('demo commerce api', () => {
  it('lists seeded products and filters by status', async () => {
    const api = createDemoCommerceApi();
    const all = await api.listProducts();
    expect(all.items).toHaveLength(3);

    await api.archiveProduct(all.items[0]!.id);
    const archived = await api.listProducts({ limit: 100, status: 'archived' });
    expect(archived.items).toHaveLength(1);
  });

  it('creates and edits a product', async () => {
    const api = createDemoCommerceApi();
    const created = await api.createProduct({
      title: 'ถ้วยกาแฟใหม่',
      slug: 'new-mug',
      description: '',
      price: 19_000,
      compareAtPrice: null,
      images: [],
      specs: [],
      stock: 5,
      weightGrams: 0,
      options: [],
      variants: [],
      category: null,
      status: 'draft',
    });
    expect(created.status).toBe('draft');

    const updated = await api.updateProduct(created.id, { status: 'active' });
    expect(updated.status).toBe('active');
  });

  it('moves an order forward and stamps the payment date', async () => {
    const api = createDemoCommerceApi();
    const orders = await api.listOrders();
    const pending = orders.items.find((item) => item.status === 'pending');
    expect(pending).toBeDefined();

    const paid = await api.updateOrderStatus(pending!.id, { status: 'paid' });
    expect(paid.status).toBe('paid');
    expect(paid.paidAt).not.toBeNull();
  });

  it('merges partial settings over the current ones', async () => {
    const api = createDemoCommerceApi();
    const updated = await api.updateSettings({ shippingFee: 8_000 });
    expect(updated.shippingFee).toBe(8_000);
    expect(updated.promptPayId).toBe('0812345678');
  });

  it('keeps bank credentials write-only', async () => {
    const api = createDemoCommerceApi();
    await expect(api.getBankConnection()).resolves.toMatchObject({ connected: false });

    const updated = await api.updateBankSettings({
      clientId: 'client-id',
      clientSecret: 'super-secret',
      webhookSecret: 'webhook-secret',
      accountNumber: '1234567890',
    });

    expect(updated.connected).toBe(true);
    expect(updated.hasClientSecret).toBe(true);
    expect(updated.hasWebhookSecret).toBe(true);
    expect(updated.accountNumber).toBe('123xxxx890');
    expect(JSON.stringify(updated)).not.toContain('super-secret');
    await expect(api.testBankConnection()).resolves.toMatchObject({
      lastCheckedAt: expect.any(String),
    });
  });
});
