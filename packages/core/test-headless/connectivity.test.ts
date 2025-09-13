import { foundryTest, expect } from './BaseFoundryTest';

foundryTest.describe('Foundry Connectivity Tests', () => {
  foundryTest('should connect to Foundry instance', async ({ foundryClient }) => {
    // Verify we can reach the Foundry homepage
    const page = foundryClient.getPage();
    const title = await page.title();
    expect(title).toContain('Foundry');
    
    // Check if the join/world selection interface is available
    const joinButton = page.locator('button[name="join"], a[href*="join"]');
    await expect(joinButton.or(page.locator('[data-world-id]')).first()).toBeVisible({ timeout: 10000 });
  });

  foundryTest('should login as GM to PF2e world', async ({ gmClient, pf2eWorld, gmUser }) => {
    await gmClient.connectToWorld(pf2eWorld.id, gmUser.id);
    
    // Verify we're logged in as GM
    const userRole = await gmClient.getPage().evaluate(() => {
      return window.game?.user?.role;
    });
    expect(userRole).toBe(4); // GAMEMASTER role in Foundry
    
    // Verify we're in the correct world
    const worldId = await gmClient.getPage().evaluate(() => {
      return window.game?.world?.id;
    });
    expect(worldId).toBe(pf2eWorld.id);
    
    // Verify PF2e system is loaded
    const systemId = await gmClient.getPage().evaluate(() => {
      return window.game?.system?.id;
    });
    expect(systemId).toBe('pf2e');
  });

  foundryTest('should login as Player to D&D5e world', async ({ playerClient, dnd5eWorld, playerUser }) => {
    await playerClient.connectToWorld(dnd5eWorld.id, playerUser.id);
    
    // Verify we're logged in as Player
    const userRole = await playerClient.getPage().evaluate(() => {
      return window.game?.user?.role;
    });
    expect(userRole).toBe(1); // PLAYER role in Foundry
    
    // Verify we're in the correct world  
    const worldId = await playerClient.getPage().evaluate(() => {
      return window.game?.world?.id;
    });
    expect(worldId).toBe(dnd5eWorld.id);
    
    // Verify D&D5e system is loaded
    const systemId = await playerClient.getPage().evaluate(() => {
      return window.game?.system?.id;
    });
    expect(systemId).toBe('dnd5e');
  });

  foundryTest('should verify Seasons & Stars module is active', async ({ foundryClient, pf2eWorld, gmUser }) => {
    await foundryClient.connectToWorld(pf2eWorld.id, gmUser.id);
    
    // Check module is registered and active
    const moduleStatus = await foundryClient.getPage().evaluate(() => {
      const module = window.game?.modules?.get('seasons-and-stars');
      return {
        exists: !!module,
        active: module?.active,
        api: !!module?.api,
        calendarEngine: !!module?.api?.calendarEngine
      };
    });
    
    expect(moduleStatus.exists).toBe(true);
    expect(moduleStatus.active).toBe(true);
    expect(moduleStatus.api).toBe(true);
    expect(moduleStatus.calendarEngine).toBe(true);
  });

  foundryTest('should verify different calendar systems per world', async ({ browser, gmUser }) => {
    const client1 = new (await import('./FoundryTestClient')).FoundryTestClient(browser);
    const client2 = new (await import('./FoundryTestClient')).FoundryTestClient(browser);
    
    try {
      await client1.initialize();
      await client2.initialize();
      
      // Connect to PF2e world (should have Golarian calendar)
      const pf2eWorld = (await import('./FoundryTestClient')).DEFAULT_CONFIG.worlds.find(w => w.system === 'pf2e')!;
      await client1.connectToWorld(pf2eWorld.id, gmUser.id);
      
      const pf2eCalendar = await client1.getCurrentCalendarData();
      expect(pf2eCalendar.calendar.id).toBe('golarion-pf2e');
      
      // Connect to D&D5e world (should have Gregorian calendar)
      const dnd5eWorld = (await import('./FoundryTestClient')).DEFAULT_CONFIG.worlds.find(w => w.system === 'dnd5e')!;
      await client2.connectToWorld(dnd5eWorld.id, gmUser.id);
      
      const dnd5eCalendar = await client2.getCurrentCalendarData();
      expect(dnd5eCalendar.calendar.id).toBe('gregorian');
      
    } finally {
      await client1.cleanup();
      await client2.cleanup();
    }
  });

  foundryTest('should test clean slate reset functionality', async ({ gmClient, pf2eWorld, gmUser }) => {
    await gmClient.connectToWorld(pf2eWorld.id, gmUser.id);
    
    // Make some changes to world state
    await gmClient.setWorldTime(86400); // Advance 1 day
    
    // Verify time was changed
    let calendarData = await gmClient.getCurrentCalendarData();
    expect(calendarData.worldTime).toBe(86400);
    
    // Reset world state
    await gmClient.resetWorldState();
    
    // Verify time was reset
    calendarData = await gmClient.getCurrentCalendarData();
    expect(calendarData.worldTime).toBe(0);
  });

  foundryTest('should verify widget elements are present', async ({ foundryClient, pf2eWorld, playerUser }) => {
    await foundryClient.connectToWorld(pf2eWorld.id, playerUser.id);
    
    // Wait a bit for widgets to render
    await foundryClient.getPage().waitForTimeout(2000);
    
    const widgets = await foundryClient.getWidgetElements();
    expect(widgets.miniWidget).toBe(true);
    
    // Test opening calendar grid
    await foundryClient.openCalendarGrid();
    const widgetsAfterOpen = await foundryClient.getWidgetElements();
    expect(widgetsAfterOpen.fullGrid).toBe(true);
    
    // Test closing calendar grid
    await foundryClient.closeCalendarGrid();
    const widgetsAfterClose = await foundryClient.getWidgetElements();
    expect(widgetsAfterClose.fullGrid).toBe(false);
  });
});