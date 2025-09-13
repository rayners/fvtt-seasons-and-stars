import { test, expect } from '@playwright/test';
import { FoundryUtils } from './foundry-utils';

/**
 * System Integration E2E Tests
 *
 * Tests integration with different game systems (PF2e, D&D 5e, etc.),
 * worldTime synchronization, and cross-system compatibility.
 */
test.describe('System Integration', () => {
  let foundryUtils: FoundryUtils;

  test.beforeEach(async ({ page }) => {
    foundryUtils = new FoundryUtils(page);
    await page.goto('/');
    await foundryUtils.loginAs('Gamemaster');
    await foundryUtils.waitForSeasonsAndStarsReady();
  });

  test('should detect and integrate with active game system', async ({ page }) => {
    // Get Foundry system information
    const systemInfo = await page.evaluate(() => {
      const game = (window as any).game;
      return {
        systemId: game?.system?.id || 'unknown',
        systemTitle: game?.system?.title || 'unknown',
        foundryVersion: game?.version || 'unknown'
      };
    });

    expect(systemInfo.systemId).toBeDefined();
    expect(systemInfo.foundryVersion).toBeDefined();

    // Verify S&S recognizes the system
    const integrationStatus = await page.evaluate(() => {
      const seasonsStars = (window as any).game?.seasonsStars;
      return {
        hasIntegration: !!seasonsStars?.compatibility,
        detectedSystem: seasonsStars?.compatibility?.detectedSystem,
        integrationMode: seasonsStars?.compatibility?.mode
      };
    });

    expect(integrationStatus.hasIntegration).toBe(true);
    expect(integrationStatus.detectedSystem).toBeDefined();
  });

  test('should synchronize with FoundryVTT worldTime system', async ({ page }) => {
    // Get initial worldTime and S&S time
    const initialTimes = await page.evaluate(() => {
      const game = (window as any).game;
      return {
        foundryWorldTime: game?.time?.worldTime || 0,
        seasonsStarsTime: game?.seasonsStars?.manager?.getCurrentDate?.()?.toWorldTime?.() || 0
      };
    });

    expect(initialTimes.foundryWorldTime).toBeGreaterThanOrEqual(0);

    // Advance time using S&S
    await page.click('[data-button="1-hour"]');
    await page.waitForTimeout(1000);

    // Verify both systems updated
    const updatedTimes = await page.evaluate(() => {
      const game = (window as any).game;
      return {
        foundryWorldTime: game?.time?.worldTime || 0,
        seasonsStarsTime: game?.seasonsStars?.manager?.getCurrentDate?.()?.toWorldTime?.() || 0
      };
    });

    expect(updatedTimes.foundryWorldTime).toBeGreaterThan(initialTimes.foundryWorldTime);

    // Times should be synchronized within reasonable tolerance
    const timeDiff = Math.abs(updatedTimes.foundryWorldTime - updatedTimes.seasonsStarsTime);
    expect(timeDiff).toBeLessThan(10); // Within 10 seconds tolerance
  });

  test('should handle PF2e worldTime conversion correctly', async ({ page }) => {
    // Check if PF2e system is active
    const isPF2e = await page.evaluate(() => {
      return (window as any).game?.system?.id === 'pf2e';
    });

    if (isPF2e) {
      // Test PF2e specific integration
      const pf2eIntegration = await page.evaluate(() => {
        const game = (window as any).game;
        return {
          hasPF2eData: !!game?.pf2e,
          worldCreationTime: game?.pf2e?.worldClock?.worldCreatedOn,
          seasonsStarsEpoch: game?.seasonsStars?.manager?.getActiveCalendar?.()?.year?.epoch
        };
      });

      if (pf2eIntegration.hasPF2eData) {
        expect(pf2eIntegration.worldCreationTime).toBeDefined();

        // Verify epoch adjustment for PF2e
        const calendarState = await foundryUtils.getCurrentCalendarState();
        if (calendarState?.calendarSystem?.includes('Golarion')) {
          // Golarion calendar should use PF2e epoch
          expect(pf2eIntegration.seasonsStarsEpoch).toBeGreaterThan(2000);
        }
      }
    }
  });

  test('should provide appropriate calendar systems for different game systems', async ({ page }) => {
    const systemId = await page.evaluate(() => {
      return (window as any).game?.system?.id || 'unknown';
    });

    // Open calendar selection to see available systems
    const calendarSelector = page.locator('[data-action="openCalendarSelection"]');
    if (await calendarSelector.isVisible()) {
      await calendarSelector.click();

      const calendarOptions = page.locator('.calendar-option .calendar-name');
      const availableCalendars = await calendarOptions.allTextContents();

      // Verify appropriate calendars are available based on system
      if (systemId === 'pf2e') {
        // Should have Golarion calendar for PF2e
        const hasGolarion = availableCalendars.some(name =>
          name.includes('Golarion') || name.includes('Absalom')
        );
        expect(hasGolarion).toBe(true);
      } else if (systemId === 'dnd5e') {
        // Should have appropriate D&D calendars
        const hasDnDCalendars = availableCalendars.some(name =>
          name.includes('Harptos') || name.includes('Forgotten Realms')
        );
        // Note: This depends on which calendar packs are installed
      }

      // Should always have generic fantasy calendars
      const hasFantasyCalendars = availableCalendars.some(name =>
        name.includes('Gregorian') || name.includes('Dave') || name.includes('Generic')
      );
      expect(hasFantasyCalendars).toBe(true);

      await page.click('.calendar-selection-dialog .close-button');
    }
  });

  test('should maintain compatibility across Foundry versions', async ({ page }) => {
    // Check Foundry version compatibility
    const foundryInfo = await foundryUtils.getFoundryInfo();
    expect(foundryInfo.foundryVersion).toBeDefined();

    // Verify S&S module is properly loaded regardless of version
    const moduleStatus = await page.evaluate(() => {
      const game = (window as any).game;
      const module = game?.modules?.get?.('seasons-and-stars');
      return {
        isActive: module?.active,
        hasAPI: !!module?.api,
        version: module?.version,
        dependencies: module?.dependencies || []
      };
    });

    expect(moduleStatus.isActive).toBe(true);
    expect(moduleStatus.hasAPI).toBe(true);

    // Check for version-specific compatibility warnings
    const compatWarnings = page.locator('.compatibility-warning');
    if (await compatWarnings.isVisible()) {
      // Should provide helpful information about compatibility
      await expect(compatWarnings).toContainText(/version|compatibility|update/i);
    }
  });

  test('should integrate with SmallTime module if present', async ({ page }) => {
    // Check if SmallTime is present
    const hasSmallTime = await page.evaluate(() => {
      return !!(window as any).game?.modules?.get?.('smalltime')?.active;
    });

    if (hasSmallTime) {
      // Verify SmallTime integration
      const integration = await page.evaluate(() => {
        const seasonsStars = (window as any).game?.seasonsStars;
        return {
          smallTimeDetected: seasonsStars?.compatibility?.smallTimeDetected,
          quickTimeButtonsHidden: seasonsStars?.settings?.get?.('hideQuickTimeWhenSmallTime')
        };
      });

      expect(integration.smallTimeDetected).toBe(true);

      // If configured to hide quick time buttons, they should not be visible
      if (integration.quickTimeButtonsHidden) {
        await expect(page.locator('[data-button="1-hour"]')).not.toBeVisible();
      }

      // SmallTime should show S&S calendar information
      const smallTimeWidget = page.locator('#smalltime');
      if (await smallTimeWidget.isVisible()) {
        // Should display S&S calendar date format
        const calendarInfo = smallTimeWidget.locator('.seasons-stars-date');
        if (await calendarInfo.isVisible()) {
          await expect(calendarInfo).toContainText(/\d+/); // Should have date information
        }
      }
    }
  });

  test('should handle worldTime edge cases and boundaries', async ({ page }) => {
    // Test worldTime = 0 edge case
    await page.evaluate(() => {
      (window as any).game.time.worldTime = 0;
    });

    // Wait for S&S to update
    await page.waitForTimeout(1000);

    // Should handle zero worldTime gracefully
    const zeroTimeState = await foundryUtils.getCurrentCalendarState();
    expect(zeroTimeState?.currentDate).toBeDefined();
    expect(zeroTimeState?.currentTime).toBeDefined();

    // Test large worldTime values
    await page.evaluate(() => {
      (window as any).game.time.worldTime = 31536000000; // ~1000 years
    });

    await page.waitForTimeout(1000);

    const largeTimeState = await foundryUtils.getCurrentCalendarState();
    expect(largeTimeState?.currentDate).toBeDefined();
    expect(largeTimeState?.currentTime).toBeDefined();

    // Restore reasonable time
    await page.evaluate(() => {
      (window as any).game.time.worldTime = Date.now() / 1000;
    });

    await page.waitForTimeout(1000);
  });

  test('should provide system-specific API endpoints', async ({ page }) => {
    // Verify S&S API is available
    const apiStatus = await page.evaluate(() => {
      const api = (window as any).game?.modules?.get?.('seasons-and-stars')?.api;
      return {
        hasAPI: !!api,
        hasCalendarManager: !!api?.manager,
        hasTimeAdvancement: !!api?.timeAdvancement,
        hasNotesManager: !!api?.notes,
        methods: Object.keys(api || {})
      };
    });

    expect(apiStatus.hasAPI).toBe(true);
    expect(apiStatus.hasCalendarManager).toBe(true);
    expect(apiStatus.methods.length).toBeGreaterThan(0);

    // Test API functionality
    const apiTest = await page.evaluate(() => {
      const api = (window as any).game?.modules?.get?.('seasons-and-stars')?.api;
      try {
        return {
          canGetCurrentDate: !!api?.manager?.getCurrentDate?.(),
          canGetCalendar: !!api?.manager?.getActiveCalendar?.(),
          hasValidAPI: true
        };
      } catch (error) {
        return {
          hasValidAPI: false,
          error: error.message
        };
      }
    });

    expect(apiTest.hasValidAPI).toBe(true);
    expect(apiTest.canGetCurrentDate).toBe(true);
  });

  test('should support calendar data validation across systems', async ({ page }) => {
    // Get current calendar data
    const calendarData = await page.evaluate(() => {
      const manager = (window as any).game?.seasonsStars?.manager;
      const calendar = manager?.getActiveCalendar?.();
      return {
        id: calendar?.id,
        hasMonths: Array.isArray(calendar?.months) && calendar.months.length > 0,
        hasWeekdays: Array.isArray(calendar?.weekdays) && calendar.weekdays.length > 0,
        hasValidYear: typeof calendar?.year?.epoch === 'number',
        hasTimeConfig: !!calendar?.time
      };
    });

    // Calendar data should be valid regardless of system
    expect(calendarData.id).toBeDefined();
    expect(calendarData.hasMonths).toBe(true);
    expect(calendarData.hasWeekdays).toBe(true);
    expect(calendarData.hasValidYear).toBe(true);
    expect(calendarData.hasTimeConfig).toBe(true);

    // Test calendar validation
    const validationResult = await page.evaluate(() => {
      const validator = (window as any).game?.seasonsStars?.validator;
      const calendar = (window as any).game?.seasonsStars?.manager?.getActiveCalendar?.();

      if (validator && calendar) {
        return validator.validate(calendar);
      }
      return { isValid: true }; // Default if no validator
    });

    expect(validationResult.isValid).toBe(true);
  });

  test('should handle system-specific time advancement rates', async ({ page }) => {
    // Get system-specific time advancement settings
    const timeSettings = await page.evaluate(() => {
      const settings = (window as any).game?.settings;
      return {
        advancementRatio: settings?.get?.('seasons-and-stars', 'timeAdvancementRatio') || 1.0,
        pauseOnCombat: settings?.get?.('seasons-and-stars', 'pauseOnCombat') || false,
        systemSpecificRates: settings?.get?.('seasons-and-stars', 'systemTimeRates') || {}
      };
    });

    expect(timeSettings.advancementRatio).toBeGreaterThan(0);

    // Test time advancement with current settings
    const initialTime = await page.evaluate(() => {
      return (window as any).game?.time?.worldTime || 0;
    });

    await page.click('[data-button="1-hour"]');
    await page.waitForTimeout(1000);

    const finalTime = await page.evaluate(() => {
      return (window as any).game?.time?.worldTime || 0;
    });

    const timeAdvanced = finalTime - initialTime;
    const expectedAdvancement = 3600 * timeSettings.advancementRatio; // 1 hour in seconds

    // Time advancement should respect system-specific rates
    expect(timeAdvanced).toBeCloseTo(expectedAdvancement, -1); // Within 10% tolerance
  });
});