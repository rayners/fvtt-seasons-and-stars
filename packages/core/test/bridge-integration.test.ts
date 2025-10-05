/**
 * Tests for bridge-integration
 * Focus on SeasonsStarsIntegration API surface and widget wrapper functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SidebarButtonRegistry } from '../src/ui/sidebar-button-registry';
import { SeasonsStarsIntegration } from '../src/core/bridge-integration';
import type { CalendarManagerInterface } from '../types/foundry-extensions';

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
