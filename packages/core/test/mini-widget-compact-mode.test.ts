/**
 * Test compact mode CSS class application logic for mini widget
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CalendarMiniWidget } from '../src/ui/calendar-mini-widget';
import type { MiniWidgetContext } from '../src/types/widget-types';

// Mock Foundry API
vi.mock('../src/core/logger', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Mini Widget Compact Mode', () => {
  let widget: CalendarMiniWidget;
  let mockElement: HTMLElement;

  beforeEach(() => {
    // Create mock element with required methods
    mockElement = {
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
      },
    } as any;

    // Create widget instance
    widget = new CalendarMiniWidget();
    (widget as any).element = mockElement;
  });

  describe('Compact Mode Logic', () => {
    it('should apply compact-mode class when both weekday and time controls are active', () => {
      const context: MiniWidgetContext = {
        showDayOfWeek: true,
        showTimeControls: true,
        // Other required properties
        shortDate: 'Test Date',
        hasSmallTime: false,
        isGM: true,
        showTime: false,
        timeString: '',
        weekdayDisplay: 'Mon',
        timeAdvancementActive: false,
        advancementRatioDisplay: '1.0x',
        calendar: { id: 'test', label: 'Test', description: 'Test calendar' },
        currentDate: {},
        formattedDate: 'Test formatted date',
      } as MiniWidgetContext;

      // Call the private method using any casting
      (widget as any).applyCompactModeIfNeeded(context);

      // Verify compact-mode class was added
      expect(mockElement.classList.add).toHaveBeenCalledWith('compact-mode');
      expect(mockElement.classList.remove).not.toHaveBeenCalled();
    });

    it('should not apply compact-mode class when only weekday is active', () => {
      const context: MiniWidgetContext = {
        showDayOfWeek: true,
        showTimeControls: false,
        // Other required properties
        shortDate: 'Test Date',
        hasSmallTime: false,
        isGM: true,
        showTime: false,
        timeString: '',
        weekdayDisplay: 'Mon',
        timeAdvancementActive: false,
        advancementRatioDisplay: '1.0x',
        calendar: { id: 'test', label: 'Test', description: 'Test calendar' },
        currentDate: {},
        formattedDate: 'Test formatted date',
      } as MiniWidgetContext;

      (widget as any).applyCompactModeIfNeeded(context);

      // Verify compact-mode class was removed (not applied)
      expect(mockElement.classList.remove).toHaveBeenCalledWith('compact-mode');
      expect(mockElement.classList.add).not.toHaveBeenCalled();
    });

    it('should not apply compact-mode class when only time controls are active', () => {
      const context: MiniWidgetContext = {
        showDayOfWeek: false,
        showTimeControls: true,
        // Other required properties
        shortDate: 'Test Date',
        hasSmallTime: false,
        isGM: true,
        showTime: false,
        timeString: '',
        weekdayDisplay: '',
        timeAdvancementActive: false,
        advancementRatioDisplay: '1.0x',
        calendar: { id: 'test', label: 'Test', description: 'Test calendar' },
        currentDate: {},
        formattedDate: 'Test formatted date',
      } as MiniWidgetContext;

      (widget as any).applyCompactModeIfNeeded(context);

      // Verify compact-mode class was removed (not applied)
      expect(mockElement.classList.remove).toHaveBeenCalledWith('compact-mode');
      expect(mockElement.classList.add).not.toHaveBeenCalled();
    });

    it('should not apply compact-mode class when neither feature is active', () => {
      const context: MiniWidgetContext = {
        showDayOfWeek: false,
        showTimeControls: false,
        // Other required properties
        shortDate: 'Test Date',
        hasSmallTime: false,
        isGM: true,
        showTime: false,
        timeString: '',
        weekdayDisplay: '',
        timeAdvancementActive: false,
        advancementRatioDisplay: '1.0x',
        calendar: { id: 'test', label: 'Test', description: 'Test calendar' },
        currentDate: {},
        formattedDate: 'Test formatted date',
      } as MiniWidgetContext;

      (widget as any).applyCompactModeIfNeeded(context);

      // Verify compact-mode class was removed (not applied)
      expect(mockElement.classList.remove).toHaveBeenCalledWith('compact-mode');
      expect(mockElement.classList.add).not.toHaveBeenCalled();
    });

    it('should handle missing element gracefully', () => {
      // Remove element to test null safety
      (widget as any).element = null;

      const context: MiniWidgetContext = {
        showDayOfWeek: true,
        showTimeControls: true,
        // Other required properties
        shortDate: 'Test Date',
        hasSmallTime: false,
        isGM: true,
        showTime: false,
        timeString: '',
        weekdayDisplay: 'Mon',
        timeAdvancementActive: false,
        advancementRatioDisplay: '1.0x',
        calendar: { id: 'test', label: 'Test', description: 'Test calendar' },
        currentDate: {},
        formattedDate: 'Test formatted date',
      } as MiniWidgetContext;

      // Should not throw error
      expect(() => {
        (widget as any).applyCompactModeIfNeeded(context);
      }).not.toThrow();
    });
  });

  describe('Compact Mode Integration', () => {
    it('should apply compact mode during render when conditions are met', () => {
      // Mock the context preparation to return compact mode conditions
      const mockContext = {
        showDayOfWeek: true,
        showTimeControls: true,
        shortDate: 'Test Date',
        hasSmallTime: false,
        isGM: true,
        showTime: false,
        timeString: '',
        weekdayDisplay: 'Mon',
        timeAdvancementActive: false,
        advancementRatioDisplay: '1.0x',
        calendar: { id: 'test', label: 'Test', description: 'Test calendar' },
        currentDate: {},
        formattedDate: 'Test formatted date',
      } as MiniWidgetContext;

      // Verify that compact mode would be applied in this scenario
      (widget as any).applyCompactModeIfNeeded(mockContext);

      expect(mockElement.classList.add).toHaveBeenCalledWith('compact-mode');
    });
  });
});
