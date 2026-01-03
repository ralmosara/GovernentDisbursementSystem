import { test, expect } from '@playwright/test';

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
    await page.click('a:has-text("Disbursement")');

    // Click create new DV button
    await page.click('a:has-text("Create"), a:has-text("New DV")');

    // Should be on create page
    await expect(page).toHaveURL(/\/disbursements\/create/);

    // Check for form elements
    await expect(page.locator('input[name="payeeName"]')).toBeVisible();
    await expect(page.locator('textarea[name="particulars"]')).toBeVisible();
    await expect(page.locator('input[name="amount"]')).toBeVisible();
  });

  test('should create a new disbursement voucher successfully', async ({ page }) => {
    await page.goto('/disbursements/create');

    // Fill in payee information
    await page.fill('input[name="payeeName"]', 'Test Supplier Inc.');
    await page.fill('input[name="payeeAddress"]', '123 Test Street, Manila');
    await page.fill('input[name="payeeTIN"]', '123-456-789-000');

    // Fill in DV details
    await page.fill('textarea[name="particulars"]', 'Purchase of office supplies for Q1 2024');
    await page.fill('input[name="amount"]', '50000');

    // Select fund cluster
    await page.selectOption('select[name="fundClusterId"]', { index: 1 });

    // Select object of expenditure
    await page.selectOption('select[name="objectOfExpenditureId"]', { index: 1 });

    // Fill in responsibility center
    await page.fill('input[name="responsibilityCenter"]', 'Administrative Services');

    // Fill in MFO/PAP code
    await page.fill('input[name="mfoPapCode"]', 'MFO-001');

    // Check certification boxes
    await page.check('input[name="certificationA"]');
    await page.check('input[name="certificationB"]');
    await page.check('input[name="certificationC"]');
    await page.check('input[name="certificationD"]');
    await page.check('input[name="certificationE"]');

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to DV detail page or list
    await page.waitForURL(/\/disbursements\/\d+/);

    // Should show success message
    await expect(page.locator('text=/Created|Success/i')).toBeVisible({ timeout: 5000 });

    // Verify DV number was generated
    await expect(page.locator('text=/DV-|\\d{4}-\\d{2}-\\d{4}/i')).toBeVisible();
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

    // Try non-numeric
    await amountInput.fill('abc');
    const value = await amountInput.inputValue();
    expect(value).not.toBe('abc'); // Should be filtered or empty
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

    try {
      // Step 1: Staff creates DV
      await staffPage.goto('/login');
      await staffPage.fill('input[name="username"]', 'staff');
      await staffPage.fill('input[type="password"]', 'password123');
      await staffPage.click('button[type="submit"]');

      await staffPage.goto('/disbursements/create');
      await staffPage.fill('input[name="payeeName"]', 'E2E Test Supplier');
      await staffPage.fill('textarea[name="particulars"]', 'E2E Test Purchase');
      await staffPage.fill('input[name="amount"]', '25000');
      await staffPage.selectOption('select[name="fundClusterId"]', { index: 1 });
      await staffPage.selectOption('select[name="objectOfExpenditureId"]', { index: 1 });
      await staffPage.check('input[name="certificationA"]');
      await staffPage.check('input[name="certificationB"]');
      await staffPage.check('input[name="certificationC"]');
      await staffPage.check('input[name="certificationD"]');
      await staffPage.check('input[name="certificationE"]');
      await staffPage.click('button[type="submit"]');

      await staffPage.waitForURL(/\/disbursements\/\d+/);
      const dvUrl = staffPage.url();
      const dvId = dvUrl.match(/\/disbursements\/(\d+)/)?.[1];

      // Step 2: Budget Officer approves
      await budgetPage.goto('/login');
      await budgetPage.fill('input[name="username"]', 'budget_officer');
      await budgetPage.fill('input[type="password"]', 'password123');
      await budgetPage.click('button[type="submit"]');

      await budgetPage.goto(`/disbursements/${dvId}`);
      await budgetPage.click('button:has-text("Approve")');
      await budgetPage.fill('textarea[name="comments"]', 'Budget approved');
      await budgetPage.click('button:has-text("Confirm")');

      await expect(budgetPage.locator('text=/Approved/i')).toBeVisible();

      // Step 3: Accountant approves
      await accountantPage.goto('/login');
      await accountantPage.fill('input[name="username"]', 'accountant');
      await accountantPage.fill('input[type="password"]', 'password123');
      await accountantPage.click('button[type="submit"]');

      await accountantPage.goto(`/disbursements/${dvId}`);
      await accountantPage.click('button:has-text("Approve")');
      await accountantPage.fill('textarea[name="comments"]', 'Accounting verified');
      await accountantPage.click('button:has-text("Confirm")');

      // Step 4: Director final approval
      await directorPage.goto('/login');
      await directorPage.fill('input[name="username"]', 'director');
      await directorPage.fill('input[type="password"]', 'password123');
      await directorPage.click('button[type="submit"]');

      await directorPage.goto(`/disbursements/${dvId}`);
      await directorPage.click('button:has-text("Approve")');
      await directorPage.fill('textarea[name="comments"]', 'Final approval');
      await directorPage.click('button:has-text("Confirm")');

      // Verify final status
      await expect(directorPage.locator('text=/Fully Approved|Approved/i')).toBeVisible();

    } finally {
      await staffContext.close();
      await budgetContext.close();
      await accountantContext.close();
      await directorContext.close();
    }
  });
});

test.describe('DV Listing and Search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', 'staff');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
  });

  test('should display list of disbursement vouchers', async ({ page }) => {
    await page.goto('/disbursements');

    // Should show table or list of DVs
    await expect(page.locator('table, .dv-list')).toBeVisible();
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

    // Results should be filtered
    await expect(page.locator('text=/Test Supplier/i')).toBeVisible();
  });
});
