import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Foundry environment inline
vi.stubGlobal('game', {});

describe('Module API Methods', () => {
  let mockCalendarManager: any;
  let mockEngine: any;
  let mockCalendar: any;
  let seasonsStarsAPI: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock calendar engine
    mockEngine = {
      dateToWorldTime: vi.fn().mockReturnValue(86400),
      worldTimeToDate: vi.fn().mockReturnValue({
        year: 2024,
        month: 6,
        day: 15,
        weekday: 2,
      }),
    };

    // Mock calendar
    mockCalendar = {
      id: 'test-calendar',
      months: [
        { name: 'January' },
        { name: 'February' },
        { name: 'March' },
        { name: 'April' },
        { name: 'May' },
        { name: 'June' },
      ],
    };

    // Mock calendar manager
    mockCalendarManager = {
      advanceDays: vi.fn().mockResolvedValue(undefined),
      advanceHours: vi.fn().mockResolvedValue(undefined),
      advanceMinutes: vi.fn().mockResolvedValue(undefined),
      advanceWeeks: vi.fn().mockResolvedValue(undefined),
      advanceMonths: vi.fn().mockResolvedValue(undefined),
      advanceYears: vi.fn().mockResolvedValue(undefined),
      getActiveCalendar: vi.fn().mockReturnValue(mockCalendar),
      getActiveEngine: vi.fn().mockReturnValue(mockEngine),
      engines: new Map([['test-calendar', mockEngine]]),
    };

    // Mock CalendarDate class
    const MockCalendarDate = vi.fn().mockImplementation((date, calendar) => ({
      year: date.year,
      month: date.month,
      day: date.day,
      format: vi.fn().mockReturnValue('15 June 2024'),
    }));

    // Setup global game object with S&S API
    global.game = {
      time: { worldTime: 86400 },
      seasonsStars: {
        manager: mockCalendarManager,
      },
    } as any;

    // Import the module to get the API - need to do this after mocking
    // Since the module sets up the API when imported
    const { APIWrapper } = await import('../src/core/api-wrapper');
    const { CalendarDate } = await import('../src/core/calendar-date');

    // Mock CalendarDate
    vi.doMock('../src/core/calendar-date', () => ({
      CalendarDate: MockCalendarDate,
    }));

    seasonsStarsAPI = {
      advanceDays: async (days: number, calendarId?: string): Promise<void> => {
        return APIWrapper.wrapAPIMethod(
          'advanceDays',
          { days, calendarId },
          (params: any) => {
            APIWrapper.validateNumber(params.days, 'Days');
            APIWrapper.validateCalendarId(params.calendarId);
          },
          () => mockCalendarManager.advanceDays(days)
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
          () => mockCalendarManager.advanceHours(hours)
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
          () => mockCalendarManager.advanceMinutes(minutes)
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
          () => mockCalendarManager.advanceWeeks(weeks)
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
          () => mockCalendarManager.advanceMonths(months)
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
          () => mockCalendarManager.advanceYears(years)
        );
      },

      formatDate: (date: any, options?: any): string => {
        APIWrapper.validateCalendarDate(date, 'Date');
        const activeCalendar = mockCalendarManager.getActiveCalendar();
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
          ? mockCalendarManager.engines?.get(calendarId)
          : mockCalendarManager.getActiveEngine();
        if (!engine) {
          throw new Error(`No engine available for calendar: ${calendarId || 'active'}`);
        }
        return engine.dateToWorldTime(date);
      },

      worldTimeToDate: (timestamp: number, calendarId?: string): any => {
        APIWrapper.validateNumber(timestamp, 'Timestamp');
        APIWrapper.validateOptionalString(calendarId, 'Calendar ID');
        const engine = calendarId
          ? mockCalendarManager.engines?.get(calendarId)
          : mockCalendarManager.getActiveEngine();
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
        expect(mockCalendarManager.advanceDays).toHaveBeenCalledWith(5);
      });

      it('should validate days parameter', async () => {
        await expect(seasonsStarsAPI.advanceDays('invalid' as any)).rejects.toThrow(
          'Days must be a finite number'
        );
        expect(mockCalendarManager.advanceDays).not.toHaveBeenCalled();
      });

      it('should reject calendar-specific operations', async () => {
        await expect(seasonsStarsAPI.advanceDays(5, 'custom-calendar')).rejects.toThrow(
          'Calendar-specific operations not yet implemented'
        );
        expect(mockCalendarManager.advanceDays).not.toHaveBeenCalled();
      });

      it('should handle negative days', async () => {
        await seasonsStarsAPI.advanceDays(-3);
        expect(mockCalendarManager.advanceDays).toHaveBeenCalledWith(-3);
      });
    });

    describe('advanceHours', () => {
      it('should advance hours successfully', async () => {
        await seasonsStarsAPI.advanceHours(12);
        expect(mockCalendarManager.advanceHours).toHaveBeenCalledWith(12);
      });

      it('should validate hours parameter', async () => {
        await expect(seasonsStarsAPI.advanceHours(Infinity)).rejects.toThrow(
          'Hours must be a finite number'
        );
        expect(mockCalendarManager.advanceHours).not.toHaveBeenCalled();
      });
    });

    describe('advanceMinutes', () => {
      it('should advance minutes successfully', async () => {
        await seasonsStarsAPI.advanceMinutes(30);
        expect(mockCalendarManager.advanceMinutes).toHaveBeenCalledWith(30);
      });

      it('should validate minutes parameter', async () => {
        await expect(seasonsStarsAPI.advanceMinutes(null as any)).rejects.toThrow(
          'Minutes must be a finite number'
        );
        expect(mockCalendarManager.advanceMinutes).not.toHaveBeenCalled();
      });
    });

    describe('advanceWeeks', () => {
      it('should advance weeks successfully', async () => {
        await seasonsStarsAPI.advanceWeeks(2);
        expect(mockCalendarManager.advanceWeeks).toHaveBeenCalledWith(2);
      });

      it('should validate weeks parameter', async () => {
        await expect(seasonsStarsAPI.advanceWeeks({} as any)).rejects.toThrow(
          'Weeks must be a finite number'
        );
        expect(mockCalendarManager.advanceWeeks).not.toHaveBeenCalled();
      });
    });

    describe('advanceMonths', () => {
      it('should advance months successfully', async () => {
        await seasonsStarsAPI.advanceMonths(1);
        expect(mockCalendarManager.advanceMonths).toHaveBeenCalledWith(1);
      });

      it('should validate months parameter', async () => {
        await expect(seasonsStarsAPI.advanceMonths(NaN)).rejects.toThrow(
          'Months must be a finite number'
        );
        expect(mockCalendarManager.advanceMonths).not.toHaveBeenCalled();
      });
    });

    describe('advanceYears', () => {
      it('should advance years successfully', async () => {
        await seasonsStarsAPI.advanceYears(1);
        expect(mockCalendarManager.advanceYears).toHaveBeenCalledWith(1);
      });

      it('should validate years parameter', async () => {
        await expect(seasonsStarsAPI.advanceYears('1' as any)).rejects.toThrow(
          'Years must be a finite number'
        );
        expect(mockCalendarManager.advanceYears).not.toHaveBeenCalled();
      });
    });
  });

  describe('Date Conversion Methods', () => {
    describe('formatDate', () => {
      it('should format date successfully', () => {
        const date = { year: 2024, month: 6, day: 15 };
        const result = seasonsStarsAPI.formatDate(date);
        expect(result).toBe('15 June 2024');
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
        mockCalendarManager.getActiveCalendar.mockReturnValueOnce(null);
        const date = { year: 2024, month: 6, day: 15 };
        expect(() => seasonsStarsAPI.formatDate(date)).toThrow('No active calendar set');
      });
    });

    describe('dateToWorldTime', () => {
      it('should convert date to world time successfully', () => {
        const date = { year: 2024, month: 6, day: 15 };
        const result = seasonsStarsAPI.dateToWorldTime(date);
        expect(result).toBe(86400);
        expect(mockEngine.dateToWorldTime).toHaveBeenCalledWith(date);
      });

      it('should validate date parameter', () => {
        expect(() => seasonsStarsAPI.dateToWorldTime('invalid')).toThrow(
          'Date must be a valid calendar date object'
        );
      });

      it('should handle specific calendar engine', () => {
        const date = { year: 2024, month: 6, day: 15 };
        seasonsStarsAPI.dateToWorldTime(date, 'test-calendar');
        expect(mockEngine.dateToWorldTime).toHaveBeenCalledWith(date);
      });

      it('should handle missing engine', () => {
        mockCalendarManager.getActiveEngine.mockReturnValueOnce(null);
        const date = { year: 2024, month: 6, day: 15 };
        expect(() => seasonsStarsAPI.dateToWorldTime(date)).toThrow(
          'No engine available for calendar: active'
        );
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
        expect(result).toEqual({
          year: 2024,
          month: 6,
          day: 15,
          weekday: 2,
        });
        expect(mockEngine.worldTimeToDate).toHaveBeenCalledWith(86400);
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
        seasonsStarsAPI.worldTimeToDate(86400, 'test-calendar');
        expect(mockEngine.worldTimeToDate).toHaveBeenCalledWith(86400);
      });

      it('should handle missing engine', () => {
        mockCalendarManager.getActiveEngine.mockReturnValueOnce(null);
        expect(() => seasonsStarsAPI.worldTimeToDate(86400)).toThrow(
          'No engine available for calendar: active'
        );
      });
    });
  });

  describe('Error Propagation', () => {
    it('should propagate manager errors in advance methods', async () => {
      mockCalendarManager.advanceDays.mockRejectedValueOnce(new Error('Manager error'));
      await expect(seasonsStarsAPI.advanceDays(5)).rejects.toThrow('Manager error');
    });

    it('should propagate engine errors in conversion methods', () => {
      mockEngine.dateToWorldTime.mockImplementation(() => {
        throw new Error('Engine error');
      });
      const date = { year: 2024, month: 6, day: 15 };
      expect(() => seasonsStarsAPI.dateToWorldTime(date)).toThrow('Engine error');
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
