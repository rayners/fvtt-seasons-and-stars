import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupFoundryEnvironment } from './setup';

describe('Integration Detection Timing Regression Test', () => {
  beforeEach(() => {
    setupFoundryEnvironment();

    // Set up global game object with active S&S module
    (global as any).game = {
      ...global.game,
      modules: {
        get: vi.fn().mockImplementation((moduleId: string) => {
          if (moduleId === 'seasons-and-stars') {
            return { active: true };
          }
          return null;
        }),
      },
      seasonsStars: undefined, // Initially undefined
    };

    // Clear window.SeasonsStars
    delete (global as any).window;
    (global as any).window = {};

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Clean up global state
    delete (global as any).game.seasonsStars;
    delete (global as any).window.SeasonsStars;
    vi.resetModules();
  });

  it('should not be null - regression test for integration detection timing issue', async () => {
    // Create real CalendarManager instance (the integration detection depends on this)
    const { CalendarManager } = await import('../src/core/calendar-manager');
    const calendarManager = new CalendarManager();

    // Set up game.seasonsStars with manager (simulating the state after module initialization)
    (global as any).game.seasonsStars = {
      manager: calendarManager,
      // ... other properties would be here in real usage
    };

    // Import and test the actual SeasonsStarsIntegration.detect() method
    const { SeasonsStarsIntegration } = await import('../src/core/bridge-integration');

    // REGRESSION TEST: Test that integration is properly detected when manager exists
    // This is the core test - if the timing bug is reintroduced, this will fail
    const integration = SeasonsStarsIntegration.detect();

    expect(integration).not.toBeNull();
    expect(integration).toHaveProperty('version');
    expect(integration).toHaveProperty('isAvailable');
    expect(integration?.isAvailable).toBe(true);

    // Clean up
    integration?.cleanup();
  });

  it('should return null when game.seasonsStars.manager is not available', async () => {
    // Set up game.seasonsStars WITHOUT manager
    (global as any).game.seasonsStars = {
      // manager is missing
    };

    const { SeasonsStarsIntegration } = await import('../src/core/bridge-integration');

    const integration = SeasonsStarsIntegration.detect();

    // Should return null when manager is not available
    expect(integration).toBeNull();
  });
});
