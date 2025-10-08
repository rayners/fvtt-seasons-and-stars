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
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarWidgetManager, WidgetWrapper } from '../src/ui/widget-manager';

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

  describe('Bug Reproduction - Using Wrong Method Names', () => {
    it('should fail to call show() when widget has no instance method named show', async () => {
      const mockWidget = {
        rendered: false,
        render: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
      };

      const wrapper = new WidgetWrapper(
        mockWidget,
        'show',
        'hide',
        'toggle',
        'getInstance',
        'rendered'
      );

      await wrapper.show();

      expect(mockWidget.render).not.toHaveBeenCalled();
    });

    it('should fail to call hide() when widget has no instance method named hide', async () => {
      const mockWidget = {
        rendered: true,
        render: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
      };

      const wrapper = new WidgetWrapper(
        mockWidget,
        'show',
        'hide',
        'toggle',
        'getInstance',
        'rendered'
      );

      await wrapper.hide();

      expect(mockWidget.close).not.toHaveBeenCalled();
    });

    it('should demonstrate the bug: widget manager showWidget fails silently', async () => {
      const mockWidget = {
        rendered: false,
        render: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
      };

      CalendarWidgetManager.registerWidget(
        'main',
        () => new WidgetWrapper(mockWidget, 'show', 'hide', 'toggle', 'getInstance', 'rendered')
      );

      await CalendarWidgetManager.showWidget('main');

      expect(mockWidget.render).not.toHaveBeenCalled();
    });
  });

  describe('Fix Verification - Using Correct Method Names', () => {
    it('should successfully call render() when using correct method name', async () => {
      const mockWidget = {
        rendered: false,
        render: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
      };

      const wrapper = new WidgetWrapper(
        mockWidget,
        'render',
        'close',
        'toggle',
        'getInstance',
        'rendered'
      );

      await wrapper.show();

      expect(mockWidget.render).toHaveBeenCalledTimes(1);
    });

    it('should successfully call close() when using correct method name', async () => {
      const mockWidget = {
        rendered: true,
        render: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
      };

      const wrapper = new WidgetWrapper(
        mockWidget,
        'render',
        'close',
        'toggle',
        'getInstance',
        'rendered'
      );

      await wrapper.hide();

      expect(mockWidget.close).toHaveBeenCalledTimes(1);
    });

    it('should verify the fix: widget manager showWidget works correctly', async () => {
      const mockWidget = {
        rendered: false,
        render: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
      };

      CalendarWidgetManager.registerWidget(
        'main',
        () => new WidgetWrapper(mockWidget, 'render', 'close', 'toggle', 'getInstance', 'rendered')
      );

      await CalendarWidgetManager.showWidget('main');

      expect(mockWidget.render).toHaveBeenCalledTimes(1);
    });

    it('should verify the fix: widget manager hideWidget works correctly', async () => {
      const mockWidget = {
        rendered: true,
        render: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
      };

      CalendarWidgetManager.registerWidget(
        'main',
        () => new WidgetWrapper(mockWidget, 'render', 'close', 'toggle', 'getInstance', 'rendered')
      );

      await CalendarWidgetManager.hideWidget('main');

      expect(mockWidget.close).toHaveBeenCalledTimes(1);
    });

    it('should verify the fix: widget manager toggleWidget works correctly', async () => {
      const mockWidget = {
        rendered: false,
        render: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
      };

      CalendarWidgetManager.registerWidget(
        'main',
        () => new WidgetWrapper(mockWidget, 'render', 'close', 'toggle', 'getInstance', 'rendered')
      );

      await CalendarWidgetManager.toggleWidget('main');

      expect(mockWidget.render).toHaveBeenCalledTimes(1);

      mockWidget.rendered = true;

      await CalendarWidgetManager.toggleWidget('main');

      expect(mockWidget.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('ApplicationV2 Pattern Compliance', () => {
    it('should use ApplicationV2 instance method pattern (render/close)', async () => {
      const applicationV2Like = {
        rendered: false,
        render: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
      };

      const wrapper = new WidgetWrapper(
        applicationV2Like,
        'render',
        'close',
        'toggle',
        'getInstance',
        'rendered'
      );

      await wrapper.show();
      expect(applicationV2Like.render).toHaveBeenCalledTimes(1);

      applicationV2Like.rendered = true;

      await wrapper.hide();
      expect(applicationV2Like.close).toHaveBeenCalledTimes(1);
    });

    it('should work with all three widget types using correct method names', async () => {
      const createMockWidget = () => ({
        rendered: false,
        render: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
      });

      const mainWidget = createMockWidget();
      const miniWidget = createMockWidget();
      const gridWidget = createMockWidget();

      CalendarWidgetManager.registerWidget(
        'main',
        () => new WidgetWrapper(mainWidget, 'render', 'close', 'toggle', 'getInstance', 'rendered')
      );
      CalendarWidgetManager.registerWidget(
        'mini',
        () => new WidgetWrapper(miniWidget, 'render', 'close', 'toggle', 'getInstance', 'rendered')
      );
      CalendarWidgetManager.registerWidget(
        'grid',
        () => new WidgetWrapper(gridWidget, 'render', 'close', 'toggle', 'getInstance', 'rendered')
      );

      await CalendarWidgetManager.showWidget('main');
      await CalendarWidgetManager.showWidget('mini');
      await CalendarWidgetManager.showWidget('grid');

      expect(mainWidget.render).toHaveBeenCalledTimes(1);
      expect(miniWidget.render).toHaveBeenCalledTimes(1);
      expect(gridWidget.render).toHaveBeenCalledTimes(1);
    });
  });

  describe('Toggle Fallback Behavior', () => {
    it('should use fallback toggle when widget has no toggle method', async () => {
      const mockWidget = {
        rendered: false,
        render: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
      };

      const wrapper = new WidgetWrapper(
        mockWidget,
        'render',
        'close',
        'nonexistentToggle',
        'getInstance',
        'rendered'
      );

      await wrapper.toggle();
      expect(mockWidget.render).toHaveBeenCalledTimes(1);

      mockWidget.rendered = true;
      await wrapper.toggle();
      expect(mockWidget.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('Method Name Validation', () => {
    it('should document that show/hide are static methods only on CalendarWidget', () => {
      // This test documents the root cause: CalendarWidget only has static show/hide methods
      // The instance methods from ApplicationV2 are render/close

      const hasStaticShow =
        typeof class {
          static show() {}
        }.show === 'function';
      const hasStaticHide =
        typeof class {
          static hide() {}
        }.hide === 'function';

      expect(hasStaticShow).toBe(true);
      expect(hasStaticHide).toBe(true);

      // But instances don't have these methods unless explicitly defined
      const instance = new (class {
        static show() {}
        static hide() {}
      })();

      expect(typeof (instance as any).show).toBe('undefined');
      expect(typeof (instance as any).hide).toBe('undefined');
    });

    it('should demonstrate ApplicationV2 provides render/close as instance methods', () => {
      // ApplicationV2 pattern: render and close are instance methods
      const applicationV2Instance = {
        render: () => {},
        close: () => {},
      };

      expect(typeof applicationV2Instance.render).toBe('function');
      expect(typeof applicationV2Instance.close).toBe('function');
    });
  });
});
