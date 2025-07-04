import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarManager } from '../src/core/calendar-manager';
import { ExternalCalendarRegistry } from '../src/core/external-calendar-registry';
import { HttpsProtocolHandler } from '../src/core/protocol-handlers/https-handler';
import { GitHubProtocolHandler } from '../src/core/protocol-handlers/github-handler';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

// Mock foundry environment and dependencies
vi.stubGlobal('game', {
  settings: {
    get: vi.fn().mockReturnValue([]), // Empty external sources
    set: vi.fn(),
  },
});
vi.stubGlobal('Hooks', {
  callAll: vi.fn(),
  on: vi.fn(),
});

// Mock fetch function for different protocol handlers
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock the built-in calendars list to be empty for this test
vi.mock('../src/generated/calendar-list', () => ({
  BUILT_IN_CALENDARS: [],
}));

// Mock Logger
vi.mock('../src/core/logger', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock CalendarValidator
vi.mock('../src/core/calendar-validator', () => ({
  CalendarValidator: {
    validate: vi.fn().mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    }),
  },
}));

// Mock CalendarLocalization
vi.mock('../src/core/calendar-localization', () => ({
  CalendarLocalization: {
    getCalendarLabel: vi.fn().mockReturnValue('Test External Calendar'),
  },
}));

describe('External Calendar Variants Integration', () => {
  let calendarManager: CalendarManager;

  // Test calendar with inline variants
  const externalCalendarWithVariants: SeasonsStarsCalendar = {
    id: 'external-custom-calendar',
    translations: {
      en: {
        label: 'External Custom Calendar',
        description: 'Custom calendar loaded from external source',
      },
    },
    months: [
      { name: 'First', days: 30 },
      { name: 'Second', days: 30 },
      { name: 'Third', days: 30 },
    ],
    weekdays: [
      { name: 'Oneday' },
      { name: 'Twoday' },
      { name: 'Threeday' },
    ],
    year: { epoch: 1000, suffix: ' EC', currentYear: 1000 },
    time: {
      hoursInDay: 24,
      minutesInHour: 60,
      secondsInMinute: 60,
    },
    leapYear: {
      rule: 'none',
    },
    intercalary: [],
    variants: {
      'winter-theme': {
        name: 'Winter Theme',
        description: 'Cold and snowy variant',
        default: true,
        overrides: {
          year: { suffix: ' WC' },
          months: {
            First: { name: 'Frostmonth', description: 'Cold first month' },
            Second: { name: 'Snowmonth', description: 'Snowy second month' },
          },
        },
      },
      'summer-theme': {
        name: 'Summer Theme',
        description: 'Hot and sunny variant',
        overrides: {
          year: { suffix: ' SC' },
          months: {
            First: { name: 'Sunmonth', description: 'Hot first month' },
            Third: { name: 'Blazemonth', description: 'Blazing third month' },
          },
          weekdays: {
            Oneday: { name: 'Sunday', description: 'Day of the sun' },
          },
        },
      },
      'merchant-theme': {
        name: 'Merchant Calendar',
        description: 'Trade-focused calendar variant',
        overrides: {
          year: { prefix: 'Trade Year ', suffix: '' },
          months: {
            First: { name: 'Coinmonth', description: 'Month of coin trading' },
            Second: { name: 'Goldmonth', description: 'Month of gold trading' },
            Third: { name: 'Gemmonth', description: 'Month of gem trading' },
          },
        },
      },
    },
  };

  // Test calendar without variants  
  const externalCalendarWithoutVariants: SeasonsStarsCalendar = {
    id: 'external-simple-calendar',
    translations: {
      en: {
        label: 'External Simple Calendar',
        description: 'Simple calendar without variants',
      },
    },
    months: [
      { name: 'Alpha', days: 25 },
      { name: 'Beta', days: 25 },
    ],
    weekdays: [
      { name: 'Workday' },
      { name: 'Restday' },
    ],
    year: { epoch: 2000, suffix: ' SC', currentYear: 2000 },
    time: {
      hoursInDay: 24,
      minutesInHour: 60,
      secondsInMinute: 60,
    },
    leapYear: {
      rule: 'none',
    },
    intercalary: [],
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup fetch mock for different external calendar requests
    mockFetch.mockImplementation((url: string | Request) => {
      const urlString = typeof url === 'string' ? url : url.url;

      if (urlString.includes('with-variants.json')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve(externalCalendarWithVariants),
        } as Response);
      } else if (urlString.includes('without-variants.json')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve(externalCalendarWithoutVariants),
        } as Response);
      } else if (urlString.includes('api.github.com')) {
        // Mock GitHub API response - check for both with-variants and without-variants
        const calendarContent = urlString.includes('with-variants')
          ? externalCalendarWithVariants
          : externalCalendarWithoutVariants;

        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              content: btoa(JSON.stringify(calendarContent)),
              encoding: 'base64',
              sha: 'abc123',
            }),
        } as Response);
      }

      return Promise.resolve({
        ok: false,
        status: 404,
      } as Response);
    });

    // Create a fresh CalendarManager instance for each test
    calendarManager = new CalendarManager();
    await calendarManager.initialize();
    
    // Clear any calendars that might have been loaded
    calendarManager.calendars.clear();
    calendarManager.engines.clear();
    
    // Clear external calendar cache
    calendarManager.clearExternalCache();
  });

  describe('External Calendar Variant Loading', () => {
    it('should load external calendar with variants and expand them', async () => {
      // Load external calendar with variants via HTTPS
      const result = await calendarManager.loadExternalCalendar(
        'https://example.com/calendars/with-variants.json'
      );

      expect(result).toBe(true);

      // Should have base calendar + 3 variants = 4 total
      expect(calendarManager.calendars.size).toBe(4);

      // Check base calendar
      expect(calendarManager.calendars.has('external-custom-calendar')).toBe(true);

      // Check variants
      expect(calendarManager.calendars.has('external-custom-calendar(winter-theme)')).toBe(true);
      expect(calendarManager.calendars.has('external-custom-calendar(summer-theme)')).toBe(true);
      expect(calendarManager.calendars.has('external-custom-calendar(merchant-theme)')).toBe(true);
    });

    it('should load external calendar without variants normally', async () => {
      // Load external calendar without variants via HTTPS
      const result = await calendarManager.loadExternalCalendar(
        'https://example.com/calendars/without-variants.json'
      );

      expect(result).toBe(true);

      // Should have only the base calendar
      expect(calendarManager.calendars.size).toBe(1);
      expect(calendarManager.calendars.has('external-simple-calendar')).toBe(true);
    });

    it('should apply external calendar variant overrides correctly', async () => {
      await calendarManager.loadExternalCalendar(
        'https://example.com/calendars/with-variants.json'
      );

      // Test winter theme overrides
      const winterCalendar = calendarManager.calendars.get(
        'external-custom-calendar(winter-theme)'
      );
      expect(winterCalendar).toBeDefined();
      expect(winterCalendar?.year.suffix).toBe(' WC');
      expect(winterCalendar?.months[0].name).toBe('Frostmonth');
      expect(winterCalendar?.months[0].description).toBe('Cold first month');
      expect(winterCalendar?.months[1].name).toBe('Snowmonth');
      expect(winterCalendar?.months[2].name).toBe('Third'); // Not overridden

      // Test summer theme overrides
      const summerCalendar = calendarManager.calendars.get(
        'external-custom-calendar(summer-theme)'
      );
      expect(summerCalendar).toBeDefined();
      expect(summerCalendar?.year.suffix).toBe(' SC');
      expect(summerCalendar?.months[0].name).toBe('Sunmonth');
      expect(summerCalendar?.months[1].name).toBe('Second'); // Not overridden
      expect(summerCalendar?.months[2].name).toBe('Blazemonth');
      expect(summerCalendar?.weekdays[0].name).toBe('Sunday');
      expect(summerCalendar?.weekdays[1].name).toBe('Twoday'); // Not overridden

      // Test merchant theme overrides
      const merchantCalendar = calendarManager.calendars.get(
        'external-custom-calendar(merchant-theme)'
      );
      expect(merchantCalendar).toBeDefined();
      expect(merchantCalendar?.year.prefix).toBe('Trade Year ');
      expect(merchantCalendar?.year.suffix).toBe('');
      expect(merchantCalendar?.months[0].name).toBe('Coinmonth');
      expect(merchantCalendar?.months[1].name).toBe('Goldmonth');
      expect(merchantCalendar?.months[2].name).toBe('Gemmonth');
    });

    it('should create calendar engines for external calendar variants', async () => {
      await calendarManager.loadExternalCalendar(
        'https://example.com/calendars/with-variants.json'
      );

      // Check that engines exist for base and all variants
      expect(calendarManager.engines.has('external-custom-calendar')).toBe(true);
      expect(calendarManager.engines.has('external-custom-calendar(winter-theme)')).toBe(true);
      expect(calendarManager.engines.has('external-custom-calendar(summer-theme)')).toBe(true);
      expect(calendarManager.engines.has('external-custom-calendar(merchant-theme)')).toBe(true);
    });

    it('should update external calendar variant IDs correctly', async () => {
      await calendarManager.loadExternalCalendar(
        'https://example.com/calendars/with-variants.json'
      );

      // Check variant IDs include the variant name
      const winterCalendar = calendarManager.calendars.get(
        'external-custom-calendar(winter-theme)'
      );
      expect(winterCalendar?.id).toBe('external-custom-calendar(winter-theme)');

      const summerCalendar = calendarManager.calendars.get(
        'external-custom-calendar(summer-theme)'
      );
      expect(summerCalendar?.id).toBe('external-custom-calendar(summer-theme)');
    });

    it('should update external calendar variant translations to show variant name', async () => {
      await calendarManager.loadExternalCalendar(
        'https://example.com/calendars/with-variants.json'
      );

      const winterCalendar = calendarManager.calendars.get(
        'external-custom-calendar(winter-theme)'
      );
      expect(winterCalendar?.translations.en.label).toContain('Winter Theme');

      const summerCalendar = calendarManager.calendars.get(
        'external-custom-calendar(summer-theme)'
      );
      expect(summerCalendar?.translations.en.label).toContain('Summer Theme');

      const merchantCalendar = calendarManager.calendars.get(
        'external-custom-calendar(merchant-theme)'
      );
      expect(merchantCalendar?.translations.en.label).toContain('Merchant Calendar');
    });
  });

  describe('External Calendar Variant Selection', () => {
    it('should resolve to default variant when setting external calendar with variants', async () => {
      await calendarManager.loadExternalCalendar(
        'https://example.com/calendars/with-variants.json'
      );

      // Set active calendar to base ID - should resolve to default variant
      await calendarManager.setActiveCalendar('external-custom-calendar');

      // Should resolve to winter-theme since it has default: true
      const activeId = calendarManager.getActiveCalendarId();
      expect(activeId).toBe('external-custom-calendar(winter-theme)');

      const activeCalendar = calendarManager.getActiveCalendar();
      expect(activeCalendar?.year.suffix).toBe(' WC');
    });

    it('should allow setting specific external calendar variants directly', async () => {
      await calendarManager.loadExternalCalendar(
        'https://example.com/calendars/with-variants.json'
      );

      // Set active calendar to specific variant
      await calendarManager.setActiveCalendar('external-custom-calendar(summer-theme)');

      const activeId = calendarManager.getActiveCalendarId();
      expect(activeId).toBe('external-custom-calendar(summer-theme)');

      const activeCalendar = calendarManager.getActiveCalendar();
      expect(activeCalendar?.year.suffix).toBe(' SC');
    });

    it('should not resolve to default variant for external calendar without variants', async () => {
      await calendarManager.loadExternalCalendar(
        'https://example.com/calendars/without-variants.json'
      );

      // Set active calendar to base ID
      await calendarManager.setActiveCalendar('external-simple-calendar');

      // Should remain base calendar since no variants exist
      const activeId = calendarManager.getActiveCalendarId();
      expect(activeId).toBe('external-simple-calendar');
    });
  });

  describe('External Calendar Variants via Different Protocols', () => {
    it('should load external calendar with variants via GitHub protocol', async () => {
      // Ensure clean state
      calendarManager.calendars.clear();
      calendarManager.engines.clear();
      calendarManager.clearExternalCache();
      
      // Load via GitHub protocol
      const result = await calendarManager.loadExternalCalendar(
        'github:example-user/example-repo/calendars/with-variants.json'
      );

      expect(result).toBe(true);

      // Should have base calendar + 3 variants = 4 total
      expect(calendarManager.calendars.size).toBe(4);
      expect(calendarManager.calendars.has('external-custom-calendar(winter-theme)')).toBe(true);
      expect(calendarManager.calendars.has('external-custom-calendar(summer-theme)')).toBe(true);
      expect(calendarManager.calendars.has('external-custom-calendar(merchant-theme)')).toBe(true);
    });

    it('should handle external calendar variants across multiple external sources', async () => {
      // Load two different external calendars with variants
      await calendarManager.loadExternalCalendar(
        'https://example.com/calendars/with-variants.json'
      );
      await calendarManager.loadExternalCalendar(
        'github:example-user/example-repo/calendars/without-variants.json'
      );

      // Should have 4 calendars from first source + 1 from second = 5 total
      expect(calendarManager.calendars.size).toBe(5);

      // Check both sources loaded correctly
      expect(calendarManager.calendars.has('external-custom-calendar')).toBe(true);
      expect(calendarManager.calendars.has('external-custom-calendar(winter-theme)')).toBe(true);
      expect(calendarManager.calendars.has('external-simple-calendar')).toBe(true);
    });
  });

  describe('External Calendar Variant Error Handling', () => {
    it('should handle invalid variant data gracefully', async () => {
      // Mock calendar with invalid variant structure
      const invalidVariantCalendar = {
        ...externalCalendarWithVariants,
        variants: {
          'broken-variant': {
            // Missing required 'name' field
            overrides: { year: { suffix: ' BROKEN' } },
          },
          'good-variant': {
            name: 'Good Variant',
            overrides: { year: { suffix: ' GOOD' } },
          },
        },
      };

      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve(invalidVariantCalendar),
        } as Response)
      );

      const result = await calendarManager.loadExternalCalendar(
        'https://example.com/calendars/invalid-variants.json'
      );

      // Should still succeed - invalid variants are skipped
      expect(result).toBe(true);

      // Should have base calendar + 1 good variant
      expect(calendarManager.calendars.size).toBe(2);
      expect(calendarManager.calendars.has('external-custom-calendar')).toBe(true);
      expect(calendarManager.calendars.has('external-custom-calendar(good-variant)')).toBe(true);
      expect(calendarManager.calendars.has('external-custom-calendar(broken-variant)')).toBe(false);
    });

    it('should preserve base calendar even if all variants fail', async () => {
      // Mock calendar with completely broken variants
      const brokenVariantsCalendar = {
        ...externalCalendarWithVariants,
        variants: {
          'broken1': {}, // Missing name and overrides
          'broken2': { name: 'Broken' }, // Missing overrides
        },
      };

      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve(brokenVariantsCalendar),
        } as Response)
      );

      const result = await calendarManager.loadExternalCalendar(
        'https://example.com/calendars/broken-variants.json'
      );

      // Should succeed with just the base calendar
      expect(result).toBe(true);
      expect(calendarManager.calendars.size).toBe(1);
      expect(calendarManager.calendars.has('external-custom-calendar')).toBe(true);
    });
  });

  describe('External Calendar Variant Cache Integration', () => {
    it('should cache external calendars with their expanded variants', async () => {
      // Load external calendar with variants
      await calendarManager.loadExternalCalendar(
        'https://example.com/calendars/with-variants.json'
      );

      // Clear fetch mock to ensure cache is used
      mockFetch.mockClear();

      // Load same calendar again - should use cache
      const result = await calendarManager.loadExternalCalendar(
        'https://example.com/calendars/with-variants.json'
      );

      expect(result).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();

      // Should still have all variants available
      expect(calendarManager.calendars.size).toBe(4);
      expect(calendarManager.calendars.has('external-custom-calendar(winter-theme)')).toBe(true);
    });
  });

  describe('External Calendar Variant API Integration', () => {
    it('should list external calendar variants in available calendars', async () => {
      await calendarManager.loadExternalCalendar(
        'https://example.com/calendars/with-variants.json'
      );

      const availableCalendars = calendarManager.getAllCalendars();
      const calendarIds = availableCalendars.map(cal => cal.id);

      expect(calendarIds).toContain('external-custom-calendar');
      expect(calendarIds).toContain('external-custom-calendar(winter-theme)');
      expect(calendarIds).toContain('external-custom-calendar(summer-theme)');
      expect(calendarIds).toContain('external-custom-calendar(merchant-theme)');
      expect(availableCalendars.length).toBe(4);
    });

    it('should provide calendar engines for external calendar variants', async () => {
      await calendarManager.loadExternalCalendar(
        'https://example.com/calendars/with-variants.json'
      );

      // Set active to a variant
      await calendarManager.setActiveCalendar('external-custom-calendar(summer-theme)');

      const activeEngine = calendarManager.getActiveEngine();
      expect(activeEngine).toBeDefined();

      const engineCalendar = activeEngine?.getCalendar();
      expect(engineCalendar?.id).toBe('external-custom-calendar(summer-theme)');
      expect(engineCalendar?.year.suffix).toBe(' SC');
    });
  });
});