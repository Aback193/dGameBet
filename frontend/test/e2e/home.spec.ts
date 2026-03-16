import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should display the hero section', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Decentralized');
    await expect(page.locator('h1')).toContainText('Football Betting');
  });

  test('should have navigation links', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('a[href="/matches"]').first()).toBeVisible();
    await expect(page.locator('a[href="/create"]').first()).toBeVisible();
  });

  test('should display how it works section', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=How It Works')).toBeVisible();
    await expect(page.locator('h3:has-text("Connect Wallet")')).toBeVisible();
    await expect(page.locator('h3:has-text("Choose a Match")')).toBeVisible();
    await expect(page.locator('h3:has-text("Place Your Bet")')).toBeVisible();
    await expect(page.locator('h3:has-text("Claim Winnings")')).toBeVisible();
  });

  test('should display stats section', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Total Matches')).toBeVisible();
    await expect(page.locator('text=Organizer Fee')).toBeVisible();
    await expect(page.locator('text=To Winners')).toBeVisible();
  });

  test('should navigate to matches page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('nav a[href="/matches"]').click();
    await expect(page).toHaveURL('/matches', { timeout: 10000 });
  });

  test('should navigate to create page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('nav a[href="/create"]').click();
    await expect(page).toHaveURL('/create', { timeout: 10000 });
  });
});
