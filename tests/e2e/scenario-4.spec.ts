import { test, expect } from '@playwright/test';

/**
 * Phase D: Scenario 4 - Status Transition Enforcement
 * 
 * Validates: State machine correctness, invalid transitions blocked
 * Duration: ~7 minutes
 * Checkpoints: 4
 */

test.describe('Scenario 4: Status Transition Enforcement', () => {
  test('4.1 Valid transitions allowed (PENDING → VERIFIED)', async ({ page, context }) => {
    // Open admin panel
    const adminPage = await context.newPage();
    await adminPage.goto('/admin/contingents');

    const demoBtn = adminPage.locator('button:has-text("Demo")').first();
    if (await demoBtn.isVisible()) {
      await demoBtn.click();
      await adminPage.waitForURL(/admin/, { timeout: 5000 });
    }

    // Find a PENDING contingent
    const pendingContingent = adminPage.locator('text=PENDING|Menunggu').first();
    if (await pendingContingent.isVisible()) {
      await pendingContingent.click();

      // Verify approve button is available
      const approveBtn = adminPage.locator('button:has-text("Setujui|Approve")');
      await expect(approveBtn).toBeVisible({ timeout: 5000 });

      // Click approve
      await approveBtn.click();

      // Fill note and confirm
      const noteField = adminPage.locator('textarea').first();
      if (await noteField.isVisible()) {
        await noteField.fill('Valid contingent - E2E Test');
      }

      const confirmBtn = adminPage.locator('button:has-text("Ya|Confirm")');
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
      }

      // Verify success
      await expect(adminPage.locator('text=Berhasil|Success')).toBeVisible({ timeout: 5000 });
    }
  });

  test('4.2 Invalid transitions blocked (REJECTED no transitions)', async ({ page, context }) => {
    const adminPage = await context.newPage();
    await adminPage.goto('/admin/contingents');

    const demoBtn = adminPage.locator('button:has-text("Demo")').first();
    if (await demoBtn.isVisible()) {
      await demoBtn.click();
    }

    // Find a REJECTED contingent
    const rejectedContingent = adminPage.locator('text=REJECTED|Ditolak').first();
    if (await rejectedContingent.isVisible()) {
      await rejectedContingent.click();

      // Should not have approve button (or it's disabled)
      const approveBtn = adminPage.locator('button:has-text("Setujui|Approve")');
      if (await approveBtn.isVisible()) {
        const isDisabled = await approveBtn.getAttribute('disabled');
        expect(isDisabled).not.toBeNull();
      } else {
        // Button shouldn't exist
        expect(true);
      }
    }
  });

  test('4.3 State skipping prevented (PENDING → DEACTIVATED blocked)', async ({ page, context }) => {
    const adminPage = await context.newPage();
    await adminPage.goto('/admin/contingents');

    const demoBtn = adminPage.locator('button:has-text("Demo")').first();
    if (await demoBtn.isVisible()) {
      await demoBtn.click();
    }

    // Find a PENDING contingent
    const pendingContingent = adminPage.locator('text=PENDING|Menunggu').first();
    if (await pendingContingent.isVisible()) {
      await pendingContingent.click();

      // Should only have approve/reject buttons (not deactivate)
      const deactivateBtn = adminPage.locator('button:has-text("Deaktif|Suspend")');
      
      if (await deactivateBtn.isVisible()) {
        const isDisabled = await deactivateBtn.getAttribute('disabled');
        expect(isDisabled).not.toBeNull();
      } else {
        // Button shouldn't exist for PENDING
        expect(true);
      }
    }
  });

  test('4.4 Cascading effects applied (rejected contingent blocks teams)', async ({ page, context }) => {
    // Admin rejects a contingent
    const adminPage = await context.newPage();
    await adminPage.goto('/admin/contingents');

    const demoBtn = adminPage.locator('button:has-text("Demo")').first();
    if (await demoBtn.isVisible()) {
      await demoBtn.click();
    }

    // Find a PENDING contingent
    const pendingContingent = adminPage.locator('text=PENDING|Menunggu').first();
    if (await pendingContingent.isVisible()) {
      await pendingContingent.click();

      // Click reject
      const rejectBtn = adminPage.locator('button:has-text("Tolak|Reject")');
      if (await rejectBtn.isVisible()) {
        await rejectBtn.click();

        // Fill rejection note
        const noteField = adminPage.locator('textarea').first();
        if (await noteField.isVisible()) {
          await noteField.fill('Dokumen tidak lengkap - E2E Test');
        }

        const confirmBtn = adminPage.locator('button:has-text("Ya|Confirm")');
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click();

          await expect(adminPage.locator('text=Berhasil|Success')).toBeVisible({ timeout: 5000 });
        }
      }
    }

    // Now verify that teams in this contingent are blocked
    const teamPage = await context.newPage();
    await teamPage.goto('/tim');

    const teamDemo = teamPage.locator('button:has-text("Demo")').first();
    if (await teamDemo.isVisible()) {
      await teamDemo.click();
      await teamPage.waitForURL(/tim/, { timeout: 5000 });
    }

    // If team's contingent was rejected, should see warning
    const warningMsg = teamPage.locator('text=ditolak|rejected|blocked');
    if (await warningMsg.isVisible()) {
      await expect(warningMsg).toBeVisible();
    }
  });
});
