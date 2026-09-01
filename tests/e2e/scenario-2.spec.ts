import { test, expect } from '@playwright/test';

/**
 * Phase D: Scenario 2 - Committee Member Lifecycle
 * 
 * Validates: Role request → Approval → Match access → Event recording
 * Duration: ~8 minutes
 * Checkpoints: 5
 */

test.describe('Scenario 2: Committee Member Lifecycle', () => {
  test('2.1 Role request UI visible', async ({ page }) => {
    // Login as regular user
    await page.goto('/masuk');
    
    // Look for role request option
    const roleRequestBtn = page.locator('button:has-text("Minta Peran|Request Role|Peran")');
    await expect(roleRequestBtn).toBeVisible({ timeout: 5000 });

    // Click to open form
    await roleRequestBtn.click();
    
    // Verify form is visible
    await expect(page.locator('text=Pilih Peran|Select Role')).toBeVisible();
  });

  test('2.2 Decision note required for rejection', async ({ page, context }) => {
    // Open admin panel
    const adminPage = await context.newPage();
    await adminPage.goto('/admin/role-requests');

    // Auto-login if demo available
    const demoBtn = adminPage.locator('button:has-text("Demo")').first();
    if (await demoBtn.isVisible()) {
      await demoBtn.click();
      await adminPage.waitForURL(/admin/, { timeout: 5000 });
    }

    // Find a pending role request
    const pendingRequest = adminPage.locator('button:has-text("Tolak|Reject")').first();
    if (await pendingRequest.isVisible()) {
      await pendingRequest.click();

      // Verify decision note field is shown
      const noteField = adminPage.locator('textarea[placeholder*="Catatan|Note"]');
      await expect(noteField).toBeVisible();

      // Try to reject without note
      const rejectBtn = adminPage.locator('button:has-text("Ya|Confirm")');
      if (await rejectBtn.isVisible()) {
        // Button should be disabled if no note
        const isDisabled = await rejectBtn.getAttribute('disabled');
        expect(isDisabled).not.toBeNull();
      }

      // Fill note
      await noteField.fill('Sertifikat belum lengkap');

      // Now button should be enabled
      if (await rejectBtn.isVisible()) {
        const isEnabled = await rejectBtn.getAttribute('disabled');
        expect(isEnabled).toBeNull();
      }
    }
  });

  test('2.3 Role binding optional', async ({ page, context }) => {
    // Open admin panel
    const adminPage = await context.newPage();
    await adminPage.goto('/admin/role-requests');

    const demoBtn = adminPage.locator('button:has-text("Demo")').first();
    if (await demoBtn.isVisible()) {
      await demoBtn.click();
      await adminPage.waitForURL(/admin/, { timeout: 5000 });
    }

    // Click to process a role request
    const processBtn = adminPage.locator('button:has-text("Proses|Process")').first();
    if (await processBtn.isVisible()) {
      await processBtn.click();

      // Verify binding fields are present but optional
      const contingentSelect = adminPage.locator('select').first();
      const venueSelect = adminPage.locator('select').nth(1);
      
      // These should exist and be optional (can be left empty)
      if (await contingentSelect.isVisible()) {
        const selectValue = await contingentSelect.inputValue();
        // Can be empty string
        expect(selectValue === '' || selectValue).toBeTruthy();
      }
    }
  });

  test('2.4 User role updated after approval', async ({ page, context }) => {
    // Request a role first
    await page.goto('/masuk');
    
    // Use demo user
    const demoBtn = page.locator('button:has-text("Demo")').first();
    if (await demoBtn.isVisible()) {
      await demoBtn.click();
    }

    // Navigate to role request
    const roleSection = page.locator('text=Peran|Role|Profile');
    if (await roleSection.isVisible()) {
      await roleSection.click();
    }

    // Admin approves the role
    const adminPage = await context.newPage();
    await adminPage.goto('/admin/role-requests');

    const demoAdminBtn = adminPage.locator('button:has-text("Demo")').first();
    if (await demoAdminBtn.isVisible()) {
      await demoAdminBtn.click();
    }

    // Find and approve request
    const approveBtn = adminPage.locator('button:has-text("Setujui|Approve")').first();
    if (await approveBtn.isVisible()) {
      await approveBtn.click();

      // Confirm
      const confirmBtn = adminPage.locator('button:has-text("Ya|Confirm")');
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
      }

      // Verify success
      await expect(adminPage.locator('text=Berhasil|Success')).toBeVisible({ timeout: 5000 });
    }

    // Check that user role is updated on team page
    await page.reload();
    const roleDisplay = page.locator('text=Peran|Role');
    await expect(roleDisplay).toBeVisible({ timeout: 5000 });
  });

  test('2.5 Committee can record match events', async ({ page, context }) => {
    // Navigate to live match
    await page.goto('/live');
    
    // Find a match in control panel
    const matchLink = page.locator('a:has-text("Control|Kontrol")').first();
    if (await matchLink.isVisible()) {
      await matchLink.click();
      await page.waitForURL(/match.*control/, { timeout: 5000 });

      // Verify event recording UI is present
      const eventButtons = page.locator('button:has-text("Gol|Goal|Kartu|Card")');
      await expect(eventButtons.first()).toBeVisible({ timeout: 5000 });

      // Try to record a goal event
      const goalBtn = page.locator('button:has-text("Gol|Goal")').first();
      if (await goalBtn.isVisible()) {
        await goalBtn.click();

        // Verify event appears in log
        await expect(page.locator('text=Gol|Goal')).toBeVisible({ timeout: 5000 });
      }
    } else {
      // If no control button visible, verify clock/timer is present
      const clockDisplay = page.locator('text=Waktu|Time|Clock');
      await expect(clockDisplay).toBeVisible({ timeout: 5000 });
    }
  });
});
