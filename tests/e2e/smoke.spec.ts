import { test, expect } from '@playwright/test';

/**
 * E2E smoke test — verifies the renderer boots and shows the DAW shell.
 *
 * This test runs against `pnpm dev:renderer` (a browser-rendered Vite dev server).
 * At M1+ we'll add a full Electron-based E2E via @playwright/test + _electron.launch.
 */

test.describe('Composer 共鸣 smoke', () => {
  test('renders the top bar and app body', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await expect(page.locator('.topbar-brand')).toHaveText(/Composer/);
    await expect(page.locator('.pane-tracks')).toBeVisible();
    await expect(page.locator('.pane-center')).toBeVisible();
    await expect(page.locator('.pane-right')).toBeVisible();
    await expect(page.locator('.agent-panel')).toBeVisible();
  });
});
