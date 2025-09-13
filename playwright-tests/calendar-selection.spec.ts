import { test, expect } from '@playwright/test';
import { FoundryUtils } from './foundry-utils';

/**
 * Calendar Selection and File Management Tests
 *
 * Tests the calendar selection dialog, file picker integration,
 * and calendar switching functionality.
 */
test.describe('Calendar Selection & Management', () => {
  let foundryUtils: FoundryUtils;

  test.beforeEach(async ({ page }) => {
    foundryUtils = new FoundryUtils(page);
    await page.goto('/');
    await foundryUtils.loginAs('Gamemaster'); // GM needed for calendar management
    await foundryUtils.waitForSeasonsAndStarsReady();
  });

  test('should display current calendar system information', async ({ page }) => {
    // Verify current calendar is displayed
    const calendarDisplay = page.locator('.calendar-system-name');
    await expect(calendarDisplay).toBeVisible();
    await expect(calendarDisplay).toContainText(/Dave Reckoning|Gregorian|Golarion/);

    // Calendar description should be visible
    const description = page.locator('.calendar-description');
    if (await description.isVisible()) {
      await expect(description).toContainText(/calendar/i);
    }
  });

  test('should open calendar selection dialog when available', async ({ page }) => {
    // Look for calendar selection trigger
    const calendarSelector = page.locator('[data-action="openCalendarSelection"]');

    if (await calendarSelector.isVisible()) {
      await calendarSelector.click();

      // Calendar selection dialog should appear
      await expect(page.locator('.calendar-selection-dialog')).toBeVisible();
      await expect(page.getByRole('heading', { name: /select.*calendar/i })).toBeVisible();

      // Dialog should contain calendar options
      await expect(page.locator('.calendar-option')).toHaveCountGreaterThan(0);

      // Close dialog
      await page.click('.calendar-selection-dialog .close-button');
      await expect(page.locator('.calendar-selection-dialog')).toBeHidden();
    }
  });

  test('should display available calendar systems from different packs', async ({ page }) => {
    const calendarSelector = page.locator('[data-action="openCalendarSelection"]');

    if (await calendarSelector.isVisible()) {
      await calendarSelector.click();

      // Should show calendars from different packs
      const fantasyCalendars = page.locator('.calendar-option[data-pack="fantasy"]');
      const scifiCalendars = page.locator('.calendar-option[data-pack="scifi"]');
      const pf2eCalendars = page.locator('.calendar-option[data-pack="pf2e"]');

      // At least one pack should have calendars
      const totalCalendars = await fantasyCalendars.count() +
                           await scifiCalendars.count() +
                           await pf2eCalendars.count();
      expect(totalCalendars).toBeGreaterThan(0);

      // Check for expected calendar names from different packs
      const calendarNames = page.locator('.calendar-option .calendar-name');
      const nameTexts = await calendarNames.allTextContents();

      // Should include some known calendars
      const hasFantasyCalendars = nameTexts.some(name =>
        name.includes('Dave Reckoning') ||
        name.includes('Exandrian') ||
        name.includes('Warhammer')
      );

      const hasScifiCalendars = nameTexts.some(name =>
        name.includes('Federation') ||
        name.includes('Star Trek')
      );

      expect(hasFantasyCalendars || hasScifiCalendars).toBe(true);

      await page.click('.calendar-selection-dialog .close-button');
    }
  });

  test('should show calendar previews and descriptions', async ({ page }) => {
    const calendarSelector = page.locator('[data-action="openCalendarSelection"]');

    if (await calendarSelector.isVisible()) {
      await calendarSelector.click();

      // Each calendar option should have preview information
      const calendarOptions = page.locator('.calendar-option');
      if (await calendarOptions.count() > 0) {
        const firstOption = calendarOptions.first();

        // Should have name and description
        await expect(firstOption.locator('.calendar-name')).toBeVisible();
        await expect(firstOption.locator('.calendar-description')).toBeVisible();

        // Should have preview text or metadata
        const preview = firstOption.locator('.calendar-preview');
        if (await preview.isVisible()) {
          await expect(preview).toContainText(/month|day|year|week/i);
        }
      }

      await page.click('.calendar-selection-dialog .close-button');
    }
  });

  test('should allow calendar switching and update UI', async ({ page }) => {
    const calendarSelector = page.locator('[data-action="openCalendarSelection"]');

    if (await calendarSelector.isVisible()) {
      // Get current calendar state
      const initialState = await foundryUtils.getCurrentCalendarState();
      const initialCalendar = initialState?.calendarSystem;

      await calendarSelector.click();

      // Find a different calendar option
      const calendarOptions = page.locator('.calendar-option');
      if (await calendarOptions.count() > 1) {
        const secondOption = calendarOptions.nth(1);
        const targetCalendarName = await secondOption.locator('.calendar-name').textContent();

        // Click to select different calendar
        await secondOption.click();

        // Dialog should close and UI should update
        await expect(page.locator('.calendar-selection-dialog')).toBeHidden();

        // Wait for calendar to update
        await page.waitForTimeout(2000);

        // Verify calendar system changed
        const newState = await foundryUtils.getCurrentCalendarState();
        expect(newState?.calendarSystem).not.toBe(initialCalendar);

        // Should contain part of the selected calendar name
        if (targetCalendarName) {
          const nameWords = targetCalendarName.split(' ');
          const hasNameWord = nameWords.some(word =>
            newState?.calendarSystem?.includes(word)
          );
          expect(hasNameWord).toBe(true);
        }
      }
    }
  });

  test('should support external calendar file loading', async ({ page }) => {
    const calendarSelector = page.locator('[data-action="openCalendarSelection"]');

    if (await calendarSelector.isVisible()) {
      await calendarSelector.click();

      // Look for external file option
      const externalFileButton = page.locator('[data-action="load-external-calendar"]');
      if (await externalFileButton.isVisible()) {
        await externalFileButton.click();

        // Should open file picker or URL input
        const filePicker = page.locator('.filepicker, .url-input-dialog');
        await expect(filePicker).toBeVisible();

        // Close file picker
        await page.click('.filepicker .close, .url-input-dialog .cancel');
        await expect(filePicker).toBeHidden();
      }

      await page.click('.calendar-selection-dialog .close-button');
    }
  });

  test('should handle URL-based calendar loading', async ({ page }) => {
    const calendarSelector = page.locator('[data-action="openCalendarSelection"]');

    if (await calendarSelector.isVisible()) {
      await calendarSelector.click();

      // Look for URL input option
      const urlButton = page.locator('[data-action="load-calendar-url"]');
      if (await urlButton.isVisible()) {
        await urlButton.click();

        // Should show URL input dialog
        await expect(page.locator('.url-input-dialog')).toBeVisible();
        await expect(page.locator('[name="calendar-url"]')).toBeVisible();

        // Test URL validation
        await page.fill('[name="calendar-url"]', 'invalid-url');
        const submitButton = page.locator('.url-input-dialog [type="submit"]');
        if (await submitButton.isVisible()) {
          await submitButton.click();

          // Should show validation error
          await expect(page.locator('.error-message')).toBeVisible();
        }

        // Close dialog
        await page.click('.url-input-dialog .cancel');
        await expect(page.locator('.url-input-dialog')).toBeHidden();
      }

      await page.click('.calendar-selection-dialog .close-button');
    }
  });

  test('should maintain calendar state after refresh', async ({ page }) => {
    // Get current calendar
    const initialState = await foundryUtils.getCurrentCalendarState();

    // Refresh the page
    await page.reload();
    await foundryUtils.waitForSeasonsAndStarsReady();

    // Calendar should be the same after refresh
    const reloadedState = await foundryUtils.getCurrentCalendarState();
    expect(reloadedState?.calendarSystem).toBe(initialState?.calendarSystem);
    expect(reloadedState?.currentDate).toBe(initialState?.currentDate);
  });

  test('should show appropriate calendar pack information', async ({ page }) => {
    const calendarSelector = page.locator('[data-action="openCalendarSelection"]');

    if (await calendarSelector.isVisible()) {
      await calendarSelector.click();

      // Check for pack organization
      const packSections = page.locator('.calendar-pack-section');
      if (await packSections.count() > 0) {
        // Should have pack headers
        await expect(page.locator('.pack-header')).toHaveCountGreaterThan(0);

        // Pack headers should indicate source
        const packHeaders = page.locator('.pack-header');
        const headerTexts = await packHeaders.allTextContents();

        const hasExpectedPacks = headerTexts.some(text =>
          text.includes('Fantasy') ||
          text.includes('Sci-Fi') ||
          text.includes('PF2e') ||
          text.includes('Core')
        );

        expect(hasExpectedPacks).toBe(true);
      }

      await page.click('.calendar-selection-dialog .close-button');
    }
  });

  test('should handle calendar loading errors gracefully', async ({ page }) => {
    // Test error handling by attempting to load invalid calendar
    const calendarSelector = page.locator('[data-action="openCalendarSelection"]');

    if (await calendarSelector.isVisible()) {
      await calendarSelector.click();

      // Look for URL loading option to test error handling
      const urlButton = page.locator('[data-action="load-calendar-url"]');
      if (await urlButton.isVisible()) {
        await urlButton.click();

        // Try to load from non-existent URL
        await page.fill('[name="calendar-url"]', 'https://invalid-domain-that-does-not-exist.com/calendar.json');

        const loadButton = page.locator('.url-input-dialog [data-action="load"]');
        if (await loadButton.isVisible()) {
          await loadButton.click();

          // Should show error message
          await expect(page.locator('.error-message, .notification.error')).toBeVisible();

          // Calendar should remain unchanged
          const state = await foundryUtils.getCurrentCalendarState();
          expect(state?.calendarSystem).toBeDefined();
        }

        // Close dialog
        await page.click('.url-input-dialog .close, .url-input-dialog .cancel');
      }

      await page.click('.calendar-selection-dialog .close-button');
    }
  });

  test('should support calendar collection browsing', async ({ page }) => {
    const calendarSelector = page.locator('[data-action="openCalendarSelection"]');

    if (await calendarSelector.isVisible()) {
      await calendarSelector.click();

      // Look for collection browsing features
      const collectionButton = page.locator('[data-action="browse-collections"]');
      if (await collectionButton.isVisible()) {
        await collectionButton.click();

        // Should show collection browser
        await expect(page.locator('.collection-browser')).toBeVisible();

        // Should list available collections
        await expect(page.locator('.collection-item')).toHaveCountGreaterThan(0);

        // Collections should have metadata
        const firstCollection = page.locator('.collection-item').first();
        await expect(firstCollection.locator('.collection-name')).toBeVisible();
        await expect(firstCollection.locator('.collection-description')).toBeVisible();

        // Close browser
        await page.click('.collection-browser .close-button');
        await expect(page.locator('.collection-browser')).toBeHidden();
      }

      await page.click('.calendar-selection-dialog .close-button');
    }
  });
});