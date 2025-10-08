/**
 * Tests for Widget Factory Registration - Module Integration
 *
 * Tests the registerWidgetFactories() function from module.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarWidgetManager, WidgetWrapper } from '../src/ui/widget-manager';
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

describe('Widget Factory Registration (Module.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    CalendarWidgetManager.clearInstances();
  });

  describe('registerWidgetFactories()', () => {
    it('should register all three widget types', () => {
      registerWidgetFactories();

      expect(CalendarWidgetManager.getWidget('main')).not.toBeNull();
      expect(CalendarWidgetManager.getWidget('mini')).not.toBeNull();
      expect(CalendarWidgetManager.getWidget('grid')).not.toBeNull();
    });

    it('should register widgets as WidgetWrapper instances', () => {
      registerWidgetFactories();

      expect(CalendarWidgetManager.getWidget('main')).toBeInstanceOf(WidgetWrapper);
      expect(CalendarWidgetManager.getWidget('mini')).toBeInstanceOf(WidgetWrapper);
      expect(CalendarWidgetManager.getWidget('grid')).toBeInstanceOf(WidgetWrapper);
    });

    it('should log debug message when registering', async () => {
      const { Logger } = await import('../src/core/logger');
      registerWidgetFactories();
      expect(Logger.debug).toHaveBeenCalledWith('Registering widget factories');
    });

    it('should not throw when called multiple times', () => {
      expect(() => {
        registerWidgetFactories();
        registerWidgetFactories();
      }).not.toThrow();
    });
  });

  describe('Error Prevention', () => {
    it('should prevent "No factory registered for widget type" error', () => {
      registerWidgetFactories();

      expect(CalendarWidgetManager.getWidget('nonexistent' as any)).toBeNull();
      expect(CalendarWidgetManager.getWidget('main')).not.toBeNull();
      expect(CalendarWidgetManager.getWidget('mini')).not.toBeNull();
      expect(CalendarWidgetManager.getWidget('grid')).not.toBeNull();
    });
  });
});
