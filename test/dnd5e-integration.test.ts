/**
 * D&D 5e Integration Tests
 * Tests D&D 5e-specific calendar enhancements and system integration
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockedFunction } from 'vitest';
import { DnD5eIntegration } from '../src/integrations/dnd5e-integration';
import { Logger } from '../src/core/logger';

// Mock Logger
vi.mock('../src/core/logger', () => ({
  Logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock Foundry global
const mockFoundryGlobal = {
  game: {
    system: { id: 'dnd5e' },
    world: {
      title: 'Test World',
      description: 'A test world for D&D 5e',
    },
    seasonsStars: {
      manager: {
        getActiveCalendar: vi.fn(),
      },
    },
  },
  Hooks: {
    on: vi.fn(),
    once: vi.fn(),
    callAll: vi.fn(),
  },
};

// Set up global environment
(globalThis as any).game = mockFoundryGlobal.game;
(globalThis as any).Hooks = mockFoundryGlobal.Hooks;

describe('DnD5eIntegration', () => {
  beforeEach(() => {
    // Reset singleton instance before each test
    (DnD5eIntegration as any).instance = null;
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should create singleton instance', () => {
      const instance1 = DnD5eIntegration.initialize();
      const instance2 = DnD5eIntegration.initialize();

      expect(instance1).toBe(instance2);
      expect(DnD5eIntegration.getInstance()).toBe(instance1);
    });

    it('should log activation message', () => {
      DnD5eIntegration.initialize();

      expect(Logger.info).toHaveBeenCalledWith(
        'D&D 5e system detected - enabling enhanced calendar features'
      );
    });

    it('should set integration as active', () => {
      const integration = DnD5eIntegration.initialize();

      expect(integration.isIntegrationActive()).toBe(true);
    });
  });

  describe('Calendar Recommendations', () => {
    let integration: DnD5eIntegration;

    beforeEach(() => {
      integration = DnD5eIntegration.initialize();
      // Reset world info before each test
      mockFoundryGlobal.game.world.title = 'Test World';
      mockFoundryGlobal.game.world.description = 'A test world for D&D 5e';
    });

    it('should recommend Sword Coast calendar by default', () => {
      mockFoundryGlobal.game.world.title = 'Generic D&D World';
      mockFoundryGlobal.game.world.description = 'A standard fantasy world';

      const recommended = integration.getRecommendedCalendar();
      expect(recommended).toBe('dnd5e-sword-coast');
    });

    it('should recommend Eberron calendar for Eberron worlds', () => {
      mockFoundryGlobal.game.world.title = 'Eberron Campaign';
      mockFoundryGlobal.game.world.description = 'Adventures in Eberron';

      const recommended = integration.getRecommendedCalendar();
      expect(recommended).toBe('eberron');
    });

    it('should recommend Dark Sun calendar for Athas worlds', () => {
      mockFoundryGlobal.game.world.title = 'Dark Sun Campaign';
      mockFoundryGlobal.game.world.description = 'Survival on Athas';

      const recommended = integration.getRecommendedCalendar();
      expect(recommended).toBe('dark-sun');
    });

    it('should recommend Greyhawk calendar for Greyhawk worlds', () => {
      mockFoundryGlobal.game.world.description = 'Adventures in Greyhawk';

      const recommended = integration.getRecommendedCalendar();
      expect(recommended).toBe('greyhawk');
    });

    it('should recommend Exandrian calendar for Critical Role worlds', () => {
      mockFoundryGlobal.game.world.description = 'Critical Role Exandria campaign';

      const recommended = integration.getRecommendedCalendar();
      expect(recommended).toBe('exandrian');
    });

    it('should recommend Sword Coast for Sword Coast references', () => {
      mockFoundryGlobal.game.world.description = 'Adventures along the Sword Coast';

      const recommended = integration.getRecommendedCalendar();
      expect(recommended).toBe('dnd5e-sword-coast');
    });

    it('should recommend Forgotten Realms for general Faerun references', () => {
      mockFoundryGlobal.game.world.description = 'Campaign in Faerun';

      const recommended = integration.getRecommendedCalendar();
      expect(recommended).toBe('forgotten-realms');
    });

    it('should handle errors gracefully', () => {
      // Simulate error in world access
      (mockFoundryGlobal.game as any).world = null;

      const recommended = integration.getRecommendedCalendar();
      expect(recommended).toBe('dnd5e-sword-coast');
    });
  });

  describe('Timeline Suggestions', () => {
    let integration: DnD5eIntegration;

    beforeEach(() => {
      integration = DnD5eIntegration.initialize();
    });

    it('should provide timeline suggestions', () => {
      const suggestions = integration.getTimelineSuggestions();

      expect(suggestions).toHaveLength(9);
      expect(suggestions[0]).toEqual({
        year: 1492,
        description: 'Dragon Heist, Dungeon of the Mad Mage (default)',
        era: 'Post-Second Sundering',
      });
    });

    it('should include major adventure years', () => {
      const suggestions = integration.getTimelineSuggestions();
      const years = suggestions.map(s => s.year);

      expect(years).toContain(1489); // Lost Mine of Phandelver
      expect(years).toContain(1491); // Curse of Strahd
      expect(years).toContain(1494); // Tomb of Annihilation
      expect(years).toContain(1496); // Baldur's Gate: Descent into Avernus
    });

    it('should include era information', () => {
      const suggestions = integration.getTimelineSuggestions();

      const postSunderingSuggestions = suggestions.filter(s => s.era === 'Post-Second Sundering');
      expect(postSunderingSuggestions.length).toBeGreaterThan(5);
    });
  });

  describe('Calendar Information', () => {
    let integration: DnD5eIntegration;

    beforeEach(() => {
      integration = DnD5eIntegration.initialize();
    });

    it('should identify D&D 5e calendars', () => {
      const info = integration.getCalendarInfo('dnd5e-sword-coast');

      expect(info.isDnD5eCalendar).toBe(true);
      expect(info.setting).toBe('Sword Coast (Forgotten Realms)');
      expect(info.timelineContext).toContain('post-Second Sundering');
      expect(info.yearRange).toContain('1489-1496 DR');
    });

    it('should provide Eberron calendar info', () => {
      const info = integration.getCalendarInfo('eberron');

      expect(info.isDnD5eCalendar).toBe(true);
      expect(info.setting).toBe('Eberron');
      expect(info.timelineContext).toContain('Post-Last War');
      expect(info.yearRange).toContain('998 YK');
    });

    it('should handle non-D&D calendars', () => {
      const info = integration.getCalendarInfo('gregorian');

      expect(info.isDnD5eCalendar).toBe(false);
      expect(info.setting).toBe('Generic/Custom Calendar');
      expect(info.timelineContext).toBeUndefined();
    });

    it('should provide information for all D&D settings', () => {
      const calendars = [
        'dnd5e-sword-coast',
        'forgotten-realms',
        'eberron',
        'greyhawk',
        'dark-sun',
        'exandrian',
      ];

      for (const calendarId of calendars) {
        const info = integration.getCalendarInfo(calendarId);
        expect(info.isDnD5eCalendar).toBe(true);
        expect(info.setting).toBeDefined();
      }
    });
  });

  describe('Seasonal Events', () => {
    let integration: DnD5eIntegration;

    beforeEach(() => {
      integration = DnD5eIntegration.initialize();
    });

    it('should provide Forgotten Realms events', () => {
      const events = integration.getSeasonalEvents('dnd5e-sword-coast', 1);

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({
        day: 15,
        name: 'Midwinter Feast',
        description: 'Traditional feast during the coldest time',
        type: 'holiday',
      });
    });

    it('should provide seasonal events for different months', () => {
      const springEvents = integration.getSeasonalEvents('forgotten-realms', 3);
      const summerEvents = integration.getSeasonalEvents('forgotten-realms', 6);
      const autumnEvents = integration.getSeasonalEvents('forgotten-realms', 9);
      const winterEvents = integration.getSeasonalEvents('forgotten-realms', 12);

      expect(springEvents).toHaveLength(1);
      expect(summerEvents).toHaveLength(1);
      expect(autumnEvents).toHaveLength(1);
      expect(winterEvents).toHaveLength(1);

      expect(springEvents[0].name).toBe('Spring Equinox');
      expect(summerEvents[0].name).toBe('Summer Solstice');
      expect(autumnEvents[0].name).toBe('Autumn Equinox');
      expect(winterEvents[0].name).toBe('Winter Solstice');
    });

    it('should provide Eberron events', () => {
      const events = integration.getSeasonalEvents('eberron', 6);

      expect(events).toHaveLength(1);
      expect(events[0].name).toBe("Aureon's Crown");
      expect(events[0].type).toBe('festival');
    });

    it('should return empty array for unknown calendars', () => {
      const events = integration.getSeasonalEvents('unknown-calendar', 1);
      expect(events).toHaveLength(0);
    });

    it('should return empty array for months without events', () => {
      const events = integration.getSeasonalEvents('forgotten-realms', 2);
      expect(events).toHaveLength(0);
    });
  });

  describe('Instance Management', () => {
    it('should allow destroying integration', () => {
      const integration = DnD5eIntegration.initialize();

      expect(integration.isIntegrationActive()).toBe(true);

      integration.destroy();

      expect(integration.isIntegrationActive()).toBe(false);
    });

    it('should return null when no instance exists', () => {
      expect(DnD5eIntegration.getInstance()).toBeNull();
    });
  });
});

describe('D&D 5e Integration Hook Registration', () => {
  it('should provide calendar enhancement functions', () => {
    // Test the core functionality that would be registered with the compatibility manager
    const integration = DnD5eIntegration.initialize();

    // Test recommended calendar function
    const recommendedCalendar = integration.getRecommendedCalendar();
    expect(typeof recommendedCalendar).toBe('string');
    expect(recommendedCalendar).toBe('dnd5e-sword-coast');

    // Test timeline suggestions function
    const timelineSuggestions = integration.getTimelineSuggestions();
    expect(Array.isArray(timelineSuggestions)).toBe(true);
    expect(timelineSuggestions).toHaveLength(9);

    // Test calendar info function
    const calendarInfo = integration.getCalendarInfo('dnd5e-sword-coast');
    expect(typeof calendarInfo).toBe('object');
    expect(calendarInfo.isDnD5eCalendar).toBe(true);

    // Test seasonal events function
    const seasonalEvents = integration.getSeasonalEvents('dnd5e-sword-coast', 1);
    expect(Array.isArray(seasonalEvents)).toBe(true);
    expect(seasonalEvents).toHaveLength(1);
  });
});
