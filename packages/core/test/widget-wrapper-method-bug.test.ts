/**
 * Tests for Widget Wrapper Method Name Bug (Issue #344)
 *
 * This test file specifically addresses the bug where widget factories were
 * registered with incorrect method names ('show'/'hide' instead of 'render'/'close').
 *
 * Background:
 * - Commit 89b121a introduced widget factory registration (fixing #78)
 * - Used static method names 'show'/'hide' which don't exist as instance methods
 * - WidgetWrapper calls methods on the instance, not static methods
 * - ApplicationV2 provides 'render'/'close' as instance methods
 * - Bug caused widgets to fail to open (issue #344)
 *
 * These tests now use the actual widget implementations to verify the fix.
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

describe('Widget Wrapper Method Name Bug (Issue #344)', () => {
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

  describe('Bug Reproduction - Static vs Instance Methods', () => {
    it('should demonstrate CalendarWidget has show/hide as static methods only', () => {
      // CalendarWidget.show is a static method
      expect(typeof CalendarWidget.show).toBe('function');
      expect(typeof CalendarWidget.hide).toBe('function');

      // But instances don't have show/hide methods
      const instance = new CalendarWidget();
      expect(typeof (instance as any).show).toBe('undefined');
      expect(typeof (instance as any).hide).toBe('undefined');

      // Instances DO have render/close from ApplicationV2
      expect(typeof instance.render).toBe('function');
      expect(typeof instance.close).toBe('function');
    });

    it('should demonstrate CalendarMiniWidget has show/hide as static methods only', () => {
      expect(typeof CalendarMiniWidget.show).toBe('function');
      expect(typeof CalendarMiniWidget.hide).toBe('function');

      const instance = new CalendarMiniWidget();
      expect(typeof (instance as any).show).toBe('undefined');
      expect(typeof (instance as any).hide).toBe('undefined');
      expect(typeof instance.render).toBe('function');
      expect(typeof instance.close).toBe('function');
    });

    it('should demonstrate CalendarGridWidget has hide as static method only', () => {
      expect(typeof CalendarGridWidget.hide).toBe('function');

      const instance = new CalendarGridWidget();
      expect(typeof (instance as any).show).toBe('undefined');
      expect(typeof (instance as any).hide).toBe('undefined');
      expect(typeof instance.render).toBe('function');
      expect(typeof instance.close).toBe('function');
    });

    it('should fail when WidgetWrapper tries to call non-existent instance methods', () => {
      const instance = new CalendarWidget();

      // Spy on render to confirm it's NOT called when using wrong method names
      const renderSpy = vi.spyOn(instance, 'render');

      const wrapper = new WidgetWrapper(
        instance,
        'show', // Wrong - this doesn't exist as instance method
        'hide', // Wrong - this doesn't exist as instance method
        'toggle',
        'getInstance',
        'rendered'
      );

      wrapper.show();

      // render should NOT have been called because 'show' doesn't exist on the instance
      expect(renderSpy).not.toHaveBeenCalled();
    });
  });

  describe('Fix Verification - Using Correct Instance Method Names', () => {
    it('should successfully call render when using correct method name', async () => {
      const instance = new CalendarWidget();
      const renderSpy = vi.spyOn(instance, 'render');

      const wrapper = new WidgetWrapper(
        instance,
        'render', // Correct - ApplicationV2 instance method
        'close', // Correct - ApplicationV2 instance method
        'toggle',
        'getInstance',
        'rendered'
      );

      await wrapper.show();

      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    it('should successfully call close when using correct method name', async () => {
      const instance = new CalendarWidget();
      const closeSpy = vi.spyOn(instance, 'close');

      // Set rendered to true so close will be called
      (instance as any).rendered = true;

      const wrapper = new WidgetWrapper(
        instance,
        'render',
        'close', // Correct - ApplicationV2 instance method
        'toggle',
        'getInstance',
        'rendered'
      );

      await wrapper.hide();

      expect(closeSpy).toHaveBeenCalledTimes(1);
    });

    it('should work with CalendarMiniWidget using correct method names', async () => {
      const instance = new CalendarMiniWidget();
      const renderSpy = vi.spyOn(instance, 'render');
      const closeSpy = vi.spyOn(instance, 'close');

      const wrapper = new WidgetWrapper(
        instance,
        'render',
        'close',
        'toggle',
        'getInstance',
        'rendered'
      );

      await wrapper.show();
      expect(renderSpy).toHaveBeenCalledTimes(1);

      (instance as any).rendered = true;
      await wrapper.hide();
      expect(closeSpy).toHaveBeenCalledTimes(1);
    });

    it('should work with CalendarGridWidget using correct method names', async () => {
      const instance = new CalendarGridWidget();
      const renderSpy = vi.spyOn(instance, 'render');
      const closeSpy = vi.spyOn(instance, 'close');

      const wrapper = new WidgetWrapper(
        instance,
        'render',
        'close',
        'toggle',
        'getInstance',
        'rendered'
      );

      await wrapper.show();
      expect(renderSpy).toHaveBeenCalledTimes(1);

      (instance as any).rendered = true;
      await wrapper.hide();
      expect(closeSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Widget Manager Integration with Correct Method Names', () => {
    it('should successfully show CalendarWidget through manager with correct method names', async () => {
      const instance = new CalendarWidget();
      const renderSpy = vi.spyOn(instance, 'render');

      CalendarWidgetManager.registerWidget(
        'main',
        () => new WidgetWrapper(instance, 'render', 'close', 'toggle', 'getInstance', 'rendered')
      );

      await CalendarWidgetManager.showWidget('main');

      expect(renderSpy).toHaveBeenCalled();
    });

    it('should successfully hide CalendarWidget through manager with correct method names', async () => {
      const instance = new CalendarWidget();
      const closeSpy = vi.spyOn(instance, 'close');
      (instance as any).rendered = true;

      CalendarWidgetManager.registerWidget(
        'main',
        () => new WidgetWrapper(instance, 'render', 'close', 'toggle', 'getInstance', 'rendered')
      );

      await CalendarWidgetManager.hideWidget('main');

      expect(closeSpy).toHaveBeenCalled();
    });

    it('should successfully toggle CalendarWidget through manager with correct method names', async () => {
      const instance = new CalendarWidget();
      const renderSpy = vi.spyOn(instance, 'render');
      const closeSpy = vi.spyOn(instance, 'close');

      CalendarWidgetManager.registerWidget(
        'main',
        () => new WidgetWrapper(instance, 'render', 'close', 'toggle', 'getInstance', 'rendered')
      );

      // First toggle should show
      await CalendarWidgetManager.toggleWidget('main');
      expect(renderSpy).toHaveBeenCalled();

      // Mark as rendered
      (instance as any).rendered = true;

      // Second toggle should hide
      await CalendarWidgetManager.toggleWidget('main');
      expect(closeSpy).toHaveBeenCalled();
    });
  });

  describe('All Three Widget Types with Correct Method Names', () => {
    it('should work with all three widget types using correct method names', async () => {
      const mainInstance = new CalendarWidget();
      const miniInstance = new CalendarMiniWidget();
      const gridInstance = new CalendarGridWidget();

      const mainRenderSpy = vi.spyOn(mainInstance, 'render');
      const miniRenderSpy = vi.spyOn(miniInstance, 'render');
      const gridRenderSpy = vi.spyOn(gridInstance, 'render');

      CalendarWidgetManager.registerWidget(
        'main',
        () =>
          new WidgetWrapper(mainInstance, 'render', 'close', 'toggle', 'getInstance', 'rendered')
      );
      CalendarWidgetManager.registerWidget(
        'mini',
        () =>
          new WidgetWrapper(miniInstance, 'render', 'close', 'toggle', 'getInstance', 'rendered')
      );
      CalendarWidgetManager.registerWidget(
        'grid',
        () =>
          new WidgetWrapper(gridInstance, 'render', 'close', 'toggle', 'getInstance', 'rendered')
      );

      await CalendarWidgetManager.showWidget('main');
      await CalendarWidgetManager.showWidget('mini');
      await CalendarWidgetManager.showWidget('grid');

      expect(mainRenderSpy).toHaveBeenCalled();
      expect(miniRenderSpy).toHaveBeenCalled();
      expect(gridRenderSpy).toHaveBeenCalled();
    });
  });

  describe('ApplicationV2 Pattern Compliance', () => {
    it('should verify render and close are ApplicationV2 instance methods', () => {
      const widget = new CalendarWidget();

      // These methods come from ApplicationV2
      expect(typeof widget.render).toBe('function');
      expect(typeof widget.close).toBe('function');

      // Widget instances extend ApplicationV2
      expect(widget instanceof foundry.applications.api.ApplicationV2).toBe(true);
    });

    it('should verify WidgetWrapper calls instance methods correctly', async () => {
      const widget = new CalendarWidget();
      const renderSpy = vi.spyOn(widget, 'render');
      const closeSpy = vi.spyOn(widget, 'close');

      const wrapper = new WidgetWrapper(
        widget,
        'render',
        'close',
        'toggle',
        'getInstance',
        'rendered'
      );

      // Test that wrapper.show() calls widget.render()
      await wrapper.show();
      expect(renderSpy).toHaveBeenCalledWith();

      // Mark as rendered so hide will work
      (widget as any).rendered = true;

      // Test that wrapper.hide() calls widget.close()
      await wrapper.hide();
      expect(closeSpy).toHaveBeenCalledWith();
    });
  });

  describe('Root Cause Documentation', () => {
    it('should document that static methods are not accessible on instances', () => {
      // This test documents the root cause of the bug
      class TestClass {
        static staticMethod() {
          return 'static';
        }
        instanceMethod() {
          return 'instance';
        }
      }

      // Static methods exist on the class
      expect(typeof TestClass.staticMethod).toBe('function');

      // But NOT on instances
      const instance = new TestClass();
      expect(typeof (instance as any).staticMethod).toBe('undefined');

      // Only instance methods exist on instances
      expect(typeof instance.instanceMethod).toBe('function');
    });

    it('should document why the bug manifested silently', () => {
      const instance = new CalendarWidget();

      // WidgetWrapper checks if method exists before calling
      const methodName = 'show';
      const fn = (instance as Record<string, unknown>)[methodName];

      // This is undefined for static methods
      expect(fn).toBeUndefined();

      // So the check fails silently
      if (typeof fn === 'function') {
        // This block never executes - the bug!
        throw new Error('Should not reach here');
      }

      // No error thrown, widget just doesn't open
      expect(true).toBe(true);
    });
  });
});
