import { expect, test, type Page } from '@playwright/test';
import { signInAsOwner, type PaymentFlags, type ShopOwner } from './shop-api';

/** Every order these specs place carries this name, so cleanup can find them. */
const BUYER = 'อีทูอี ผู้ซื้อทดสอบ';

let owner: ShopOwner;
let original: PaymentFlags;

test.beforeAll(async () => {
  owner = await signInAsOwner();
  original = await owner.payments();
  await owner.setPayments({ promptpay: true, cod: true, card: true, bbl: original.bbl });
});

test.afterAll(async () => {
  for (const order of await owner.orders()) {
    if (order.customerName === BUYER && order.status === 'pending') await owner.cancel(order.id);
  }
  await owner.setPayments(original);
});

/** Puts the first product that needs no size/colour choice into the cart. */
const addAnyProductAndOpenCheckout = async (page: Page): Promise<void> => {
  await page.goto('/shop');
  const total = await page.locator('a.shop-card__link').count();
  expect(total, 'the demo shop lists products').toBeGreaterThan(0);

  for (let index = 0; index < total; index += 1) {
    await page.goto('/shop');
    await page.locator('a.shop-card__link').nth(index).click();
    if ((await page.locator('#product-variant').count()) > 0) continue;
    await page.getByRole('button', { name: 'ซื้อเลย' }).click();
    await expect(page).toHaveURL(/\/checkout/);
    return;
  }
  throw new Error('no product without options in the demo shop');
};

const fillBuyer = async (page: Page): Promise<void> => {
  await page.locator('input[name="name"]').fill(BUYER);
  await page.locator('input[name="phone"]').fill('0800000000');
  await page.locator('input[name="address"]').fill('1 ถนนทดสอบ');
  await page.locator('input[name="province"]').fill('เชียงใหม่');
  await page.locator('input[name="postcode"]').fill('50200');
};

test.describe('storefront checkout', () => {
  test('cash on delivery ends on a pending order page', async ({ page }) => {
    await addAnyProductAndOpenCheckout(page);
    await fillBuyer(page);
    await page.getByLabel(/เก็บเงินปลายทาง/).check();
    await page.getByRole('button', { name: /^สั่งซื้อ/ }).click();

    await expect(page).toHaveURL(/\/order\/[\w-]+/);
    await expect(page.getByRole('heading', { level: 1, name: /คำสั่งซื้อ LM-/ })).toBeVisible();
    await expect(page.getByText('รอชำระเงิน').first()).toBeVisible();
  });

  test('PromptPay shows the QR and the amount to pay', async ({ page }) => {
    await addAnyProductAndOpenCheckout(page);
    await fillBuyer(page);
    await page.getByLabel(/พร้อมเพย์/).check();
    await page.getByRole('button', { name: /^สั่งซื้อ/ }).click();

    await expect(page.getByRole('heading', { name: 'ชำระเงินด้วยพร้อมเพย์' })).toBeVisible();
    await expect(page.locator('.shop-payment__qr svg')).toBeVisible();
    await expect(page.getByText(/ยอดที่ต้องชำระ/)).toBeVisible();
  });

  test('card payment hands the buyer over to Stripe Checkout', async ({ page }) => {
    await addAnyProductAndOpenCheckout(page);
    await fillBuyer(page);
    await page.getByLabel(/บัตรเครดิต/).check();
    await page.getByRole('button', { name: /^สั่งซื้อ/ }).click();

    // The browser must be allowed to follow the redirect off-site (the page's
    // form-action policy once blocked it); a test-mode session id proves the
    // order reached Stripe and not a live account.
    await page.waitForURL(/^https:\/\/checkout\.stripe\.com\/c\/pay\/cs_test_/, {
      timeout: 30_000,
      waitUntil: 'commit',
    });
  });

  test('an incomplete form is sent back to checkout, not to an order', async ({ page }) => {
    await addAnyProductAndOpenCheckout(page);
    await page.locator('input[name="name"]').fill(BUYER);
    // Bypass the browser's own required-field checks to exercise the server.
    await page.locator('form.shop-checkout').evaluate((form) => {
      (form as HTMLFormElement).noValidate = true;
      for (const input of form.querySelectorAll('[required]')) input.removeAttribute('required');
    });
    await page.getByRole('button', { name: /^สั่งซื้อ/ }).click();

    await expect(page).toHaveURL(/\/checkout\?error=1/);
  });
});
