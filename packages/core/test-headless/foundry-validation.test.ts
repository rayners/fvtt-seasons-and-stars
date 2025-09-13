import { test, expect, Page } from '@playwright/test';

/**
 * Basic validation test to understand Foundry's actual login/world selection flow
 * This will help us debug and improve our FoundryTestClient
 */

const FOUNDRY_URL = 'http://localhost:30000';
const ADMIN_PASSWORD = 'p';

test.describe('Foundry Login Flow Discovery', () => {
  test('should explore Foundry homepage and document actual selectors', async ({ page }) => {
    console.log(`🔍 Navigating to ${FOUNDRY_URL}...`);

    try {
      await page.goto(FOUNDRY_URL, { timeout: 10000 });

      // Take initial screenshot
      await page.screenshot({ path: 'test-results/01-initial-page.png', fullPage: true });

      const title = await page.title();
      console.log(`📄 Page title: "${title}"`);

      // Check what's actually on the page
      const pageContent = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form')).map(form => ({
          action: form.action,
          method: form.method,
          inputs: Array.from(form.querySelectorAll('input')).map(input => ({
            name: input.name,
            type: input.type,
            id: input.id,
          })),
        }));

        const buttons = Array.from(document.querySelectorAll('button')).map(btn => ({
          text: btn.textContent?.trim(),
          type: btn.type,
          name: btn.name,
          onclick: btn.onclick?.toString(),
        }));

        const selects = Array.from(document.querySelectorAll('select')).map(select => ({
          name: select.name,
          options: Array.from(select.options).map(opt => opt.text),
        }));

        return { forms, buttons, selects, url: window.location.href };
      });

      console.log(`🔍 Page analysis:`, JSON.stringify(pageContent, null, 2));

      // Check for admin password prompt
      const adminPasswordField = page.locator(
        'input[name="adminKey"], input[name="password"], input[type="password"]'
      );
      if (await adminPasswordField.isVisible({ timeout: 2000 })) {
        console.log(`🔐 Admin password field found, filling with configured password`);
        await adminPasswordField.fill(ADMIN_PASSWORD);

        const submitBtn = page.locator('button[type="submit"], input[type="submit"]');
        await submitBtn.click();
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: 'test-results/02-after-admin-auth.png', fullPage: true });
      }

      // Now check what's available after potential auth
      const postAuthContent = await page.evaluate(() => {
        const worldElements = Array.from(
          document.querySelectorAll('[data-world-id], .world, .world-entry')
        ).map(el => ({
          worldId: el.getAttribute('data-world-id') || el.getAttribute('data-world'),
          text: el.textContent?.trim(),
          tagName: el.tagName,
          className: el.className,
        }));

        return { worldElements, currentUrl: window.location.href };
      });

      console.log(`🌍 World elements found:`, JSON.stringify(postAuthContent, null, 2));

      expect(postAuthContent.worldElements.length).toBeGreaterThan(0);
    } catch (error) {
      await page.screenshot({ path: 'test-results/error-discovery.png', fullPage: true });
      console.error(`❌ Discovery failed:`, error);
      throw error;
    }
  });

  test('should attempt to join the first available world', async ({ page }) => {
    console.log(`🎮 Attempting full world join flow...`);

    try {
      await page.goto(FOUNDRY_URL);

      // Handle admin auth if needed
      const adminPasswordField = page.locator(
        'input[name="adminKey"], input[name="password"], input[type="password"]'
      );
      if (await adminPasswordField.isVisible({ timeout: 2000 })) {
        await adminPasswordField.fill(ADMIN_PASSWORD);
        const submitBtn = page.locator('button[type="submit"], input[type="submit"]');
        await submitBtn.click();
        await page.waitForLoadState('networkidle');
      }

      // Find first world
      const firstWorld = page.locator('[data-world-id], .world, .world-entry').first();
      await expect(firstWorld).toBeVisible({ timeout: 10000 });

      console.log(`🌍 Clicking first world...`);
      await firstWorld.click();
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'test-results/03-after-world-select.png', fullPage: true });

      // Check for user selection
      const userSelect = page.locator('select[name="userid"], select[name="user"]');
      const gamemaster = page.locator('option[value="gamemaster"], option:has-text("Gamemaster")');

      if (await userSelect.isVisible({ timeout: 5000 })) {
        console.log(`👤 User select found, choosing Gamemaster...`);
        if (await gamemaster.isVisible()) {
          await userSelect.selectOption({ label: 'Gamemaster' });
        } else {
          // Try to select first available option
          await userSelect.selectOption({ index: 0 });
        }
      } else {
        console.log(`👤 No user select found, looking for user buttons...`);
        const gmButton = page.locator('button:has-text("Gamemaster"), a:has-text("Gamemaster")');
        if (await gmButton.isVisible({ timeout: 2000 })) {
          await gmButton.click();
        }
      }

      await page.screenshot({ path: 'test-results/04-after-user-select.png', fullPage: true });

      // Join the world
      const joinButton = page.locator(
        'button[name="join"], button:has-text("Join"), button:has-text("Launch")'
      );
      await expect(joinButton).toBeVisible({ timeout: 5000 });

      console.log(`🚀 Clicking join button...`);
      await joinButton.click();

      // Wait for world to load
      await page.waitForLoadState('networkidle');

      // Wait for Foundry UI elements from their tested patterns
      console.log(`⏳ Waiting for Foundry UI to load...`);
      await page.waitForSelector('#ui-left, #sidebar', { timeout: 30000 });

      await page.screenshot({ path: 'test-results/05-foundry-loaded.png', fullPage: true });

      // Verify we're actually in Foundry
      const foundryLoaded = await page.evaluate(() => {
        return {
          hasGame: typeof window.game !== 'undefined',
          gameReady: window.game?.ready === true,
          worldId: window.game?.world?.id,
          systemId: window.game?.system?.id,
          userRole: window.game?.user?.role,
          userName: window.game?.user?.name,
        };
      });

      console.log(`✅ Foundry game state:`, foundryLoaded);

      expect(foundryLoaded.hasGame).toBe(true);
      expect(foundryLoaded.gameReady).toBe(true);
      expect(foundryLoaded.worldId).toBeTruthy();
    } catch (error) {
      await page.screenshot({ path: 'test-results/error-world-join.png', fullPage: true });
      console.error(`❌ World join failed:`, error);
      throw error;
    }
  });
});
