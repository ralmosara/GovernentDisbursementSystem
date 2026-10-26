import { test, expect, type Page } from '@playwright/test';

/**
 * Fill a voucher's required fields; the ORS/BURS number is any obligation reference. The payee
 * is made unique so earlier runs do not trigger the possible-duplicate warning.
 */
async function fillVoucher(page: Page, dv: { payeeName: string; particulars: string; amount: string }) {
  const run = Date.now();
  await page.fill('input[name="orsBursNo"]', `ORS-E2E-${run}`);
  await page.fill('input[name="payeeName"]', `${dv.payeeName} ${run}`);
  await page.fill('textarea[name="particulars"]', dv.particulars);
  await page.fill('input[name="amount"]', dv.amount);
  await page.selectOption('select[name="fundClusterId"]', { index: 1 });
  await page.selectOption('select[name="objectExpenditureId"]', { index: 1 });
  await page.selectOption('select[name="paymentMode"]', 'ada');
}

async function login(page: Page, username: string) {
  await page.goto('/login');
  await page.fill('input[name="username"]', username);
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/dashboard/);
}

/** Approve the DV's current stage from its page */
async function approve(page: Page, dvId: string, comments: string) {
  // Wait for the page script that opens the dialog, then for the dialog itself
  await page.goto(`/disbursements/${dvId}`, { waitUntil: 'networkidle' });
  await page.click('[data-open="approve-dialog"]');
  await expect(page.locator('#approve-dialog')).toBeVisible();
  await page.fill('#approve-comments', comments);
  await page.click('#approve-submit');
  await page.waitForLoadState('networkidle');
}

test.describe('Disbursement Voucher Creation', () => {
  test.beforeEach(async ({ page }) => {
    // Login as staff user who can create DVs
    await page.goto('/login');
    await page.fill('input[name="username"]', 'staff');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should navigate to DV creation page', async ({ page }) => {
    // Navigate to disbursements
    await page.locator('summary:has-text("Disbursements")').click();
    await page.getByRole('link', { name: 'Disbursement vouchers' }).click();

    // Click create new DV button
    await page.click('a:has-text("New voucher"), a:has-text("Create a voucher")');

    // Should be on create page
    await expect(page).toHaveURL(/\/disbursements\/create/);

    // Check for form elements
    await expect(page.locator('input[name="payeeName"]')).toBeVisible();
    await expect(page.locator('textarea[name="particulars"]')).toBeVisible();
    await expect(page.locator('input[name="amount"]')).toBeVisible();
  });

  test('should create a new disbursement voucher successfully', async ({ page }) => {
    await page.goto('/disbursements/create');

    await fillVoucher(page, { payeeName: 'Test Supplier Inc.', particulars: 'Purchase of office supplies for Q1 2024', amount: '50000' });
    await page.fill('input[name="payeeAddress"]', '123 Test Street, Manila');
    await page.fill('input[name="payeeTin"]', '123-456-789-000');
    await page.fill('input[name="responsibilityCenter"]', 'Administrative Services');

    await page.click('#submit-btn');

    // Opens the new DV, numbered serial-month-year
    await page.waitForURL(/\/disbursements\/\d+/);
    await expect(page.getByText(/\d{4}-\d{2}-\d{4}/).first()).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/disbursements/create');

    // Try to submit empty form
    await page.click('button[type="submit"]');

    // Check for validation errors
    const payeeNameInput = page.locator('input[name="payeeName"]');
    const isRequired = await payeeNameInput.evaluate((el: HTMLInputElement) => el.required);
    expect(isRequired).toBe(true);
  });

  test('should validate amount is numeric and positive', async ({ page }) => {
    await page.goto('/disbursements/create');

    // Try invalid amount
    await page.fill('input[name="amount"]', '-100');

    // Check validation
    const amountInput = page.locator('input[name="amount"]');
    const min = await amountInput.getAttribute('min');
    expect(min).toBe('0.01');

    // A number input, so the browser accepts no text
    expect(await amountInput.getAttribute('type')).toBe('number');
  });

  test('should upload supporting documents', async ({ page }) => {
    await page.goto('/disbursements/create');

    // Fill in minimal required fields
    await page.fill('input[name="payeeName"]', 'Test Supplier');
    await page.fill('textarea[name="particulars"]', 'Test purchase');
    await page.fill('input[name="amount"]', '10000');

    // Upload a file (if file upload component exists)
    const fileInput = page.locator('input[type="file"]');

    if (await fileInput.count() > 0) {
      await fileInput.setInputFiles({
        name: 'invoice.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('PDF content'),
      });

      // Check file appears in list
      await expect(page.locator('text=/invoice.pdf/i')).toBeVisible();
    }
  });

  test('should save as draft', async ({ page }) => {
    await page.goto('/disbursements/create');

    // Fill in some fields
    await page.fill('input[name="payeeName"]', 'Draft Supplier');
    await page.fill('textarea[name="particulars"]', 'Draft DV');
    await page.fill('input[name="amount"]', '5000');

    // Click save as draft button (if exists)
    const draftButton = page.locator('button:has-text("Draft"), button:has-text("Save Draft")');

    if (await draftButton.count() > 0) {
      await draftButton.click();

      // Should save and show success
      await expect(page.locator('text=/Saved|Draft/i')).toBeVisible();
    }
  });

  test('should calculate total amount automatically', async ({ page }) => {
    await page.goto('/disbursements/create');

    // If there's an itemized entry system
    const addItemButton = page.locator('button:has-text("Add Item")');

    if (await addItemButton.count() > 0) {
      // Add first item
      await page.fill('input[name="items[0].description"]', 'Item 1');
      await page.fill('input[name="items[0].amount"]', '10000');

      // Add second item
      await addItemButton.click();
      await page.fill('input[name="items[1].description"]', 'Item 2');
      await page.fill('input[name="items[1].amount"]', '15000');

      // Check total is calculated
      const totalField = page.locator('input[name="amount"]');
      await expect(totalField).toHaveValue('25000');
    }
  });
});

test.describe('DV Approval Workflow E2E', () => {
  test('should complete full approval workflow', async ({ browser }) => {
    // Create 4 contexts for different users
    const staffContext = await browser.newContext();
    const budgetContext = await browser.newContext();
    const accountantContext = await browser.newContext();
    const directorContext = await browser.newContext();

    const staffPage = await staffContext.newPage();
    const budgetPage = await budgetContext.newPage();
    const accountantPage = await accountantContext.newPage();
    const directorPage = await directorContext.newPage();

    const divisionContext = await browser.newContext();
    const divisionPage = await divisionContext.newPage();
    try {
      // Staff prepares the DV
      await login(staffPage, 'staff');
      await staffPage.goto('/disbursements/create');
      await fillVoucher(staffPage, { payeeName: 'E2E Test Supplier', particulars: 'E2E Test Purchase', amount: '25000' });
      await staffPage.click('#submit-btn');
      await staffPage.waitForURL(/\/disbursements\/\d+/);
      const dvId = staffPage.url().match(/\/disbursements\/(\d+)/)![1];

      // Division head, budget officer, accountant and director approve in turn (the preparer
      // cannot approve their own voucher when segregation of duties is enforced)
      await login(divisionPage, 'division_head');
      await approve(divisionPage, dvId, 'Division approved');
      await login(budgetPage, 'budget_officer');
      await approve(budgetPage, dvId, 'Budget approved');
      await login(accountantPage, 'accountant');
      await approve(accountantPage, dvId, 'Accounting verified');
      await login(directorPage, 'director');
      await approve(directorPage, dvId, 'Final approval');

      await directorPage.goto(`/disbursements/${dvId}`);
      await expect(directorPage.getByText(/Approved/).first()).toBeVisible();
    } finally {
      await staffContext.close();
      await divisionContext.close();
      await budgetContext.close();
      await accountantContext.close();
      await directorContext.close();
    }
  });
});

test.describe('DV Listing and Search', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'staff');
  });

  test('should display list of disbursement vouchers', async ({ page }) => {
    await page.goto('/disbursements');

    // A table of vouchers, or the empty state when there are none yet
    await expect(page.locator('table, .empty-state').first()).toBeVisible();
  });

  test('should filter DVs by status', async ({ page }) => {
    await page.goto('/disbursements');

    // Select filter
    await page.selectOption('select[name="status"]', 'pending_budget');

    // Click filter button
    await page.click('button:has-text("Filter"), button[type="submit"]');

    // Check filtered results
    await expect(page).toHaveURL(/status=pending_budget/);
  });

  test('should search DVs by payee name', async ({ page }) => {
    await page.goto('/disbursements');

    // Enter search term
    await page.fill('input[name="search"], input[placeholder*="Search"]', 'Test Supplier');

    // Submit search
    await page.press('input[name="search"], input[placeholder*="Search"]', 'Enter');

    // The search is applied as a filter
    await expect(page).toHaveURL(/search=Test\+Supplier/);
  });
});
