/**
 * Tests for CalendarWidgetManager
 * Demonstrates the bug where widget factories are never registered
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarWidgetManager, WidgetWrapper } from '../src/ui/widget-manager';

// Mock logger to suppress console output in tests
vi.mock('../src/core/logger', () => ({
  Logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('CalendarWidgetManager', () => {
  beforeEach(() => {
    // Clear all instances and factories before each test
    CalendarWidgetManager.clearInstances();
    // Clear factories (this is private, so we need to use type assertion)
    (CalendarWidgetManager as any).factories.clear();
  });

  describe('Widget Registration', () => {
    it('should register widget factories', () => {
      const mockWidgetFactory = vi.fn(() => ({
        show: vi.fn(),
        hide: vi.fn(),
        toggle: vi.fn(),
        getInstance: vi.fn(),
        isVisible: vi.fn().mockReturnValue(false),
      }));

      CalendarWidgetManager.registerWidget('main', mockWidgetFactory);

      expect(CalendarWidgetManager.getRegisteredTypes()).toContain('main');
    });

    it('should fail to get widget when no factory is registered', () => {
      // This demonstrates the bug - no factories registered
      const widget = CalendarWidgetManager.getWidget('main');

      expect(widget).toBeNull();
    });

    it('should successfully get widget when factory is registered', () => {
      const mockWidget = {
        show: vi.fn(),
        hide: vi.fn(),
        toggle: vi.fn(),
        getInstance: vi.fn(),
        isVisible: vi.fn().mockReturnValue(false),
      };

      CalendarWidgetManager.registerWidget('main', () => mockWidget);

      const widget = CalendarWidgetManager.getWidget('main');

      expect(widget).not.toBeNull();
      expect(widget).toBe(mockWidget);
    });
  });

  describe('Bug Reproduction: Scene Controls Integration', () => {
    it('should fail when scene controls try to toggle widget without registration', async () => {
      // This is what happens in the reported bug
      // Scene controls call toggleWidget but no factories are registered

      await CalendarWidgetManager.toggleWidget('grid');

      // The widget manager will log a warning and do nothing
      // In the real app, this prevents the calendar from opening
      const widget = CalendarWidgetManager.getWidget('grid');
      expect(widget).toBeNull();
    });

    it('should work when widgets are properly registered', async () => {
      const mockWidget = {
        show: vi.fn(),
        hide: vi.fn(),
        toggle: vi.fn(),
        getInstance: vi.fn(),
        isVisible: vi.fn().mockReturnValue(false),
      };

      CalendarWidgetManager.registerWidget('grid', () => mockWidget);

      await CalendarWidgetManager.toggleWidget('grid');

      expect(mockWidget.toggle).toHaveBeenCalled();
    });
  });

  describe('Complete Widget Manager Integration', () => {
    it('should handle all widget types when properly registered', () => {
      const createMockWidget = () => ({
        show: vi.fn(),
        hide: vi.fn(),
        toggle: vi.fn(),
        getInstance: vi.fn(),
        isVisible: vi.fn().mockReturnValue(false),
      });

      // This is what SHOULD happen in module initialization
      CalendarWidgetManager.registerWidget('main', createMockWidget);
      CalendarWidgetManager.registerWidget('mini', createMockWidget);
      CalendarWidgetManager.registerWidget('grid', createMockWidget);

      // All widget types should be available
      expect(CalendarWidgetManager.getWidget('main')).not.toBeNull();
      expect(CalendarWidgetManager.getWidget('mini')).not.toBeNull();
      expect(CalendarWidgetManager.getWidget('grid')).not.toBeNull();
    });

    it('should work with WidgetWrapper for actual widget classes', () => {
      // Mock widget classes similar to CalendarWidget, CalendarMiniWidget, CalendarGridWidget
      const mockWidgetClass = {
        show: vi.fn(),
        hide: vi.fn(),
        toggle: vi.fn(),
        getInstance: vi.fn().mockReturnValue({ rendered: true }),
        rendered: true,
      };

      // Register using WidgetWrapper (same pattern as the fix)
      CalendarWidgetManager.registerWidget(
        'main',
        () =>
          new WidgetWrapper(mockWidgetClass, 'show', 'hide', 'toggle', 'getInstance', 'rendered')
      );

      const widget = CalendarWidgetManager.getWidget('main');
      expect(widget).not.toBeNull();
      expect(widget?.isVisible()).toBe(true);
    });
  });

  describe('WidgetWrapper', () => {
    it('should wrap a widget with standard interface', async () => {
      const mockWidget = {
        render: vi.fn(),
        close: vi.fn(),
        toggle: vi.fn(),
        getInstance: vi.fn().mockReturnValue('instance'),
        rendered: true,
      };

      const wrapper = new WidgetWrapper(mockWidget);

      await wrapper.show();
      expect(mockWidget.render).toHaveBeenCalled();

      await wrapper.hide();
      expect(mockWidget.close).toHaveBeenCalled();

      await wrapper.toggle();
      expect(mockWidget.toggle).toHaveBeenCalled();

      expect(wrapper.isVisible()).toBe(true);
      expect(wrapper.getInstance()).toBe('instance');
    });
  });
});
