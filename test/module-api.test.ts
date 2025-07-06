import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use real TestLogger instead of mocks for better testing
import { TestLogger } from './utils/test-logger';
vi.mock('../src/core/logger', () => ({
  Logger: TestLogger,
}));

// Mock Foundry environment inline
vi.stubGlobal('game', {});

import { CalendarEngine } from '../src/core/calendar-engine';
import { CalendarManager } from '../src/core/calendar-manager';
import { CalendarDate } from '../src/core/calendar-date';
import { mockStandardCalendar } from './mocks/calendar-mocks';

describe('Module API Methods', () => {
  let calendarManager: CalendarManager;
  let calendarEngine: CalendarEngine;
  let testCalendar: any;
  let seasonsStarsAPI: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    TestLogger.clearLogs();

    // Use real calendar from test mocks
    testCalendar = {
      ...mockStandardCalendar,
      months: [
        { name: 'January', days: 31 },
        { name: 'February', days: 28 },
        { name: 'March', days: 31 },
        { name: 'April', days: 30 },
        { name: 'May', days: 31 },
        { name: 'June', days: 30 },
      ],
    };

    // Create real calendar engine
    calendarEngine = new CalendarEngine(testCalendar);

    // Create real calendar manager
    calendarManager = new CalendarManager();

    // Manually setup the manager without full initialization (which requires Foundry)
    calendarManager.calendars.set(testCalendar.id, testCalendar);
    calendarManager.engines.set(testCalendar.id, calendarEngine);

    // Set the active calendar to enable getActiveCalendar() and getActiveEngine()
    (calendarManager as any).activeCalendarId = testCalendar.id;

    // Mock the TimeConverter methods since they depend on Foundry's game.time
    const mockTimeConverter = {
      advanceDays: vi.fn().mockResolvedValue(undefined),
      advanceHours: vi.fn().mockResolvedValue(undefined),
      advanceMinutes: vi.fn().mockResolvedValue(undefined),
      advanceWeeks: vi.fn().mockResolvedValue(undefined),
      advanceMonths: vi.fn().mockResolvedValue(undefined),
      advanceYears: vi.fn().mockResolvedValue(undefined),
    };

    // Inject the mock TimeConverter
    (calendarManager as any).timeConverter = mockTimeConverter;

    // Create a spy to track TimeConverter calls
    const timeConverterSpy = {
      advanceDays: vi.spyOn(mockTimeConverter, 'advanceDays'),
      advanceHours: vi.spyOn(mockTimeConverter, 'advanceHours'),
      advanceMinutes: vi.spyOn(mockTimeConverter, 'advanceMinutes'),
      advanceWeeks: vi.spyOn(mockTimeConverter, 'advanceWeeks'),
      advanceMonths: vi.spyOn(mockTimeConverter, 'advanceMonths'),
      advanceYears: vi.spyOn(mockTimeConverter, 'advanceYears'),
    };

    // Store spy for test access
    (calendarManager as any)._timeConverterSpy = timeConverterSpy;

    // Setup global game object with S&S API using real manager
    global.game = {
      time: { worldTime: 86400 },
      seasonsStars: {
        manager: calendarManager,
      },
    } as any;

    // Import the module to get the API - need to do this after setting up the manager
    const { APIWrapper } = await import('../src/core/api-wrapper');

    seasonsStarsAPI = {
      advanceDays: async (days: number, calendarId?: string): Promise<void> => {
        return APIWrapper.wrapAPIMethod(
          'advanceDays',
          { days, calendarId },
          (params: any) => {
            APIWrapper.validateNumber(params.days, 'Days');
            APIWrapper.validateCalendarId(params.calendarId);
          },
          () => calendarManager.advanceDays(days)
        );
      },

      advanceHours: async (hours: number, calendarId?: string): Promise<void> => {
        return APIWrapper.wrapAPIMethod(
          'advanceHours',
          { hours, calendarId },
          (params: any) => {
            APIWrapper.validateNumber(params.hours, 'Hours');
            APIWrapper.validateCalendarId(params.calendarId);
          },
          () => calendarManager.advanceHours(hours)
        );
      },

      advanceMinutes: async (minutes: number, calendarId?: string): Promise<void> => {
        return APIWrapper.wrapAPIMethod(
          'advanceMinutes',
          { minutes, calendarId },
          (params: any) => {
            APIWrapper.validateNumber(params.minutes, 'Minutes');
            APIWrapper.validateCalendarId(params.calendarId);
          },
          () => calendarManager.advanceMinutes(minutes)
        );
      },

      advanceWeeks: async (weeks: number, calendarId?: string): Promise<void> => {
        return APIWrapper.wrapAPIMethod(
          'advanceWeeks',
          { weeks, calendarId },
          (params: any) => {
            APIWrapper.validateNumber(params.weeks, 'Weeks');
            APIWrapper.validateCalendarId(params.calendarId);
          },
          () => calendarManager.advanceWeeks(weeks)
        );
      },

      advanceMonths: async (months: number, calendarId?: string): Promise<void> => {
        return APIWrapper.wrapAPIMethod(
          'advanceMonths',
          { months, calendarId },
          (params: any) => {
            APIWrapper.validateNumber(params.months, 'Months');
            APIWrapper.validateCalendarId(params.calendarId);
          },
          () => calendarManager.advanceMonths(months)
        );
      },

      advanceYears: async (years: number, calendarId?: string): Promise<void> => {
        return APIWrapper.wrapAPIMethod(
          'advanceYears',
          { years, calendarId },
          (params: any) => {
            APIWrapper.validateNumber(params.years, 'Years');
            APIWrapper.validateCalendarId(params.calendarId);
          },
          () => calendarManager.advanceYears(years)
        );
      },

      formatDate: (date: any, options?: any): string => {
        APIWrapper.validateCalendarDate(date, 'Date');
        const activeCalendar = calendarManager.getActiveCalendar();
        if (!activeCalendar) {
          throw new Error('No active calendar set');
        }
        const calendarDate = new CalendarDate(date, activeCalendar);
        return calendarDate.format(options);
      },

      dateToWorldTime: (date: any, calendarId?: string): number => {
        APIWrapper.validateCalendarDate(date, 'Date');
        APIWrapper.validateOptionalString(calendarId, 'Calendar ID');
        const engine = calendarId
          ? calendarManager.engines?.get(calendarId)
          : calendarManager.getActiveEngine();
        if (!engine) {
          throw new Error(`No engine available for calendar: ${calendarId || 'active'}`);
        }
        return engine.dateToWorldTime(date);
      },

      worldTimeToDate: (timestamp: number, calendarId?: string): any => {
        APIWrapper.validateNumber(timestamp, 'Timestamp');
        APIWrapper.validateOptionalString(calendarId, 'Calendar ID');
        const engine = calendarId
          ? calendarManager.engines?.get(calendarId)
          : calendarManager.getActiveEngine();
        if (!engine) {
          throw new Error(`No engine available for calendar: ${calendarId || 'active'}`);
        }
        return engine.worldTimeToDate(timestamp);
      },
    };
  });

  describe('Time Advancement Methods', () => {
    describe('advanceDays', () => {
      it('should advance days successfully', async () => {
        await seasonsStarsAPI.advanceDays(5);
        expect((calendarManager as any)._timeConverterSpy.advanceDays).toHaveBeenCalledWith(5);
      });

      it('should validate days parameter', async () => {
        await expect(seasonsStarsAPI.advanceDays('invalid' as any)).rejects.toThrow(
          'Days must be a finite number'
        );
        expect((calendarManager as any)._timeConverterSpy.advanceDays).not.toHaveBeenCalled();
      });

      it('should reject calendar-specific operations', async () => {
        await expect(seasonsStarsAPI.advanceDays(5, 'custom-calendar')).rejects.toThrow(
          'Calendar-specific operations not yet implemented'
        );
        expect((calendarManager as any)._timeConverterSpy.advanceDays).not.toHaveBeenCalled();
      });

      it('should handle negative days', async () => {
        await seasonsStarsAPI.advanceDays(-3);
        expect((calendarManager as any)._timeConverterSpy.advanceDays).toHaveBeenCalledWith(-3);
      });
    });

    describe('advanceHours', () => {
      it('should advance hours successfully', async () => {
        await seasonsStarsAPI.advanceHours(12);
        expect((calendarManager as any)._timeConverterSpy.advanceHours).toHaveBeenCalledWith(12);
      });

      it('should validate hours parameter', async () => {
        await expect(seasonsStarsAPI.advanceHours(Infinity)).rejects.toThrow(
          'Hours must be a finite number'
        );
        expect((calendarManager as any)._timeConverterSpy.advanceHours).not.toHaveBeenCalled();
      });
    });

    describe('advanceMinutes', () => {
      it('should advance minutes successfully', async () => {
        await seasonsStarsAPI.advanceMinutes(30);
        expect((calendarManager as any)._timeConverterSpy.advanceMinutes).toHaveBeenCalledWith(30);
      });

      it('should validate minutes parameter', async () => {
        await expect(seasonsStarsAPI.advanceMinutes(null as any)).rejects.toThrow(
          'Minutes must be a finite number'
        );
        expect((calendarManager as any)._timeConverterSpy.advanceMinutes).not.toHaveBeenCalled();
      });
    });

    describe('advanceWeeks', () => {
      it('should advance weeks successfully', async () => {
        await seasonsStarsAPI.advanceWeeks(2);
        expect((calendarManager as any)._timeConverterSpy.advanceWeeks).toHaveBeenCalledWith(2);
      });

      it('should validate weeks parameter', async () => {
        await expect(seasonsStarsAPI.advanceWeeks({} as any)).rejects.toThrow(
          'Weeks must be a finite number'
        );
        expect((calendarManager as any)._timeConverterSpy.advanceWeeks).not.toHaveBeenCalled();
      });
    });

    describe('advanceMonths', () => {
      it('should advance months successfully', async () => {
        await seasonsStarsAPI.advanceMonths(1);
        expect((calendarManager as any)._timeConverterSpy.advanceMonths).toHaveBeenCalledWith(1);
      });

      it('should validate months parameter', async () => {
        await expect(seasonsStarsAPI.advanceMonths(NaN)).rejects.toThrow(
          'Months must be a finite number'
        );
        expect((calendarManager as any)._timeConverterSpy.advanceMonths).not.toHaveBeenCalled();
      });
    });

    describe('advanceYears', () => {
      it('should advance years successfully', async () => {
        await seasonsStarsAPI.advanceYears(1);
        expect((calendarManager as any)._timeConverterSpy.advanceYears).toHaveBeenCalledWith(1);
      });

      it('should validate years parameter', async () => {
        await expect(seasonsStarsAPI.advanceYears('1' as any)).rejects.toThrow(
          'Years must be a finite number'
        );
        expect((calendarManager as any)._timeConverterSpy.advanceYears).not.toHaveBeenCalled();
      });
    });
  });

  describe('Date Conversion Methods', () => {
    describe('formatDate', () => {
      it('should format date successfully', () => {
        const date = { year: 2024, month: 6, day: 15 };
        const result = seasonsStarsAPI.formatDate(date);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0); // Real CalendarDate format depends on template system
      });

      it('should validate date parameter', () => {
        expect(() => seasonsStarsAPI.formatDate(null)).toThrow(
          'Date must be a valid calendar date object'
        );
      });

      it('should validate date structure', () => {
        expect(() => seasonsStarsAPI.formatDate({ year: '2024', month: 6, day: 15 })).toThrow(
          'Date must have valid year, month, and day numbers'
        );
      });

      it('should handle missing active calendar', () => {
        // Temporarily clear active calendar to test error case
        const originalActiveId = (calendarManager as any).activeCalendarId;
        (calendarManager as any).activeCalendarId = null;

        const date = { year: 2024, month: 6, day: 15 };
        expect(() => seasonsStarsAPI.formatDate(date)).toThrow('No active calendar set');

        // Restore active calendar
        (calendarManager as any).activeCalendarId = originalActiveId;
      });
    });

    describe('dateToWorldTime', () => {
      it('should convert date to world time successfully', () => {
        const date = { year: 2024, month: 6, day: 15 };
        const result = seasonsStarsAPI.dateToWorldTime(date);
        expect(typeof result).toBe('number');
        expect(result).toBeGreaterThan(0); // Real engine will return actual calculated value
      });

      it('should validate date parameter', () => {
        expect(() => seasonsStarsAPI.dateToWorldTime('invalid')).toThrow(
          'Date must be a valid calendar date object'
        );
      });

      it('should handle specific calendar engine', () => {
        const date = { year: 2024, month: 6, day: 15 };
        const result = seasonsStarsAPI.dateToWorldTime(date, 'test-calendar');
        expect(typeof result).toBe('number');
        expect(result).toBeGreaterThan(0); // Real engine will return actual calculated value
      });

      it('should handle missing engine', () => {
        // Temporarily clear active calendar to test error case
        const originalActiveId = (calendarManager as any).activeCalendarId;
        (calendarManager as any).activeCalendarId = null;

        const date = { year: 2024, month: 6, day: 15 };
        expect(() => seasonsStarsAPI.dateToWorldTime(date)).toThrow(
          'No engine available for calendar: active'
        );

        // Restore active calendar
        (calendarManager as any).activeCalendarId = originalActiveId;
      });

      it('should handle missing specific calendar engine', () => {
        const date = { year: 2024, month: 6, day: 15 };
        expect(() => seasonsStarsAPI.dateToWorldTime(date, 'nonexistent')).toThrow(
          'No engine available for calendar: nonexistent'
        );
      });
    });

    describe('worldTimeToDate', () => {
      it('should convert world time to date successfully', () => {
        const result = seasonsStarsAPI.worldTimeToDate(86400);
        expect(result).toHaveProperty('year');
        expect(result).toHaveProperty('month');
        expect(result).toHaveProperty('day');
        expect(typeof result.year).toBe('number');
        expect(typeof result.month).toBe('number');
        expect(typeof result.day).toBe('number'); // Real engine will return actual calculated date
      });

      it('should validate timestamp parameter', () => {
        expect(() => seasonsStarsAPI.worldTimeToDate('invalid')).toThrow(
          'Timestamp must be a finite number'
        );
      });

      it('should handle infinite timestamps', () => {
        expect(() => seasonsStarsAPI.worldTimeToDate(Infinity)).toThrow(
          'Timestamp must be a finite number'
        );
      });

      it('should handle specific calendar engine', () => {
        const result = seasonsStarsAPI.worldTimeToDate(86400, 'test-calendar');
        expect(result).toHaveProperty('year');
        expect(result).toHaveProperty('month');
        expect(result).toHaveProperty('day');
        expect(typeof result.year).toBe('number'); // Real engine will return actual calculated date
      });

      it('should handle missing engine', () => {
        // Temporarily clear active calendar to test error case
        const originalActiveId = (calendarManager as any).activeCalendarId;
        (calendarManager as any).activeCalendarId = null;

        expect(() => seasonsStarsAPI.worldTimeToDate(86400)).toThrow(
          'No engine available for calendar: active'
        );

        // Restore active calendar
        (calendarManager as any).activeCalendarId = originalActiveId;
      });
    });
  });

  describe('Error Propagation', () => {
    it('should propagate manager errors in advance methods', async () => {
      // Mock TimeConverter to throw an error
      const mockTimeConverter = (calendarManager as any).timeConverter;
      mockTimeConverter.advanceDays.mockRejectedValueOnce(new Error('Manager error'));

      await expect(seasonsStarsAPI.advanceDays(5)).rejects.toThrow('Manager error');
    });

    it('should propagate engine errors in conversion methods', () => {
      // Create a spy on the engine's dateToWorldTime method to throw an error
      const engineSpy = vi.spyOn(calendarEngine, 'dateToWorldTime');
      engineSpy.mockImplementation(() => {
        throw new Error('Engine error');
      });

      const date = { year: 2024, month: 6, day: 15 };
      expect(() => seasonsStarsAPI.dateToWorldTime(date)).toThrow('Engine error');

      // Restore the original implementation
      engineSpy.mockRestore();
    });
  });

  describe('Integration with APIWrapper', () => {
    it('should use APIWrapper for async methods', async () => {
      // This is tested implicitly through the validation behavior
      await expect(seasonsStarsAPI.advanceDays('invalid' as any)).rejects.toThrow(
        'Days must be a finite number'
      );
    });

    it('should use APIWrapper validation for sync methods', () => {
      // This is tested implicitly through the validation behavior
      expect(() => seasonsStarsAPI.formatDate(null)).toThrow(
        'Date must be a valid calendar date object'
      );
    });
  });
});
