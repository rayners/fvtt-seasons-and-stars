import { test, expect } from '@playwright/test';
import { FoundryUtils } from './foundry-utils';

/**
 * Time Advancement E2E Tests
 *
 * Tests the time advancement functionality including quick time buttons,
 * time progression, and integration with FoundryVTT's time system.
 */
test.describe('Seasons & Stars Time Advancement', () => {
  let foundryUtils: FoundryUtils;

  test.beforeEach(async ({ page }) => {
    foundryUtils = new FoundryUtils(page);

    await page.goto('/');
    await foundryUtils.loginAs('Gamemaster'); // GM needed for time advancement
    await foundryUtils.waitForSeasonsAndStarsReady();
  });

  test('should display quick time advancement buttons for GMs', async ({ page }) => {
    // Verify quick time buttons are visible for GMs
    await expect(page.locator('[data-action="advance-time"]')).toBeVisible();
    await expect(page.locator('[data-button="1-hour"]')).toBeVisible();
    await expect(page.locator('[data-button="8-hours"]')).toBeVisible();
    await expect(page.locator('[data-button="1-day"]')).toBeVisible();

    // Check for pause/resume button if combat is active
    const pauseButton = page.locator('[data-action="pause-time"]');
    if (await pauseButton.isVisible()) {
      await expect(pauseButton).toContainText(/Pause|Resume/);
    }
  });

  test('should advance time by 1 hour using quick buttons', async ({ page }) => {
    // Get initial time
    const initialState = await foundryUtils.getCurrentCalendarState();
    const initialTime = initialState?.currentTime;

    // Click 1-hour advancement button
    await page.click('[data-button="1-hour"]');

    // Wait for time update to propagate
    await page.waitForTimeout(1000);

    // Verify time has advanced
    const newState = await foundryUtils.getCurrentCalendarState();
    expect(newState?.currentTime).not.toBe(initialTime);

    // Verify time advancement is approximately 1 hour
    // (accounting for calendar time vs real time conversion)
    const timeRegex = /(\d{1,2}):(\d{2}):(\d{2})/;
    const initialMatch = initialTime?.match(timeRegex);
    const newMatch = newState?.currentTime?.match(timeRegex);

    if (initialMatch && newMatch) {
      const initialHour = parseInt(initialMatch[1]);
      const newHour = parseInt(newMatch[1]);
      const expectedHour = (initialHour + 1) % 24;
      expect(newHour).toBe(expectedHour);
    }
  });

  test('should advance time by 8 hours (long rest)', async ({ page }) => {
    // Get initial time state
    const initialState = await foundryUtils.getCurrentCalendarState();

    // Click 8-hour advancement button (long rest scenario)
    await page.click('[data-button="8-hours"]');

    // Wait for time update
    await page.waitForTimeout(1000);

    // Verify significant time advancement occurred
    const newState = await foundryUtils.getCurrentCalendarState();
    expect(newState?.currentTime).not.toBe(initialState?.currentTime);

    // For 8-hour advancement, we might see date change depending on time of day
    const dateChanged = newState?.currentDate !== initialState?.currentDate;
    if (dateChanged) {
      // Date rolled over - verify it's the next day
      expect(newState?.currentDate).toBeDefined();
    }
  });

  test('should advance time by 1 day using quick buttons', async ({ page }) => {
    // Get initial date
    const initialState = await foundryUtils.getCurrentCalendarState();
    const initialDate = initialState?.currentDate;

    // Click 1-day advancement button
    await page.click('[data-button="1-day"]');

    // Wait for date update
    await page.waitForTimeout(1500);

    // Verify date has changed
    const newState = await foundryUtils.getCurrentCalendarState();
    expect(newState?.currentDate).not.toBe(initialDate);
    expect(newState?.currentDate).toBeDefined();
  });

  test('should integrate with FoundryVTT worldTime system', async ({ page }) => {
    // Get initial worldTime from Foundry
    const initialWorldTime = await page.evaluate(() => {
      return (window as any).game?.time?.worldTime || 0;
    });

    // Advance time using S&S quick button
    await page.click('[data-button="1-hour"]');
    await page.waitForTimeout(1000);

    // Verify worldTime was updated
    const newWorldTime = await page.evaluate(() => {
      return (window as any).game?.time?.worldTime || 0;
    });

    expect(newWorldTime).toBeGreaterThan(initialWorldTime);

    // Verify the advancement is approximately 1 hour in seconds
    const timeDiff = newWorldTime - initialWorldTime;
    expect(timeDiff).toBeGreaterThan(3500); // ~1 hour minus some tolerance
    expect(timeDiff).toBeLessThan(3700); // ~1 hour plus some tolerance
  });

  test('should respect time advancement settings', async ({ page }) => {
    // Open calendar grid to check for time advancement controls
    await foundryUtils.openCalendarGrid();

    // Look for time advancement ratio setting indicator
    const timeRatioDisplay = page.locator('[data-setting="timeAdvancementRatio"]');
    if (await timeRatioDisplay.isVisible()) {
      await expect(timeRatioDisplay).toContainText(/\d+\.?\d*x/);
    }

    await foundryUtils.closeCalendarGrid();
  });

  test('should pause time advancement during combat', async ({ page }) => {
    // Check if combat pause functionality is available
    const pauseButton = page.locator('[data-action="pause-time"]');

    if (await pauseButton.isVisible()) {
      // Test pause functionality
      await pauseButton.click();

      // Verify pause state is indicated
      await expect(pauseButton).toContainText(/Resume|Paused/);

      // Test resume functionality
      await pauseButton.click();
      await expect(pauseButton).toContainText(/Pause/);
    }
  });

  test('should update calendar display after time advancement', async ({ page }) => {
    // Open calendar grid
    await foundryUtils.openCalendarGrid();

    // Note current day highlighting
    const todayElement = page.locator('[data-day][class*="today"]');
    const initialTodayDay = await todayElement.getAttribute('data-day');

    await foundryUtils.closeCalendarGrid();

    // Advance time by 1 day
    await page.click('[data-button="1-day"]');
    await page.waitForTimeout(1000);

    // Reopen calendar and verify today marker moved
    await foundryUtils.openCalendarGrid();

    const newTodayElement = page.locator('[data-day][class*="today"]');
    const newTodayDay = await newTodayElement.getAttribute('data-day');

    // Today should have moved (or rolled to next month)
    expect(newTodayDay).not.toBe(initialTodayDay);

    await foundryUtils.closeCalendarGrid();
  });

  test('should handle time advancement with custom calendar systems', async ({ page }) => {
    // Test with current calendar system (Dave Reckoning from initial tests)
    const initialState = await foundryUtils.getCurrentCalendarState();
    expect(initialState?.calendarSystem).toContain('Dave Reckoning');

    // Advance time and verify calendar-specific formatting is maintained
    await page.click('[data-button="1-hour"]');
    await page.waitForTimeout(1000);

    const newState = await foundryUtils.getCurrentCalendarState();

    // Should still be using the same calendar system
    expect(newState?.calendarSystem).toBe(initialState?.calendarSystem);

    // Should maintain calendar-specific date format
    expect(newState?.currentDate).toMatch(/\w+day.*DR$/); // Dave Reckoning format
  });

  test('should allow manual time input for precise advancement', async ({ page }) => {
    // Look for manual time input controls
    const manualTimeInput = page.locator('[data-action="manual-time-input"]');

    if (await manualTimeInput.isVisible()) {
      await manualTimeInput.click();

      // Should open time input dialog
      await expect(page.locator('.time-input-dialog')).toBeVisible();

      // Test input fields for hours, minutes, seconds
      await expect(page.locator('[name="hours"]')).toBeVisible();
      await expect(page.locator('[name="minutes"]')).toBeVisible();

      // Close dialog
      await page.click('.time-input-dialog .close-button');
      await expect(page.locator('.time-input-dialog')).toBeHidden();
    }
  });
});