import { Page, BrowserContext, expect } from '@playwright/test';

/**
 * E2E Test Helpers
 * 
 * Common utilities for browser automation across all scenarios.
 */

export class TestHelpers {
  /**
   * Login as demo admin user
   */
  static async loginAsAdmin(page: Page) {
    await page.goto('/admin');
    
    const demoBtn = page.locator('button:has-text("Demo")').first();
    if (await demoBtn.isVisible()) {
      await demoBtn.click();
      await page.waitForURL(/admin/, { timeout: 10000 });
    }
  }

  /**
   * Login as demo team user
   */
  static async loginAsTeam(page: Page) {
    await page.goto('/tim');
    
    const demoBtn = page.locator('button:has-text("Demo")').first();
    if (await demoBtn.isVisible()) {
      await demoBtn.click();
      await page.waitForURL(/tim/, { timeout: 10000 });
    }
  }

  /**
   * Login as demo public user
   */
  static async loginAsPublic(page: Page) {
    await page.goto('/masuk');
    
    const demoBtn = page.locator('button:has-text("Demo")').first();
    if (await demoBtn.isVisible()) {
      await demoBtn.click();
      await page.waitForURL(/tim|admin|masuk/, { timeout: 10000 });
    }
  }

  /**
   * Find and approve a pending contingent
   */
  static async approvePendingContingent(page: Page, note: string) {
    await page.goto('/admin/contingents');
    
    const pending = page.locator('text=PENDING|Menunggu').first();
    if (await pending.isVisible()) {
      await pending.click();

      const approveBtn = page.locator('button:has-text("Setujui|Approve")');
      if (await approveBtn.isVisible()) {
        await approveBtn.click();

        const noteField = page.locator('textarea').first();
        if (await noteField.isVisible()) {
          await noteField.fill(note);
        }

        const confirmBtn = page.locator('button:has-text("Ya|Confirm")');
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click();
          await expect(page.locator('text=Berhasil|Success')).toBeVisible({ timeout: 5000 });
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Find and reject a pending contingent
   */
  static async rejectPendingContingent(page: Page, note: string) {
    await page.goto('/admin/contingents');
    
    const pending = page.locator('text=PENDING|Menunggu').first();
    if (await pending.isVisible()) {
      await pending.click();

      const rejectBtn = page.locator('button:has-text("Tolak|Reject")');
      if (await rejectBtn.isVisible()) {
        await rejectBtn.click();

        const noteField = page.locator('textarea').first();
        if (await noteField.isVisible()) {
          await noteField.fill(note);
        }

        const confirmBtn = page.locator('button:has-text("Ya|Confirm")');
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click();
          await expect(page.locator('text=Berhasil|Success')).toBeVisible({ timeout: 5000 });
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Approve a pending role request
   */
  static async approvePendingRole(page: Page, note?: string) {
    await page.goto('/admin/role-requests');
    
    const approveBtn = page.locator('button:has-text("Setujui|Approve")').first();
    if (await approveBtn.isVisible()) {
      await approveBtn.click();

      if (note) {
        const noteField = page.locator('textarea').first();
        if (await noteField.isVisible()) {
          await noteField.fill(note);
        }
      }

      const confirmBtn = page.locator('button:has-text("Ya|Confirm")');
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
        await expect(page.locator('text=Berhasil|Success')).toBeVisible({ timeout: 5000 });
        return true;
      }
    }
    return false;
  }

  /**
   * Add a player to team
   */
  static async addPlayer(page: Page, name: string, jerseyNumber: string) {
    await page.goto('/tim');
    
    // Navigate to players section
    await page.click('text=Pemain|Players');
    await page.waitForTimeout(500);

    // Click add button
    const addBtn = page.locator('button:has-text("Tambah|Add")').first();
    if (await addBtn.isVisible()) {
      await addBtn.click();

      // Fill form
      const nameField = page.locator('input[placeholder*="nama" i]').first();
      if (await nameField.isVisible()) {
        await nameField.fill(name);
      }

      const jerseyField = page.locator('input[placeholder*="nomor" i]').first();
      if (await jerseyField.isVisible()) {
        await jerseyField.fill(jerseyNumber);
      }

      // Submit
      const saveBtn = page.locator('button:has-text("Simpan|Save")').first();
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        await expect(page.locator(`text=${name}`)).toBeVisible({ timeout: 5000 });
        return true;
      }
    }
    return false;
  }

  /**
   * Verify error message is visible and actionable
   */
  static async verifyErrorMessage(page: Page) {
    const errorMsg = page.locator('text=ditolak|denied|403|error|Akses');
    if (await errorMsg.isVisible()) {
      const text = await errorMsg.textContent();
      expect(text).toBeTruthy();
      expect(text!.length).toBeGreaterThan(5);
      return true;
    }
    return false;
  }

  /**
   * Get current user role from UI
   */
  static async getCurrentRole(page: Page): Promise<string | null> {
    const roleDisplay = page.locator('text=/Peran|Role|Admin|Team/');
    if (await roleDisplay.isVisible()) {
      return await roleDisplay.textContent();
    }
    return null;
  }

  /**
   * Wait for status change
   */
  static async waitForStatus(page: Page, status: string, timeout = 10000) {
    const statusLocator = page.locator(`text=${status}`);
    await expect(statusLocator).toBeVisible({ timeout });
  }

  /**
   * Record a match event
   */
  static async recordMatchEvent(page: Page, eventType: string) {
    const eventBtn = page.locator(`button:has-text("${eventType}|Gol|Card")`).first();
    if (await eventBtn.isVisible()) {
      await eventBtn.click();
      await page.waitForTimeout(500);
      return true;
    }
    return false;
  }

  /**
   * Verify audit log entry exists
   */
  static async verifyAuditLog(page: Page, action: string, note?: string) {
    await page.goto('/admin/audit-logs');
    
    const entry = page.locator(`text=${action}`).first();
    if (await entry.isVisible()) {
      if (note) {
        const noteEntry = page.locator(`text=${note}`).first();
        return await noteEntry.isVisible();
      }
      return true;
    }
    return false;
  }
}
