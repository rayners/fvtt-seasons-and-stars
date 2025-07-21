import { describe, it, expect, beforeEach, vi } from 'vitest';

// Use real TestLogger instead of mocks for better testing
import { TestLogger } from './utils/test-logger';
import { mockCalendarFetch } from './utils/mock-calendar-fetch';
vi.mock('../src/core/logger', () => ({
  Logger: TestLogger,
}));

import { CalendarManager } from '../src/core/calendar-manager';

// Mock foundry environment and dependencies
vi.stubGlobal('game', {
  settings: {
    get: vi.fn(),
    set: vi.fn(),
  },
  modules: new Map([['seasons-and-stars', { id: 'seasons-and-stars', active: true }]]),
});
vi.stubGlobal('Hooks', {
  callAll: vi.fn(),
  on: vi.fn(),
});

// Mock fetch to return different responses for different files
vi.stubGlobal('fetch', vi.fn());

// Note: No longer using generated calendar list - calendars loaded dynamically from index.json

// Mock CalendarValidator
vi.mock('../src/core/calendar-validator', () => ({
  CalendarValidator: {
    validate: vi.fn().mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    }),
    validateWithHelp: vi.fn().mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    }),
  },
}));

// Mock CalendarLocalization
vi.mock('../src/core/calendar-localization', () => ({
  CalendarLocalization: {
    getCalendarLabel: vi.fn().mockReturnValue('Test Calendar'),
  },
}));

describe('External Calendar Variants System', () => {
  let calendarManager: CalendarManager;

  beforeEach(async () => {
    vi.clearAllMocks();
    TestLogger.clearLogs();

    // Mock fetch to read actual calendar files from disk
    mockCalendarFetch();

    calendarManager = new CalendarManager();
  });

  describe('External Variant File Loading', () => {
    it('should load base calendar and external variants successfully', async () => {
      await calendarManager.loadBuiltInCalendars();

      // Should have all core calendars (16 base + 4 golarion variants + 4 star trek variants = 23)
      expect(calendarManager.calendars.size).toBe(23);
      expect(calendarManager.calendars.has('gregorian')).toBe(true);
      expect(calendarManager.calendars.has('golarion-pf2e')).toBe(true);

      // Manually load the external variant file to test the functionality
      const variantFileData = {
        id: 'gregorian-star-trek-variants',
        baseCalendar: 'gregorian',
        variants: {
          'earth-stardate': {
            name: 'Earth Stardate System',
            description: 'Earth-based stardate calendar',
            default: true,
            config: { yearOffset: 2323 },
            overrides: {
              year: { prefix: 'Stardate ', suffix: '' },
            },
          },
          'vulcan-calendar': {
            name: 'Vulcan Calendar',
            description: 'Traditional Vulcan calendar system',
            config: { yearOffset: 2161 },
            overrides: {
              year: { prefix: '', suffix: ' V.S.' },
              months: {
                January: { name: "T'Keth", description: 'First month in Vulcan calendar' },
                February: { name: "T'Ket", description: 'Second month in Vulcan calendar' },
              },
            },
          },
          'klingon-calendar': {
            name: 'Klingon Calendar',
            description: 'Traditional Klingon warrior calendar',
            config: { yearOffset: 2151 },
            overrides: {
              year: { prefix: '', suffix: ' K.Y.' },
              months: {
                January: { name: 'Maktag', description: 'Month of battle preparation' },
                February: { name: 'Jagh', description: 'Month of enemies' },
              },
              weekdays: {
                Sunday: { name: 'jup', description: 'Day of the warrior' },
                Monday: { name: 'ghItlh', description: 'Day of writing' },
              },
            },
          },
          'federation-standard': {
            name: 'Federation Standard Calendar',
            description: 'United Federation of Planets standard calendar',
            config: { yearOffset: 2161 },
            overrides: {
              year: { prefix: '', suffix: ' F.S.' },
            },
          },
        },
      };

      const baseCalendar = calendarManager.calendars.get('gregorian');
      expect(baseCalendar).toBeDefined();

      // Apply external variants manually
      calendarManager['applyExternalVariants'](baseCalendar!, variantFileData);

      // Should still have all core calendars (Star Trek variants are already loaded)
      expect(calendarManager.calendars.size).toBe(23);

      // Check Star Trek variants
      expect(calendarManager.calendars.has('gregorian(earth-stardate)')).toBe(true);
      expect(calendarManager.calendars.has('gregorian(vulcan-calendar)')).toBe(true);
      expect(calendarManager.calendars.has('gregorian(klingon-calendar)')).toBe(true);
      expect(calendarManager.calendars.has('gregorian(federation-standard)')).toBe(true);
    });

    it('should apply external variant overrides correctly', async () => {
      await calendarManager.loadBuiltInCalendars();

      // Manually apply external variants to test the functionality
      const variantFileData = {
        id: 'gregorian-star-trek-variants',
        baseCalendar: 'gregorian',
        variants: {
          'earth-stardate': {
            name: 'Earth Stardate System',
            default: true,
            overrides: {
              year: { prefix: 'Stardate ', suffix: '' },
            },
          },
          'vulcan-calendar': {
            name: 'Vulcan Calendar',
            overrides: {
              year: { prefix: '', suffix: ' V.S.' },
              months: {
                January: { name: "T'Keth" },
                February: { name: "T'Ket" },
              },
            },
          },
          'klingon-calendar': {
            name: 'Klingon Calendar',
            overrides: {
              year: { prefix: '', suffix: ' K.Y.' },
              months: {
                January: { name: 'Maktag' },
                February: { name: 'Jagh' },
              },
              weekdays: {
                Sunday: { name: 'jup' },
                Monday: { name: 'ghItlh' },
              },
            },
          },
        },
      };

      const baseCalendar = calendarManager.calendars.get('gregorian');
      expect(baseCalendar).toBeDefined();

      // Apply external variants manually
      calendarManager['applyExternalVariants'](baseCalendar!, variantFileData);

      // Test Vulcan calendar overrides
      const vulcanCalendar = calendarManager.calendars.get('gregorian(vulcan-calendar)');
      expect(vulcanCalendar).toBeDefined();
      expect(vulcanCalendar?.year.suffix).toBe(' V.S.');
      expect(vulcanCalendar?.months[0].name).toBe("T'Keth");
      expect(vulcanCalendar?.months[1].name).toBe("T'Ket");
      expect(vulcanCalendar?.months[2].name).toBe('March'); // Not overridden

      // Test Klingon calendar overrides
      const klingonCalendar = calendarManager.calendars.get('gregorian(klingon-calendar)');
      expect(klingonCalendar).toBeDefined();
      expect(klingonCalendar?.year.suffix).toBe(' K.Y.');
      expect(klingonCalendar?.months[0].name).toBe('Maktag');
      expect(klingonCalendar?.months[1].name).toBe('Jagh');
      expect(klingonCalendar?.weekdays[0].name).toBe('jup');
      expect(klingonCalendar?.weekdays[1].name).toBe('ghItlh');
      expect(klingonCalendar?.weekdays[2].name).toBe('Tuesday'); // Not overridden

      // Test Stardate calendar overrides
      const stardateCalendar = calendarManager.calendars.get('gregorian(earth-stardate)');
      expect(stardateCalendar).toBeDefined();
      expect(stardateCalendar?.year.prefix).toBe('Stardate ');
      expect(stardateCalendar?.year.suffix).toBe('');
    });

    it('should preserve base calendar properties for non-overridden items', async () => {
      await calendarManager.loadBuiltInCalendars();

      // Manually apply external variants to test the functionality
      const variantFileData = {
        id: 'gregorian-star-trek-variants',
        baseCalendar: 'gregorian',
        variants: {
          'vulcan-calendar': {
            name: 'Vulcan Calendar',
            overrides: {
              year: { prefix: '', suffix: ' V.S.' },
              months: {
                January: { name: "T'Keth" },
                February: { name: "T'Ket" },
              },
            },
          },
        },
      };

      const baseCalendar = calendarManager.calendars.get('gregorian');
      expect(baseCalendar).toBeDefined();

      // Apply external variants manually
      calendarManager['applyExternalVariants'](baseCalendar!, variantFileData);

      const vulcanCalendar = calendarManager.calendars.get('gregorian(vulcan-calendar)');
      expect(vulcanCalendar).toBeDefined();

      // Non-overridden months should remain unchanged
      expect(vulcanCalendar?.months[2].name).toBe('March');
      expect(vulcanCalendar?.months[2].days).toBe(31);

      // Non-overridden weekdays should remain unchanged
      expect(vulcanCalendar?.weekdays[2].name).toBe('Tuesday');
      expect(vulcanCalendar?.weekdays.length).toBe(7); // Same as base
    });

    it('should handle missing base calendar gracefully', async () => {
      // Mock fetch to return 404 for gregorian calendar
      vi.mocked(fetch).mockImplementation(() => {
        return Promise.resolve({ ok: false, status: 404 } as Response);
      });

      await calendarManager.loadBuiltInCalendars();

      // Should have no calendars since base wasn't loaded
      expect(calendarManager.calendars.size).toBe(0);
    });

    it('should handle invalid external variant file format', async () => {
      // Use the shared mock (no need to override for this test)
      await calendarManager.loadBuiltInCalendars();

      // Should have all core calendars (16 base + 4 golarion variants + 4 star trek variants = 23)
      expect(calendarManager.calendars.size).toBe(23);
      expect(calendarManager.calendars.has('gregorian')).toBe(true);

      // Test the invalid variant file handling by calling the method directly
      const invalidVariantFileData = {
        id: 'invalid-variant',
        // Missing required baseCalendar field
        variants: {},
      };

      // This should fail validation and not load any variants
      const isValid = calendarManager['validateExternalVariantFile'](invalidVariantFileData);
      expect(isValid).toBe(false);
    });

    it('should not auto-resolve to external variants when setting base calendar', async () => {
      await calendarManager.loadBuiltInCalendars();

      // Set active calendar to base ID
      await calendarManager.setActiveCalendar('gregorian');

      // Should remain base calendar - external variants are not automatic defaults
      // They represent themed collections that should be explicitly selected
      const activeId = calendarManager.getActiveCalendarId();
      expect(activeId).toBe('gregorian');
    });

    it('should allow setting specific external variants directly', async () => {
      await calendarManager.loadBuiltInCalendars();

      // Manually apply external variants to test the functionality
      const variantFileData = {
        id: 'gregorian-star-trek-variants',
        baseCalendar: 'gregorian',
        variants: {
          'vulcan-calendar': {
            name: 'Vulcan Calendar',
            overrides: {
              year: { prefix: '', suffix: ' V.S.' },
            },
          },
        },
      };

      const baseCalendar = calendarManager.calendars.get('gregorian');
      expect(baseCalendar).toBeDefined();

      // Apply external variants manually
      calendarManager['applyExternalVariants'](baseCalendar!, variantFileData);

      // Set active calendar to specific external variant
      await calendarManager.setActiveCalendar('gregorian(vulcan-calendar)');

      // Should use the specific variant
      const activeId = calendarManager.getActiveCalendarId();
      expect(activeId).toBe('gregorian(vulcan-calendar)');

      const activeCalendar = calendarManager.getActiveCalendar();
      expect(activeCalendar?.year.suffix).toBe(' V.S.');
    });

    it('should create calendar engines for external variants', async () => {
      await calendarManager.loadBuiltInCalendars();

      // Manually apply external variants to test the functionality
      const variantFileData = {
        id: 'gregorian-star-trek-variants',
        baseCalendar: 'gregorian',
        variants: {
          'earth-stardate': {
            name: 'Earth Stardate System',
            overrides: {
              year: { prefix: 'Stardate ', suffix: '' },
            },
          },
          'vulcan-calendar': {
            name: 'Vulcan Calendar',
            overrides: {
              year: { prefix: '', suffix: ' V.S.' },
            },
          },
          'klingon-calendar': {
            name: 'Klingon Calendar',
            overrides: {
              year: { prefix: '', suffix: ' K.Y.' },
            },
          },
          'federation-standard': {
            name: 'Federation Standard Calendar',
            overrides: {
              year: { prefix: '', suffix: ' F.S.' },
            },
          },
        },
      };

      const baseCalendar = calendarManager.calendars.get('gregorian');
      expect(baseCalendar).toBeDefined();

      // Apply external variants manually
      calendarManager['applyExternalVariants'](baseCalendar!, variantFileData);

      // Check that engines exist for all variants
      expect(calendarManager.engines.has('gregorian')).toBe(true);
      expect(calendarManager.engines.has('gregorian(earth-stardate)')).toBe(true);
      expect(calendarManager.engines.has('gregorian(vulcan-calendar)')).toBe(true);
      expect(calendarManager.engines.has('gregorian(klingon-calendar)')).toBe(true);
      expect(calendarManager.engines.has('gregorian(federation-standard)')).toBe(true);
    });

    it('should update variant calendar translations to show variant name', async () => {
      await calendarManager.loadBuiltInCalendars();

      // Manually apply external variants to test the functionality
      const variantFileData = {
        id: 'gregorian-star-trek-variants',
        baseCalendar: 'gregorian',
        variants: {
          'vulcan-calendar': {
            name: 'Vulcan Calendar',
            overrides: {
              year: { prefix: '', suffix: ' V.S.' },
            },
          },
          'klingon-calendar': {
            name: 'Klingon Calendar',
            overrides: {
              year: { prefix: '', suffix: ' K.Y.' },
            },
          },
        },
      };

      const baseCalendar = calendarManager.calendars.get('gregorian');
      expect(baseCalendar).toBeDefined();

      // Apply external variants manually
      calendarManager['applyExternalVariants'](baseCalendar!, variantFileData);

      const vulcanCalendar = calendarManager.calendars.get('gregorian(vulcan-calendar)');
      expect(vulcanCalendar).toBeDefined();
      expect(vulcanCalendar?.translations.en.label).toContain('Vulcan Calendar');

      const klingonCalendar = calendarManager.calendars.get('gregorian(klingon-calendar)');
      expect(klingonCalendar).toBeDefined();
      expect(klingonCalendar?.translations.en.label).toContain('Klingon Calendar');
    });
  });

  describe('External Variant File Validation', () => {
    it('should validate required external variant file fields', async () => {
      const validData = {
        id: 'test-variants',
        baseCalendar: 'gregorian',
        variants: {
          'test-variant': { name: 'Test', overrides: {} },
        },
      };

      const invalidData = [
        {}, // Empty object
        { id: 'test' }, // Missing baseCalendar and variants
        { id: 'test', baseCalendar: 'gregorian' }, // Missing variants
        { baseCalendar: 'gregorian', variants: {} }, // Missing id
        { id: 'test', baseCalendar: 'gregorian', variants: null }, // Null variants
      ];

      // Access private method for testing
      const manager = new CalendarManager();
      const validateMethod = (manager as any).validateExternalVariantFile;

      expect(validateMethod.call(manager, validData)).toBe(true);

      for (const invalid of invalidData) {
        expect(validateMethod.call(manager, invalid)).toBe(false);
      }
    });
  });
});
