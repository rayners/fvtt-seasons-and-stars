import { Page, expect } from '@playwright/test';

/**
 * FoundryVTT Utility Functions for Playwright Tests
 * 
 * These utilities were developed based on actual exploration of FoundryVTT
 * using the Playwright MCP integration.
 */

export class FoundryUtils {
  private adminPassword = process.env.FOUNDRY_ADMIN_PASSWORD || process.env.FOUNDRY_ADMIN_KEY || 'p';
  private preferredWorld = process.env.SNS_PLAYWRIGHT_WORLD_NAME || process.env.SNS_PLAYWRIGHT_WORLD_ID || '';

  constructor(private page: Page) {}

  /**
   * Login to FoundryVTT as a specific user
   * Based on working headless test patterns
   */
  async loginAs(username: string = 'Administrator') {
    await this.ensureWorldLoginScreen();

    // Wait for user select dropdown to be available
    const userSelect = this.page.locator('select[name="userid"]');
    await userSelect.waitFor({ timeout: 15000 });

    const availableUsers = await userSelect.evaluate(select =>
      Array.from(select.options).map(option => option.label || option.text || option.value)
    );

    let targetUser = username;
    if (!availableUsers.includes(targetUser)) {
      const fallbackUser = availableUsers.find(label => label && label !== 'Gamemaster');
      if (fallbackUser) {
        targetUser = fallbackUser;
      } else {
        throw new Error(`User ${username} not available. Found: ${availableUsers.join(', ')}`);
      }
    }

    // Select user by label (display name)
    await userSelect.selectOption({ label: targetUser });

    // Click join button
    await this.page.click('button[type="submit"]:has-text("Join Game Session")');

    // Wait for game to load
    await this.page.waitForLoadState('networkidle');

    // Wait for game interface to appear
    await this.page.waitForSelector('#sidebar, #ui-left, .vtt.game', { timeout: 30000 });
    await this.page.waitForFunction(() => window.game !== undefined, { timeout: 30000 });
    await this.page
      .waitForFunction(() => window.game?.ready === true, { timeout: 30000 })
      .catch(() => undefined);
  }

  /**
   * Convenience helper to sign in a user and wait until Seasons & Stars is ready.
   */
  async loginAndWait(username: string = 'Administrator') {
    await this.loginAs(username);
    await this.waitForSeasonsAndStarsReady();
  }

  /**
   * Ensure the test is on the world login screen, starting the world if needed.
   */
  private async ensureWorldLoginScreen() {
    const joinForm = this.page.locator('#join-game-form');
    try {
      await joinForm.waitFor({ state: 'visible', timeout: 5000 });
      return;
    } catch {
      // Ignore timeout - we'll proceed to launch the world
    }

    // Visit the Foundry setup page to launch the world
    await this.page.goto('/setup');
    await this.page.waitForLoadState('domcontentloaded');

    await this.authenticateIfNeeded();
    await this.dismissModalDialogs();

    // Locate the desired world (fallback to first available)
    let worldLocator = this.page.locator('li.package.world');
    if (this.preferredWorld) {
      const byName = this.page.locator(`li.package.world:has-text("${this.preferredWorld}")`);
      if ((await byName.count()) > 0) {
        worldLocator = byName;
      } else {
        const byId = this.page.locator(`li.package.world[data-world-id="${this.preferredWorld}"]`);
        if ((await byId.count()) > 0) {
          worldLocator = byId;
        }
      }
    }

    const worldCount = await worldLocator.count();
    if (worldCount === 0) {
      await this.page.goto('/');
      await joinForm.waitFor({ timeout: 20000 });
      return;
    }

    const targetWorld = worldLocator.first();
    try {
      await targetWorld.waitFor({ timeout: 10000 });
      await targetWorld.scrollIntoViewIfNeeded();
      await targetWorld.hover();
    } catch (error) {
      await this.page.goto('/');
      await joinForm.waitFor({ timeout: 20000 });
      return;
    }

    const launchSelectors = [
      '.control.play[data-action="worldLaunch"]',
      '[data-action="worldLaunch"]',
      'button:has-text("Play")',
      'button[data-control="play"]',
    ];

    let launched = false;
    for (const selector of launchSelectors) {
      const playButton = targetWorld.locator(selector).first();
      if ((await playButton.count()) > 0) {
        await playButton.click();
        launched = true;
        break;
      }
    }

    if (!launched) {
      throw new Error('Unable to locate Play button for selected world');
    }

    await this.page.waitForLoadState('networkidle');
    await joinForm.waitFor({ timeout: 20000 });
  }

  /**
   * Provide admin authentication when the setup page requires it.
   */
  private async authenticateIfNeeded() {
    const adminInput = this.page.locator('input[name="adminPassword"], input[name="adminKey"]');
    let needsAuth = false;
    try {
      needsAuth = await adminInput.isVisible({ timeout: 1000 });
    } catch {
      needsAuth = false;
    }

    if (needsAuth) {
      await adminInput.fill(this.adminPassword);
      const submitButton = this.page.locator('button[type="submit"], button[name="submit"], button:has-text("Submit"), button:has-text("Login")');
      if ((await submitButton.count()) > 0) {
        await submitButton.first().click();
      } else {
        await adminInput.press('Enter');
      }

      await this.page.waitForLoadState('networkidle');
    }
  }

  /**
   * Dismiss blocking modal dialogs such as the setup tour.
   */
  private async dismissModalDialogs() {
    const specificTour = this.page.locator('.tour-center-step.tour [data-action="exit"]');
    try {
      if (await specificTour.isVisible({ timeout: 1000 })) {
        await specificTour.click();
        await this.page.waitForTimeout(300);
      }
    } catch {
      // ignore if the specific tour selector is not found
    }

    const modalSelectors = [
      '[data-action="exit"]',
      '[data-action="close"]',
      '.dialog .window-header .close',
      '.tour .window-header .close',
      '.notification .close',
      '.modal .close',
      'button:has-text("Close")',
      'button:has-text("Dismiss")',
      'button:has-text("Skip")',
      'button:has-text("End Tour")',
      'button:has-text("Exit Tour")',
    ];

    for (const selector of modalSelectors) {
      const button = this.page.locator(selector);
      try {
        if (await button.isVisible({ timeout: 200 })) {
          await button.click();
          await this.page.waitForTimeout(200);
        }
      } catch {
        // Ignore errors for non-interactable elements
      }
    }
  }

  /**
   * Wait for Seasons & Stars module to be fully loaded
   * Based on actual UI elements from screenshots
   */
  async waitForSeasonsAndStarsReady() {
    // Wait for module scripts to load
    await this.page.waitForFunction(
      () => window.game?.modules?.get?.('seasons-and-stars')?.active === true,
      { timeout: 20000 }
    );

    // Wait for S&S API to be available
    await this.page.waitForFunction(
      () => window.game?.seasonsStars?.manager !== undefined,
      { timeout: 20000 }
    );

    await this.showMainWidget().catch(() => undefined);

    const widgetSelectors = '#seasons-stars-widget, #seasons-stars-mini-widget, #seasons-stars-grid-widget';
    await this.page.waitForSelector(widgetSelectors, { timeout: 20000 });

    try {
      await this.closeCalendarGrid();
    } catch {
      // ignore close errors during init
    }

    await this.hideMiniWidget().catch(() => undefined);

    const mainWidget = this.page.locator('#seasons-stars-widget');
    if (!(await mainWidget.isVisible().catch(() => false))) {
      const miniOpen = this.page
        .locator(
          '#seasons-stars-mini-widget [data-action="openLargerView"], #seasons-stars-mini-widget .mini-date'
        )
        .first();
      if ((await miniOpen.count()) > 0) {
        await miniOpen.click();
      }

      await this.showMainWidget().catch(() => undefined);
    }
  }

  private async showWidgetType(widget: 'main' | 'mini' | 'grid') {
    await this.page.evaluate(type => {
      const globalWindow = window as any;
      switch (type) {
        case 'main':
          globalWindow.SeasonsStars?.CalendarWidget?.show?.();
          break;
        case 'mini':
          globalWindow.SeasonsStars?.CalendarMiniWidget?.show?.();
          break;
        case 'grid':
          globalWindow.SeasonsStars?.CalendarGridWidget?.show?.();
          break;
        default:
          break;
      }
    }, widget);
  }

  async showMainWidget() {
    await this.showWidgetType('main');
    const mainWidget = this.page.locator('#seasons-stars-widget');
    await mainWidget.waitFor({ timeout: 20000 }).catch(() => undefined);
    await this.page
      .waitForFunction(() => {
        const element = document.querySelector('#seasons-stars-widget') as HTMLElement | null;
        return element && element.offsetWidth > 0 && element.offsetHeight > 0;
      }, { timeout: 20000 })
      .catch(() => undefined);
  }

  async showMiniWidget() {
    await this.showWidgetType('mini');
    const miniWidget = this.page.locator('#seasons-stars-mini-widget');
    await miniWidget.waitFor({ timeout: 20000 }).catch(() => undefined);
    await this.page
      .waitForFunction(() => {
        const element = document.querySelector('#seasons-stars-mini-widget') as HTMLElement | null;
        return element && element.offsetWidth > 0 && element.offsetHeight > 0;
      }, { timeout: 20000 })
      .catch(() => undefined);
  }

  async hideMiniWidget() {
    await this.page.evaluate(() => {
      const globalWindow = window as any;
      globalWindow.SeasonsStars?.CalendarMiniWidget?.hide?.();
    });

    await this.page
      .waitForFunction(() => {
        const element = document.querySelector('#seasons-stars-mini-widget') as HTMLElement | null;
        return !element || element.offsetWidth === 0 || element.offsetHeight === 0 || element.style.display === 'none';
      }, { timeout: 5000 })
      .catch(() => undefined);
  }

  /**
   * Get current calendar state from the widget
   * Based on observed widget structure
   */
  async getCurrentCalendarState() {
    return await this.page.evaluate(() => {
      const readMainWidget = (main: HTMLElement) => ({
        source: 'main',
        calendarSystem: main.querySelector('.calendar-title span')?.textContent?.trim() || null,
        currentDate: main.querySelector('.main-date')?.textContent?.trim() || null,
        currentTime: main.querySelector('.time-display .time')?.textContent?.trim() || null,
        isVisible: true,
      });

      const readMiniWidget = (mini: HTMLElement) => {
        const game = (window as any).game;
        const calendar = game?.seasonsStars?.manager?.getActiveCalendar?.();
        return {
          source: 'mini',
          calendarSystem: calendar?.label || calendar?.name || null,
          currentDate: mini.querySelector('.mini-date')?.textContent?.trim() || null,
          currentTime: mini.querySelector('.mini-time')?.textContent?.trim() || null,
          isVisible: true,
        };
      };

      const readGridWidget = (grid: HTMLElement) => {
        const monthName = grid.querySelector('.month-name')?.textContent?.trim() || null;
        const yearDisplay = grid.querySelector('.year-display')?.textContent?.trim() || null;
        const calendar = (window as any).game?.seasonsStars?.manager?.getActiveCalendar?.();
        return {
          source: 'grid',
          calendarSystem: calendar?.label || calendar?.name || null,
          currentDate: [monthName, yearDisplay].filter(Boolean).join(' '),
          currentTime: null,
          isVisible: true,
        };
      };

      const main = document.querySelector('#seasons-stars-widget') as HTMLElement | null;
      if (main && main.offsetWidth > 0 && main.offsetHeight > 0) {
        return readMainWidget(main);
      }

      const mini = document.querySelector('#seasons-stars-mini-widget') as HTMLElement | null;
      if (mini && mini.offsetWidth > 0 && mini.offsetHeight > 0) {
        return readMiniWidget(mini);
      }

      const grid = document.querySelector('#seasons-stars-grid-widget') as HTMLElement | null;
      if (grid && grid.offsetWidth > 0 && grid.offsetHeight > 0) {
        return readGridWidget(grid);
      }

      return null;
    });
  }

  /**
   * Open the calendar grid modal
   * Based on successful exploration
   */
  async openCalendarGrid() {
    const grid = this.page.locator('#seasons-stars-grid-widget');
    if (await grid.isVisible().catch(() => false)) {
      return;
    }

    const gridSwitch = this.page.locator('#seasons-stars-widget button[data-action="switchToGrid"]');
    if ((await gridSwitch.count()) > 0) {
      await gridSwitch.first().click();
    } else {
      await this.page.click('#seasons-stars-widget [data-action="openDetailedView"], #seasons-stars-widget .date-display');
    }
    await this.page.waitForSelector('#seasons-stars-grid-widget', { 
      state: 'visible',
      timeout: 5000 
    });

    // Wait for calendar data to load
    await this.page.waitForSelector('#seasons-stars-grid-widget .calendar-day[data-day]', { timeout: 5000 });
  }

  /**
   * Close the calendar grid modal
   * Based on successful exploration
   */
  async closeCalendarGrid() {
    const grid = this.page.locator('#seasons-stars-grid-widget');
    if (await grid.isVisible()) {
      const closeButton = grid
        .locator(
          'button[data-action="switchToMain"], .window-header .window-button[data-action="close"], .window-header button[aria-label="Close"], .close-button, [data-action="close"], button:has-text("Close")'
        )
        .first();
      if ((await closeButton.count()) > 0) {
        await closeButton.click({ force: true });
      } else {
        await this.page.keyboard.press('Escape');
      }

      await this.page.waitForSelector('#seasons-stars-grid-widget', {
        state: 'hidden',
        timeout: 5000,
      }).catch(() => undefined);
    }
  }

  /**
   * Open the note creation dialog for the first available day in the calendar grid.
   */
  async openNoteCreationDialog() {
    const isGridVisible = await this.page
      .locator('#seasons-stars-grid-widget')
      .isVisible()
      .catch(() => false);

    if (!isGridVisible) {
      await this.openCalendarGrid();
    }

    const dayCell = this.page.locator('#seasons-stars-grid-widget .calendar-day[data-day]').first();
    await dayCell.click();
    await dayCell.hover();

    const addNoteButton = this.page
      .locator(
        '#seasons-stars-grid-widget [data-action="createNote"], #seasons-stars-grid-widget [data-action="add-note"], #seasons-stars-grid-widget .add-note-button, button:has-text("Add Note")'
      )
      .first();
    await addNoteButton.waitFor({ timeout: 5000 });
    await addNoteButton.click();

    await this.page.waitForSelector('.seasons-stars-note-form', {
      state: 'visible',
      timeout: 8000,
    });
  }

  /**
   * Close the note creation dialog if it is open.
   */
  async closeNoteCreationDialog() {
    const dialog = this.page.locator('.dialog');
    if ((await dialog.count()) > 0) {
      const cancelButton = this.page
        .locator(
          '.dialog button[data-button="cancel"], .dialog button[data-action="no"], .dialog button:has-text("Cancel"), .dialog .dialog-button:has-text("Cancel"), .dialog .window-button[data-button="cancel"]'
        )
        .first();
      if ((await cancelButton.count()) > 0) {
        await cancelButton.click({ force: true });
      } else {
        await this.page.keyboard.press('Escape');
      }

      await this.page
        .waitForSelector('.seasons-stars-note-form', {
          state: 'hidden',
          timeout: 5000,
        })
        .catch(() => undefined);
    }
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
        const timeElement = document.querySelector('#seasons-stars-widget .time-display .time');
        return timeElement && /\d{1,2}:\d{2}(:\d{2})?/.test(timeElement.textContent ?? '');
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
