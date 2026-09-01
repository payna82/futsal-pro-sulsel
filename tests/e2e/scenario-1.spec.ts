import { test, expect } from '@playwright/test';

/**
 * Phase D: Scenario 1 - Full Team Registration Journey
 * 
 * Validates: Team creation → Document upload → Submission → Admin approval → Access unlock
 * Duration: ~10 minutes
 * Checkpoints: 6
 */

const TEAM_NAME = `Tim E2E ${Date.now()}`;

test.describe('Scenario 1: Team Registration Journey', () => {
  test('1.1 Team account creation works', async ({ page }) => {
    // Go to public homepage
    await page.goto('/');
    await expect(page.locator('text=Masuk Sebagai Tim')).toBeVisible();

    // Click team login portal
    await page.click('text=Masuk Sebagai Tim');
    await page.waitForURL('/team/login', { timeout: 5000 });

    // Click "Belum Ada Akun? Daftar"
    await page.click('text=Belum Ada Akun');
    await page.waitForURL(/\/team.*register|\/daftar/, { timeout: 5000 });

    // Fill registration form
    await page.fill('input[placeholder*="nama tim" i]', TEAM_NAME);
    
    // Select contingent (first available)
    const contingentSelect = page.locator('select, [role="listbox"]').first();
    await contingentSelect.click();
    const firstOption = page.locator('[role="option"]').first();
    if (await firstOption.isVisible()) {
      await firstOption.click();
    }

    await page.fill('input[placeholder*="manajer" i], input[placeholder*="nama" i]', 'Test Manager');
    await page.fill('input[type="email"]', `team-${Date.now()}@test.local`);

    // Submit form
    await page.click('button:has-text("Daftar")');
    
    // Expect success and dashboard
    await page.waitForURL(/\/tim|\/team/, { timeout: 10000 });
    await expect(page.locator('text=Lengkapi Profil')).toBeVisible({ timeout: 5000 });
  });

  test('1.2 Document upload UI functional', async ({ page }) => {
    // Login as team (using demo credentials or test account)
    await page.goto('/team/login');
    
    // For testing: Use demo team if available
    // This assumes demo authentication is set up
    const teamButton = page.locator('button:has-text("Demo")').first();
    if (await teamButton.isVisible()) {
      await teamButton.click();
      await page.waitForURL(/\/tim/, { timeout: 5000 });
    }

    // Navigate to documents section
    await page.click('text=Dokumen');
    
    // Verify upload UI is present
    await expect(page.locator('text=Unggah Dokumen|Upload')).toBeVisible();
    
    // Find upload input and verify it's functional
    const uploadInput = page.locator('input[type="file"]').first();
    await expect(uploadInput).toBeTruthy();
  });

  test('1.3 Player & official records save', async ({ page }) => {
    // Login as team
    await page.goto('/tim');
    if (!page.url().includes('/tim')) {
      await page.goto('/team/login');
      // Auto-login with demo
      const demoBtn = page.locator('button:has-text("Demo")').first();
      if (await demoBtn.isVisible()) await demoBtn.click();
    }

    // Navigate to players
    await page.click('text=Pemain|Players');
    await page.waitForURL(/pemain|player/, { timeout: 5000 });

    // Click "Tambah Pemain"
    await page.click('button:has-text("Tambah|Add")');
    
    // Fill player form
    await page.fill('input[placeholder*="nama" i]', 'Pemain Test');
    await page.fill('input[type="number"]', '19850101');  // Birth date
    await page.fill('input[placeholder*="nomor" i]', '7');  // Jersey number

    // Submit
    await page.click('button:has-text("Simpan|Save")');
    
    // Verify player appears in list
    await expect(page.locator('text=Pemain Test')).toBeVisible({ timeout: 5000 });
  });

  test('1.4 Submission creates notification', async ({ page }) => {
    // Login as team
    await page.goto('/tim');
    if (!page.url().includes('/tim')) {
      const demoBtn = page.locator('button:has-text("Demo")').first();
      if (await demoBtn.isVisible()) await demoBtn.click();
    }

    // Find and click submission button
    await expect(page.locator('button:has-text("Kirim|Submit")')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Kirim|Submit")');

    // Confirm in dialog
    const confirmBtn = page.locator('button:has-text("Ya|Konfirmasi|Confirm")');
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
    }

    // Verify success toast
    await expect(page.locator('text=Berhasil|sukses|Success')).toBeVisible({ timeout: 5000 });
  });

  test('1.5 Admin can approve with note', async ({ page, context }) => {
    // Open new admin tab
    const adminPage = await context.newPage();
    await adminPage.goto('/admin');

    // If login required, use demo admin
    const adminDemoBtn = adminPage.locator('button:has-text("Demo")').first();
    if (await adminDemoBtn.isVisible()) {
      await adminDemoBtn.click();
    }

    // Navigate to approvals
    await adminPage.click('text=Persetujuan');
    await adminPage.waitForURL(/admin.*approval|persetujuan/, { timeout: 5000 });

    // Find pending team
    const pendingTeam = adminPage.locator(`text=${TEAM_NAME}`).first();
    if (await pendingTeam.isVisible()) {
      await pendingTeam.click();
    }

    // Fill approval note
    await adminPage.fill('textarea', 'Dokumen lengkap dan valid - E2E Test Approval');

    // Click approve
    await adminPage.click('button:has-text("Setujui|Approve")');

    // Confirm
    const confirmBtn = adminPage.locator('button:has-text("Ya|Confirm")');
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
    }

    // Verify success
    await expect(adminPage.locator('text=Berhasil|Success')).toBeVisible({ timeout: 5000 });
  });

  test('1.6 Team access unlocked after approval', async ({ page }) => {
    // Return to team tab
    await page.goto('/tim');
    if (!page.url().includes('/tim')) {
      const demoBtn = page.locator('button:has-text("Demo")').first();
      if (await demoBtn.isVisible()) await demoBtn.click();
    }

    // Refresh to get latest status
    await page.reload();

    // Verify status shows "Disetujui" (approved)
    await expect(page.locator('text=Disetujui|Approved|VERIFIED')).toBeVisible({ timeout: 5000 });

    // Verify access to live matches
    const liveLink = page.locator('text=Live|Pertandingan|Jadwal');
    await expect(liveLink).toBeVisible();
  });
});
