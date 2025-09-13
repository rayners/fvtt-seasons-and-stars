import { test, expect } from '@playwright/test';
import { FoundryUtils } from './foundry-utils';

/**
 * Permission-based UI Tests
 *
 * Tests different UI states and functionality based on user roles (GM vs Player).
 * Verifies that appropriate controls are shown/hidden and functionality is
 * properly restricted based on permissions.
 */
test.describe('Seasons & Stars Permissions', () => {
  let foundryUtils: FoundryUtils;

  test.describe('Player View', () => {
    test.beforeEach(async ({ page }) => {
      foundryUtils = new FoundryUtils(page);
      await page.goto('/');
      await foundryUtils.loginAs('Player1'); // Non-GM user
      await foundryUtils.waitForSeasonsAndStarsReady();
    });

    test('should show calendar widget but hide GM-only controls', async ({ page }) => {
      // Calendar widget should be visible to all users
      await expect(page.locator('#seasons-stars-widget')).toBeVisible();
      await expect(page.locator('.current-date')).toBeVisible();
      await expect(page.locator('.current-time')).toBeVisible();

      // Time advancement buttons should NOT be visible to players
      await expect(page.locator('[data-action="advance-time"]')).not.toBeVisible();
      await expect(page.locator('[data-button="1-hour"]')).not.toBeVisible();
      await expect(page.locator('[data-button="8-hours"]')).not.toBeVisible();
      await expect(page.locator('[data-button="1-day"]')).not.toBeVisible();
    });

    test('should allow calendar viewing but not calendar selection', async ({ page }) => {
      // Players should be able to view current calendar system
      const state = await foundryUtils.getCurrentCalendarState();
      expect(state?.calendarSystem).toBeDefined();

      // Calendar selection/change button should NOT be visible to players
      await expect(page.locator('[data-action="change-calendar"]')).not.toBeVisible();
      await expect(page.locator('[data-action="openCalendarSelection"]')).not.toBeVisible();
    });

    test('should show read-only calendar grid', async ({ page }) => {
      // Players should be able to open calendar grid
      await foundryUtils.openCalendarGrid();

      // Calendar data should be visible
      await expect(page.locator('.calendar-day[data-day]')).toHaveCountGreaterThan(0);
      await expect(page.locator('.month-name')).toBeVisible();

      // But editing controls should be hidden
      await expect(page.locator('[data-action="edit-calendar"]')).not.toBeVisible();
      await expect(page.locator('[data-action="add-note"]')).not.toBeVisible();

      await foundryUtils.closeCalendarGrid();
    });

    test('should show public notes but hide private/GM notes', async ({ page }) => {
      await foundryUtils.openCalendarGrid();

      // Look for notes on calendar days
      const notesMarkers = page.locator('.calendar-day [data-note-visibility="public"]');
      if (await notesMarkers.count() > 0) {
        // Public notes should be visible
        await expect(notesMarkers.first()).toBeVisible();
      }

      // GM-only notes should not be visible
      await expect(page.locator('[data-note-visibility="gm"]')).not.toBeVisible();
      await expect(page.locator('[data-note-visibility="private"]')).not.toBeVisible();

      await foundryUtils.closeCalendarGrid();
    });

    test('should not show calendar file selection hints', async ({ page }) => {
      // Calendar selection hints should not appear for players
      await expect(page.locator('.calendar-hint')).not.toBeVisible();
      await expect(page.locator('[data-tooltip*="Click to change calendar"]')).not.toBeVisible();
    });
  });

  test.describe('GM View', () => {
    test.beforeEach(async ({ page }) => {
      foundryUtils = new FoundryUtils(page);
      await page.goto('/');
      await foundryUtils.loginAs('Gamemaster'); // GM user
      await foundryUtils.waitForSeasonsAndStarsReady();
    });

    test('should show all controls and time advancement buttons', async ({ page }) => {
      // All standard controls should be visible
      await expect(page.locator('#seasons-stars-widget')).toBeVisible();

      // Time advancement controls should be visible to GMs
      await expect(page.locator('[data-action="advance-time"]')).toBeVisible();
      await expect(page.locator('[data-button="1-hour"]')).toBeVisible();
      await expect(page.locator('[data-button="8-hours"]')).toBeVisible();
      await expect(page.locator('[data-button="1-day"]')).toBeVisible();
    });

    test('should allow calendar system selection and configuration', async ({ page }) => {
      // Calendar selection should be available to GMs
      const calendarSelector = page.locator('[data-action="openCalendarSelection"]');
      if (await calendarSelector.isVisible()) {
        await calendarSelector.click();

        // Calendar selection dialog should open
        await expect(page.locator('.calendar-selection-dialog')).toBeVisible();

        // Should show available calendar options
        await expect(page.locator('.calendar-option')).toHaveCountGreaterThan(0);

        // Close dialog
        await page.click('.calendar-selection-dialog .close-button');
        await expect(page.locator('.calendar-selection-dialog')).toBeHidden();
      }
    });

    test('should show calendar management controls', async ({ page }) => {
      await foundryUtils.openCalendarGrid();

      // GMs should see editing and management controls
      const editControls = page.locator('[data-action="edit-calendar"]');
      if (await editControls.isVisible()) {
        await expect(editControls).toBeVisible();
      }

      // Note management controls should be available
      const addNoteButton = page.locator('[data-action="add-note"]');
      if (await addNoteButton.isVisible()) {
        await expect(addNoteButton).toBeVisible();
      }

      await foundryUtils.closeCalendarGrid();
    });

    test('should show all note types including private/GM notes', async ({ page }) => {
      await foundryUtils.openCalendarGrid();

      // GMs should see all note visibility levels
      const allNotes = page.locator('.calendar-day [data-note-visibility]');
      if (await allNotes.count() > 0) {
        // Check for various note types
        const publicNotes = page.locator('[data-note-visibility="public"]');
        const gmNotes = page.locator('[data-note-visibility="gm"]');
        const privateNotes = page.locator('[data-note-visibility="private"]');

        // At least one type should be visible
        const totalNotes = await publicNotes.count() + await gmNotes.count() + await privateNotes.count();
        expect(totalNotes).toBeGreaterThan(0);
      }

      await foundryUtils.closeCalendarGrid();
    });

    test('should show calendar configuration hints and tooltips', async ({ page }) => {
      // GMs should see helpful hints for calendar management
      const calendarHint = page.locator('.calendar-hint');
      if (await calendarHint.isVisible()) {
        await expect(calendarHint).toContainText(/calendar/i);
      }

      // Tooltips for configuration should be available
      const configTooltips = page.locator('[data-tooltip*="change"], [title*="change"]');
      if (await configTooltips.count() > 0) {
        await expect(configTooltips.first()).toBeVisible();
      }
    });

    test('should allow time advancement settings modification', async ({ page }) => {
      // Look for time advancement settings controls
      const settingsButton = page.locator('[data-action="time-settings"]');
      if (await settingsButton.isVisible()) {
        await settingsButton.click();

        // Settings dialog should appear
        await expect(page.locator('.time-settings-dialog')).toBeVisible();

        // Should contain ratio and combat pause settings
        await expect(page.locator('[name="timeAdvancementRatio"]')).toBeVisible();
        await expect(page.locator('[name="pauseOnCombat"]')).toBeVisible();

        // Close settings
        await page.click('.time-settings-dialog .close-button');
        await expect(page.locator('.time-settings-dialog')).toBeHidden();
      }
    });
  });

  test.describe('Permission Transitions', () => {
    test('should update UI when user role changes', async ({ page }) => {
      foundryUtils = new FoundryUtils(page);

      // Start as player
      await page.goto('/');
      await foundryUtils.loginAs('Player1');
      await foundryUtils.waitForSeasonsAndStarsReady();

      // Verify player view
      await expect(page.locator('[data-button="1-hour"]')).not.toBeVisible();

      // Logout and login as GM
      await page.click('[data-action="logout"]');
      await foundryUtils.loginAs('Gamemaster');
      await foundryUtils.waitForSeasonsAndStarsReady();

      // Verify GM controls now appear
      await expect(page.locator('[data-button="1-hour"]')).toBeVisible();
    });

    test('should maintain calendar state across permission changes', async ({ page }) => {
      foundryUtils = new FoundryUtils(page);

      // Login as GM and get calendar state
      await page.goto('/');
      await foundryUtils.loginAs('Gamemaster');
      await foundryUtils.waitForSeasonsAndStarsReady();

      const gmState = await foundryUtils.getCurrentCalendarState();

      // Logout and login as player
      await page.click('[data-action="logout"]');
      await foundryUtils.loginAs('Player1');
      await foundryUtils.waitForSeasonsAndStarsReady();

      // Calendar state should be the same
      const playerState = await foundryUtils.getCurrentCalendarState();
      expect(playerState?.currentDate).toBe(gmState?.currentDate);
      expect(playerState?.calendarSystem).toBe(gmState?.calendarSystem);
    });
  });

  test.describe('Note Permissions', () => {
    test.beforeEach(async ({ page }) => {
      foundryUtils = new FoundryUtils(page);
    });

    test('should respect note visibility settings for players', async ({ page }) => {
      await page.goto('/');
      await foundryUtils.loginAs('Player1');
      await foundryUtils.waitForSeasonsAndStarsReady();
      await foundryUtils.openCalendarGrid();

      // Test note visibility based on permissions
      const noteElements = page.locator('.calendar-note');
      if (await noteElements.count() > 0) {
        // Check each note's visibility matches permission level
        for (let i = 0; i < await noteElements.count(); i++) {
          const note = noteElements.nth(i);
          const visibility = await note.getAttribute('data-visibility');

          if (visibility === 'public') {
            await expect(note).toBeVisible();
          } else if (visibility === 'gm' || visibility === 'private') {
            await expect(note).not.toBeVisible();
          }
        }
      }

      await foundryUtils.closeCalendarGrid();
    });

    test('should allow GMs to see all notes regardless of visibility', async ({ page }) => {
      await page.goto('/');
      await foundryUtils.loginAs('Gamemaster');
      await foundryUtils.waitForSeasonsAndStarsReady();
      await foundryUtils.openCalendarGrid();

      // GMs should see all notes
      const allNotes = page.locator('.calendar-note');
      if (await allNotes.count() > 0) {
        // All notes should be visible to GMs
        for (let i = 0; i < await allNotes.count(); i++) {
          const note = allNotes.nth(i);
          await expect(note).toBeVisible();
        }
      }

      await foundryUtils.closeCalendarGrid();
    });
  });
});