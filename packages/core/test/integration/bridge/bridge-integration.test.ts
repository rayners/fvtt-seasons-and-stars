/**
 * Tests for bridge-integration
 * Focus on SeasonsStarsIntegration API surface and BridgeWidgetWrapper merge behavior
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SidebarButtonRegistry } from '../../../src/ui/sidebar-button-registry';
import { SeasonsStarsIntegration } from '../../../src/core/bridge-integration';
import type { CalendarManagerInterface } from '../types/foundry-extensions';
import type { WidgetType } from '../types/widget-types';

/**
 * Test helper that replicates BridgeWidgetWrapper.addSidebarButton logic
 * This allows us to test the merge behavior without needing actual widget instances
 */
class TestBridgeWidgetWrapper {
  constructor(
    private widget: any,
    private widgetType: WidgetType
  ) {}

  addSidebarButton(name: string, icon: string, tooltip: string, callback: () => void): void {
    const registry = SidebarButtonRegistry.getInstance();
    const existing = registry.get(name);

    if (existing) {
      // Button already exists - merge widget type targeting
      const updated = { ...existing };

      if (updated.only) {
        // Add this widget type to the existing 'only' list if not already present
        if (!updated.only.includes(this.widgetType)) {
          updated.only = [...updated.only, this.widgetType];
        }
      } else if (updated.except) {
        // Remove this widget type from the 'except' list so button shows here
        updated.except = updated.except.filter(type => type !== this.widgetType);
        // If except list becomes empty, remove the property
        if (updated.except.length === 0) {
          delete updated.except;
        }
      } else {
        // No filters means shows everywhere - do not modify
        // Bridge attempting to add a global button should not restrict its scope
        // No changes to updated - button stays global
      }

      // Preserve original callback to avoid unexpected overrides
      // Use update() instead of unregister/register to reduce hook emissions
      registry.update(updated);
      return;
    }

    // New button - register for this widget type only
    registry.register({
      name,
      icon,
      tooltip,
      callback,
      only: [this.widgetType],
    });
  }
}

// Mock CalendarManager
const createMockCalendarManager = (): CalendarManagerInterface => ({
  getCurrentCalendar: vi.fn(() => ({
    id: 'gregorian',
    name: 'Gregorian',
    months: [],
    weekdays: [],
    eras: [],
    leapYearRule: 'gregorian',
  })),
  getCurrentDate: vi.fn(() => ({
    year: 2024,
    month: 1,
    day: 1,
    dayOfWeek: 1,
    dayOfYear: 1,
    era: null,
    isLeapYear: true,
    calendarId: 'gregorian',
  })),
  setCurrentDate: vi.fn(),
  getAvailableCalendars: vi.fn(() => []),
  switchCalendar: vi.fn(),
  formatDate: vi.fn(() => 'Mock Date'),
  getWorldTime: vi.fn(() => 0),
  setWorldTime: vi.fn(),
  convertToWorldTime: vi.fn(() => 0),
  convertFromWorldTime: vi.fn(() => ({
    year: 2024,
    month: 1,
    day: 1,
    dayOfWeek: 1,
    dayOfYear: 1,
    era: null,
    isLeapYear: true,
    calendarId: 'gregorian',
  })),
  advanceTime: vi.fn(),
  isValidDate: vi.fn(() => true),
});

describe('SeasonsStarsIntegration - Bridge API', () => {
  let registry: SidebarButtonRegistry;
  let integration: SeasonsStarsIntegration;
  let mockCalendarManager: CalendarManagerInterface;

  beforeEach(() => {
    // Clear singletons for clean tests
    (SidebarButtonRegistry as any).instance = null;
    (SeasonsStarsIntegration as any).instance = null;
    registry = SidebarButtonRegistry.getInstance();

    // Create mock calendar manager and integration directly
    mockCalendarManager = createMockCalendarManager();
    integration = new (SeasonsStarsIntegration as any)(mockCalendarManager);
  });

  describe('Widget Management', () => {
    it('should report no widgets available in test environment', () => {
      expect(integration.widgets.main).toBeNull();
      expect(integration.widgets.mini).toBeNull();
      expect(integration.widgets.grid).toBeNull();
    });

    it('should return null for preferred widget when none available', () => {
      expect(integration.widgets.getPreferredWidget()).toBeNull();
    });

    it('should report widgets as not visible', () => {
      expect(integration.widgets.isMainWidgetVisible()).toBe(false);
      expect(integration.widgets.isMiniWidgetVisible()).toBe(false);
      expect(integration.widgets.isGridWidgetVisible()).toBe(false);
    });
  });

  describe('Integration Properties', () => {
    it('should provide api interface', () => {
      expect(integration.api).toBeDefined();
      expect(typeof integration.api.getCurrentDate).toBe('function');
    });

    it('should provide widgets interface', () => {
      expect(integration.widgets).toBeDefined();
    });

    it('should provide button registry', () => {
      expect(integration.buttonRegistry).toBe(registry);
    });

    it('should provide hooks interface', () => {
      expect(integration.hooks).toBeDefined();
    });
  });
});

describe('BridgeWidgetWrapper - Widget Targeting Merge Behavior', () => {
  let registry: SidebarButtonRegistry;
  let mainWrapper: TestBridgeWidgetWrapper;
  let miniWrapper: TestBridgeWidgetWrapper;
  let gridWrapper: TestBridgeWidgetWrapper;

  beforeEach(() => {
    (SidebarButtonRegistry as any).instance = null;
    registry = SidebarButtonRegistry.getInstance();

    const mockWidget = { rendered: true };
    mainWrapper = new TestBridgeWidgetWrapper(mockWidget, 'main');
    miniWrapper = new TestBridgeWidgetWrapper(mockWidget, 'mini');
    gridWrapper = new TestBridgeWidgetWrapper(mockWidget, 'grid');
  });

  describe('Global Button Preservation', () => {
    it('should preserve global button scope when bridge adds it', () => {
      const callback = vi.fn();

      // Register a global button (no filters)
      registry.register({
        name: 'global-btn',
        icon: 'fas fa-globe',
        tooltip: 'Global',
        callback,
      });

      const initial = registry.get('global-btn');
      expect(initial?.only).toBeUndefined();
      expect(initial?.except).toBeUndefined();

      // Bridge attempts to add - should remain global
      mainWrapper.addSidebarButton('global-btn', 'fas fa-globe', 'Global', callback);

      const updated = registry.get('global-btn');
      expect(updated?.only).toBeUndefined();
      expect(updated?.except).toBeUndefined();
    });

    it('should keep button global across multiple bridge add attempts', () => {
      const callback = vi.fn();

      // Register global button
      registry.register({
        name: 'stay-global',
        icon: 'fas fa-star',
        tooltip: 'Global',
        callback,
      });

      // Multiple bridge widgets try to add - should stay global
      mainWrapper.addSidebarButton('stay-global', 'fas fa-star', 'Global', callback);
      expect(registry.get('stay-global')?.only).toBeUndefined();

      gridWrapper.addSidebarButton('stay-global', 'fas fa-star', 'Global', callback);
      expect(registry.get('stay-global')?.only).toBeUndefined();

      miniWrapper.addSidebarButton('stay-global', 'fas fa-star', 'Global', callback);
      expect(registry.get('stay-global')?.only).toBeUndefined();
    });
  });

  describe('Callback Preservation', () => {
    it('should preserve original callback when merging', () => {
      const originalCallback = vi.fn();
      const newCallback = vi.fn();

      mainWrapper.addSidebarButton('callback-test', 'fas fa-test', 'Test', originalCallback);

      const initial = registry.get('callback-test');
      expect(initial?.callback).toBe(originalCallback);

      // Try to add with different callback
      gridWrapper.addSidebarButton('callback-test', 'fas fa-test', 'Test', newCallback);

      const updated = registry.get('callback-test');
      expect(updated?.callback).toBe(originalCallback);
      expect(updated?.callback).not.toBe(newCallback);
    });
  });

  describe('Only Filter Merge', () => {
    it('should add widget type to existing only list', () => {
      const callback = vi.fn();

      mainWrapper.addSidebarButton('only-btn', 'fas fa-filter', 'Only', callback);
      expect(registry.get('only-btn')?.only).toEqual(['main']);

      gridWrapper.addSidebarButton('only-btn', 'fas fa-filter', 'Only', callback);
      expect(registry.get('only-btn')?.only).toEqual(['main', 'grid']);
    });

    it('should not duplicate widget type in only list', () => {
      const callback = vi.fn();

      mainWrapper.addSidebarButton('no-dup', 'fas fa-star', 'No Dup', callback);
      mainWrapper.addSidebarButton('no-dup', 'fas fa-star', 'No Dup', callback);

      expect(registry.get('no-dup')?.only).toEqual(['main']);
    });
  });

  describe('Except Filter Merge', () => {
    it('should remove widget type from except list', () => {
      const callback = vi.fn();

      registry.register({
        name: 'except-btn',
        icon: 'fas fa-ban',
        tooltip: 'Except',
        callback,
        except: ['main', 'grid'],
      });

      mainWrapper.addSidebarButton('except-btn', 'fas fa-ban', 'Except', callback);

      const updated = registry.get('except-btn');
      expect(updated?.except).toEqual(['grid']);
    });

    it('should delete except property when list becomes empty', () => {
      const callback = vi.fn();

      registry.register({
        name: 'last-except',
        icon: 'fas fa-check',
        tooltip: 'Last',
        callback,
        except: ['main'],
      });

      mainWrapper.addSidebarButton('last-except', 'fas fa-check', 'Last', callback);

      const updated = registry.get('last-except');
      expect(updated?.except).toBeUndefined();
      expect(updated?.only).toBeUndefined();
    });
  });
});
