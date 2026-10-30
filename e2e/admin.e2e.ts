import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test.describe('back office', () => {
  test('the owner signs in and lands on the dashboard', async ({ page }) => {
    await signIn(page);

    await expect(page.locator('.shell-nav')).toBeVisible();
    await expect(page.locator('.shell-brand__site-name')).toContainText('กาแฟบ้านดอย');
    // The sidebar is flat: nine doors, and the tabs of a screen stay inside it.
    await expect(page.getByRole('link', { name: 'ตั้งค่า' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'ทีมงาน & สิทธิ์' })).toHaveCount(0);
  });

  test('settings › add-ons closes a capability and says so', async ({ page }) => {
    await signIn(page);
    await page.getByRole('link', { name: 'ตั้งค่า' }).click();
    await page.getByRole('tab', { name: 'ส่วนเสริม' }).click();

    await expect(page.getByText('ส่วนที่เปิดให้ใช้บนเว็บนี้')).toBeVisible();

    const commerce = page
      .locator('.ui-switch')
      .filter({ hasText: 'ร้านค้า' })
      .getByRole('switch');
    await expect(commerce).toHaveAttribute('aria-checked', 'true');

    await commerce.click();
    await expect(page.getByText('ปิด “ร้านค้า” แล้ว')).toBeVisible();
    await expect(commerce).toHaveAttribute('aria-checked', 'false');
  });

  test('the owner confirms a booking from the agenda', async ({ page }) => {
    await signIn(page);
    await page.getByRole('link', { name: 'เติบโต' }).click();
    await page.getByRole('tab', { name: 'การจองคิว' }).click();

    await expect(page.getByText('บริการที่เปิดให้จอง')).toBeVisible();
    await expect(page.getByText('ตรวจทั่วไป').first()).toBeVisible();

    const row = page.locator('.settings-row').filter({ hasText: 'สมชาย ใจดี' });
    await row.getByRole('button', { name: 'ยืนยันแล้ว' }).click();

    await expect(page.getByText('ยืนยันนัดแล้ว')).toBeVisible();
    await expect(row.getByText('ยืนยันแล้ว')).toBeVisible();
  });

  test('the owner refunds a paid order in one flow', async ({ page }) => {
    await signIn(page);
    await page.getByRole('link', { name: 'ร้านค้า' }).click();
    await page.getByRole('tab', { name: 'คำสั่งซื้อ' }).click();

    await page.getByRole('button', { name: /LM-261020-CD34/ }).click();
    await page.getByRole('button', { name: 'คืนเงินลูกค้า' }).click();

    await expect(page.getByText('คืนเงินคำสั่งซื้อนี้')).toBeVisible();
    const refundDialog = page.getByRole('dialog', { name: 'คืนเงินคำสั่งซื้อนี้' });
    await refundDialog.getByRole('textbox').nth(1).fill('สินค้าหมด');
    await page.getByRole('button', { name: 'ยืนยันคืนเงิน' }).click();

    const orderDialog = page.getByRole('dialog', { name: 'คำสั่งซื้อ LM-261020-CD34' });
    await expect(orderDialog.getByText('คืนเงินแล้ว 400.00 บาท')).toBeVisible();
    await expect(orderDialog.getByText(/สินค้าหมด/)).toBeVisible();
  });
});
