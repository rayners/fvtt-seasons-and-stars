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

// Mock CalendarValidator - will return invalid for calendars missing currentYear
vi.mock('../src/core/calendar-validator', () => ({
  CalendarValidator: {
    validate: vi.fn().mockImplementation(calendar => {
      // Return invalid for calendars missing currentYear
      if (!calendar.year?.currentYear) {
        return {
          isValid: false,
          errors: ['Missing year.currentYear field'],
          warnings: [],
        };
      }
      return {
        isValid: true,
        errors: [],
        warnings: [],
      };
    }),
    validateWithHelp: vi.fn().mockImplementation(calendar => {
      // Return invalid for calendars missing currentYear
      if (!calendar.year?.currentYear) {
        return {
          isValid: false,
          errors: ['Missing year.currentYear field'],
          warnings: [],
        };
      }
      return {
        isValid: true,
        errors: [],
        warnings: [],
      };
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

      // Should have core calendars: gregorian + 2 canonical hours variants = 3 total
      // Note: External variant calendars create one calendar per variant using parentheses notation
      expect(calendarManager.calendars.size).toBe(3);
      expect(calendarManager.calendars.has('gregorian')).toBe(true);
      expect(calendarManager.calendars.has('gregorian(medieval-monastery)')).toBe(true);
      expect(calendarManager.calendars.has('gregorian(custom-hours)')).toBe(true);

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

      // Should now have core calendars + 4 Star Trek variants (3 + 4 = 7 total)
      expect(calendarManager.calendars.size).toBe(7);

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

      // Should have core calendars: gregorian + 2 canonical hours variants = 3 total
      // Note: External variant calendars create one calendar per variant using parentheses notation
      expect(calendarManager.calendars.size).toBe(3);
      expect(calendarManager.calendars.has('gregorian')).toBe(true);
      expect(calendarManager.calendars.has('gregorian(medieval-monastery)')).toBe(true);
      expect(calendarManager.calendars.has('gregorian(custom-hours)')).toBe(true);

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

  describe('Calendar Collection Two-Pass Loading', () => {
    it('should handle mixed regular calendars and external variant files in collections', async () => {
      // Create a mock collection that contains both regular calendars and variant files
      const mockCollectionIndex = {
        $schema: 'https://example.com/calendar-collection-schema.json',
        name: 'Mixed Calendar Collection',
        description: 'Collection with both regular calendars and external variants',
        version: '1.0.0',
        calendars: [
          {
            id: 'test-regular-calendar',
            name: 'Test Regular Calendar',
            file: 'test-regular.json',
            description: 'A regular calendar for testing',
            author: 'Test Author',
          },
          {
            id: 'gregorian-test-variants',
            name: 'Test Gregorian Variants',
            file: 'gregorian-test-variants.json',
            description: 'External variants for testing',
            author: 'Test Author',
          },
        ],
      };

      // Mock regular calendar file
      const mockRegularCalendar = {
        id: 'test-regular-calendar',
        translations: {
          en: {
            label: 'Test Regular Calendar',
            description: 'A regular calendar for testing',
          },
        },
        year: {
          epoch: 0,
          currentYear: 2024,
          prefix: '',
          suffix: ' CE',
          startDay: 0,
        },
        months: [
          { name: 'January', abbreviation: 'Jan', days: 31, description: 'First month' },
          { name: 'February', abbreviation: 'Feb', days: 28, description: 'Second month' },
        ],
        weekdays: [
          { name: 'Monday', abbreviation: 'Mon' },
          { name: 'Tuesday', abbreviation: 'Tue' },
        ],
        leapYear: { rule: 'none' },
        intercalary: [],
        moons: [],
        seasons: [],
        time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
      };

      // Mock external variant file
      const mockVariantFile = {
        id: 'gregorian-test-variants',
        baseCalendar: 'gregorian',
        variants: {
          'test-variant': {
            name: 'Test Variant',
            description: 'A test variant',
            overrides: {
              year: {
                prefix: 'Test ',
                suffix: ' TV',
              },
            },
          },
        },
      };

      // First load the gregorian calendar so the variant has a base to reference
      await calendarManager.loadBuiltInCalendars();
      const initialCalendarCount = calendarManager.calendars.size;

      // Now setup fetch mock to return appropriate responses for our test collection
      // This extends the existing mockCalendarFetch to handle our test URLs
      const fetchMock = vi.mocked(fetch);
      const originalImpl = fetchMock.getMockImplementation();
      fetchMock.mockImplementation(async (url: string) => {
        const urlStr = url.toString();

        if (urlStr.includes('mixed-collection')) {
          return new Response(JSON.stringify(mockCollectionIndex), { status: 200 });
        } else if (urlStr.includes('test-regular.json')) {
          return new Response(JSON.stringify(mockRegularCalendar), { status: 200 });
        } else if (urlStr.includes('gregorian-test-variants.json')) {
          return new Response(JSON.stringify(mockVariantFile), { status: 200 });
        }

        // Fall back to original implementation for built-in calendar loading
        return originalImpl ? originalImpl(url) : new Response('Not Found', { status: 404 });
      });

      // Load the mixed collection
      const results = await calendarManager.loadCalendarCollection(
        'https://example.com/mixed-collection'
      );

      // Verify results
      expect(results).toHaveLength(2);

      // Both should be successful (regular calendar loaded in pass 1, variant processed in pass 2)
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);

      // Verify the regular calendar was loaded
      expect(calendarManager.calendars.has('test-regular-calendar')).toBe(true);
      expect(calendarManager.calendars.get('test-regular-calendar')?.year.currentYear).toBe(2024);

      // Verify the variant was applied to the base gregorian calendar
      expect(calendarManager.calendars.has('gregorian(test-variant)')).toBe(true);
      const variant = calendarManager.calendars.get('gregorian(test-variant)');
      expect(variant?.year.prefix).toBe('Test ');
      expect(variant?.year.suffix).toBe(' TV');

      // Total calendar count should be initial count + 1 regular + 1 variant
      expect(calendarManager.calendars.size).toBe(initialCalendarCount + 2);
    });

    it('should handle variant files without base calendar gracefully', async () => {
      const mockCollectionIndex = {
        $schema: 'https://example.com/calendar-collection-schema.json',
        name: 'Orphaned Variants Collection',
        description: 'Collection with variant file but no base calendar',
        version: '1.0.0',
        calendars: [
          {
            id: 'orphaned-variants',
            name: 'Orphaned Variants',
            file: 'orphaned-variants.json',
            description: 'Variants without base calendar',
            author: 'Test Author',
          },
        ],
      };

      const mockOrphanedVariantFile = {
        id: 'orphaned-variants',
        baseCalendar: 'nonexistent-calendar',
        variants: {
          'orphan-variant': {
            name: 'Orphan Variant',
            description: 'A variant without a base',
          },
        },
      };

      // Setup fetch mock to handle our test collection URLs while preserving built-in calendar loading
      const fetchMock = vi.mocked(fetch);
      const originalImpl = fetchMock.getMockImplementation();
      fetchMock.mockImplementation(async (url: string) => {
        const urlStr = url.toString();

        if (urlStr.includes('orphaned-collection')) {
          return new Response(JSON.stringify(mockCollectionIndex), { status: 200 });
        } else if (urlStr.includes('orphaned-variants.json')) {
          return new Response(JSON.stringify(mockOrphanedVariantFile), { status: 200 });
        }

        // Fall back to original implementation for built-in calendar loading
        return originalImpl ? originalImpl(url) : new Response('Not Found', { status: 404 });
      });

      // Load the collection with orphaned variant
      const results = await calendarManager.loadCalendarCollection(
        'https://example.com/orphaned-collection'
      );

      // Should have one result that failed due to missing base calendar
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain("Base calendar 'nonexistent-calendar' not found");

      // Variant should not be loaded
      expect(calendarManager.calendars.has('nonexistent-calendar(orphan-variant)')).toBe(false);
    });

    it('should skip validation for variant files but validate regular calendars', async () => {
      const mockCollectionIndex = {
        $schema: 'https://example.com/calendar-collection-schema.json',
        name: 'Validation Test Collection',
        description: 'Tests validation behavior for mixed collections',
        version: '1.0.0',
        calendars: [
          {
            id: 'invalid-regular-calendar',
            name: 'Invalid Regular Calendar',
            file: 'invalid-regular.json',
            description: 'A calendar missing required fields',
            author: 'Test Author',
          },
          {
            id: 'valid-test-variants',
            name: 'Valid Test Variants',
            file: 'valid-test-variants.json',
            description: 'Valid external variants',
            author: 'Test Author',
          },
        ],
      };

      // Invalid regular calendar (missing required fields)
      const mockInvalidCalendar = {
        id: 'invalid-regular-calendar',
        translations: {
          en: {
            label: 'Invalid Calendar',
            description: 'Missing required fields',
          },
        },
        year: {
          epoch: 0,
          // Missing currentYear to trigger validation error
          prefix: '',
          suffix: '',
          startDay: 0,
        },
        months: [],
        weekdays: [],
        leapYear: { rule: 'none' },
        intercalary: [],
        moons: [],
        seasons: [],
        time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
      };

      // Valid variant file (should not be validated as regular calendar)
      const mockValidVariantFile = {
        id: 'valid-test-variants',
        baseCalendar: 'gregorian',
        variants: {
          'validation-test-variant': {
            name: 'Validation Test Variant',
            description: 'Testing validation behavior',
          },
        },
      };

      // Ensure gregorian calendar exists for the variant
      await calendarManager.loadBuiltInCalendars();

      // Setup fetch mock to handle our test collection URLs while preserving built-in calendar loading
      const fetchMock = vi.mocked(fetch);
      const originalImpl = fetchMock.getMockImplementation();
      fetchMock.mockImplementation(async (url: string) => {
        const urlStr = url.toString();

        if (urlStr.includes('validation-collection')) {
          return new Response(JSON.stringify(mockCollectionIndex), { status: 200 });
        } else if (urlStr.includes('invalid-regular.json')) {
          return new Response(JSON.stringify(mockInvalidCalendar), { status: 200 });
        } else if (urlStr.includes('valid-test-variants.json')) {
          return new Response(JSON.stringify(mockValidVariantFile), { status: 200 });
        }

        // Fall back to original implementation for built-in calendar loading
        return originalImpl ? originalImpl(url) : new Response('Not Found', { status: 404 });
      });

      // Load the collection
      const results = await calendarManager.loadCalendarCollection(
        'https://example.com/validation-collection'
      );

      expect(results).toHaveLength(2);

      // Regular calendar should fail validation
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('validation');

      // Variant file should succeed (processed without calendar validation)
      expect(results[1].success).toBe(true);

      // Variant should be applied successfully
      expect(calendarManager.calendars.has('gregorian(validation-test-variant)')).toBe(true);
    });
  });
});
