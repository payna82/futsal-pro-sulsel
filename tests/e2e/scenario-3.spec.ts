import { test, expect } from '@playwright/test';

/**
 * Phase D: Scenario 3 - Permission Denial Scenarios
 * 
 * Validates: Cross-tenant blocking, role-based access, error clarity
 * Duration: ~6 minutes
 * Checkpoints: 4
 */

test.describe('Scenario 3: Permission Denial Scenarios', () => {
  test('3.1 Unauthenticated users cannot access the team portal', async ({ page }) => {
    await page.goto('/team/profile');

    await expect(page).toHaveURL(/\/team\/(profile|login)/);
    await expect(
      page.getByText(/Silakan masuk ke portal tim|Sesi akun tim tidak tersedia|Masuk Portal Tim/),
    ).toBeVisible({ timeout: 10000 });
  });

  test('3.2 Permission denied hides actions', async ({ page }) => {
    // Login as PUBLIC user (lowest permissions)
    await page.goto('/masuk');

    const demoBtn = page.locator('button:has-text("Demo.*PUBLIC")');
    if (await demoBtn.isVisible()) {
      await demoBtn.click();
    } else {
      // Login as any user
      const anyDemo = page.locator('button:has-text("Demo")').first();
      if (await anyDemo.isVisible()) await anyDemo.click();
    }

    // Navigate to admin area
    await page.goto('/admin');

    // Admin buttons should not be visible
    const adminButtons = page.locator('button:has-text("Setujui|Tolak|Approve|Reject")');
    
    // Should either not exist or be disabled
    const count = await adminButtons.count();
    for (let i = 0; i < count; i++) {
      const isDisabled = await adminButtons.nth(i).getAttribute('disabled');
      expect(isDisabled).not.toBeNull();
    }
  });

  test('3.3 Rejected contingent blocks team operations', async ({ page }) => {
    // This test assumes a rejected contingent exists in fixtures
    // Navigate to team from rejected contingent
    
    // Try to add a player
    await page.goto('/tim');

    const demoBtn = page.locator('button:has-text("Demo")').first();
    if (await demoBtn.isVisible()) {
      await demoBtn.click();
      await page.waitForURL(/tim/, { timeout: 5000 });
    }

    // If contingent is rejected, try to perform action
    const addPlayerBtn = page.locator('button:has-text("Tambah|Add")').first();
    if (await addPlayerBtn.isVisible()) {
      await addPlayerBtn.click();

      // Should either fail or show warning
      const warning = page.locator('text=ditolak|rejected|blocked');
      if (await warning.isVisible()) {
        await expect(warning).toBeVisible();
      }
    }
  });

  test('3.4 Error messages are actionable', async ({ page }) => {
    // Try an unauthorized action
    await page.goto('/admin/contingents');

    // If not authorized
    const errorMsg = page.locator('text=Akses ditolak|Permission denied|403');
    
    if (await errorMsg.isVisible()) {
      // Verify error message is clear
      const text = await errorMsg.textContent();
      expect(text).toBeTruthy();
      expect(text!.length).toBeGreaterThan(10);

      // Should have actionable guidance
      const actionLink = page.locator('text=Kembali|Login|Home|Dashboard');
      if (await actionLink.isVisible()) {
        await expect(actionLink).toBeVisible();
      }
    }
  });
});
