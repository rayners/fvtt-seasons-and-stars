import { describe, it, expect, beforeEach, vi } from 'vitest';

// Use real TestLogger instead of mocks for better testing
import { TestLogger } from './utils/test-logger';
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
});
vi.stubGlobal('Hooks', {
  callAll: vi.fn(),
  on: vi.fn(),
});

// Mock fetch to return different responses for different files
vi.stubGlobal('fetch', vi.fn());

// Mock the built-in calendars list to include gregorian and variants
vi.mock('../src/generated/calendar-list', () => ({
  BUILT_IN_CALENDARS: ['gregorian', 'gregorian-star-trek-variants'],
}));

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

    // Mock responses for different calendar files
    vi.mocked(fetch).mockImplementation((url: string) => {
      if (url.includes('gregorian.json')) {
        // Mock gregorian base calendar
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 'gregorian',
              translations: {
                en: { label: 'Gregorian Calendar', description: 'Standard Earth calendar' },
              },
              months: [
                { name: 'January', days: 31 },
                { name: 'February', days: 28 },
                { name: 'March', days: 31 },
                { name: 'April', days: 30 },
                { name: 'May', days: 31 },
                { name: 'June', days: 30 },
                { name: 'July', days: 31 },
                { name: 'August', days: 31 },
                { name: 'September', days: 30 },
                { name: 'October', days: 31 },
                { name: 'November', days: 30 },
                { name: 'December', days: 31 },
              ],
              weekdays: [
                { name: 'Sunday' },
                { name: 'Monday' },
                { name: 'Tuesday' },
                { name: 'Wednesday' },
                { name: 'Thursday' },
                { name: 'Friday' },
                { name: 'Saturday' },
              ],
              year: { epoch: 0, suffix: ' AD' },
            }),
        } as Response);
      } else if (url.includes('gregorian-star-trek-variants.json')) {
        // Mock Star Trek variants file
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 'gregorian-star-trek-variants',
              baseCalendar: 'gregorian',
              name: 'Star Trek Calendar Variants',
              description: 'Star Trek universe calendar variants',
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
            }),
        } as Response);
      } else {
        // File not found
        return Promise.resolve({
          ok: false,
          status: 404,
        } as Response);
      }
    });

    calendarManager = new CalendarManager();
  });

  describe('External Variant File Loading', () => {
    it('should load base calendar and external variants successfully', async () => {
      await calendarManager.loadBuiltInCalendars();

      // Should have base calendar + 4 Star Trek variants = 5 total
      expect(calendarManager.calendars.size).toBe(5);

      // Check base calendar
      expect(calendarManager.calendars.has('gregorian')).toBe(true);

      // Check Star Trek variants
      expect(calendarManager.calendars.has('gregorian(earth-stardate)')).toBe(true);
      expect(calendarManager.calendars.has('gregorian(vulcan-calendar)')).toBe(true);
      expect(calendarManager.calendars.has('gregorian(klingon-calendar)')).toBe(true);
      expect(calendarManager.calendars.has('gregorian(federation-standard)')).toBe(true);
    });

    it('should apply external variant overrides correctly', async () => {
      await calendarManager.loadBuiltInCalendars();

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
      // Mock a variant file that references a non-existent base calendar
      vi.mocked(fetch).mockImplementation((url: string) => {
        if (url.includes('gregorian.json')) {
          return Promise.resolve({ ok: false, status: 404 } as Response);
        } else if (url.includes('gregorian-star-trek-variants.json')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                id: 'gregorian-star-trek-variants',
                baseCalendar: 'gregorian',
                variants: {
                  'test-variant': {
                    name: 'Test Variant',
                    overrides: { year: { suffix: ' TEST' } },
                  },
                },
              }),
          } as Response);
        }
        return Promise.resolve({ ok: false, status: 404 } as Response);
      });

      await calendarManager.loadBuiltInCalendars();

      // Should have no calendars since base wasn't loaded
      expect(calendarManager.calendars.size).toBe(0);
    });

    it('should handle invalid external variant file format', async () => {
      // Mock invalid variant file
      vi.mocked(fetch).mockImplementation((url: string) => {
        if (url.includes('gregorian.json')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                id: 'gregorian',
                translations: { en: { label: 'Gregorian' } },
                months: [{ name: 'January', days: 31 }],
                weekdays: [{ name: 'Sunday' }],
                year: { epoch: 0 },
              }),
          } as Response);
        } else if (url.includes('gregorian-star-trek-variants.json')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                // Missing required fields
                invalidStructure: true,
              }),
          } as Response);
        }
        return Promise.resolve({ ok: false, status: 404 } as Response);
      });

      await calendarManager.loadBuiltInCalendars();

      // Should only have base calendar, no variants due to invalid format
      expect(calendarManager.calendars.size).toBe(1);
      expect(calendarManager.calendars.has('gregorian')).toBe(true);
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

      // Check that engines exist for all variants
      expect(calendarManager.engines.has('gregorian')).toBe(true);
      expect(calendarManager.engines.has('gregorian(earth-stardate)')).toBe(true);
      expect(calendarManager.engines.has('gregorian(vulcan-calendar)')).toBe(true);
      expect(calendarManager.engines.has('gregorian(klingon-calendar)')).toBe(true);
      expect(calendarManager.engines.has('gregorian(federation-standard)')).toBe(true);
    });

    it('should update variant calendar translations to show variant name', async () => {
      await calendarManager.loadBuiltInCalendars();

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
