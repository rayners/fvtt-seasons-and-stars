/**
 * Tests for Widget Factory Registration - Module Integration
 *
 * Tests the specific changes made in module.ts for widget factory registration
 * that was added to fix issue #78 "No factory registered for widget type"
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarWidgetManager, WidgetWrapper } from '../src/ui/widget-manager';
import { CalendarWidget } from '../src/ui/calendar-widget';
import { CalendarMiniWidget } from '../src/ui/calendar-mini-widget';
import { CalendarGridWidget } from '../src/ui/calendar-grid-widget';
import { registerWidgetFactories } from '../src/module';

// Mock the logger module with simple vi.fn() mocks
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

describe('Widget Factory Registration (Module.ts Changes)', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  describe('Import Statement Coverage', () => {
    it('should successfully import CalendarWidgetManager and WidgetWrapper', () => {
      // Test that the imports we added work correctly
      expect(CalendarWidgetManager).toBeDefined();
      expect(WidgetWrapper).toBeDefined();
      expect(typeof CalendarWidgetManager.registerWidget).toBe('function');
      expect(typeof WidgetWrapper).toBe('function');
    });
  });

  describe('Widget Factory Registration Code Coverage', () => {
    it('should register all widget factories using actual module function', () => {
      // Call the ACTUAL function from module.ts
      registerWidgetFactories();

      // Verify all registrations worked
      expect(CalendarWidgetManager.getWidget('main')).not.toBeNull();
      expect(CalendarWidgetManager.getWidget('mini')).not.toBeNull();
      expect(CalendarWidgetManager.getWidget('grid')).not.toBeNull();
    });

    it('should register main widget factory with correct wrapper type', () => {
      registerWidgetFactories();

      const widget = CalendarWidgetManager.getWidget('main');
      expect(widget).not.toBeNull();
      expect(widget).toBeInstanceOf(WidgetWrapper);
    });

    it('should register mini widget factory with correct wrapper type', () => {
      registerWidgetFactories();

      const widget = CalendarWidgetManager.getWidget('mini');
      expect(widget).not.toBeNull();
      expect(widget).toBeInstanceOf(WidgetWrapper);
    });

    it('should register grid widget factory with correct wrapper type', () => {
      registerWidgetFactories();

      const widget = CalendarWidgetManager.getWidget('grid');
      expect(widget).not.toBeNull();
      expect(widget).toBeInstanceOf(WidgetWrapper);
    });

    it('should create WidgetWrapper instances with correct parameters', () => {
      // Test the WidgetWrapper constructor calls from module.ts
      // Uses static method names ('show'/'hide') because WidgetWrapper receives classes
      const mainWrapper = new WidgetWrapper(
        CalendarWidget,
        'show',
        'hide',
        'toggle',
        'getInstance',
        'rendered'
      );
      const miniWrapper = new WidgetWrapper(
        CalendarMiniWidget,
        'show',
        'hide',
        'toggle',
        'getInstance',
        'rendered'
      );
      const gridWrapper = new WidgetWrapper(
        CalendarGridWidget,
        'show',
        'hide',
        'toggle',
        'getInstance',
        'rendered'
      );

      // Verify wrappers were created successfully
      expect(mainWrapper).toBeInstanceOf(WidgetWrapper);
      expect(miniWrapper).toBeInstanceOf(WidgetWrapper);
      expect(gridWrapper).toBeInstanceOf(WidgetWrapper);
    });
  });

  describe('Debug Logging Coverage', () => {
    it('should call Logger.debug when registering widget factories', async () => {
      // Import Logger to get the mocked version
      const { Logger } = await import('../src/core/logger');

      // Call the actual function which includes the debug logging
      registerWidgetFactories();

      expect(Logger.debug).toHaveBeenCalledWith('Registering widget factories');
    });
  });

  describe('Integration Test - Complete Module Registration Flow', () => {
    it('should successfully complete the entire widget registration flow', async () => {
      // Import Logger to get the mocked version
      const { Logger } = await import('../src/core/logger');

      // Call the ACTUAL function from module.ts
      registerWidgetFactories();

      // Verify the bug from issue #78 is fixed
      // Before the fix, this would return null and cause the error
      const mainWidget = CalendarWidgetManager.getWidget('main');
      const miniWidget = CalendarWidgetManager.getWidget('mini');
      const gridWidget = CalendarWidgetManager.getWidget('grid');

      // All widgets should now be available (fixing issue #78)
      expect(mainWidget).not.toBeNull();
      expect(miniWidget).not.toBeNull();
      expect(gridWidget).not.toBeNull();

      // Verify logging was called
      expect(Logger.debug).toHaveBeenCalledWith('Registering widget factories');
    });

    it('should prevent the "No factory registered for widget type" error', () => {
      // This test specifically addresses issue #78

      // Call the actual registration function
      registerWidgetFactories();

      // Test with a non-existent widget type to verify error handling
      expect(CalendarWidgetManager.getWidget('nonexistent' as any)).toBeNull();

      // Ensure the main widget types that module.ts registers are available
      const mainWidget = CalendarWidgetManager.getWidget('main');
      const miniWidget = CalendarWidgetManager.getWidget('mini');
      const gridWidget = CalendarWidgetManager.getWidget('grid');

      // After the fix in module.ts, these should all be available
      expect(mainWidget).not.toBeNull();
      expect(miniWidget).not.toBeNull();
      expect(gridWidget).not.toBeNull();

      // Verify they are the correct type
      expect(mainWidget).toBeInstanceOf(WidgetWrapper);
      expect(miniWidget).toBeInstanceOf(WidgetWrapper);
      expect(gridWidget).toBeInstanceOf(WidgetWrapper);

      // The error "No factory registered for widget type" should no longer occur for standard widgets
    });
  });

  describe('Error Prevention Coverage', () => {
    it('should handle factory registration errors gracefully', () => {
      // Call the actual registration function
      expect(() => {
        registerWidgetFactories();
      }).not.toThrow();
    });

    it('should allow re-registration of widgets', () => {
      // Register once
      registerWidgetFactories();

      // Re-register (should not throw)
      expect(() => {
        registerWidgetFactories();
      }).not.toThrow();

      // Should still work
      expect(CalendarWidgetManager.getWidget('main')).not.toBeNull();
      expect(CalendarWidgetManager.getWidget('mini')).not.toBeNull();
      expect(CalendarWidgetManager.getWidget('grid')).not.toBeNull();
    });
  });
});
