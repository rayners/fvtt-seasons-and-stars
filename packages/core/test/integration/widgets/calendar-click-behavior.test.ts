import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarGridWidget } from '../../../src/ui/calendar-grid-widget';
import { CalendarEngine } from '../../../src/core/calendar-engine';
import { CalendarManager } from '../../../src/core/calendar-manager';
import { mockStandardCalendar, mockStandardDate } from '../../mocks/calendar-mocks';

describe('Calendar Click Behavior Feature', () => {
  let engine: CalendarEngine;
  let manager: CalendarManager;
  let widget: CalendarGridWidget;
  let mockNotifications: any;

  beforeEach(() => {
    // Set up real calendar engine and manager
    engine = new CalendarEngine(mockStandardCalendar);
    manager = new CalendarManager();
    (manager as any).activeEngine = engine;
    (manager as any).activeCalendar = mockStandardCalendar;

    // Mock manager methods properly
    vi.spyOn(manager, 'getActiveEngine').mockReturnValue(engine);
    vi.spyOn(manager, 'getActiveCalendar').mockReturnValue(mockStandardCalendar);

    // Create a proper CalendarDate-like object with toObject method
    const mockCurrentDate = {
      year: 2024,
      month: 1,
      day: 1,
      weekday: 0,
      time: { hour: 0, minute: 0, second: 0 },
      toObject: () => ({
        year: 2024,
        month: 1,
        day: 1,
        weekday: 0,
        time: { hour: 0, minute: 0, second: 0 },
      }),
    };
    vi.spyOn(manager, 'getCurrentDate').mockReturnValue(mockCurrentDate as any);

    // Mock minimal game globals with real implementations
    global.game = {
      settings: {
        get: (module: string, setting: string) => {
          if (module === 'seasons-and-stars' && setting === 'calendarClickBehavior') {
            return 'setDate'; // Default behavior
          }
          return undefined;
        },
      },
      user: { isGM: true },
      i18n: { lang: 'en' },
      seasonsStars: {
        manager: manager,
      },
    } as any;

    // Mock notifications with tracking
    mockNotifications = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    global.ui = { notifications: mockNotifications } as any;

    // Create widget with real manager
    widget = new CalendarGridWidget();
    (widget as any).viewDate = { ...mockStandardDate };
  });

  describe('Core Click Behavior Logic', () => {
    it('should handle normal click in setDate mode (GM)', async () => {
      const mockTarget = document.createElement('div');
      mockTarget.dataset.day = '15';
      const mockEvent = new Event('click') as MouseEvent;

      // Track manager.setCurrentDate calls
      const setCurrentDateSpy = vi.spyOn(manager, 'setCurrentDate').mockResolvedValue();
      const renderSpy = vi.spyOn(widget, 'render').mockImplementation(() => Promise.resolve());

      await widget._onSelectDate(mockEvent, mockTarget);

      // Should be called with a CalendarDate instance with the right properties
      expect(setCurrentDateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          year: 2024,
          month: 1,
          day: 15,
          weekday: expect.any(Number),
          time: { hour: 0, minute: 0, second: 0 },
        })
      );
      expect(mockNotifications.info).toHaveBeenCalledWith('Date set to 15th of January, 2024');
      expect(renderSpy).toHaveBeenCalled();
    });

    it('should handle normal click in viewDetails mode', async () => {
      // Set viewDetails mode
      global.game.settings.get = vi.fn().mockReturnValue('viewDetails');

      const mockTarget = document.createElement('div');
      mockTarget.dataset.day = '25';
      const mockEvent = new Event('click') as MouseEvent;

      await widget._onSelectDate(mockEvent, mockTarget);

      expect(mockNotifications.info).toHaveBeenCalledWith('25th of January, 2024');
      expect(mockNotifications.info).not.toHaveBeenCalledWith(
        expect.stringContaining('Date set to')
      );
    });

    it('should handle Ctrl+Click override in viewDetails mode (GM)', async () => {
      // Set viewDetails mode
      global.game.settings.get = vi.fn().mockReturnValue('viewDetails');

      const mockTarget = document.createElement('div');
      mockTarget.dataset.day = '10';
      const mockEvent = new MouseEvent('click', { ctrlKey: true });

      const setCurrentDateSpy = vi.spyOn(manager, 'setCurrentDate').mockResolvedValue();

      await widget._onSelectDate(mockEvent, mockTarget);

      expect(setCurrentDateSpy).toHaveBeenCalled();
      expect(mockNotifications.info).toHaveBeenCalledWith('Date set to 10th of January, 2024');
    });

    it('should handle Cmd+Click override in viewDetails mode (GM)', async () => {
      // Set viewDetails mode
      global.game.settings.get = vi.fn().mockReturnValue('viewDetails');

      const mockTarget = document.createElement('div');
      mockTarget.dataset.day = '20';
      const mockEvent = new MouseEvent('click', { metaKey: true });

      const setCurrentDateSpy = vi.spyOn(manager, 'setCurrentDate').mockResolvedValue();

      await widget._onSelectDate(mockEvent, mockTarget);

      expect(setCurrentDateSpy).toHaveBeenCalled();
      expect(mockNotifications.info).toHaveBeenCalledWith('Date set to 20th of January, 2024');
    });

    it('should show date info for non-GM clicks instead of setting date', async () => {
      global.game.user = { isGM: false };

      const mockTarget = document.createElement('div');
      mockTarget.dataset.day = '15';
      const mockEvent = new Event('click') as MouseEvent;

      const setCurrentDateSpy = vi.spyOn(manager, 'setCurrentDate').mockResolvedValue();

      await widget._onSelectDate(mockEvent, mockTarget);

      expect(setCurrentDateSpy).not.toHaveBeenCalled();
      expect(mockNotifications.info).toHaveBeenCalledWith('15th of January, 2024');
    });

    it('should show date info for non-GM Ctrl+Click (not set date)', async () => {
      global.game.user = { isGM: false };

      const mockTarget = document.createElement('div');
      mockTarget.dataset.day = '15';
      const mockEvent = new MouseEvent('click', { ctrlKey: true });

      const setCurrentDateSpy = vi.spyOn(manager, 'setCurrentDate').mockResolvedValue();

      await widget._onSelectDate(mockEvent, mockTarget);

      expect(setCurrentDateSpy).not.toHaveBeenCalled();
      expect(mockNotifications.info).toHaveBeenCalledWith('15th of January, 2024');
    });
  });

  describe('Intercalary Day Handling', () => {
    beforeEach(() => {
      // Add intercalary day to calendar
      const calendarWithIntercalary = {
        ...mockStandardCalendar,
        intercalary: [
          {
            name: 'Festival Day',
            after: 'January',
            description: 'A special celebration day',
          },
        ],
      };
      engine = new CalendarEngine(calendarWithIntercalary);
      (manager as any).activeEngine = engine;
      (manager as any).activeCalendar = calendarWithIntercalary;

      // Update the mocks to return the new engine and calendar
      vi.spyOn(manager, 'getActiveEngine').mockReturnValue(engine);
      vi.spyOn(manager, 'getActiveCalendar').mockReturnValue(calendarWithIntercalary);

      // Create a proper CalendarDate-like object with toObject method for intercalary tests
      const mockCurrentDate = {
        year: 2024,
        month: 1,
        day: 1,
        weekday: 0,
        time: { hour: 0, minute: 0, second: 0 },
        toObject: () => ({
          year: 2024,
          month: 1,
          day: 1,
          weekday: 0,
          time: { hour: 0, minute: 0, second: 0 },
        }),
      };
      vi.spyOn(manager, 'getCurrentDate').mockReturnValue(mockCurrentDate as any);
    });

    it('should handle intercalary day selection', async () => {
      const mockTarget = document.createElement('div');
      mockTarget.dataset.day = 'Festival Day';

      const calendarDay = document.createElement('div');
      calendarDay.classList.add('calendar-day', 'intercalary');
      calendarDay.appendChild(mockTarget);
      document.body.appendChild(calendarDay);

      const mockEvent = new Event('click') as MouseEvent;
      const setCurrentDateSpy = vi.spyOn(manager, 'setCurrentDate').mockResolvedValue();

      await widget._onSelectDate(mockEvent, mockTarget);

      expect(setCurrentDateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          year: 2024,
          month: 1,
          day: 1,
          weekday: 0,
          time: { hour: 0, minute: 0, second: 0 },
          intercalary: 'Festival Day',
        })
      );
      expect(mockNotifications.info).toHaveBeenCalledWith(
        'Date set to Festival Day (intercalary day after January 2024)'
      );

      document.body.removeChild(calendarDay);
    });

    it('should show intercalary day info in viewDetails mode', async () => {
      global.game.settings.get = vi.fn().mockReturnValue('viewDetails');

      const mockTarget = document.createElement('div');
      mockTarget.dataset.day = 'Festival Day';

      const calendarDay = document.createElement('div');
      calendarDay.classList.add('calendar-day', 'intercalary');
      calendarDay.appendChild(mockTarget);
      document.body.appendChild(calendarDay);

      const mockEvent = new Event('click') as MouseEvent;

      await widget._onSelectDate(mockEvent, mockTarget);

      expect(mockNotifications.info).toHaveBeenCalledWith(
        'Festival Day (intercalary day after January, 2024)\nA special celebration day'
      );

      document.body.removeChild(calendarDay);
    });
  });

  describe('Error Handling', () => {
    it('should handle setCurrentDate errors gracefully', async () => {
      const mockTarget = document.createElement('div');
      mockTarget.dataset.day = '15';
      const mockEvent = new Event('click') as MouseEvent;

      // Mock setCurrentDate to throw error
      vi.spyOn(manager, 'setCurrentDate').mockRejectedValue(new Error('Test error'));

      await widget._onSelectDate(mockEvent, mockTarget);

      expect(mockNotifications.error).toHaveBeenCalledWith('Failed to set date');
    });

    it('should handle showDateInfo errors gracefully', async () => {
      global.game.settings.get = vi.fn().mockReturnValue('viewDetails');

      const mockTarget = document.createElement('div');
      mockTarget.dataset.day = '15';
      const mockEvent = new Event('click') as MouseEvent;

      // Mock engine to throw error
      vi.spyOn(engine, 'getCalendar').mockImplementation(() => {
        throw new Error('Test error');
      });

      await widget._onSelectDate(mockEvent, mockTarget);

      expect(mockNotifications.warn).toHaveBeenCalledWith('Failed to load date information');
    });

    it('should handle missing manager gracefully', async () => {
      global.game.seasonsStars = { manager: null };

      const mockTarget = document.createElement('div');
      mockTarget.dataset.day = '15';
      const mockEvent = new Event('click') as MouseEvent;

      // Should not throw error
      await expect(widget._onSelectDate(mockEvent, mockTarget)).resolves.toBeUndefined();
    });

    it('should handle missing engine gracefully', async () => {
      global.game.seasonsStars = {
        manager: {
          getActiveEngine: () => null,
          getCurrentDate: () => mockStandardDate,
        },
      };

      const mockTarget = document.createElement('div');
      mockTarget.dataset.day = '15';
      const mockEvent = new Event('click') as MouseEvent;

      // Should not throw error
      await expect(widget._onSelectDate(mockEvent, mockTarget)).resolves.toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid day numbers', async () => {
      const mockTarget = document.createElement('div');
      mockTarget.dataset.day = '0'; // Invalid day
      const mockEvent = new Event('click') as MouseEvent;

      const setCurrentDateSpy = vi.spyOn(manager, 'setCurrentDate').mockResolvedValue();

      await widget._onSelectDate(mockEvent, mockTarget);

      expect(setCurrentDateSpy).not.toHaveBeenCalled();
    });

    it('should handle missing day data', async () => {
      const mockTarget = document.createElement('div');
      // No dataset.day
      const mockEvent = new Event('click') as MouseEvent;

      const setCurrentDateSpy = vi.spyOn(manager, 'setCurrentDate').mockResolvedValue();

      await widget._onSelectDate(mockEvent, mockTarget);

      expect(setCurrentDateSpy).not.toHaveBeenCalled();
    });

    it('should handle missing intercalary day name', async () => {
      const mockTarget = document.createElement('div');
      // No dataset.day for intercalary

      const calendarDay = document.createElement('div');
      calendarDay.classList.add('calendar-day', 'intercalary');
      calendarDay.appendChild(mockTarget);
      document.body.appendChild(calendarDay);

      const mockEvent = new Event('click') as MouseEvent;
      const setCurrentDateSpy = vi.spyOn(manager, 'setCurrentDate').mockResolvedValue();

      await widget._onSelectDate(mockEvent, mockTarget);

      expect(setCurrentDateSpy).not.toHaveBeenCalled();
      document.body.removeChild(calendarDay);
    });

    it('should handle missing current date time', async () => {
      // Mock getCurrentDate to return date without time but with toObject method
      const mockCurrentDateNoTime = {
        year: 2024,
        month: 1,
        day: 1,
        weekday: 0,
        toObject: () => ({
          year: 2024,
          month: 1,
          day: 1,
          weekday: 0,
        }),
      };
      vi.spyOn(manager, 'getCurrentDate').mockReturnValue(mockCurrentDateNoTime as any);

      const mockTarget = document.createElement('div');
      mockTarget.dataset.day = '15';
      const mockEvent = new Event('click') as MouseEvent;

      const setCurrentDateSpy = vi.spyOn(manager, 'setCurrentDate').mockResolvedValue();

      await widget._onSelectDate(mockEvent, mockTarget);

      expect(setCurrentDateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          year: 2024,
          month: 1,
          day: 15,
          weekday: expect.any(Number),
          time: { hour: 0, minute: 0, second: 0 }, // Should default to zeros
        })
      );
    });
  });

  describe('UI Hint Generation', () => {
    it('should generate correct GM hints in setDate mode', async () => {
      global.game.user = { isGM: true };
      global.game.settings.get = vi.fn().mockReturnValue('setDate');

      const context = await widget._prepareContext();

      expect(context.uiHint).toBe('Click dates to set current date.');
      expect(context.isGM).toBe(true);
      expect(context.clickBehavior).toBe('setDate');
    });

    it('should generate correct GM hints in viewDetails mode', async () => {
      global.game.user = { isGM: true };
      global.game.settings.get = vi.fn().mockReturnValue('viewDetails');

      const context = await widget._prepareContext();

      expect(context.uiHint).toBe('Click dates to view details. Ctrl+Click to set current date.');
      expect(context.isGM).toBe(true);
      expect(context.clickBehavior).toBe('viewDetails');
    });

    it('should generate correct player hints', async () => {
      global.game.user = { isGM: false };

      const context = await widget._prepareContext();

      expect(context.uiHint).toBe('Click dates to view details.');
      expect(context.isGM).toBe(false);
    });

    it('should handle undefined user gracefully', async () => {
      global.game.user = undefined;

      const context = await widget._prepareContext();

      expect(context.uiHint).toBe('Click dates to view details.');
      expect(context.isGM).toBe(false);
    });
  });

  describe('Helper Methods', () => {
    it('should generate correct ordinal suffixes', () => {
      expect((widget as any).addOrdinalSuffix(1)).toBe('1st');
      expect((widget as any).addOrdinalSuffix(2)).toBe('2nd');
      expect((widget as any).addOrdinalSuffix(3)).toBe('3rd');
      expect((widget as any).addOrdinalSuffix(4)).toBe('4th');
      expect((widget as any).addOrdinalSuffix(11)).toBe('11th');
      expect((widget as any).addOrdinalSuffix(12)).toBe('12th');
      expect((widget as any).addOrdinalSuffix(13)).toBe('13th');
      expect((widget as any).addOrdinalSuffix(21)).toBe('21st');
      expect((widget as any).addOrdinalSuffix(22)).toBe('22nd');
      expect((widget as any).addOrdinalSuffix(23)).toBe('23rd');
      expect((widget as any).addOrdinalSuffix(24)).toBe('24th');
    });

    it('should format years with prefix and suffix', () => {
      // Test with default calendar (no prefix/suffix)
      expect((widget as any).formatYear(2024)).toBe('2024');

      // Test with calendar that has suffix
      const calendarWithSuffix = {
        ...mockStandardCalendar,
        year: { ...mockStandardCalendar.year, prefix: '', suffix: ' CE' },
      };
      vi.spyOn(manager, 'getActiveCalendar').mockReturnValue(calendarWithSuffix);
      expect((widget as any).formatYear(1)).toBe('1 CE');

      // Test with calendar that has prefix
      const calendarWithPrefix = {
        ...mockStandardCalendar,
        year: { ...mockStandardCalendar.year, prefix: 'Year ', suffix: '' },
      };
      vi.spyOn(manager, 'getActiveCalendar').mockReturnValue(calendarWithPrefix);
      expect((widget as any).formatYear(2024)).toBe('Year 2024');

      // Test with both prefix and suffix
      const calendarWithBoth = {
        ...mockStandardCalendar,
        year: { ...mockStandardCalendar.year, prefix: 'AC ', suffix: ' DR' },
      };
      vi.spyOn(manager, 'getActiveCalendar').mockReturnValue(calendarWithBoth);
      expect((widget as any).formatYear(1372)).toBe('AC 1372 DR');
    });
  });

  describe('Integration with Real Calendar Data', () => {
    it('should format year with prefix and suffix in notifications', async () => {
      // Create calendar with year prefix and suffix
      const calendarWithYearSuffix = {
        ...mockStandardCalendar,
        year: {
          ...mockStandardCalendar.year,
          prefix: '',
          suffix: ' CE',
        },
      };
      engine = new CalendarEngine(calendarWithYearSuffix);
      (manager as any).activeEngine = engine;
      (manager as any).activeCalendar = calendarWithYearSuffix;

      // Update the mocks to return the new engine and calendar
      vi.spyOn(manager, 'getActiveEngine').mockReturnValue(engine);
      vi.spyOn(manager, 'getActiveCalendar').mockReturnValue(calendarWithYearSuffix);

      // Test in setDate mode
      global.game.settings.get = vi.fn().mockReturnValue('setDate');

      const mockTarget = document.createElement('div');
      mockTarget.dataset.day = '15';
      const mockEvent = new Event('click') as MouseEvent;

      vi.spyOn(manager, 'setCurrentDate').mockResolvedValue();

      await widget._onSelectDate(mockEvent, mockTarget);

      expect(mockNotifications.info).toHaveBeenCalledWith('Date set to 15th of January, 2024 CE');

      // Test in viewDetails mode
      global.game.settings.get = vi.fn().mockReturnValue('viewDetails');

      await widget._onSelectDate(mockEvent, mockTarget);

      expect(mockNotifications.info).toHaveBeenCalledWith('15th of January, 2024 CE');
    });

    it('should work with calendar containing month descriptions', async () => {
      // Create calendar with month description
      const calendarWithDesc = {
        ...mockStandardCalendar,
        months: [
          {
            name: 'January',
            days: 31,
            description: 'The first month of winter',
          },
        ],
      };
      engine = new CalendarEngine(calendarWithDesc);
      (manager as any).activeEngine = engine;
      (manager as any).activeCalendar = calendarWithDesc;

      // Update the mocks to return the new engine and calendar
      vi.spyOn(manager, 'getActiveEngine').mockReturnValue(engine);
      vi.spyOn(manager, 'getActiveCalendar').mockReturnValue(calendarWithDesc);

      global.game.settings.get = vi.fn().mockReturnValue('viewDetails');

      const mockTarget = document.createElement('div');
      mockTarget.dataset.day = '15';
      const mockEvent = new Event('click') as MouseEvent;

      await widget._onSelectDate(mockEvent, mockTarget);

      expect(mockNotifications.info).toHaveBeenCalledWith(
        '15th of January, 2024\nThe first month of winter'
      );
    });

    it('should handle missing month gracefully', async () => {
      // Set viewDate to invalid month
      (widget as any).viewDate = { year: 2024, month: 99, day: 1, weekday: 0 };

      const mockTarget = document.createElement('div');
      mockTarget.dataset.day = '15';
      const mockEvent = new Event('click') as MouseEvent;

      const setCurrentDateSpy = vi.spyOn(manager, 'setCurrentDate').mockResolvedValue();

      await widget._onSelectDate(mockEvent, mockTarget);

      expect(setCurrentDateSpy).toHaveBeenCalled();
      expect(mockNotifications.info).toHaveBeenCalledWith('Date set to 15th of Unknown, 2024');
    });
  });
});
