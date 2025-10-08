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
 *
 * Background:
 * - Commit 89b121a introduced widget factory registration (fixing #78)
 * - Correctly used static method names 'show'/'hide'/'toggle'
 * - This PR initially tried to change to 'render'/'close' (instance methods)
 * - That change was incorrect because WidgetWrapper receives classes, not instances
 * - Issue #344 occurred when trying to use instance method names with class objects
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CalendarWidgetManager, WidgetWrapper } from '../src/ui/widget-manager';
import { CalendarWidget } from '../src/ui/calendar-widget';
import { CalendarMiniWidget } from '../src/ui/calendar-mini-widget';
import { CalendarGridWidget } from '../src/ui/calendar-grid-widget';

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
    // Clean up any active widget instances
    const mainInstance = CalendarWidget.getInstance();
    if (mainInstance?.rendered) {
      mainInstance.close();
    }
    const miniInstance = CalendarMiniWidget.getInstance();
    if (miniInstance?.rendered) {
      miniInstance.close();
    }
    const gridInstance = CalendarGridWidget.getInstance();
    if (gridInstance?.rendered) {
      gridInstance.close();
    }
  });

  describe('Widget Class Architecture', () => {
    it('should have static lifecycle methods on CalendarWidget class', () => {
      // These are STATIC methods on the class
      expect(typeof CalendarWidget.show).toBe('function');
      expect(typeof CalendarWidget.hide).toBe('function');
      expect(typeof CalendarWidget.toggle).toBe('function');
      expect(typeof CalendarWidget.getInstance).toBe('function');
    });

    it('should have instance methods on CalendarWidget instances', () => {
      const instance = new CalendarWidget();

      // These are INSTANCE methods (from ApplicationV2)
      expect(typeof instance.render).toBe('function');
      expect(typeof instance.close).toBe('function');

      // Static methods are NOT available on instances
      expect(typeof (instance as any).show).toBe('undefined');
      expect(typeof (instance as any).hide).toBe('undefined');
    });

    it('should have static lifecycle methods on CalendarMiniWidget class', () => {
      expect(typeof CalendarMiniWidget.show).toBe('function');
      expect(typeof CalendarMiniWidget.hide).toBe('function');
      expect(typeof CalendarMiniWidget.toggle).toBe('function');
      expect(typeof CalendarMiniWidget.getInstance).toBe('function');
    });

    it('should have static lifecycle methods on CalendarGridWidget class', () => {
      expect(typeof CalendarGridWidget.show).toBe('function');
      expect(typeof CalendarGridWidget.hide).toBe('function');
      expect(typeof CalendarGridWidget.toggle).toBe('function');
      expect(typeof CalendarGridWidget.getInstance).toBe('function');
    });
  });

  describe('WidgetWrapper with Class Objects', () => {
    it('should work when configured with static method names', async () => {
      // WidgetWrapper receives the CLASS, not an instance
      const wrapper = new WidgetWrapper(
        CalendarWidget,
        'show', // Static method name
        'hide', // Static method name
        'toggle', // Static method name
        'getInstance',
        'rendered'
      );

      // Spy on the static show method
      const showSpy = vi.spyOn(CalendarWidget, 'show');

      // Call wrapper.show() which should invoke CalendarWidget.show()
      await wrapper.show();

      // Verify the static method was called
      expect(showSpy).toHaveBeenCalledTimes(1);
    });

    it('should fail silently when configured with instance method names', async () => {
      // This is the BUG - trying to use instance method names with a class
      const wrapper = new WidgetWrapper(
        CalendarWidget,
        'render', // WRONG - this is an instance method, not on the class
        'close', // WRONG - this is an instance method, not on the class
        'toggle',
        'getInstance',
        'rendered'
      );

      // Spy on the static show method to verify it's NOT called
      const showSpy = vi.spyOn(CalendarWidget, 'show');

      // Call wrapper.show() - this will fail silently because CalendarWidget['render'] is undefined
      await wrapper.show();

      // Verify that no methods were called (silent failure)
      expect(showSpy).not.toHaveBeenCalled();

      // The wrapper tried to find CalendarWidget['render'] which is undefined
      expect(typeof (CalendarWidget as any)['render']).toBe('undefined');
    });

    it('should work with CalendarMiniWidget using static method names', async () => {
      const wrapper = new WidgetWrapper(
        CalendarMiniWidget,
        'show',
        'hide',
        'toggle',
        'getInstance',
        'rendered'
      );

      const showSpy = vi.spyOn(CalendarMiniWidget, 'show');
      await wrapper.show();
      expect(showSpy).toHaveBeenCalledTimes(1);
    });

    it('should work with CalendarGridWidget using static method names', async () => {
      const wrapper = new WidgetWrapper(
        CalendarGridWidget,
        'show',
        'hide',
        'toggle',
        'getInstance',
        'rendered'
      );

      const showSpy = vi.spyOn(CalendarGridWidget, 'show');
      await wrapper.show();
      expect(showSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Why Instance Method Names Fail', () => {
    it('should demonstrate that render/close do not exist on the widget classes', () => {
      // The problem: 'render' and 'close' are instance methods, not static
      expect(typeof (CalendarWidget as any)['render']).toBe('undefined');
      expect(typeof (CalendarWidget as any)['close']).toBe('undefined');

      expect(typeof (CalendarMiniWidget as any)['render']).toBe('undefined');
      expect(typeof (CalendarMiniWidget as any)['close']).toBe('undefined');

      expect(typeof (CalendarGridWidget as any)['render']).toBe('undefined');
      expect(typeof (CalendarGridWidget as any)['close']).toBe('undefined');
    });

    it('should show that WidgetWrapper fails silently when methods do not exist', async () => {
      const wrapper = new WidgetWrapper(
        CalendarWidget,
        'nonExistentMethod',
        'anotherFakeMethod',
        'toggle',
        'getInstance',
        'rendered'
      );

      // This won't throw an error due to the typeof check in WidgetWrapper
      await wrapper.show();
      await wrapper.hide();

      // But nothing actually happened - silent failure
      const instance = CalendarWidget.getInstance();
      expect(instance).toBeNull(); // No widget was created
    });
  });

  describe('Correct Architecture Pattern', () => {
    it('should demonstrate the correct flow: wrapper calls static method on class', async () => {
      // The CORRECT pattern is:
      // 1. WidgetWrapper receives CalendarWidget (class)
      // 2. Wrapper calls CalendarWidget.show() (static method)
      // 3. Static method creates/gets instance and calls instance.render()

      const showSpy = vi.spyOn(CalendarWidget, 'show');

      // Create wrapper with correct static method names
      const wrapper = new WidgetWrapper(
        CalendarWidget,
        'show', // Static method
        'hide', // Static method
        'toggle',
        'getInstance',
        'rendered'
      );

      // Call wrapper.show() which should invoke the static method
      await wrapper.show();

      // Verify the static method was called
      expect(showSpy).toHaveBeenCalledTimes(1);
    });

    it('should verify the complete integration through CalendarWidgetManager', async () => {
      // Register widget with correct static method names
      CalendarWidgetManager.registerWidget(
        'test',
        () => new WidgetWrapper(CalendarWidget, 'show', 'hide', 'toggle', 'getInstance', 'rendered')
      );

      const showSpy = vi.spyOn(CalendarWidget, 'show');

      // Show the widget through the manager
      await CalendarWidgetManager.showWidget('test');

      // Verify the static method was called
      expect(showSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Scene Control Button Integration (Issue #344)', () => {
    it('should call CalendarWidget.show() when showWidget is called for main widget', async () => {
      // This simulates the scene control button flow:
      // scene-controls.ts:85 → CalendarWidgetManager.showWidget('main')

      CalendarWidgetManager.registerWidget(
        'main',
        () => new WidgetWrapper(CalendarWidget, 'show', 'hide', 'toggle', 'getInstance', 'rendered')
      );

      const showSpy = vi.spyOn(CalendarWidget, 'show');

      await CalendarWidgetManager.showWidget('main');

      expect(showSpy).toHaveBeenCalledTimes(1);
    });

    it('should call CalendarMiniWidget.show() when showWidget is called for mini widget', async () => {
      // This simulates the scene control button flow when defaultWidget is 'mini'
      // scene-controls.ts:78 → CalendarWidgetManager.showWidget('mini')

      CalendarWidgetManager.registerWidget(
        'mini',
        () =>
          new WidgetWrapper(CalendarMiniWidget, 'show', 'hide', 'toggle', 'getInstance', 'rendered')
      );

      const showSpy = vi.spyOn(CalendarMiniWidget, 'show');

      await CalendarWidgetManager.showWidget('mini');

      expect(showSpy).toHaveBeenCalledTimes(1);
    });

    it('should call CalendarGridWidget.show() when showWidget is called for grid widget', async () => {
      // This simulates the scene control button flow when defaultWidget is 'grid'
      // scene-controls.ts:81 → CalendarWidgetManager.showWidget('grid')

      CalendarWidgetManager.registerWidget(
        'grid',
        () =>
          new WidgetWrapper(CalendarGridWidget, 'show', 'hide', 'toggle', 'getInstance', 'rendered')
      );

      const showSpy = vi.spyOn(CalendarGridWidget, 'show');

      await CalendarWidgetManager.showWidget('grid');

      expect(showSpy).toHaveBeenCalledTimes(1);
    });

    it('should call CalendarWidget.hide() when hideWidget is called for main widget', async () => {
      // This simulates the scene control button hide flow:
      // scene-controls.ts:116 → CalendarWidgetManager.hideWidget('main')

      CalendarWidgetManager.registerWidget(
        'main',
        () => new WidgetWrapper(CalendarWidget, 'show', 'hide', 'toggle', 'getInstance', 'rendered')
      );

      const hideSpy = vi.spyOn(CalendarWidget, 'hide');

      await CalendarWidgetManager.hideWidget('main');

      expect(hideSpy).toHaveBeenCalledTimes(1);
    });

    it('should call CalendarWidget.toggle() when toggleWidget is called for main widget', async () => {
      // This simulates the scene control button toggle flow:
      // scene-controls.ts:147 → CalendarWidgetManager.toggleWidget('main')

      CalendarWidgetManager.registerWidget(
        'main',
        () => new WidgetWrapper(CalendarWidget, 'show', 'hide', 'toggle', 'getInstance', 'rendered')
      );

      const toggleSpy = vi.spyOn(CalendarWidget, 'toggle');

      await CalendarWidgetManager.toggleWidget('main');

      expect(toggleSpy).toHaveBeenCalledTimes(1);
    });

    it('should demonstrate scene control button would fail with instance method names', async () => {
      // This test documents why issue #344 would occur if we used 'render'/'close'

      CalendarWidgetManager.registerWidget(
        'main',
        () =>
          new WidgetWrapper(CalendarWidget, 'render', 'close', 'toggle', 'getInstance', 'rendered')
      );

      const showSpy = vi.spyOn(CalendarWidget, 'show');

      // Try to show the widget through the manager
      await CalendarWidgetManager.showWidget('main');

      // The static method was NOT called because wrapper looked for 'render' which doesn't exist on the class
      expect(showSpy).not.toHaveBeenCalled();

      // This is why the scene control button would fail to open widgets
    });

    it('should verify complete scene control flow with all three widget types registered', async () => {
      // Register all widgets as they are in module.ts
      CalendarWidgetManager.registerWidget(
        'main',
        () => new WidgetWrapper(CalendarWidget, 'show', 'hide', 'toggle', 'getInstance', 'rendered')
      );
      CalendarWidgetManager.registerWidget(
        'mini',
        () =>
          new WidgetWrapper(CalendarMiniWidget, 'show', 'hide', 'toggle', 'getInstance', 'rendered')
      );
      CalendarWidgetManager.registerWidget(
        'grid',
        () =>
          new WidgetWrapper(CalendarGridWidget, 'show', 'hide', 'toggle', 'getInstance', 'rendered')
      );

      const mainShowSpy = vi.spyOn(CalendarWidget, 'show');
      const miniShowSpy = vi.spyOn(CalendarMiniWidget, 'show');
      const gridShowSpy = vi.spyOn(CalendarGridWidget, 'show');

      // Simulate scene control button clicking for each widget type
      await CalendarWidgetManager.showWidget('main');
      await CalendarWidgetManager.showWidget('mini');
      await CalendarWidgetManager.showWidget('grid');

      // All widgets should successfully open
      expect(mainShowSpy).toHaveBeenCalledTimes(1);
      expect(miniShowSpy).toHaveBeenCalledTimes(1);
      expect(gridShowSpy).toHaveBeenCalledTimes(1);
    });
  });
});
