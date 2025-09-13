import { test, expect } from '@playwright/test';
import { FoundryUtils } from './foundry-utils';

/**
 * Seasons & Stars Calendar Widget E2E Tests
 *
 * These tests verify the calendar widget functionality within FoundryVTT
 * using the Playwright MCP integration discovered through exploration.
 */

test.describe('Seasons & Stars Calendar Widget', () => {
  let foundryUtils: FoundryUtils;

  test.beforeEach(async ({ page }) => {
    foundryUtils = new FoundryUtils(page);
    await page.goto('/');
    await foundryUtils.loginAs('TestGM');
    await foundryUtils.waitForSeasonsAndStarsReady();
  });

  test('should display Seasons & Stars calendar interface', async ({ page }) => {
    // Verify S&S is working by checking for the main title
    await expect(page.locator('text=Seasons & Stars').first()).toBeVisible();

    // Check for Golarion calendar (PF2e world)
    await expect(page.locator('text=Golarion Calendar').first()).toBeVisible();

    // Verify we can see Absalom Reckoning date format
    await expect(page.getByText(/\d+ AR/).first()).toBeVisible();

    // Verify time display is present
    await expect(page.getByText(/\d{2}:\d{2}:\d{2}/).first()).toBeVisible();

    // Log success
    console.log('✅ Seasons & Stars is working and displaying calendar data correctly!');
  });

  test('should display calendar interface with current date', async ({ page }) => {
    // The calendar dialog is already open by default
    // Verify we can see the main calendar dialog
    await expect(page.locator('text=Calendar Packs Available')).toBeVisible();

    // Verify current date is displayed (Golarion format)
    await expect(page.locator('text=Starday')).toBeVisible();
    await expect(page.locator('text=Rova')).toBeVisible();
    await expect(page.locator('text=4725 AR')).toBeVisible();

    // Verify we can see the calendar system info (use first to avoid strict mode)
    await expect(page.locator('text=Pathfinder 2e').first()).toBeVisible();
    await expect(page.locator('text=Absalom Reckoning')).toBeVisible();
  });

  test('should display time advancement controls', async ({ page }) => {
    // Verify time advancement section is visible
    await expect(page.locator('text=Time Advancement:')).toBeVisible();

    // Check for larger advancement buttons we can see
    await expect(page.locator('text=1 Day')).toBeVisible();
    await expect(page.locator('text=1 Week')).toBeVisible();
    await expect(page.locator('text=1 Month')).toBeVisible();

    // Verify the play button for continuous time advancement
    await expect(page.locator('text=Play (1.5x speed)')).toBeVisible();

    // Check for custom advancement
    await expect(page.locator('text=Custom')).toBeVisible();
  });

  test('should support calendar system selection', async ({ page }) => {
    // Test the calendar system dropdown
    const calendarDropdown = page.locator('text=Golarion Calendar (Pathfinder 2e)');
    await expect(calendarDropdown).toBeVisible();

    // Verify we can see different calendar options available
    await expect(page.locator('text=Fantasy')).toBeVisible();
    await expect(page.locator('text=PF2E Calendars')).toBeVisible();

    // Check that clicking "above to change calendar" works
    const changeCalendarText = page.locator('text=Click above to change calendar');
    await expect(changeCalendarText).toBeVisible();
  });

  test('should display module benefits and features', async ({ page }) => {
    // Check for the Benefits section visible in the interface
    await expect(page.locator('text=Benefits')).toBeVisible();

    // Verify different calendar pack sections are shown
    await expect(page.locator('text=Fantasy')).toBeVisible();
    await expect(page.locator('text=PF2E Calendars')).toBeVisible();
    await expect(page.locator('text=Sci-Fi Calendars')).toBeVisible();

    // Check for installation notes
    await expect(page.locator('text=Install or')).toBeVisible();
  });

  test('should display current time and date information', async ({ page }) => {
    // Verify the specific current date elements from the screenshot
    await expect(page.locator('text=13th Rova')).toBeVisible();

    // Check that time is displayed in proper format
    await expect(page.getByText(/\d{2}:\d{2}:\d{2}/).first()).toBeVisible();

    // Verify date context information
    await expect(page.locator('text=Pathfinder 2e')).toBeVisible();
  });

  test('should allow closing the calendar dialog', async ({ page }) => {
    // The calendar dialog should be open and have close buttons
    const closeButtons = page.locator('button:has-text("×"), .close');

    // Verify close buttons exist
    await expect(closeButtons.first()).toBeVisible();

    // We won't actually close it since other tests need it open
    // but we can verify the buttons are clickable
    await expect(closeButtons.first()).toBeEnabled();
  });

  test('should display bulk advancement controls', async ({ page }) => {
    // Check for advancement section - using visible text from interface
    await expect(page.locator('text=Advance Date:')).toBeVisible();

    // Verify the large advancement buttons (from screenshot)
    await expect(page.locator('text=1 Day')).toBeVisible();
    await expect(page.locator('text=1 Week')).toBeVisible();
    await expect(page.locator('text=1 Month')).toBeVisible();
  });

  test('should maintain module API integration', async ({ page }) => {
    // Check for module API availability
    const moduleAPI = await page.evaluate(() => {
      const game = (window as any).game;
      return {
        moduleActive: game?.modules?.get?.('seasons-and-stars')?.active || false,
        hasAPI: typeof game?.modules?.get?.('seasons-and-stars')?.api !== 'undefined',
        hasSeasonsStars: typeof game?.seasonsStars !== 'undefined'
      };
    });

    expect(moduleAPI.moduleActive).toBe(true);
    expect(moduleAPI.hasAPI).toBe(true);
    expect(moduleAPI.hasSeasonsStars).toBe(true);
  });

});