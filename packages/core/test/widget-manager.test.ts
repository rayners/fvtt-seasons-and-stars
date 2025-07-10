/**
 * Tests for CalendarWidgetManager
 * Demonstrates the bug where widget factories are never registered
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Use real TestLogger instead of mocks for better testing
import { TestLogger } from './utils/test-logger';
vi.mock('../src/core/logger', () => ({
  Logger: TestLogger,
}));

import { CalendarWidgetManager, WidgetWrapper } from '../src/ui/widget-manager';
import { CalendarWidget } from '../src/ui/calendar-widget';
import { CalendarMiniWidget } from '../src/ui/calendar-mini-widget';
import { CalendarGridWidget } from '../src/ui/calendar-grid-widget';

describe('CalendarWidgetManager', () => {
  beforeEach(() => {
    // Clear all instances and factories before each test
    CalendarWidgetManager.clearInstances();
    // Clear factories (this is private, so we need to use type assertion)
    (CalendarWidgetManager as any).factories.clear();
    // Clear test logger logs
    TestLogger.clearLogs();
  });

  describe('Widget Registration', () => {
    it('should register widget factories', () => {
      const widgetFactory = () => new WidgetWrapper(CalendarWidget);

      CalendarWidgetManager.registerWidget('main', widgetFactory);

      expect(CalendarWidgetManager.getRegisteredTypes()).toContain('main');
    });

    it('should fail to get widget when no factory is registered', () => {
      // This demonstrates the bug - no factories registered
      const widget = CalendarWidgetManager.getWidget('main');

      expect(widget).toBeNull();
    });

    it('should successfully get widget when factory is registered', () => {
      const widgetFactory = () => new WidgetWrapper(CalendarWidget);

      CalendarWidgetManager.registerWidget('main', widgetFactory);

      const widget = CalendarWidgetManager.getWidget('main');

      expect(widget).not.toBeNull();
      expect(widget).toBeInstanceOf(WidgetWrapper);
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
      const widgetFactory = () => new WidgetWrapper(CalendarGridWidget);

      CalendarWidgetManager.registerWidget('grid', widgetFactory);

      await CalendarWidgetManager.toggleWidget('grid');

      // Widget should now be retrieved and toggle called
      const widget = CalendarWidgetManager.getWidget('grid');
      expect(widget).not.toBeNull();
    });
  });

  describe('Complete Widget Manager Integration', () => {
    it('should handle all widget types when properly registered', () => {
      const createWidgetFactory = (widgetClass: any) => () => new WidgetWrapper(widgetClass);

      // This is what SHOULD happen in module initialization
      CalendarWidgetManager.registerWidget('main', createWidgetFactory(CalendarWidget));
      CalendarWidgetManager.registerWidget('mini', createWidgetFactory(CalendarMiniWidget));
      CalendarWidgetManager.registerWidget('grid', createWidgetFactory(CalendarGridWidget));

      // All widget types should be available
      expect(CalendarWidgetManager.getWidget('main')).not.toBeNull();
      expect(CalendarWidgetManager.getWidget('mini')).not.toBeNull();
      expect(CalendarWidgetManager.getWidget('grid')).not.toBeNull();
    });

    it('should work with WidgetWrapper for actual widget classes', () => {
      // Register using WidgetWrapper with real CalendarWidget
      CalendarWidgetManager.registerWidget('main', () => new WidgetWrapper(CalendarWidget));

      const widget = CalendarWidgetManager.getWidget('main');
      expect(widget).not.toBeNull();
      expect(widget).toBeInstanceOf(WidgetWrapper);
    });
  });

  describe('WidgetWrapper', () => {
    it('should wrap a widget with standard interface', async () => {
      const wrapper = new WidgetWrapper(CalendarWidget);

      // Test wrapper functionality - these should not throw
      await expect(wrapper.show()).resolves.not.toThrow();
      await expect(wrapper.hide()).resolves.not.toThrow();
      await expect(wrapper.toggle()).resolves.not.toThrow();

      // Test interface methods exist
      expect(typeof wrapper.isVisible).toBe('function');
      expect(typeof wrapper.getInstance).toBe('function');
    });
  });
});
