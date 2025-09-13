import { Page, expect } from '@playwright/test';

/**
 * FoundryVTT Utility Functions for Playwright Tests
 * 
 * These utilities were developed based on actual exploration of FoundryVTT
 * using the Playwright MCP integration.
 */

export class FoundryUtils {
  
  constructor(private page: Page) {}

  /**
   * Login to FoundryVTT as a specific user
   * Based on working headless test patterns
   */
  async loginAs(username: 'Administrator' | 'Gamemaster' | 'TestGM' | 'TestPlayer' = 'Administrator') {
    // Wait for user select dropdown to be available
    const userSelect = this.page.locator('select[name="userid"]');
    await userSelect.waitFor({ timeout: 15000 });

    // Select user by label (display name)
    await userSelect.selectOption({ label: username });

    // Click join button
    await this.page.click('button[type="submit"]:has-text("Join Game Session")');

    // Wait for game to load
    await this.page.waitForLoadState('networkidle');

    // Wait for game interface to appear
    await this.page.waitForSelector('#sidebar, #ui-left, .vtt.game', { timeout: 30000 });
  }

  /**
   * Wait for Seasons & Stars module to be fully loaded
   * Based on actual UI elements from screenshots
   */
  async waitForSeasonsAndStarsReady() {
    // Wait for module scripts to load
    await this.page.waitForFunction(
      () => window.game?.modules?.get?.('seasons-and-stars')?.active === true,
      { timeout: 15000 }
    );

    // Wait for S&S API to be available
    await this.page.waitForFunction(
      () => window.game?.seasonsStars?.manager !== undefined,
      { timeout: 15000 }
    );

    // Look for the actual S&S UI elements we can see in the screenshot
    // The dialog/widget might be open initially, or look for calendar-related elements
    await this.page.waitForSelector('.calendar-system-name, .current-date, [data-module="seasons-and-stars"], .seasons-stars', { timeout: 15000 });
  }

  /**
   * Get current calendar state from the widget
   * Based on observed widget structure
   */
  async getCurrentCalendarState() {
    return await this.page.evaluate(() => {
      const widget = document.querySelector('#seasons-stars-widget');
      if (!widget) return null;
      
      return {
        calendarSystem: widget.querySelector('.calendar-system-name')?.textContent?.trim(),
        currentDate: widget.querySelector('.current-date')?.textContent?.trim(),
        currentTime: widget.querySelector('.current-time')?.textContent?.trim(),
        isVisible: widget.offsetHeight > 0 && widget.offsetWidth > 0,
      };
    });
  }

  /**
   * Open the calendar grid modal
   * Based on successful exploration
   */
  async openCalendarGrid() {
    await this.page.click('[data-action="open-calendar-grid"], .current-date');
    await this.page.waitForSelector('#seasons-stars-grid-widget', { 
      state: 'visible',
      timeout: 5000 
    });
    
    // Wait for calendar data to load
    await this.page.waitForSelector('.calendar-day[data-day]', { timeout: 5000 });
  }

  /**
   * Close the calendar grid modal
   * Based on successful exploration
   */
  async closeCalendarGrid() {
    await this.page.click('#seasons-stars-grid-widget .close-button');
    await this.page.waitForSelector('#seasons-stars-grid-widget', { 
      state: 'hidden',
      timeout: 5000 
    });
  }

  /**
   * Get calendar grid data
   * Based on observed calendar structure
   */
  async getCalendarGridData() {
    await this.openCalendarGrid();
    
    return await this.page.evaluate(() => {
      const grid = document.querySelector('#seasons-stars-grid-widget');
      if (!grid) return null;
      
      const monthName = grid.querySelector('.month-name')?.textContent?.trim();
      const year = grid.querySelector('.year-display')?.textContent?.trim();
      
      // Get all calendar days with their data
      const days = Array.from(grid.querySelectorAll('.calendar-day[data-day]')).map(day => {
        const dayElement = day as HTMLElement;
        return {
          day: parseInt(dayElement.dataset.day || '0'),
          date: dayElement.dataset.date,
          isToday: dayElement.textContent?.includes('TODAY') || false,
          moonPhases: dayElement.querySelector('.moon-phases')?.textContent?.trim(),
          tooltip: dayElement.title,
        };
      });
      
      const weekDays = Array.from(grid.querySelectorAll('.calendar-weekday'))
        .map(el => el.textContent?.trim());
      
      return {
        monthName,
        year,
        weekDays,
        days,
        totalDays: days.length,
      };
    });
  }

  /**
   * Verify module console logs for proper initialization
   * Based on observed loading patterns
   */
  async verifyModuleLoading() {
    const logs = await this.page.evaluate(() => {
      // Get console messages from the page
      return Array.from(document.querySelectorAll('script')).some(script => 
        script.src.includes('seasons-and-stars')
      );
    });
    
    expect(logs).toBe(true);
    
    // Check for specific S&S initialization messages
    const consoleMessages = [];
    this.page.on('console', msg => {
      if (msg.text().includes('[S&S]') || msg.text().includes('Seasons and Stars')) {
        consoleMessages.push(msg.text());
      }
    });
    
    return consoleMessages;
  }

  /**
   * Wait for any FoundryVTT dialogs to close
   * Utility method for cleaning up UI state
   */
  async closeAllDialogs() {
    const dialogs = await this.page.locator('.dialog .close').all();
    for (const dialog of dialogs) {
      try {
        await dialog.click({ timeout: 1000 });
      } catch {
        // Ignore if dialog is already closed
      }
    }
  }

  /**
   * Take a screenshot with a descriptive name
   * Useful for debugging test failures
   */
  async screenshotWithName(name: string) {
    await this.page.screenshot({ 
      path: `playwright-tests/screenshots/${name}-${Date.now()}.png`,
      fullPage: true 
    });
  }

  /**
   * Get Foundry version and active modules
   * Useful for test environment verification
   */
  async getFoundryInfo() {
    return await this.page.evaluate(() => {
      return {
        foundryVersion: (window as any).game?.version || 'unknown',
        activeModules: Array.from((window as any).game?.modules?.entries() || [])
          .filter(([_, module]) => module.active)
          .map(([id, module]) => ({ id, title: module.title })),
        worldTitle: (window as any).game?.world?.title || 'unknown',
        systemId: (window as any).game?.system?.id || 'unknown',
        systemTitle: (window as any).game?.system?.title || 'unknown',
      };
    });
  }

  /**
   * Get current worldTime from Foundry
   * Useful for time advancement testing
   */
  async getCurrentWorldTime() {
    return await this.page.evaluate(() => {
      return (window as any).game?.time?.worldTime || 0;
    });
  }

  /**
   * Set world time using Foundry's proper API (GM only)
   * Uses game.time.set(worldTime) as per Foundry docs
   */
  async setWorldTime(worldTime: number) {
    return await this.page.evaluate((time) => {
      const game = (window as any).game;
      if (game?.time?.set && game?.user?.isGM) {
        return game.time.set(time);
      }
      return false;
    }, worldTime);
  }

  /**
   * Advance world time using Foundry's proper API (GM only)
   * Uses game.time.advance(seconds, options) as per Foundry docs
   */
  async advanceWorldTime(seconds: number, options: any = {}) {
    return await this.page.evaluate((advanceSeconds, advanceOptions) => {
      const game = (window as any).game;
      if (game?.time?.advance && game?.user?.isGM) {
        return game.time.advance(advanceSeconds, advanceOptions);
      }
      return false;
    }, seconds, options);
  }

  /**
   * Wait for time advancement to complete
   * Useful after calling time advancement methods
   */
  async waitForTimeAdvancement(timeoutMs: number = 2000) {
    // Wait for any time advancement animations or updates
    await this.page.waitForTimeout(500);

    // Wait for stability in the time display
    await this.page.waitForFunction(
      () => {
        const timeElement = document.querySelector('#seasons-stars-widget .current-time');
        return timeElement && timeElement.textContent?.match(/\d{1,2}:\d{2}:\d{2}/);
      },
      { timeout: timeoutMs }
    );
  }

  /**
   * Check if user is GM
   * Useful for permission-based tests
   */
  async isUserGM() {
    return await this.page.evaluate(() => {
      return (window as any).game?.user?.isGM || false;
    });
  }

  /**
   * Get Seasons & Stars API status
   * Useful for integration testing
   */
  async getSeasonsStarsAPI() {
    return await this.page.evaluate(() => {
      const api = (window as any).game?.modules?.get?.('seasons-and-stars')?.api;
      const manager = (window as any).game?.seasonsStars?.manager;

      return {
        hasAPI: !!api,
        hasManager: !!manager,
        methods: Object.keys(api || {}),
        managerMethods: Object.keys(manager || {}),
        isReady: !!(api && manager)
      };
    });
  }

  /**
   * Wait for and handle any Foundry notifications
   * Useful for error handling in tests
   */
  async getAndClearNotifications() {
    return await this.page.evaluate(() => {
      const notifications = Array.from(document.querySelectorAll('.notification'))
        .map(el => ({
          type: el.className.includes('error') ? 'error' :
                el.className.includes('warning') ? 'warning' :
                el.className.includes('info') ? 'info' : 'unknown',
          text: el.textContent?.trim() || ''
        }));

      // Clear notifications
      document.querySelectorAll('.notification .close').forEach(btn => {
        (btn as HTMLElement).click();
      });

      return notifications;
    });
  }
}