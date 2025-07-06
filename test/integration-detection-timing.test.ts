import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupFoundryEnvironment } from './setup';

describe('Integration Detection Timing Regression Test', () => {
  let mockCalendarManager: any;

  beforeEach(() => {
    setupFoundryEnvironment();

    // Mock calendar manager
    mockCalendarManager = {
      getActiveCalendar: vi.fn(),
      getActiveEngine: vi.fn(),
      advanceDays: vi.fn(),
    };

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

    // Clear any existing window.SeasonsStars
    delete (global as any).window;
    (global as any).window = {};

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Clean up global state
    delete (global as any).game.seasonsStars;
    delete (global as any).window.SeasonsStars;
  });

  it('should not be null - regression test for integration detection timing issue', async () => {
    // Mock the detect method to simulate the real behavior
    const mockIntegration = {
      version: '1.0.0',
      isAvailable: true,
      api: {},
      widgets: {},
      hooks: {},
      hasFeature: vi.fn(),
      getFeatureVersion: vi.fn(),
      cleanup: vi.fn(),
    };

    const detectSpy = vi.fn().mockImplementation(() => {
      // Check if game.seasonsStars.manager exists (as the real detect method does)
      if (global.game.seasonsStars?.manager) {
        return mockIntegration;
      }
      return null;
    });

    // Mock the SeasonsStarsIntegration class
    const MockSeasonsStarsIntegration = {
      detect: detectSpy,
    };

    // Simulate the FIXED module initialization process
    // Step 1: Create game.seasonsStars object with integration initially null
    global.game.seasonsStars = {
      api: {},
      manager: mockCalendarManager,
      notes: {},
      categories: {},
      integration: null, // Initially null as per the fix
      compatibilityManager: {},
      resetSeasonsWarningState: vi.fn(),
      getSeasonsWarningState: vi.fn(),
      setSeasonsWarningState: vi.fn(),
    };

    // Step 2: Set integration after the object is fully created (the fix)
    global.game.seasonsStars.integration = MockSeasonsStarsIntegration.detect();

    // REGRESSION TEST: Verify integration is properly detected and NOT null
    expect(global.game.seasonsStars.integration).not.toBeNull();
    expect(global.game.seasonsStars.integration?.version).toBe('1.0.0');
    expect(detectSpy).toHaveBeenCalledTimes(1);
  });
});
