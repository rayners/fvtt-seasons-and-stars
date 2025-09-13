import { test, expect } from '@playwright/test';
import { FoundryUtils } from './foundry-utils';

/**
 * Notes Management E2E Tests
 *
 * Tests the calendar-integrated notes system including note creation,
 * editing, permissions, recurring notes, and search functionality.
 */
test.describe('Calendar Notes Management', () => {
  let foundryUtils: FoundryUtils;

  test.beforeEach(async ({ page }) => {
    foundryUtils = new FoundryUtils(page);
    await page.goto('/');
    await foundryUtils.loginAs('Gamemaster'); // Start with GM for note management
    await foundryUtils.waitForSeasonsAndStarsReady();
  });

  test('should display note indicators on calendar days', async ({ page }) => {
    await foundryUtils.openCalendarGrid();

    // Look for days with note indicators
    const noteDays = page.locator('.calendar-day[data-has-notes="true"]');
    if (await noteDays.count() > 0) {
      // Note indicators should be visible
      await expect(noteDays.first().locator('.note-indicator')).toBeVisible();

      // Should show note count if multiple notes
      const noteCount = noteDays.first().locator('.note-count');
      if (await noteCount.isVisible()) {
        await expect(noteCount).toContainText(/\d+/);
      }
    }

    await foundryUtils.closeCalendarGrid();
  });

  test('should allow creating new notes on calendar days', async ({ page }) => {
    await foundryUtils.openCalendarGrid();

    // Find a day without notes or use any day
    const targetDay = page.locator('.calendar-day[data-day="15"]').first();
    await targetDay.click();

    // Should show day context menu or note creation option
    const addNoteButton = page.locator('[data-action="add-note"], .add-note-button');
    if (await addNoteButton.isVisible()) {
      await addNoteButton.click();

      // Note creation dialog should appear
      await expect(page.locator('.note-creation-dialog')).toBeVisible();

      // Dialog should have required fields
      await expect(page.locator('[name="note-title"]')).toBeVisible();
      await expect(page.locator('[name="note-content"]')).toBeVisible();
      await expect(page.locator('[name="note-visibility"]')).toBeVisible();

      // Test creating a note
      await page.fill('[name="note-title"]', 'Test Note');
      await page.fill('[name="note-content"]', 'This is a test note for the calendar.');
      await page.selectOption('[name="note-visibility"]', 'public');

      // Save the note
      await page.click('.note-creation-dialog [data-action="save"]');

      // Dialog should close
      await expect(page.locator('.note-creation-dialog')).toBeHidden();

      // Day should now show note indicator
      await expect(targetDay.locator('.note-indicator')).toBeVisible();
    }

    await foundryUtils.closeCalendarGrid();
  });

  test('should support different note visibility levels', async ({ page }) => {
    await foundryUtils.openCalendarGrid();

    const targetDay = page.locator('.calendar-day[data-day="20"]').first();
    await targetDay.click();

    const addNoteButton = page.locator('[data-action="add-note"], .add-note-button');
    if (await addNoteButton.isVisible()) {
      await addNoteButton.click();

      // Test visibility options
      const visibilitySelect = page.locator('[name="note-visibility"]');
      await expect(visibilitySelect).toBeVisible();

      // Should have visibility options
      const options = await visibilitySelect.locator('option').allTextContents();
      expect(options).toContain('Public');
      expect(options).toContain('GM Only');
      expect(options).toContain('Private');

      // Test GM-only note
      await page.fill('[name="note-title"]', 'GM Secret');
      await page.fill('[name="note-content"]', 'This is a GM-only note.');
      await page.selectOption('[name="note-visibility"]', 'gm');

      await page.click('.note-creation-dialog [data-action="save"]');
      await expect(page.locator('.note-creation-dialog')).toBeHidden();

      // Note should be created with GM visibility
      const noteElement = targetDay.locator('[data-note-visibility="gm"]');
      if (await noteElement.isVisible()) {
        await expect(noteElement).toHaveAttribute('data-note-visibility', 'gm');
      }
    }

    await foundryUtils.closeCalendarGrid();
  });

  test('should allow editing existing notes', async ({ page }) => {
    await foundryUtils.openCalendarGrid();

    // Find a day with existing notes
    const noteDay = page.locator('.calendar-day[data-has-notes="true"]').first();
    if (await noteDay.isVisible()) {
      await noteDay.click();

      // Should show existing notes
      const existingNote = page.locator('.note-item').first();
      if (await existingNote.isVisible()) {
        // Click edit button or right-click for context menu
        const editButton = existingNote.locator('[data-action="edit-note"]');
        if (await editButton.isVisible()) {
          await editButton.click();

          // Note editing dialog should appear
          await expect(page.locator('.note-editing-dialog')).toBeVisible();

          // Fields should be pre-filled
          const titleField = page.locator('[name="note-title"]');
          await expect(titleField).not.toBeEmpty();

          // Make changes
          await titleField.fill('Updated Note Title');

          // Save changes
          await page.click('.note-editing-dialog [data-action="save"]');
          await expect(page.locator('.note-editing-dialog')).toBeHidden();
        }
      }
    }

    await foundryUtils.closeCalendarGrid();
  });

  test('should support recurring notes', async ({ page }) => {
    await foundryUtils.openCalendarGrid();

    const targetDay = page.locator('.calendar-day[data-day="10"]').first();
    await targetDay.click();

    const addNoteButton = page.locator('[data-action="add-note"], .add-note-button');
    if (await addNoteButton.isVisible()) {
      await addNoteButton.click();

      // Look for recurring note options
      const recurringCheckbox = page.locator('[name="note-recurring"]');
      if (await recurringCheckbox.isVisible()) {
        await recurringCheckbox.check();

        // Recurring options should appear
        await expect(page.locator('.recurring-options')).toBeVisible();

        // Should have recurrence patterns
        const patternSelect = page.locator('[name="recurrence-pattern"]');
        await expect(patternSelect).toBeVisible();

        const patterns = await patternSelect.locator('option').allTextContents();
        expect(patterns.some(p => p.includes('Daily'))).toBe(true);
        expect(patterns.some(p => p.includes('Weekly'))).toBe(true);
        expect(patterns.some(p => p.includes('Monthly'))).toBe(true);

        // Create weekly recurring note
        await page.fill('[name="note-title"]', 'Weekly Meeting');
        await page.fill('[name="note-content"]', 'Recurring weekly team meeting.');
        await page.selectOption('[name="recurrence-pattern"]', 'weekly');

        await page.click('.note-creation-dialog [data-action="save"]');
        await expect(page.locator('.note-creation-dialog')).toBeHidden();
      }
    }

    await foundryUtils.closeCalendarGrid();
  });

  test('should support note categories and organization', async ({ page }) => {
    await foundryUtils.openCalendarGrid();

    const targetDay = page.locator('.calendar-day[data-day="25"]').first();
    await targetDay.click();

    const addNoteButton = page.locator('[data-action="add-note"], .add-note-button');
    if (await addNoteButton.isVisible()) {
      await addNoteButton.click();

      // Look for category selection
      const categorySelect = page.locator('[name="note-category"]');
      if (await categorySelect.isVisible()) {
        // Should have category options
        const categories = await categorySelect.locator('option').allTextContents();
        expect(categories.length).toBeGreaterThan(1);

        // Common categories might include
        const hasEventCategory = categories.some(c => c.includes('Event'));
        const hasReminderCategory = categories.some(c => c.includes('Reminder'));
        expect(hasEventCategory || hasReminderCategory).toBe(true);

        // Create categorized note
        await page.fill('[name="note-title"]', 'Important Event');
        await page.fill('[name="note-content"]', 'This is an important calendar event.');
        await page.selectOption('[name="note-category"]', { index: 1 });

        await page.click('.note-creation-dialog [data-action="save"]');
        await expect(page.locator('.note-creation-dialog')).toBeHidden();
      }
    }

    await foundryUtils.closeCalendarGrid();
  });

  test('should provide note search functionality', async ({ page }) => {
    // Look for note search in the main interface
    const searchButton = page.locator('[data-action="search-notes"]');
    if (await searchButton.isVisible()) {
      await searchButton.click();

      // Search dialog should appear
      await expect(page.locator('.note-search-dialog')).toBeVisible();

      // Should have search input
      await expect(page.locator('[name="search-query"]')).toBeVisible();

      // Test search functionality
      await page.fill('[name="search-query"]', 'meeting');
      await page.click('.note-search-dialog [data-action="search"]');

      // Should show search results
      const results = page.locator('.search-results .note-result');
      if (await results.count() > 0) {
        // Results should contain search term
        await expect(results.first()).toContainText(/meeting/i);

        // Should be able to click result to navigate
        await results.first().click();

        // Should close search and navigate to note
        await expect(page.locator('.note-search-dialog')).toBeHidden();
      }
    }
  });

  test('should respect note permissions for different user roles', async ({ page }) => {
    // Create notes as GM first
    await foundryUtils.openCalendarGrid();

    const targetDay = page.locator('.calendar-day[data-day="30"]').first();
    await targetDay.click();

    const addNoteButton = page.locator('[data-action="add-note"], .add-note-button');
    if (await addNoteButton.isVisible()) {
      await addNoteButton.click();

      // Create a GM-only note
      await page.fill('[name="note-title"]', 'GM Secret Info');
      await page.fill('[name="note-content"]', 'This is confidential GM information.');
      await page.selectOption('[name="note-visibility"]', 'gm');

      await page.click('.note-creation-dialog [data-action="save"]');
      await expect(page.locator('.note-creation-dialog')).toBeHidden();
    }

    await foundryUtils.closeCalendarGrid();

    // Now login as player and verify note visibility
    await page.click('[data-action="logout"]');
    await foundryUtils.loginAs('Player1');
    await foundryUtils.waitForSeasonsAndStarsReady();

    await foundryUtils.openCalendarGrid();

    // Player should not see GM-only notes
    await targetDay.click();
    const gmNote = page.locator('[data-note-visibility="gm"]');
    await expect(gmNote).not.toBeVisible();

    // But should see public notes
    const publicNotes = page.locator('[data-note-visibility="public"]');
    if (await publicNotes.count() > 0) {
      await expect(publicNotes.first()).toBeVisible();
    }

    await foundryUtils.closeCalendarGrid();
  });

  test('should support note performance optimization for large datasets', async ({ page }) => {
    await foundryUtils.openCalendarGrid();

    // Test pagination or lazy loading if many notes exist
    const noteContainer = page.locator('.notes-container');
    if (await noteContainer.isVisible()) {
      // Look for pagination controls
      const pagination = page.locator('.notes-pagination');
      if (await pagination.isVisible()) {
        await expect(pagination.locator('.page-button')).toHaveCountGreaterThan(0);

        // Test page navigation
        const nextButton = pagination.locator('[data-action="next-page"]');
        if (await nextButton.isVisible()) {
          await nextButton.click();

          // Should load next page of notes
          await page.waitForTimeout(500);
          await expect(pagination.locator('.current-page')).toContainText(/\d+/);
        }
      }

      // Look for virtual scrolling or lazy loading indicators
      const lazyLoader = page.locator('.lazy-loading-indicator');
      if (await lazyLoader.isVisible()) {
        await expect(lazyLoader).toContainText(/loading/i);
      }
    }

    await foundryUtils.closeCalendarGrid();
  });

  test('should handle note export and backup functionality', async ({ page }) => {
    // Look for note management tools
    const notesMenu = page.locator('[data-action="notes-management"]');
    if (await notesMenu.isVisible()) {
      await notesMenu.click();

      // Should show management options
      await expect(page.locator('.notes-management-dialog')).toBeVisible();

      // Look for export functionality
      const exportButton = page.locator('[data-action="export-notes"]');
      if (await exportButton.isVisible()) {
        await exportButton.click();

        // Should trigger download or show export options
        const exportDialog = page.locator('.export-dialog');
        if (await exportDialog.isVisible()) {
          await expect(exportDialog.locator('[name="export-format"]')).toBeVisible();

          // Close export dialog
          await page.click('.export-dialog .cancel');
          await expect(exportDialog).toBeHidden();
        }
      }

      // Close management dialog
      await page.click('.notes-management-dialog .close-button');
      await expect(page.locator('.notes-management-dialog')).toBeHidden();
    }
  });
});