import { describe, it, expect, beforeEach } from 'vitest';
import { CalendarGridWidget } from '../src/ui/calendar-grid-widget';

describe('Calendar Click Behavior Feature', () => {
  let widget: CalendarGridWidget;

  beforeEach(() => {
    // Mock game.settings.get for calendarClickBehavior
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
      i18n: {
        lang: 'en',
      },
      seasonsStars: {
        manager: {
          getActiveEngine: () => null,
          getActiveCalendar: () => null,
          getCurrentDate: () => null,
        },
      },
    } as any;

    global.ui = {
      notifications: {
        info: () => {},
        warn: () => {},
        error: () => {},
      },
    } as any;
  });

  describe('Click Behavior Setting Integration', () => {
    it('should check calendarClickBehavior setting in _onSelectDate', () => {
      const widget = new CalendarGridWidget();

      // Create mock event and target
      const mockEvent = new Event('click') as MouseEvent;
      const mockTarget = document.createElement('div');
      mockTarget.dataset.day = '15';

      // Mock the methods that would be called
      let setCurrentDateCalled = false;
      let showDateInfoCalled = false;

      (widget as any).setCurrentDate = () => {
        setCurrentDateCalled = true;
      };
      (widget as any).showDateInfo = () => {
        showDateInfoCalled = true;
      };

      // Test default behavior (setDate)
      widget._onSelectDate(mockEvent, mockTarget);
      expect(setCurrentDateCalled).toBe(true);
      expect(showDateInfoCalled).toBe(false);
    });

    it('should call showDateInfo when setting is viewDetails', () => {
      // Override settings to return viewDetails
      global.game.settings.get = (module: string, setting: string) => {
        if (module === 'seasons-and-stars' && setting === 'calendarClickBehavior') {
          return 'viewDetails';
        }
        return undefined;
      };

      const widget = new CalendarGridWidget();

      const mockEvent = new Event('click') as MouseEvent;
      const mockTarget = document.createElement('div');
      mockTarget.dataset.day = '15';

      let setCurrentDateCalled = false;
      let showDateInfoCalled = false;

      (widget as any).setCurrentDate = () => {
        setCurrentDateCalled = true;
      };
      (widget as any).showDateInfo = () => {
        showDateInfoCalled = true;
      };

      // Test viewDetails behavior
      widget._onSelectDate(mockEvent, mockTarget);
      expect(setCurrentDateCalled).toBe(false);
      expect(showDateInfoCalled).toBe(true);
    });

    it('should handle Ctrl+Click to force date setting', () => {
      // Set viewDetails mode
      global.game.settings.get = (module: string, setting: string) => {
        if (module === 'seasons-and-stars' && setting === 'calendarClickBehavior') {
          return 'viewDetails';
        }
        return undefined;
      };

      const widget = new CalendarGridWidget();

      // Create Ctrl+Click event
      const mockEvent = new MouseEvent('click', { ctrlKey: true });
      const mockTarget = document.createElement('div');
      mockTarget.dataset.day = '15';

      let setCurrentDateCalled = false;
      let showDateInfoCalled = false;

      (widget as any).setCurrentDate = () => {
        setCurrentDateCalled = true;
      };
      (widget as any).showDateInfo = () => {
        showDateInfoCalled = true;
      };

      // Test Ctrl+Click behavior - should force date setting even in viewDetails mode
      widget._onSelectDate(mockEvent, mockTarget);
      expect(setCurrentDateCalled).toBe(true);
      expect(showDateInfoCalled).toBe(false);
    });

    it('should handle Cmd+Click (metaKey) to force date setting', () => {
      // Set viewDetails mode
      global.game.settings.get = (module: string, setting: string) => {
        if (module === 'seasons-and-stars' && setting === 'calendarClickBehavior') {
          return 'viewDetails';
        }
        return undefined;
      };

      const widget = new CalendarGridWidget();

      // Create Cmd+Click event (Mac)
      const mockEvent = new MouseEvent('click', { metaKey: true });
      const mockTarget = document.createElement('div');
      mockTarget.dataset.day = '15';

      let setCurrentDateCalled = false;
      let showDateInfoCalled = false;

      (widget as any).setCurrentDate = () => {
        setCurrentDateCalled = true;
      };
      (widget as any).showDateInfo = () => {
        showDateInfoCalled = true;
      };

      // Test Cmd+Click behavior - should force date setting even in viewDetails mode
      widget._onSelectDate(mockEvent, mockTarget);
      expect(setCurrentDateCalled).toBe(true);
      expect(showDateInfoCalled).toBe(false);
    });

    it('should respect GM permissions', () => {
      // Set up non-GM user
      global.game.user = { isGM: false };

      const widget = new CalendarGridWidget();

      const mockEvent = new Event('click') as MouseEvent;
      const mockTarget = document.createElement('div');
      mockTarget.dataset.day = '15';

      let setCurrentDateCalled = false;
      let showDateInfoCalled = false;
      let warningShown = false;

      (widget as any).setCurrentDate = () => {
        setCurrentDateCalled = true;
      };
      (widget as any).showDateInfo = () => {
        showDateInfoCalled = true;
      };

      global.ui.notifications.warn = () => {
        warningShown = true;
      };

      // Test default behavior with non-GM (should show warning and call showDateInfo)
      widget._onSelectDate(mockEvent, mockTarget);
      expect(setCurrentDateCalled).toBe(false);
      expect(warningShown).toBe(true);
    });

    it('should prevent non-GM Ctrl+Click from setting date', () => {
      // Set up non-GM user
      global.game.user = { isGM: false };

      const widget = new CalendarGridWidget();

      // Create Ctrl+Click event
      const mockEvent = new MouseEvent('click', { ctrlKey: true });
      const mockTarget = document.createElement('div');
      mockTarget.dataset.day = '15';

      let setCurrentDateCalled = false;
      let showDateInfoCalled = false;
      let warningShown = false;

      (widget as any).setCurrentDate = () => {
        setCurrentDateCalled = true;
      };
      (widget as any).showDateInfo = () => {
        showDateInfoCalled = true;
      };

      global.ui.notifications.warn = () => {
        warningShown = true;
      };

      // Test Ctrl+Click with non-GM (should show warning, not set date)
      widget._onSelectDate(mockEvent, mockTarget);
      expect(setCurrentDateCalled).toBe(false);
      expect(warningShown).toBe(true);
    });
  });

  describe('Date Info Display', () => {
    it('should handle showDateInfo with valid target', () => {
      const widget = new CalendarGridWidget();

      // Mock calendar manager and date data with complete structure
      global.game.seasonsStars = {
        manager: {
          getActiveEngine: () => ({
            worldTimeToDate: () => ({ year: 2024, month: 12, day: 25, weekday: 2 }),
            getCalendar: () => ({
              name: 'Test Calendar',
              months: [
                { name: 'January' }, { name: 'February' }, { name: 'March' },
                { name: 'April' }, { name: 'May' }, { name: 'June' },
                { name: 'July' }, { name: 'August' }, { name: 'September' },
                { name: 'October' }, { name: 'November' }, { name: 'December' }
              ],
              weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
              translations: {
                en: {
                  label: 'Test Calendar'
                }
              }
            }),
          }),
          getActiveCalendar: () => ({
            name: 'Test Calendar',
            months: [
              { name: 'January' }, { name: 'February' }, { name: 'March' },
              { name: 'April' }, { name: 'May' }, { name: 'June' },
              { name: 'July' }, { name: 'August' }, { name: 'September' },
              { name: 'October' }, { name: 'November' }, { name: 'December' }
            ],
            weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            translations: {
              en: {
                label: 'Test Calendar'
              }
            }
          }),
          getCurrentDate: () => ({ year: 2024, month: 12, day: 25, weekday: 2 }),
        },
      } as any;

      // Initialize widget's viewDate properly
      (widget as any).viewDate = { year: 2024, month: 12, day: 25, weekday: 2 };

      const mockTarget = document.createElement('div');
      mockTarget.dataset.day = '25';

      let infoShown = false;
      global.ui.notifications.info = () => {
        infoShown = true;
      };

      // Test showDateInfo execution
      (widget as any).showDateInfo(mockTarget);
      expect(infoShown).toBe(true);
    });

    it('should handle showDateInfo with invalid day', () => {
      const widget = new CalendarGridWidget();

      const mockTarget = document.createElement('div');
      // Missing dataset.day

      let infoShown = false;
      global.ui.notifications.info = () => {
        infoShown = true;
      };

      // Test showDateInfo with invalid target
      (widget as any).showDateInfo(mockTarget);
      expect(infoShown).toBe(false); // Should not show info for invalid day
    });
  });

  describe('Feature Logic Coverage', () => {
    it('should properly detect modifier keys', () => {
      const widget = new CalendarGridWidget();
      const mockTarget = document.createElement('div');
      mockTarget.dataset.day = '15';

      // Mock methods to track calls
      let setCurrentDateCalled = false;
      let showDateInfoCalled = false;

      (widget as any).setCurrentDate = () => {
        setCurrentDateCalled = true;
      };
      (widget as any).showDateInfo = () => {
        showDateInfoCalled = true;
      };

      // Test both ctrlKey and metaKey detection
      const ctrlEvent = new MouseEvent('click', { ctrlKey: true });
      const metaEvent = new MouseEvent('click', { metaKey: true });

      // Both should behave the same way
      widget._onSelectDate(ctrlEvent, mockTarget);
      expect(setCurrentDateCalled).toBe(true);

      setCurrentDateCalled = false; // Reset
      widget._onSelectDate(metaEvent, mockTarget);
      expect(setCurrentDateCalled).toBe(true);
    });

    it('should handle missing dataset.day gracefully', () => {
      const widget = new CalendarGridWidget();
      const mockEvent = new Event('click') as MouseEvent;
      const mockTarget = document.createElement('div');
      // No dataset.day

      let setCurrentDateCalled = false;
      (widget as any).setCurrentDate = () => {
        setCurrentDateCalled = true;
      };

      // Should not crash when day is missing
      expect(() => {
        widget._onSelectDate(mockEvent, mockTarget);
      }).not.toThrow();
    });

    it('should validate behavior setting values', () => {
      const widget = new CalendarGridWidget();
      const mockEvent = new Event('click') as MouseEvent;
      const mockTarget = document.createElement('div');
      mockTarget.dataset.day = '15';

      // Test with invalid setting value
      global.game.settings.get = () => 'invalidValue';

      let setCurrentDateCalled = false;
      (widget as any).setCurrentDate = () => {
        setCurrentDateCalled = true;
      };

      // Should default to setDate behavior with invalid setting
      widget._onSelectDate(mockEvent, mockTarget);
      expect(setCurrentDateCalled).toBe(true);
    });

    it('should handle undefined game.user gracefully', () => {
      const widget = new CalendarGridWidget();
      const mockEvent = new Event('click') as MouseEvent;
      const mockTarget = document.createElement('div');
      mockTarget.dataset.day = '15';

      // Set undefined user
      global.game.user = undefined;

      let warningShown = false;
      global.ui.notifications.warn = () => {
        warningShown = true;
      };

      // Should treat undefined user as non-GM
      widget._onSelectDate(mockEvent, mockTarget);
      expect(warningShown).toBe(true);
    });
  });
});