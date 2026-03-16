import { test, expect } from '@playwright/test';

test.describe('Matches Page', () => {
  test('should display the matches heading', async ({ page }) => {
    await page.goto('/matches');
    await expect(page.locator('h1')).toContainText('Matches');
  });

  test('should have active and completed filter buttons', async ({ page }) => {
    await page.goto('/matches');
    await expect(page.getByRole('tab', { name: /Active/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Completed/ })).toBeVisible();
  });

  test('should switch between active and completed filters', async ({ page }) => {
    await page.goto('/matches');
    await page.getByRole('tab', { name: /Completed/ }).click();
    await page.getByRole('tab', { name: /Active/ }).click();
  });
});

test.describe('Create Match Page', () => {
  test('should display create match heading', async ({ page }) => {
    await page.goto('/create');
    await expect(page.locator('h1')).toContainText('Create Match');
  });

  test('should show connect wallet prompt when not connected', async ({ page }) => {
    await page.goto('/create');
    await expect(page.locator('text=Connect your wallet')).toBeVisible();
  });
});

test.describe('Profile Page', () => {
  test('should display profile page content', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.locator('text=Connect your wallet')).toBeVisible();
  });

  test('should show connect wallet prompt when not connected', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.locator('text=Connect your wallet to view your profile')).toBeVisible();
  });
});
