import { expect, type Page } from '@playwright/test';

export const DEMO_EMAIL = 'owner@example.com';
export const DEMO_PASSWORD = 'lumio-demo-1234';

/** Signs in to the demo back office and waits until the dashboard is on screen. */
export const signIn = async (page: Page): Promise<void> => {
  await page.goto('/login');
  await page.getByLabel('อีเมล').fill(DEMO_EMAIL);
  await page.getByLabel('รหัสผ่าน').fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
};
