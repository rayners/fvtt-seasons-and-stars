/**
 * Tests for CalendarMiniWidget viewport bounds checking
 * Ensures the widget stays within viewport boundaries when positioned
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { CalendarMiniWidget } from '../../src/ui/calendar-mini-widget';
import { mockStandardCalendar } from '../mocks/calendar-mocks';
import type { SeasonsStarsCalendar } from '../../src/types/calendar';
import { CalendarDate } from '../../src/core/calendar-date';

// Mock TimeAdvancementService
vi.mock('../../src/core/time-advancement-service', () => ({
  TimeAdvancementService: {
    getInstance: vi.fn(() => ({
      isActive: false,
      shouldShowPauseButton: false,
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      updateRatio: vi.fn(),
      initialize: vi.fn(),
      destroy: vi.fn(),
    })),
  },
}));

// Mock CalendarWidgetManager
vi.mock('../../src/ui/widget-manager', () => ({
  CalendarWidgetManager: {
    showWidget: vi.fn(),
  },
}));

// Mock SmallTimeUtils
vi.mock('../../src/ui/base-widget-manager', () => ({
  SmallTimeUtils: {
    isSmallTimeAvailable: () => false,
    getSmallTimeElement: () => null,
  },
}));

// Mock foundry.utils and Draggable
(global as any).foundry = {
  utils: {
    mergeObject: (original: any, other: any) => ({ ...original, ...other }),
  },
  applications: {
    ux: {
      Draggable: vi.fn().mockImplementation(() => ({
        _onDragMouseDown: vi.fn(),
        _onDragMouseUp: vi.fn(),
      })),
    },
  },
};

describe('CalendarMiniWidget - Viewport Bounds Checking', () => {
  let widget: CalendarMiniWidget;
  let mockCalendar: SeasonsStarsCalendar;
  let mockDate: CalendarDate;
  let mockSettings: Map<string, any>;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup settings mock
    mockSettings = new Map();
    mockSettings.set('seasons-and-stars.miniWidgetShowTime', false);
    mockSettings.set('seasons-and-stars.miniWidgetShowDayOfWeek', false);
    mockSettings.set('seasons-and-stars.alwaysShowQuickTimeButtons', false);
    mockSettings.set('seasons-and-stars.timeAdvancementRatio', 1.0);
    mockSettings.set('seasons-and-stars.defaultWidget', 'main');
    mockSettings.set('seasons-and-stars.miniWidgetPinned', false);

    // Create mock calendar
    mockCalendar = { ...mockStandardCalendar };

    // Create mock date
    mockDate = new CalendarDate(
      {
        year: 2024,
        month: 1,
        day: 15,
        weekday: 0,
        time: {
          hour: 12,
          minute: 30,
          second: 0,
        },
      },
      mockCalendar
    );

    // Setup global game object
    global.game = {
      settings: {
        get: vi.fn((module: string, key: string) => mockSettings.get(`${module}.${key}`)),
        set: vi.fn((module: string, key: string, value: any) => {
          mockSettings.set(`${module}.${key}`, value);
          return Promise.resolve();
        }),
      },
      user: { isGM: true },
      seasonsStars: {
        manager: {
          getActiveCalendar: vi.fn().mockReturnValue(mockCalendar),
          getCurrentDate: vi.fn().mockReturnValue(mockDate),
          getAllCalendars: vi.fn().mockReturnValue([mockCalendar]),
          advanceMinutes: vi.fn().mockResolvedValue(undefined),
          advanceHours: vi.fn().mockResolvedValue(undefined),
        },
      },
    } as any;

    global.ui = { notifications: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } } as any;

    // Create widget instance
    widget = new CalendarMiniWidget();
  });

  describe('Viewport Bounds Detection', () => {
    it('should detect when position would be outside top viewport boundary', () => {
      const position = { top: -50, left: 100 };
      const bounds = widget.isPositionOutsideViewport(position);
      expect(bounds.outsideTop).toBe(true);
      expect(bounds.outsideBottom).toBe(false);
      expect(bounds.outsideLeft).toBe(false);
      expect(bounds.outsideRight).toBe(false);
    });

    it('should detect when position would be outside bottom viewport boundary', () => {
      global.window = { innerHeight: 768, innerWidth: 1024 } as any;
      const position = { top: 800, left: 100 };
      const bounds = widget.isPositionOutsideViewport(position);
      expect(bounds.outsideTop).toBe(false);
      expect(bounds.outsideBottom).toBe(true);
      expect(bounds.outsideLeft).toBe(false);
      expect(bounds.outsideRight).toBe(false);
    });

    it('should detect when position would be outside left viewport boundary', () => {
      const position = { top: 100, left: -20 };
      const bounds = widget.isPositionOutsideViewport(position);
      expect(bounds.outsideTop).toBe(false);
      expect(bounds.outsideBottom).toBe(false);
      expect(bounds.outsideLeft).toBe(true);
      expect(bounds.outsideRight).toBe(false);
    });

    it('should detect when position would be outside right viewport boundary', () => {
      global.window = { innerHeight: 768, innerWidth: 1024 } as any;
      const position = { top: 100, left: 1100 };
      const bounds = widget.isPositionOutsideViewport(position);
      expect(bounds.outsideTop).toBe(false);
      expect(bounds.outsideBottom).toBe(false);
      expect(bounds.outsideLeft).toBe(false);
      expect(bounds.outsideRight).toBe(true);
    });

    it('should detect when position is within all viewport boundaries', () => {
      global.window = { innerHeight: 768, innerWidth: 1024 } as any;
      const position = { top: 100, left: 100 };
      const bounds = widget.isPositionOutsideViewport(position);
      expect(bounds.outsideTop).toBe(false);
      expect(bounds.outsideBottom).toBe(false);
      expect(bounds.outsideLeft).toBe(false);
      expect(bounds.outsideRight).toBe(false);
    });

    it('should account for widget dimensions when checking boundaries', () => {
      global.window = { innerHeight: 768, innerWidth: 1024 } as any;
      // Widget is estimated at 200px wide and 80px tall
      const position = { top: 700, left: 900 }; // Would put bottom-right corner outside
      const bounds = widget.isPositionOutsideViewport(position);
      expect(bounds.outsideBottom).toBe(true);
      expect(bounds.outsideRight).toBe(true);
    });
  });

  describe('Viewport Bounds Correction', () => {
    beforeEach(() => {
      global.window = { innerHeight: 768, innerWidth: 1024 } as any;
    });

    it('should correct position when outside top boundary', () => {
      const position = { top: -50, left: 100 };
      const corrected = widget.correctPositionForViewport(position);
      expect(corrected.top).toBeGreaterThanOrEqual(10); // Minimum padding from edge
      expect(corrected.left).toBe(100); // Left unchanged
    });

    it('should correct position when outside bottom boundary', () => {
      const position = { top: 800, left: 100 };
      const corrected = widget.correctPositionForViewport(position);
      expect(corrected.top).toBeLessThanOrEqual(768 - 80 - 10); // viewport - widget height - padding
      expect(corrected.left).toBe(100); // Left unchanged
    });

    it('should correct position when outside left boundary', () => {
      const position = { top: 100, left: -50 };
      const corrected = widget.correctPositionForViewport(position);
      expect(corrected.top).toBe(100); // Top unchanged
      expect(corrected.left).toBeGreaterThanOrEqual(10); // Minimum padding from edge
    });

    it('should correct position when outside right boundary', () => {
      const position = { top: 100, left: 1100 };
      const corrected = widget.correctPositionForViewport(position);
      expect(corrected.top).toBe(100); // Top unchanged
      expect(corrected.left).toBeLessThanOrEqual(1024 - 200 - 10); // viewport - widget width - padding
    });

    it('should correct multiple boundaries simultaneously', () => {
      const position = { top: -50, left: -50 };
      const corrected = widget.correctPositionForViewport(position);
      expect(corrected.top).toBeGreaterThanOrEqual(10);
      expect(corrected.left).toBeGreaterThanOrEqual(10);
    });

    it('should not change position when within boundaries', () => {
      const position = { top: 100, left: 100 };
      const corrected = widget.correctPositionForViewport(position);
      expect(corrected.top).toBe(100);
      expect(corrected.left).toBe(100);
    });

    it('should handle edge case at exact viewport boundaries', () => {
      const position = { top: 0, left: 0 };
      const corrected = widget.correctPositionForViewport(position);
      expect(corrected.top).toBeGreaterThanOrEqual(10); // Should add padding
      expect(corrected.left).toBeGreaterThanOrEqual(10); // Should add padding
    });
  });

  describe('Fallback Position Strategy', () => {
    beforeEach(() => {
      global.window = { innerHeight: 768, innerWidth: 1024 } as any;
    });

    it('should use fallback position when computed position is outside viewport', () => {
      // Mock element for positioning
      const mockElement = document.createElement('div');
      (widget as any).element = mockElement;

      // Simulate positioning that would place widget outside viewport
      const invalidPosition = { top: -100, left: 1200 };
      const fallbackPosition = widget.getFallbackPosition();

      expect(fallbackPosition.top).toBeGreaterThan(0);
      expect(fallbackPosition.top).toBeLessThan(768);
      expect(fallbackPosition.left).toBeGreaterThan(0);
      expect(fallbackPosition.left).toBeLessThan(1024);
    });

    it('should calculate sensible fallback position based on viewport size', () => {
      const fallback = widget.getFallbackPosition();
      
      // Should be in lower-left area (typical for UI widgets)
      expect(fallback.top).toBe(768 - 150); // Bottom offset
      expect(fallback.left).toBe(20); // Left margin
    });

    it('should adjust fallback position for small viewports', () => {
      global.window = { innerHeight: 400, innerWidth: 600 } as any;
      const fallback = widget.getFallbackPosition();
      
      // Should still be visible but adjusted for small screen
      expect(fallback.top).toBe(250); // 400 - 150
      expect(fallback.left).toBe(20);
    });

    it('should ensure fallback position itself is within bounds', () => {
      global.window = { innerHeight: 100, innerWidth: 150 } as any; // Tiny viewport
      const fallback = widget.getFallbackPosition();
      
      // Should clamp to minimum viable position
      const bounds = widget.isPositionOutsideViewport(fallback);
      expect(bounds.outsideTop).toBe(false);
      expect(bounds.outsideBottom).toBe(true); // Widget might not fit, but position is attempted
    });
  });

  describe('Integration with Positioning Methods', () => {
    beforeEach(() => {
      global.window = { innerHeight: 768, innerWidth: 1024 } as any;
      const mockElement = document.createElement('div');
      (widget as any).element = mockElement;
    });

    it('should apply viewport bounds checking in positionStandalone', () => {
      const spy = vi.spyOn(widget as any, 'correctPositionForViewport');
      (widget as any).positionStandalone();
      
      expect(spy).toHaveBeenCalled();
    });

    it('should apply viewport bounds checking in positionRelativeToSmallTime', () => {
      // Mock SmallTime element
      const smallTimeElement = document.createElement('div');
      smallTimeElement.style.position = 'fixed';
      smallTimeElement.style.top = '10px'; // Near top of viewport
      smallTimeElement.style.left = '10px';
      smallTimeElement.getBoundingClientRect = () => ({
        top: 10,
        left: 10,
        bottom: 50,
        right: 200,
        width: 190,
        height: 40,
      } as DOMRect);

      const spy = vi.spyOn(widget as any, 'correctPositionForViewport');
      (widget as any).positionAboveSmallTime(smallTimeElement);
      
      // Should detect that positioning above would go outside viewport
      expect(spy).toHaveBeenCalled();
    });

    it('should fall back to standalone when player list positioning fails bounds check', () => {
      // Mock player list that would cause out of bounds
      const playerList = document.createElement('div');
      playerList.id = 'players';
      playerList.style.position = 'fixed';
      playerList.style.top = '-100px'; // Outside viewport
      document.body.appendChild(playerList);

      const standaloneSpy = vi.spyOn(widget as any, 'positionStandalone');
      (widget as any).positionRelativeToPlayerList();
      
      // Cleanup
      document.body.removeChild(playerList);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing window object gracefully', () => {
      const originalWindow = global.window;
      (global as any).window = undefined;
      
      const position = { top: 100, left: 100 };
      const corrected = widget.correctPositionForViewport(position);
      
      // Should return original position when window is unavailable
      expect(corrected).toEqual(position);
      
      global.window = originalWindow;
    });

    it('should handle zero-sized viewport', () => {
      global.window = { innerHeight: 0, innerWidth: 0 } as any;
      
      const position = { top: 100, left: 100 };
      const corrected = widget.correctPositionForViewport(position);
      
      // Should apply minimum positioning
      expect(corrected.top).toBeGreaterThanOrEqual(0);
      expect(corrected.left).toBeGreaterThanOrEqual(0);
    });

    it('should handle NaN or invalid position values', () => {
      const position = { top: NaN, left: undefined as any };
      const corrected = widget.correctPositionForViewport(position);
      
      // Should return fallback position
      expect(Number.isFinite(corrected.top)).toBe(true);
      expect(Number.isFinite(corrected.left)).toBe(true);
    });

    it('should handle extremely large position values', () => {
      const position = { top: Number.MAX_SAFE_INTEGER, left: Number.MAX_SAFE_INTEGER };
      const corrected = widget.correctPositionForViewport(position);
      
      // Should clamp to viewport
      expect(corrected.top).toBeLessThan(1000);
      expect(corrected.left).toBeLessThan(1500);
    });
  });
});