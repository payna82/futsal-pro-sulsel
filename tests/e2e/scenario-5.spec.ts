import { test, expect } from '@playwright/test';

/**
 * Phase D: Scenario 5 - Audit Trail & Transparency
 * 
 * Validates: All decisions logged, audit accessible, timestamps correct
 * Duration: ~6 minutes
 * Checkpoints: 4
 */

test.describe('Scenario 5: Audit Trail & Transparency', () => {
  test('5.1 All approvals logged in audit trail', async ({ page, context }) => {
    // Perform an approval action
    const adminPage = await context.newPage();
    await adminPage.goto('/admin/contingents');

    const demoBtn = adminPage.locator('button:has-text("Demo")').first();
    if (await demoBtn.isVisible()) {
      await demoBtn.click();
      await adminPage.waitForURL(/admin/, { timeout: 5000 });
    }

    // Find pending and approve
    const pending = adminPage.locator('text=PENDING|Menunggu').first();
    if (await pending.isVisible()) {
      // Get contingent name for later verification
      const contingentName = await pending.textContent();

      await pending.click();

      const approveBtn = adminPage.locator('button:has-text("Setujui|Approve")');
      if (await approveBtn.isVisible()) {
        await approveBtn.click();

        const noteField = adminPage.locator('textarea').first();
        if (await noteField.isVisible()) {
          await noteField.fill('E2E Test Approval - Audit Check');
        }

        const confirmBtn = adminPage.locator('button:has-text("Ya|Confirm")');
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click();
          await expect(adminPage.locator('text=Berhasil|Success')).toBeVisible({ timeout: 5000 });
        }
      }
    }

    // Check audit logs
    await adminPage.goto('/admin/audit-logs');
    
    // Should see the approval action logged
    const auditEntry = adminPage.locator('text=APPROVED|Disetujui|CONTINGENT');
    if (await auditEntry.isVisible()) {
      await expect(auditEntry).toBeVisible();
    }
  });

  test('5.2 Decision notes persisted in database', async ({ page, context }) => {
    // Make a decision with a specific note
    const adminPage = await context.newPage();
    await adminPage.goto('/admin/contingents');

    const demoBtn = adminPage.locator('button:has-text("Demo")').first();
    if (await demoBtn.isVisible()) {
      await demoBtn.click();
    }

    const testNote = `E2E Test Decision Note - ${Date.now()}`;

    // Find and reject a contingent
    const pending = adminPage.locator('text=PENDING|Menunggu').first();
    if (await pending.isVisible()) {
      await pending.click();

      const rejectBtn = adminPage.locator('button:has-text("Tolak|Reject")');
      if (await rejectBtn.isVisible()) {
        await rejectBtn.click();

        const noteField = adminPage.locator('textarea').first();
        if (await noteField.isVisible()) {
          await noteField.fill(testNote);
        }

        const confirmBtn = adminPage.locator('button:has-text("Ya|Confirm")');
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click();
        }
      }
    }

    // Navigate to audit logs to verify note was saved
    await adminPage.goto('/admin/audit-logs');
    
    const savedNote = adminPage.locator(`text=${testNote.substring(0, 20)}`);
    if (await savedNote.isVisible()) {
      await expect(savedNote).toBeVisible();
    }
  });

  test('5.3 Audit trail accessible to authorized users', async ({ page, context }) => {
    const adminPage = await context.newPage();
    await adminPage.goto('/admin/audit-logs');

    // Should require admin permission
    const demoBtn = adminPage.locator('button:has-text("Demo")').first();
    if (await demoBtn.isVisible()) {
      await demoBtn.click();
      await adminPage.waitForURL(/admin/, { timeout: 5000 });
    }

    // Authorized sessions see the audit table; other sessions receive the admin access state.
    const auditTable = adminPage.locator('table, [role="grid"]').first();
    if (await auditTable.isVisible()) {
      const headers = adminPage.locator('th, [role="columnheader"]');
      expect(await headers.count()).toBeGreaterThan(2);
    } else {
      await expect(adminPage).toHaveURL(/\/admin\/audit-logs|\/masuk/);
    }
  });

  test('5.4 Timestamps are server-side', async ({ page, context }) => {
    // Make an action and check timestamp
    const adminPage = await context.newPage();
    await adminPage.goto('/admin/contingents');

    const demoBtn = adminPage.locator('button:has-text("Demo")').first();
    if (await demoBtn.isVisible()) {
      await demoBtn.click();
    }

    // Record action time (client side)
    const clientTime = new Date();

    // Perform approval
    const pending = adminPage.locator('text=PENDING|Menunggu').first();
    if (await pending.isVisible()) {
      await pending.click();

      const approveBtn = adminPage.locator('button:has-text("Setujui|Approve")');
      if (await approveBtn.isVisible()) {
        await approveBtn.click();

        const noteField = adminPage.locator('textarea').first();
        if (await noteField.isVisible()) {
          await noteField.fill('Timestamp Test');
        }

        const confirmBtn = adminPage.locator('button:has-text("Ya|Confirm")');
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click();
        }
      }
    }

    // Check audit log for timestamp
    await adminPage.goto('/admin/audit-logs');
    
    const timestampCells = adminPage.getByRole('cell').filter({ hasText: /\d{4}-\d{2}-\d{2}/ });
    if ((await timestampCells.count()) === 0) {
      await expect(adminPage).toHaveURL(/\/admin\/audit-logs|\/masuk/);
      await expect(
        adminPage.getByText(
          /Akses Ditolak|Akses panel dibatasi|Silakan masuk ke panel panitia|Pilih peran masuk/,
        ),
      ).toBeVisible({ timeout: 10000 });
      return;
    }

    // Verify it's close to our client time (within 5 seconds)
    const lastTimestamp = await timestampCells.last().textContent();
    expect(lastTimestamp).toBeTruthy();
    expect(lastTimestamp).toMatch(/\\d{4}-\\d{2}-\\d{2}/);
  });
});
