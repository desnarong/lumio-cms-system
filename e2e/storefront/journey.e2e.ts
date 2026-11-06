import { expect, test, type Page } from '@playwright/test';

/**
 * A new customer's first ten minutes against the real stack: an account,
 * the setup wizard, a published site, an edit, and the public page a visitor
 * sees. Each run makes its own account and subdomain, so it never touches the
 * demo shop the checkout specs use, and it checks the new site shows only its
 * own content (a tenant leak once served the demo shop's home page here).
 */
const API = process.env.E2E_API_URL ?? 'http://localhost:49100/api/v1';
// localhost, not 127.0.0.1: the admin's API is http://localhost:49100, and the
// SameSite=Lax refresh cookie only travels when both are the same site.
const ADMIN = process.env.E2E_ADMIN_URL ?? 'http://localhost:49300';
const ROOT_DOMAIN = process.env.E2E_ROOT_DOMAIN ?? 'example.com';
const CADDY_PORT = process.env.CADDY_HTTP_PORT ?? '49700';
/** Text only the seeded demo site's live home page has (the template shares the rest). */
const DEMO_SITE_TEXT = /B-Lighting/;

const run = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
const subdomain = `e2e-${run}`;
const email = `e2e-${run}@example.com`;
// Test-only credential for a throwaway account on the local stack.
const password = `e2e-pass-${run}`;
const siteName = `คาเฟ่ทดสอบ ${run}`;
const publicUrl = (path: string): string =>
  `http://${subdomain}.${ROOT_DOMAIN}:${CADDY_PORT}${path}`;

const register = async (): Promise<void> => {
  const response = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, name: 'อีทูอี เจ้าของใหม่' }),
  });
  expect(response.status, await response.clone().text()).toBe(201);
};

const signIn = async (page: Page): Promise<void> => {
  await page.goto(`${ADMIN}/login`);
  await page.getByLabel('อีเมล').fill(email);
  await page.getByLabel('รหัสผ่าน').fill(password);
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
};

const createSiteWithWizard = async (page: Page): Promise<void> => {
  // A brand-new account has no site, so it lands on the wizard.
  await expect(page).toHaveURL(/\/wizard/);
  await page.getByText('ร้านอาหาร / คาเฟ่').click();
  await page.getByRole('button', { name: 'ถัดไป' }).click();

  await page.getByLabel('ชื่อเว็บ').fill(siteName);
  await page.getByLabel('ที่อยู่เว็บ').fill(subdomain);
  await page.getByRole('button', { name: 'ถัดไป' }).click();
  // Style and colour keep the suggestions for the chosen business.
  await page.getByRole('button', { name: 'ถัดไป' }).click();
  await page.getByRole('button', { name: 'ถัดไป' }).click();

  await page.getByRole('button', { name: 'สร้างเว็บให้เลย!' }).click();
  await expect(page.getByText(`เว็บ ${siteName} พร้อมใช้งาน`)).toBeVisible({ timeout: 30_000 });
};

test.describe.configure({ mode: 'serial' });

test('a new owner signs up, builds a site, edits it, and visitors see it', async ({
  page,
  context,
}) => {
  await register();
  await signIn(page);
  await createSiteWithWizard(page);

  // The wizard publishes every page; the visitor sees this site and no other.
  const visitor = await context.newPage();
  await visitor.goto(publicUrl('/'));
  await expect(visitor).toHaveTitle(new RegExp(siteName));
  await expect(visitor.locator('body')).not.toContainText(DEMO_SITE_TEXT);
  await visitor.goto(publicUrl('/menu'));
  await expect(visitor).toHaveTitle(new RegExp(`เมนูร้าน — ${siteName}`));

  // The owner changes the home page and publishes it again.
  await page.getByRole('button', { name: 'เริ่มแก้ไขหน้าแรก' }).click();
  await expect(page).toHaveURL(/\/editor\//);
  const headline = `ยินดีต้อนรับสู่ ${run}`;
  await editFirstHeading(page, headline);
  await page.getByRole('button', { name: 'เผยแพร่', exact: true }).click();
  await expect(page.getByText('ผู้เข้าชมเห็นหน้านี้แล้ว')).toBeVisible({ timeout: 30_000 });

  // Publishing revalidates the page, so the next visit shows the new text.
  await expect
    .poll(
      async () => {
        await visitor.goto(publicUrl('/'));
        return visitor.locator('body').innerText();
      },
      { timeout: 30_000 },
    )
    .toContain(headline);
});

/** Types over the first heading on the canvas, the way an owner edits in place. */
async function editFirstHeading(page: Page, text: string): Promise<void> {
  const heading = page.locator('[data-editable-path="props.heading"]').first();
  // The first click selects the section, the second puts the caret in the text.
  await heading.click();
  await heading.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type(text);
  await page.locator('.editor-inspector__title').click();
  await expect(heading).toHaveText(text);
}
