import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test.describe('back office', () => {
  test('the owner signs in and lands on the dashboard', async ({ page }) => {
    await signIn(page);

    await expect(page.locator('.shell-nav')).toBeVisible();
    await expect(page.locator('.shell-topbar__site')).toContainText('กาแฟบ้านดอย');
  });

  test('settings › add-ons closes a capability and says so', async ({ page }) => {
    await signIn(page);
    await page.getByRole('link', { name: 'ทั่วไป' }).click();
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

  test('the owner refunds a paid order in one flow', async ({ page }) => {
    await signIn(page);
    await page.getByRole('link', { name: 'คำสั่งซื้อ' }).click();

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
