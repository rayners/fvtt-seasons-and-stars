/**
 * Tests for Widget Wrapper Architecture (Issue #344)
 *
 * This test file verifies the correct usage of WidgetWrapper with widget classes.
 *
 * CRITICAL ARCHITECTURE NOTE:
 * - WidgetWrapper receives a **CLASS** (e.g., CalendarWidget), not an instance
 * - Widget classes have **static methods** (show, hide, toggle) for lifecycle management
 * - These static methods internally manage instances and call instance methods (render, close)
 * - Therefore, WidgetWrapper must be configured to call the STATIC method names
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CalendarWidgetManager, WidgetWrapper } from '../src/ui/widget-manager';
import { CalendarWidget } from '../src/ui/calendar-widget';
import { CalendarMiniWidget } from '../src/ui/calendar-mini-widget';
import { CalendarGridWidget } from '../src/ui/calendar-grid-widget';
import { registerWidgetFactories } from '../src/module';

vi.mock('../src/core/logger', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    api: vi.fn(),
    integration: vi.fn(),
    critical: vi.fn(),
    timing: vi.fn((label, fn) => fn()),
  },
}));

describe('Widget Wrapper Architecture (Issue #344)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    CalendarWidgetManager.clearInstances();
  });

  afterEach(() => {
    [CalendarWidget, CalendarMiniWidget, CalendarGridWidget].forEach(widgetClass => {
      const instance = widgetClass.getInstance();
      if (instance?.rendered) {
        instance.close();
      }
    });
  });

  describe('Widget Class Architecture', () => {
    const widgetClasses = [
      { name: 'CalendarWidget', class: CalendarWidget },
      { name: 'CalendarMiniWidget', class: CalendarMiniWidget },
      { name: 'CalendarGridWidget', class: CalendarGridWidget },
    ];

    it.each(widgetClasses)(
      'should have static lifecycle methods on $name class',
      ({ class: widgetClass }) => {
        expect(typeof widgetClass.show).toBe('function');
        expect(typeof widgetClass.hide).toBe('function');
        expect(typeof widgetClass.toggle).toBe('function');
        expect(typeof widgetClass.getInstance).toBe('function');
      }
    );

    it('should have instance methods but not static methods on widget instances', () => {
      const instance = new CalendarWidget();

      expect(typeof instance.render).toBe('function');
      expect(typeof instance.close).toBe('function');
      expect(typeof (instance as any).show).toBe('undefined');
      expect(typeof (instance as any).hide).toBe('undefined');
    });

    it.each(widgetClasses)(
      'should not have render/close static methods on $name class',
      ({ class: widgetClass }) => {
        expect(typeof (widgetClass as any)['render']).toBe('undefined');
        expect(typeof (widgetClass as any)['close']).toBe('undefined');
      }
    );
  });

  describe('WidgetWrapper with Static Method Names', () => {
    const testCases = [
      { type: 'main', class: CalendarWidget },
      { type: 'mini', class: CalendarMiniWidget },
      { type: 'grid', class: CalendarGridWidget },
    ];

    it.each(testCases)(
      'should call $type widget static show method when wrapper.show() is called',
      async ({ class: widgetClass }) => {
        const wrapper = new WidgetWrapper(
          widgetClass,
          'show',
          'hide',
          'toggle',
          'getInstance',
          'rendered'
        );

        const showSpy = vi.spyOn(widgetClass, 'show');
        await wrapper.show();
        expect(showSpy).toHaveBeenCalledTimes(1);
      }
    );

    it('should fail silently when configured with instance method names', async () => {
      const wrapper = new WidgetWrapper(
        CalendarWidget,
        'render',
        'close',
        'toggle',
        'getInstance',
        'rendered'
      );

      const showSpy = vi.spyOn(CalendarWidget, 'show');
      await wrapper.show();
      expect(showSpy).not.toHaveBeenCalled();
      expect(typeof (CalendarWidget as any)['render']).toBe('undefined');
    });
  });

  describe('Production Registration Integration', () => {
    beforeEach(() => {
      registerWidgetFactories();
    });

    const widgetTypes: Array<{ type: 'main' | 'mini' | 'grid'; class: typeof CalendarWidget }> = [
      { type: 'main', class: CalendarWidget },
      { type: 'mini', class: CalendarMiniWidget },
      { type: 'grid', class: CalendarGridWidget },
    ];

    it.each(widgetTypes)(
      'should call $type widget static show method through CalendarWidgetManager',
      async ({ type, class: widgetClass }) => {
        const showSpy = vi.spyOn(widgetClass, 'show');
        await CalendarWidgetManager.showWidget(type);
        expect(showSpy).toHaveBeenCalledTimes(1);
      }
    );

    it.each(widgetTypes)(
      'should call $type widget static hide method through CalendarWidgetManager',
      async ({ type, class: widgetClass }) => {
        const hideSpy = vi.spyOn(widgetClass, 'hide');
        await CalendarWidgetManager.hideWidget(type);
        expect(hideSpy).toHaveBeenCalledTimes(1);
      }
    );

    it.each(widgetTypes)(
      'should call $type widget static toggle method through CalendarWidgetManager',
      async ({ type, class: widgetClass }) => {
        const toggleSpy = vi.spyOn(widgetClass, 'toggle');
        await CalendarWidgetManager.toggleWidget(type);
        expect(toggleSpy).toHaveBeenCalledTimes(1);
      }
    );

    it('should verify scene control button integration for all widget types', async () => {
      const mainShowSpy = vi.spyOn(CalendarWidget, 'show');
      const miniShowSpy = vi.spyOn(CalendarMiniWidget, 'show');
      const gridShowSpy = vi.spyOn(CalendarGridWidget, 'show');

      await CalendarWidgetManager.showWidget('main');
      await CalendarWidgetManager.showWidget('mini');
      await CalendarWidgetManager.showWidget('grid');

      expect(mainShowSpy).toHaveBeenCalledTimes(1);
      expect(miniShowSpy).toHaveBeenCalledTimes(1);
      expect(gridShowSpy).toHaveBeenCalledTimes(1);
    });

    it('should demonstrate scene control button would fail with instance method names', async () => {
      CalendarWidgetManager.clearInstances();
      CalendarWidgetManager.registerWidget(
        'main',
        () =>
          new WidgetWrapper(CalendarWidget, 'render', 'close', 'toggle', 'getInstance', 'rendered')
      );

      const showSpy = vi.spyOn(CalendarWidget, 'show');
      await CalendarWidgetManager.showWidget('main');
      expect(showSpy).not.toHaveBeenCalled();
    });
  });
});
