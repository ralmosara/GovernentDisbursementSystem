import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Visual regression and accessibility checks for the design system.
 *
 * - Screenshots are compared against committed baselines. Create or refresh them with
 *   `npx playwright test design-system --project=chromium --update-snapshots`.
 * - Accessibility uses axe-core and fails on serious or critical violations.
 * - Signed-in pages need E2E_USERNAME and E2E_PASSWORD; without them those tests skip.
 *
 * Runs on the chromium project only: baselines are browser-specific and one engine is
 * enough to catch design regressions.
 */

const USERNAME = process.env.E2E_USERNAME;
const PASSWORD = process.env.E2E_PASSWORD;

// Content that changes from run to run (dates, live figures, tables of records), plus
// Astro's dev toolbar, which animates in when tests run against `astro dev`
const VOLATILE = ['[data-volatile]', 'main table', 'main .tabular-nums', '.nav-badge', 'astro-dev-toolbar'];

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Design-system checks run on chromium only');
});

async function setTheme(page: Page, theme: 'light' | 'dark') {
  await page.addInitScript(value => {
    try {
      localStorage.setItem('fms.theme', value);
    } catch {
      // ignore
    }
  }, theme);
}

async function signIn(page: Page) {
  await page.goto('/login');
  await page.fill('#username', USERNAME!);
  await page.fill('#password', PASSWORD!);
  await page.click('#login-button');
  await expect(page).toHaveURL(/\/dashboard/);
}

async function expectNoSeriousA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
  // Name the first few offending elements and why, so a failure is actionable
  const describe = (node: (typeof serious)[number]['nodes'][number]) =>
    `${node.target.join(' ')} (${(node.failureSummary ?? '').split('\n')[1]?.trim() ?? ''})`;
  expect(
    serious.map(v => `${v.id}: ${v.help} — ${v.nodes.slice(0, 3).map(describe).join(' | ')}`),
    'serious or critical accessibility violations'
  ).toEqual([]);
}

test.describe('Login', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`looks right in ${theme} theme`, async ({ page }) => {
      await setTheme(page, theme);
      await page.goto('/login');
      await expect(page).toHaveScreenshot(`login-${theme}.png`, {
        fullPage: true,
        mask: [page.locator('footer'), page.locator('astro-dev-toolbar')],
      });
    });

    test(`has no serious accessibility issues in ${theme} theme`, async ({ page }) => {
      await setTheme(page, theme);
      await page.goto('/login');
      await expectNoSeriousA11yViolations(page);
    });
  }

  test('fits a phone screen without sideways scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
    await expect(page).toHaveScreenshot('login-mobile.png', {
      fullPage: true,
      mask: [page.locator('footer'), page.locator('astro-dev-toolbar')],
    });
  });
});

test.describe('Signed-in pages', () => {
  test.skip(!USERNAME || !PASSWORD, 'Set E2E_USERNAME and E2E_PASSWORD to run signed-in checks');

  const pages = [
    { name: 'home', path: '/dashboard' },
    { name: 'approvals', path: '/approvals' },
    { name: 'vouchers', path: '/disbursements' },
    { name: 'voucher-create', path: '/disbursements/create' },
    { name: 'obligations', path: '/budget/obligations' },
    { name: 'insights', path: '/reports/insights' },
  ];

  for (const { name, path } of pages) {
    test(`${name}: layout and accessibility`, async ({ page }) => {
      await signIn(page);
      await page.goto(path);
      await expectNoSeriousA11yViolations(page);
      await expect(page).toHaveScreenshot(`${name}.png`, {
        mask: VOLATILE.map(selector => page.locator(selector)),
        maxDiffPixelRatio: 0.01,
      });
    });
  }

  test('home has no sideways scrolling on a phone', async ({ page }) => {
    await signIn(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/dashboard');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });

  test('search jumps to a page from the keyboard', async ({ page }) => {
    await signIn(page);
    // Retry until the page script has attached the shortcut (it loads after first paint)
    const dialog = page.getByRole('dialog', { name: 'Search pages and actions' });
    await expect(async () => {
      await page.keyboard.press('Control+k');
      await expect(dialog).toBeVisible({ timeout: 500 });
    }).toPass();
    await page.keyboard.type('reconciliation');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/cash\/reconciliations/);
  });

  test('recently visited pages appear first in search', async ({ page }) => {
    await signIn(page);
    await page.goto('/budget/obligations');
    await page.goto('/dashboard');
    await expect(async () => {
      await page.keyboard.press('Control+k');
      await expect(page.locator('#search-dialog')).toBeVisible({ timeout: 500 });
    }).toPass();
    const firstGroup = page.locator('#search-results [role="presentation"]').first();
    await expect(firstGroup).toHaveText('Recent');
    await expect(page.locator('#search-results [role="option"]').first()).toContainText(/obligations/i);
  });

  test('theme choice persists across pages', async ({ page }) => {
    await signIn(page);
    await page.getByRole('button', { name: /^Account:/ }).click();
    await page.getByRole('menuitemradio', { name: 'Dark' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.goto('/disbursements');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expectNoSeriousA11yViolations(page);
  });

  test('voucher list sorts by column', async ({ page }) => {
    await signIn(page);
    await page.goto('/disbursements?fiscalYear=all');
    const amountHeader = page.getByRole('columnheader', { name: /Amount/ });
    test.skip((await page.locator('main table tbody tr').count()) < 2, 'Needs at least two vouchers');
    await amountHeader.getByRole('button').click();
    await expect(amountHeader).toHaveAttribute('aria-sort', 'ascending');
  });
});
