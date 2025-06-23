import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ManagerAccessUtils } from '../src/core/manager-access-utils';

// Mock Foundry environment inline
vi.stubGlobal('game', {});

describe('ManagerAccessUtils', () => {
  let mockManager: any;
  let mockCalendar: any;
  let mockCurrentDate: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock current date
    mockCurrentDate = {
      year: 2024,
      month: 6,
      day: 15,
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

    // Mock manager
    mockManager = {
      getActiveCalendar: vi.fn().mockReturnValue(mockCalendar),
      getCurrentDate: vi.fn().mockReturnValue(mockCurrentDate),
    };

    // Setup global game object
    global.game = {
      seasonsStars: {
        manager: mockManager,
      },
    } as any;
  });

  describe('getManagerState', () => {
    it('should return complete manager state when everything is available', () => {
      const state = ManagerAccessUtils.getManagerState();

      expect(state).toEqual({
        manager: mockManager,
        activeCalendar: mockCalendar,
        currentDate: mockCurrentDate,
      });

      expect(mockManager.getActiveCalendar).toHaveBeenCalled();
      expect(mockManager.getCurrentDate).toHaveBeenCalled();
    });

    it('should return null manager when game.seasonsStars is missing', () => {
      global.game = {} as any;

      const state = ManagerAccessUtils.getManagerState();

      expect(state).toEqual({
        manager: null,
        activeCalendar: null,
        currentDate: null,
      });
    });

    it('should return null manager when game.seasonsStars.manager is missing', () => {
      global.game = {
        seasonsStars: {},
      } as any;

      const state = ManagerAccessUtils.getManagerState();

      expect(state).toEqual({
        manager: null,
        activeCalendar: null,
        currentDate: null,
      });
    });

    it('should handle null active calendar', () => {
      mockManager.getActiveCalendar.mockReturnValueOnce(null);

      const state = ManagerAccessUtils.getManagerState();

      expect(state).toEqual({
        manager: mockManager,
        activeCalendar: null,
        currentDate: mockCurrentDate,
      });
    });

    it('should handle null current date', () => {
      mockManager.getCurrentDate.mockReturnValueOnce(null);

      const state = ManagerAccessUtils.getManagerState();

      expect(state).toEqual({
        manager: mockManager,
        activeCalendar: mockCalendar,
        currentDate: null,
      });
    });

    it('should handle manager methods throwing errors', () => {
      mockManager.getActiveCalendar.mockImplementation(() => {
        throw new Error('Calendar error');
      });
      mockManager.getCurrentDate.mockImplementation(() => {
        throw new Error('Date error');
      });

      const state = ManagerAccessUtils.getManagerState();

      expect(state).toEqual({
        manager: mockManager,
        activeCalendar: null,
        currentDate: null,
      });
    });
  });

  describe('createErrorContext', () => {
    it('should create error context with provided error message', () => {
      const errorMessage = 'Test error occurred';
      const context = ManagerAccessUtils.createErrorContext(errorMessage);

      expect(context).toEqual({
        error: errorMessage,
        calendar: null,
        currentDate: null,
        formattedDate: 'Not Available',
      });
    });

    it('should handle different error messages', () => {
      const errorMessages = [
        'Manager not available',
        'Calendar not loaded',
        'Date calculation failed',
      ];

      errorMessages.forEach(message => {
        const context = ManagerAccessUtils.createErrorContext(message);
        expect(context.error).toBe(message);
        expect(context.calendar).toBeNull();
        expect(context.currentDate).toBeNull();
        expect(context.formattedDate).toBe('Not Available');
      });
    });
  });

  describe('isManagerReady', () => {
    it('should return true when manager is available', () => {
      const isReady = ManagerAccessUtils.isManagerReady();
      expect(isReady).toBe(true);
    });

    it('should return false when manager is null', () => {
      global.game = {} as any;
      const isReady = ManagerAccessUtils.isManagerReady();
      expect(isReady).toBe(false);
    });

    it('should return false when game.seasonsStars is missing', () => {
      global.game = {} as any;
      const isReady = ManagerAccessUtils.isManagerReady();
      expect(isReady).toBe(false);
    });
  });

  describe('getFormattedDate', () => {
    it('should format date when calendar and current date are available', () => {
      const formatted = ManagerAccessUtils.getFormattedDate();
      expect(formatted).toBe('15 June 2024');
    });

    it('should return "Not Available" when current date is null', () => {
      mockManager.getCurrentDate.mockReturnValueOnce(null);
      const formatted = ManagerAccessUtils.getFormattedDate();
      expect(formatted).toBe('Not Available');
    });

    it('should return "Not Available" when active calendar is null', () => {
      mockManager.getActiveCalendar.mockReturnValueOnce(null);
      const formatted = ManagerAccessUtils.getFormattedDate();
      expect(formatted).toBe('Not Available');
    });

    it('should return "Not Available" when manager is null', () => {
      global.game = {} as any;
      const formatted = ManagerAccessUtils.getFormattedDate();
      expect(formatted).toBe('Not Available');
    });

    it('should handle months array edge cases', () => {
      // Test when month index is out of bounds
      mockCurrentDate.month = 13; // Invalid month
      const formatted = ManagerAccessUtils.getFormattedDate();
      expect(formatted).toBe('15 Unknown 2024');
    });

    it('should handle missing month name gracefully', () => {
      // Test when month object exists but name is missing
      mockCalendar.months[5] = {}; // Month exists but no name property
      const formatted = ManagerAccessUtils.getFormattedDate();
      expect(formatted).toBe('15 Unknown 2024');
    });

    it('should return "Format Error" when formatting throws an error', () => {
      // Force an error in formatting by making currentDate invalid
      mockManager.getCurrentDate.mockReturnValueOnce({
        year: 2024,
        month: null, // Invalid month
        day: 15,
      });

      const formatted = ManagerAccessUtils.getFormattedDate();
      expect(formatted).toBe('Format Error');
    });

    it('should handle calendar with empty months array', () => {
      mockCalendar.months = [];
      const formatted = ManagerAccessUtils.getFormattedDate();
      expect(formatted).toBe('15 Unknown 2024');
    });

    it('should handle different month indices correctly', () => {
      // Test month 1 (January)
      mockCurrentDate.month = 1;
      let formatted = ManagerAccessUtils.getFormattedDate();
      expect(formatted).toBe('15 January 2024');

      // Test month 12 (if exists)
      if (mockCalendar.months.length >= 12) {
        mockCurrentDate.month = 12;
        formatted = ManagerAccessUtils.getFormattedDate();
        expect(formatted).toContain('2024');
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle completely broken game object', () => {
      global.game = null as any;

      const state = ManagerAccessUtils.getManagerState();
      expect(state.manager).toBeNull();

      const isReady = ManagerAccessUtils.isManagerReady();
      expect(isReady).toBe(false);

      const formatted = ManagerAccessUtils.getFormattedDate();
      expect(formatted).toBe('Not Available');
    });

    it('should handle manager with partial functionality', () => {
      const partialManager = {
        getActiveCalendar: vi.fn().mockReturnValue(mockCalendar),
        // Missing getCurrentDate method
      };

      global.game = {
        seasonsStars: {
          manager: partialManager,
        },
      } as any;

      const state = ManagerAccessUtils.getManagerState();
      expect(state.manager).toBe(partialManager);
      expect(state.activeCalendar).toBe(mockCalendar);
      expect(state.currentDate).toBeNull(); // Should handle missing method gracefully
    });

    it('should be resilient to undefined properties', () => {
      global.game = {
        seasonsStars: {
          manager: {
            getActiveCalendar: () => undefined,
            getCurrentDate: () => undefined,
          },
        },
      } as any;

      const state = ManagerAccessUtils.getManagerState();
      expect(state.activeCalendar).toBeNull();
      expect(state.currentDate).toBeNull();

      const formatted = ManagerAccessUtils.getFormattedDate();
      expect(formatted).toBe('Not Available');
    });
  });

  describe('Performance and Caching', () => {
    it('should call manager methods each time (no caching)', () => {
      ManagerAccessUtils.getManagerState();
      ManagerAccessUtils.getManagerState();
      ManagerAccessUtils.getManagerState();

      // Should call manager methods 3 times (no caching)
      expect(mockManager.getActiveCalendar).toHaveBeenCalledTimes(3);
      expect(mockManager.getCurrentDate).toHaveBeenCalledTimes(3);
    });

    it('should handle rapid successive calls correctly', () => {
      const results = [];
      for (let i = 0; i < 5; i++) {
        results.push(ManagerAccessUtils.isManagerReady());
      }

      expect(results).toEqual([true, true, true, true, true]);
    });
  });
});
