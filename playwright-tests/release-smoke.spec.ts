import { test, expect } from '@playwright/test';
import { FoundryUtils } from './foundry-utils';

/**
 * Core release smoke tests for Seasons & Stars.
 *
 * These tests focus on the fundamental workflows we want to validate
 * before cutting a release. They intentionally avoid deep configuration
 * scenarios so they remain fast and reliable.
 */
test.describe('Release Core Smoke Suite', () => {
  test.describe.configure({ mode: 'serial' });

  let foundryUtils: FoundryUtils;

  test.beforeEach(async ({ page }) => {
    foundryUtils = new FoundryUtils(page);
    await page.goto('/');
  });

  test.afterEach(async () => {
    await foundryUtils.closeNoteCreationDialog();
    await foundryUtils.closeCalendarGrid();
    await foundryUtils.hideMiniWidget();
    await foundryUtils.showMainWidget().catch(() => undefined);
  });

  test('@release-core GM sees calendar widget with current state', async ({ page }) => {
    await test.step('Login as Gamemaster', async () => {
      await foundryUtils.loginAndWait('Gamemaster');
    });

    const state = await test.step('Capture widget state', async () => {
      return await foundryUtils.getCurrentCalendarState();
    });

    expect(state?.isVisible).toBe(true);
    expect(state?.calendarSystem).toBeTruthy();
    expect(state?.currentDate).toMatch(/\d/);
    expect(state?.currentTime).toMatch(/\d{2}:\d{2}/);

    await test.step('Log environment info', async () => {
      const info = await foundryUtils.getFoundryInfo();
      console.log('[release-core] Foundry info', info);
    });
  });

  test('@release-core GM quick time controls advance world time', async ({ page }) => {
    await test.step('Login as Gamemaster', async () => {
      await foundryUtils.loginAndWait('Gamemaster');
    });

    const initialWorldTime = await test.step('Read initial world time', async () => {
      return await foundryUtils.getCurrentWorldTime();
    });

    await test.step('Advance time via quick control', async () => {
      await page.click('#seasons-stars-widget [data-action="advanceDate"][data-amount="60"][data-unit="minutes"]');
      await foundryUtils.waitForTimeAdvancement();
    });

    const newWorldTime = await test.step('Read new world time', async () => {
      return await foundryUtils.getCurrentWorldTime();
    });

    const timeDisplay = await foundryUtils.getCurrentCalendarState();

    expect(newWorldTime).toBeGreaterThan(initialWorldTime);
    if (timeDisplay?.currentTime) {
      expect(timeDisplay.currentTime).toMatch(/\d{1,2}:\d{2}/);
    }
  });

  test('@release-core Mini widget renders compact info', async ({ page }) => {
    await test.step('Login as Gamemaster', async () => {
      await foundryUtils.loginAndWait('Gamemaster');
    });

    await test.step('Show mini widget', async () => {
      await foundryUtils.showMiniWidget();
    });

    const miniWidget = page.locator('#seasons-stars-mini-widget');
    await expect(miniWidget).toBeVisible();

    const miniDate = (await miniWidget.locator('.mini-date').first().textContent())?.trim();
    expect(miniDate && miniDate.length).toBeTruthy();

    const miniTimeLocator = miniWidget.locator('.mini-time').first();
    if (await miniTimeLocator.count()) {
      const miniTime = (await miniTimeLocator.textContent())?.trim();
      if (miniTime && miniTime.length > 0) {
        expect(miniTime).toMatch(/\d{1,2}:\d{2}/);
      }
    }

    await test.step('Restore main widget', async () => {
      await foundryUtils.showMainWidget();
      await foundryUtils.hideMiniWidget();
    });
  });

  test('@release-core Calendar grid opens and navigates', async ({ page }) => {
    await test.step('Login as Gamemaster', async () => {
      await foundryUtils.loginAndWait('Gamemaster');
    });

    await test.step('Open calendar grid', async () => {
      await foundryUtils.openCalendarGrid();
    });

    const monthNameLocator = page.locator('#seasons-stars-grid-widget .month-name');
    await expect(monthNameLocator).toBeVisible();
    const initialMonth = (await monthNameLocator.textContent())?.trim();

    await test.step('Navigate to next month if available', async () => {
      const nextButton = page.locator('#seasons-stars-grid-widget [data-action="nextMonth"], button:has-text("Next Month")');
      if (await nextButton.count()) {
        await nextButton.first().click();
        await page.waitForTimeout(500);
      }
    });

    const nextMonth = (await monthNameLocator.textContent())?.trim();
    if (initialMonth && nextMonth) {
      expect(nextMonth).not.toBe(initialMonth);
    }

    await test.step('Verify today marker', async () => {
      const highlightLocator = page.locator(
        '#seasons-stars-grid-widget .calendar-day[class*="today"], #seasons-stars-grid-widget .calendar-day.selected'
      );
      expect(await highlightLocator.count()).toBeGreaterThan(0);
    });
  });

  test('@release-core Note creation dialog opens for GM', async ({ page }) => {
    await test.step('Login as Gamemaster', async () => {
      await foundryUtils.loginAndWait('Gamemaster');
    });

    await test.step('Open note creation dialog', async () => {
      await foundryUtils.openNoteCreationDialog();
    });

    const noteForm = page.locator('.seasons-stars-note-form');
    await expect(noteForm).toBeVisible();
    await expect(noteForm.locator('[name="title"]').first()).toBeVisible();
    await expect(noteForm.locator('[name="content"]').first()).toBeVisible();
    await expect(noteForm.locator('select[name="category"]').first()).toBeVisible();

    await test.step('Close note creation dialog', async () => {
      await foundryUtils.closeNoteCreationDialog();
    });
  });

  test('@release-core Player sees read-only calendar', async ({ page }) => {
    await test.step('Login as Player', async () => {
      await foundryUtils.loginAndWait('TestPlayer');
    });

    const state = await foundryUtils.getCurrentCalendarState();
    expect(state?.isVisible).toBe(true);

    await test.step('Verify GM controls are hidden', async () => {
      const gmControls = page.locator(
        '#seasons-stars-widget [data-action="advanceDate"], #seasons-stars-widget [data-action="toggleTimeAdvancement"]'
      );
      const gmControlsCount = await gmControls.count();
      if (gmControlsCount > 0) {
        await expect(gmControls).not.toBeVisible();
      } else {
        expect(gmControlsCount).toBe(0);
      }
    });

    await test.step('Open calendar grid', async () => {
      await foundryUtils.openCalendarGrid();
    });

    const dayCount = await page.locator('#seasons-stars-grid-widget .calendar-day[data-day]').count();
    expect(dayCount).toBeGreaterThan(0);

    await test.step('Ensure player cannot see note creation actions', async () => {
      const addNoteButton = page.locator(
        '#seasons-stars-grid-widget [data-action="createNote"], #seasons-stars-grid-widget [data-action="add-note"], #seasons-stars-grid-widget .add-note-button'
      );
      const addButtonCount = await addNoteButton.count();
      if (addButtonCount > 0) {
        await expect(addNoteButton).not.toBeVisible();
      } else {
        expect(addButtonCount).toBe(0);
      }
    });
  });
});
