import { Page, Browser } from '@playwright/test';

export interface TestWorld {
  id: string;
  name: string;
  system: string;
  calendar: string;
  description: string;
}

export interface TestUser {
  id: string;
  name: string;
  role: 'gamemaster' | 'player';
  permissions: string[];
}

export interface FoundryTestConfig {
  foundryUrl: string;
  adminPassword?: string;
  worlds: TestWorld[];
  users: TestUser[];
  timeouts: {
    pageLoad: number;
    moduleLoad: number;
    worldLoad: number;
  };
}

export const DEFAULT_CONFIG: FoundryTestConfig = {
  foundryUrl: 'http://localhost:30000',
  adminPassword: 'p',
  worlds: [
    {
      id: 'sands-testing-gm',
      name: 'S&S-Testing-GM',
      system: 'pf2e',
      calendar: 'golarion-pf2e',
      description: 'GM context testing with PF2e system and Golarian calendar'
    },
    {
      id: 'sands-testing-player', 
      name: 'S&S-Testing-Player',
      system: 'dnd5e',
      calendar: 'gregorian',
      description: 'Player context testing with D&D5e system and Gregorian calendar'
    },
    {
      id: 'sands-integration-test',
      name: 'S&S-Integration-Test',
      system: 'dragonbane',
      calendar: 'vale-reckoning',
      description: 'Integration testing with Dragonbane system and Vale Reckoning calendar'
    }
  ],
  users: [
    {
      id: 'testgm',
      name: 'TestGM',
      role: 'gamemaster',
      permissions: ['ACTOR_CREATE', 'ITEM_CREATE', 'JOURNAL_CREATE', 'MACRO_SCRIPT', 'SETTINGS_MODIFY']
    },
    {
      id: 'player1',
      name: 'Player1', 
      role: 'player',
      permissions: ['ACTOR_CREATE']
    }
  ],
  timeouts: {
    pageLoad: 10000,
    moduleLoad: 15000,
    worldLoad: 20000
  }
};

export class FoundryTestClient {
  private page: Page;
  private browser: Browser;
  private config: FoundryTestConfig;
  private currentWorld: TestWorld | null = null;
  private currentUser: TestUser | null = null;

  constructor(browser: Browser, config: FoundryTestConfig = DEFAULT_CONFIG) {
    this.browser = browser;
    this.config = config;
  }

  async initialize(): Promise<void> {
    this.page = await this.browser.newPage();
    
    // Enable console logging for debugging
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error(`Foundry Console Error: ${msg.text()}`);
      } else if (msg.text().includes('Seasons & Stars')) {
        console.log(`S&S Debug: ${msg.text()}`);
      }
    });

    // Navigate to Foundry
    await this.page.goto(this.config.foundryUrl, { 
      waitUntil: 'networkidle',
      timeout: this.config.timeouts.pageLoad
    });
  }

  async connectToWorld(worldId: string, userId: string): Promise<void> {
    const world = this.config.worlds.find(w => w.id === worldId);
    const user = this.config.users.find(u => u.id === userId);
    
    if (!world) throw new Error(`World not found: ${worldId}`);
    if (!user) throw new Error(`User not found: ${userId}`);

    // Check if we need admin authentication first
    const currentUrl = await this.page.url();
    if (currentUrl.includes('/auth') || await this.page.locator('input[name="adminKey"]').isVisible().catch(() => false)) {
      await this.authenticateAsAdmin();
    }

    // Navigate to Foundry and handle potential world running state
    await this.page.goto(this.config.foundryUrl);
    await this.page.waitForLoadState('networkidle');

    // Check if we're on a join page (world is running) and need to return to setup
    if (await this.page.locator('#join-game').isVisible({ timeout: 2000 })) {
      console.log(`🔄 World is running, returning to setup...`);
      
      // Look for the return to setup form with admin password
      const setupForm = this.page.locator('#join-game-setup');
      if (await setupForm.isVisible({ timeout: 2000 })) {
        // Fill in the admin password
        const adminPasswordField = setupForm.locator('input[name="adminPassword"]');
        if (await adminPasswordField.isVisible({ timeout: 1000 })) {
          await adminPasswordField.fill(this.config.adminPassword || '');
        }
        
        // Click the return to setup button
        const returnButton = setupForm.locator('button[type="submit"]');
        await returnButton.click();
        await this.page.waitForLoadState('networkidle');
        console.log(`🔄 Returned to setup page with admin authentication`);
      }
    }

    // Navigate to setup page if not already there
    const url = await this.page.url();
    if (!url.includes('/setup')) {
      await this.page.goto(`${this.config.foundryUrl}/setup`);
      await this.page.waitForLoadState('networkidle');
    }

    // Close any modal dialogs that might be blocking (like tours, backups notifications, etc.)
    await this.dismissModalDialogs();

    // Look for the world using the actual Foundry selectors we discovered
    try {
      // Find the world li element and click its play button
      const worldLi = this.page.locator(`li.package.world:has-text("${world.name}")`);
      await worldLi.waitFor({ timeout: 10000 });
      
      // Hover over the world to make the play button visible
      await worldLi.hover();
      
      // Click the play button to launch the world
      const playButton = worldLi.locator('.control.play[data-action="worldLaunch"]');
      await playButton.waitFor({ timeout: 5000 });
      await playButton.click();
      
    } catch (error) {
      await this.takeScreenshot(`world-launch-error-${worldId}`);
      throw new Error(`Failed to launch world "${worldId}": ${error.message}`);
    }

    // Wait for world to start loading
    await this.page.waitForLoadState('networkidle');

    // Now we should be on the user selection screen for the specific world
    try {
      // Wait for the join game form to appear
      await this.page.waitForSelector('#join-game-form', { timeout: 10000 });
      
      // Select the user from the dropdown
      const userSelect = this.page.locator('select[name="userid"]');
      await userSelect.waitFor({ timeout: 5000 });
      
      // Select by the option text (user.name)
      await userSelect.selectOption({ label: user.name });
      
      // If there's a password field, leave it empty (most test users don't have passwords)
      const passwordField = this.page.locator('input[name="password"]');
      if (await passwordField.isVisible({ timeout: 1000 })) {
        await passwordField.fill(''); // Clear any existing password
      }
      
    } catch (error) {
      await this.takeScreenshot(`user-selection-error-${userId}`);
      throw new Error(`Failed to select user "${userId}": ${error.message}`);
    }
    
    // Join the world - use the specific join button from the form
    try {
      const joinButton = this.page.locator('button[name="join"]');
      await joinButton.waitFor({ timeout: 5000 });
      await joinButton.click();
    } catch (error) {
      await this.takeScreenshot(`join-error-${worldId}`);
      throw new Error(`Failed to join world: ${error.message}`);
    }
    
    // Wait for the world to load completely
    await this.page.waitForLoadState('networkidle');
    await this.waitForFoundryReady();
    await this.waitForSeasonsAndStarsReady();

    this.currentWorld = world;
    this.currentUser = user;
  }

  private async authenticateAsAdmin(): Promise<void> {
    if (!this.config.adminPassword) {
      throw new Error('Admin password not configured');
    }

    // Use the actual selector we discovered: input[name="adminPassword"]
    const adminInput = this.page.locator('input[name="adminPassword"]');
    if (await adminInput.isVisible({ timeout: 2000 })) {
      await adminInput.fill(this.config.adminPassword);
      
      const submitButton = this.page.locator('button[type="submit"]');
      await submitButton.click();
      
      // Wait for authentication to complete and redirect to setup page
      await this.page.waitForLoadState('networkidle');
    }
  }

  private async dismissModalDialogs(): Promise<void> {
    // Handle the specific Foundry Backups tour modal 
    try {
      const tourStep = this.page.locator('.tour-center-step.tour');
      if (await tourStep.isVisible({ timeout: 2000 })) {
        // Click the exit button with the specific data-action="exit"
        const exitButton = tourStep.locator('[data-action="exit"]');
        if (await exitButton.isVisible({ timeout: 1000 })) {
          await exitButton.click();
          await this.page.waitForTimeout(1000); // Wait for tour to fully close
          console.log(`🚫 Dismissed Foundry tour modal`);
          return; // Tour dismissed, no need to check other selectors
        }
      }
    } catch (e) {
      console.log(`⚠️ Tour dismissal failed: ${e.message}`);
    }

    // Fallback: Look for other common modal dialog patterns
    const modalSelectors = [
      '[data-action="exit"]',                    // Specific tour exit button
      '[data-action="close"]',                   // Data attribute close
      '.dialog .window-header .close',           // Generic dialog close button
      '.tour .window-header .close',             // Tour modal close button  
      '.notification .close',                    // Notification close button
      '.modal .close',                           // Generic modal close button
      'button:has-text("Close")',                // Close button text
      'button:has-text("Dismiss")',              // Dismiss button text
      'button:has-text("Skip")',                 // Skip button text
      '.window-app .window-header .close'        // Foundry window app close
    ];

    for (const selector of modalSelectors) {
      try {
        const closeButton = this.page.locator(selector);
        if (await closeButton.isVisible({ timeout: 500 })) {
          await closeButton.click();
          await this.page.waitForTimeout(500); // Brief wait for animation
          console.log(`🚫 Dismissed modal with selector: ${selector}`);
          break; // Only dismiss one modal at a time
        }
      } catch (e) {
        // Selector not found or not clickable, continue
      }
    }
  }

  async waitForFoundryReady(): Promise<void> {
    // Wait for the main Foundry game object to be available
    await this.page.waitForFunction(
      () => typeof window.game !== 'undefined' && window.game.ready,
      { timeout: this.config.timeouts.worldLoad }
    );
  }

  async waitForSeasonsAndStarsReady(): Promise<void> {
    // Wait for Seasons & Stars module to be loaded and ready
    await this.page.waitForFunction(
      () => {
        const module = window.game?.modules?.get('seasons-and-stars');
        return module?.active === true;
      },
      { timeout: this.config.timeouts.moduleLoad }
    );

    // Wait for the calendar engine to be initialized - with more flexible checking
    try {
      await this.page.waitForFunction(
        () => {
          const api = window.game?.modules?.get('seasons-and-stars')?.api;
          // Check for various signs that the module API is ready
          return api && (api.calendarEngine !== undefined || api.timeAdvancement !== undefined || api.settingsManager !== undefined);
        },
        { timeout: this.config.timeouts.moduleLoad }
      );
    } catch (error) {
      // If calendar engine isn't ready, log what we do have and continue
      const moduleStatus = await this.page.evaluate(() => {
        const module = window.game?.modules?.get('seasons-and-stars');
        const api = module?.api;
        return {
          moduleActive: module?.active,
          hasApi: !!api,
          apiKeys: api ? Object.keys(api) : [],
          calendarEngine: !!api?.calendarEngine,
          timeAdvancement: !!api?.timeAdvancement,
          settingsManager: !!api?.settingsManager
        };
      });
      console.log(`⚠️ Calendar engine not fully initialized, current status:`, moduleStatus);
      
      // Only throw if the module isn't active at all
      if (!moduleStatus.moduleActive) {
        throw error;
      }
    }
  }

  async resetWorldState(): Promise<void> {
    if (!this.currentWorld || !this.currentUser) {
      throw new Error('No world/user connected');
    }

    // Reset module settings to defaults
    await this.page.evaluate(() => {
      const module = window.game.modules.get('seasons-and-stars');
      if (module?.api?.settingsManager) {
        return module.api.settingsManager.resetToDefaults();
      }
    });

    // Clear any UI state
    await this.page.evaluate(() => {
      // Close any open dialogs or modals
      document.querySelectorAll('.dialog, .window-app').forEach(el => {
        if (typeof el.close === 'function') {
          el.close();
        } else {
          el.remove();
        }
      });
    });

    // Reset world time if user has permissions
    if (this.currentUser.role === 'gamemaster') {
      await this.page.evaluate(() => {
        if (window.game.time) {
          window.game.time.advance(0 - window.game.time.worldTime);
        }
      });
    }
  }

  async returnToSetup(): Promise<void> {
    try {
      // Navigate to the base URL which should show either setup or join page
      await this.page.goto(this.config.foundryUrl);
      await this.page.waitForLoadState('networkidle');

      // If we're on the join page (world is running), return to setup with admin auth
      if (await this.page.locator('#join-game').isVisible({ timeout: 3000 })) {
        const setupForm = this.page.locator('#join-game-setup');
        if (await setupForm.isVisible({ timeout: 2000 })) {
          // Fill in the admin password
          const adminPasswordField = setupForm.locator('input[name="adminPassword"]');
          if (await adminPasswordField.isVisible({ timeout: 1000 })) {
            await adminPasswordField.fill(this.config.adminPassword || '');
          }
          
          // Click the return to setup button
          const returnButton = setupForm.locator('button[type="submit"]');
          await returnButton.click();
          await this.page.waitForLoadState('networkidle');
          console.log(`🔄 Successfully returned to setup with admin auth`);
        }
      }
    } catch (error) {
      console.log(`⚠️ Failed to return to setup: ${error.message}`);
    }
  }

  async getSeasonsAndStarsAPI(): Promise<any> {
    return await this.page.evaluate(() => {
      return window.game?.modules?.get('seasons-and-stars')?.api;
    });
  }

  async getCurrentCalendarData(): Promise<any> {
    return await this.page.evaluate(() => {
      const api = window.game?.modules?.get('seasons-and-stars')?.api;
      if (api?.calendarEngine) {
        return {
          currentDate: api.calendarEngine.getCurrentDate(),
          worldTime: window.game.time.worldTime,
          calendar: api.calendarEngine.calendar
        };
      }
      return null;
    });
  }

  async setWorldTime(worldTime: number): Promise<void> {
    if (this.currentUser?.role !== 'gamemaster') {
      throw new Error('Only GM can set world time');
    }

    await this.page.evaluate((time) => {
      if (window.game.time) {
        const currentTime = window.game.time.worldTime;
        const advancement = time - currentTime;
        return window.game.time.advance(advancement);
      }
    }, worldTime);
  }

  async advanceTime(seconds: number): Promise<void> {
    if (this.currentUser?.role !== 'gamemaster') {
      throw new Error('Only GM can advance time');
    }

    await this.page.evaluate((advancement) => {
      return window.game.time.advance(advancement);
    }, seconds);
  }

  async getWidgetElements(): Promise<{miniWidget: boolean, fullGrid: boolean}> {
    return await this.page.evaluate(() => {
      const miniWidget = document.querySelector('.seasons-stars-mini-widget') !== null;
      const fullGrid = document.querySelector('.seasons-stars-calendar-grid') !== null;
      return { miniWidget, fullGrid };
    });
  }

  async openCalendarGrid(): Promise<void> {
    // Look for the mini widget button to open the full grid
    const miniWidgetButton = '.seasons-stars-mini-widget .calendar-button';
    await this.page.waitForSelector(miniWidgetButton, { timeout: 5000 });
    await this.page.click(miniWidgetButton);
    
    // Wait for the grid to appear
    await this.page.waitForSelector('.seasons-stars-calendar-grid', { timeout: 5000 });
  }

  async closeCalendarGrid(): Promise<void> {
    const closeButton = '.seasons-stars-calendar-grid .window-header .close';
    try {
      await this.page.waitForSelector(closeButton, { timeout: 2000 });
      await this.page.click(closeButton);
      
      // Wait for grid to disappear
      await this.page.waitForSelector('.seasons-stars-calendar-grid', { 
        state: 'detached', 
        timeout: 2000 
      });
    } catch (error) {
      // Grid might not be open, that's okay
    }
  }

  async takeScreenshot(name: string): Promise<Buffer> {
    return await this.page.screenshot({
      path: `test-results/headless-${name}-${Date.now()}.png`,
      fullPage: true
    });
  }

  async cleanup(): Promise<void> {
    if (this.page && !this.page.isClosed()) {
      await this.page.close();
    }
    this.currentWorld = null;
    this.currentUser = null;
  }

  getCurrentWorld(): TestWorld | null {
    return this.currentWorld;
  }

  getCurrentUser(): TestUser | null {
    return this.currentUser;
  }

  getPage(): Page {
    return this.page;
  }
}