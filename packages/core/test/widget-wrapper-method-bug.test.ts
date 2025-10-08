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
});
