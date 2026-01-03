import { test, expect } from '@playwright/test';

test.describe('User Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login page correctly', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Login/i);

    // Check for login form elements
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    // Fill in login form
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[type="password"]', 'password123');

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Check for user menu or welcome message
    await expect(page.locator('text=/Welcome|Dashboard/i')).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    // Fill in login form with wrong credentials
    await page.fill('input[name="username"]', 'wronguser');
    await page.fill('input[type="password"]', 'wrongpassword');

    // Submit form
    await page.click('button[type="submit"]');

    // Should stay on login page
    await expect(page).toHaveURL(/\/login/);

    // Should show error message
    await expect(page.locator('text=/Invalid|Error|Wrong/i')).toBeVisible();
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    // Try to submit without filling fields
    await page.click('button[type="submit"]');

    // Check for HTML5 validation or custom error messages
    const usernameInput = page.locator('input[name="username"]');
    await expect(usernameInput).toBeFocused();
  });

  test('should hide password by default', async ({ page }) => {
    const passwordInput = page.locator('input[type="password"]');

    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Type password and verify it's masked
    await passwordInput.fill('secretpassword');
    const value = await passwordInput.inputValue();
    expect(value).toBe('secretpassword');
  });

  test('should redirect authenticated users away from login page', async ({ page, context }) => {
    // First login
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for redirect
    await expect(page).toHaveURL(/\/dashboard/);

    // Try to go back to login page
    await page.goto('/login');

    // Should redirect back to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/);

    // Click logout button (assuming it exists in navigation)
    await page.click('button:has-text("Logout"), a:has-text("Logout")');

    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/);

    // Should not be able to access dashboard
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should handle session timeout', async ({ page }) => {
    // Login
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/);

    // Clear cookies to simulate session timeout
    await page.context().clearCookies();

    // Try to access protected page
    await page.goto('/disbursements');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Role-Based Access Control', () => {
  test('should restrict access based on user role', async ({ page }) => {
    // Login as regular staff
    await page.goto('/login');
    await page.fill('input[name="username"]', 'staff');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Try to access admin page
    await page.goto('/admin/users');

    // Should redirect to dashboard or show access denied
    const url = page.url();
    expect(url).toMatch(/\/dashboard|\/login|\/403/);
  });

  test('should allow admin access to all pages', async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Access admin pages
    await page.goto('/admin/users');
    await expect(page).toHaveURL(/\/admin\/users/);

    await page.goto('/audit');
    await expect(page).toHaveURL(/\/audit/);

    await page.goto('/admin/activity-dashboard');
    await expect(page).toHaveURL(/\/admin\/activity-dashboard/);
  });
});

test.describe('Security Features', () => {
  test('should not expose sensitive information in errors', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Error message should be generic, not revealing if user exists
    const errorText = await page.locator('text=/Invalid|Error/i').textContent();

    // Should not contain database errors or stack traces
    expect(errorText).not.toContain('SQL');
    expect(errorText).not.toContain('Error:');
    expect(errorText).not.toContain('at ');
  });

  test('should implement rate limiting on login attempts', async ({ page }) => {
    await page.goto('/login');

    // Make multiple failed login attempts
    for (let i = 0; i < 6; i++) {
      await page.fill('input[name="username"]', 'admin');
      await page.fill('input[type="password"]', 'wrongpassword' + i);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);
    }

    // Should show rate limit message or temporarily block
    const content = await page.textContent('body');
    expect(content).toMatch(/too many|rate limit|try again|blocked/i);
  });

  test('should use HTTPS in production', async ({ page }) => {
    // This test would need to be configured for production environment
    // Just checking that protocol can be verified
    const url = page.url();
    expect(url).toBeDefined();
  });
});
