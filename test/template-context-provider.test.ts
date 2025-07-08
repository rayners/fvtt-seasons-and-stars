/**
 * Tests for Template Context Provider System
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  TemplateContextProviderRegistry,
  templateContextProviders,
  type TemplateContextProviderRegistration,
} from '../src/core/template-context-provider';
import { CalendarDate } from '../src/core/calendar-date';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

// Mock the global Hooks object
const mockHooks = {
  callAll: vi.fn(),
};

// @ts-expect-error - Mocking global Hooks object
global.Hooks = mockHooks;

// Sample calendar data for testing
const sampleCalendar: SeasonsStarsCalendar = {
  id: 'test-calendar',
  translations: {
    en: {
      label: 'Test Calendar',
      description: 'A test calendar for unit tests',
    },
  },
  months: [
    { name: 'January', days: 31 },
    { name: 'February', days: 28 },
    { name: 'March', days: 31 },
    { name: 'April', days: 30 },
  ],
  weekdays: [
    { name: 'Monday' },
    { name: 'Tuesday' },
    { name: 'Wednesday' },
    { name: 'Thursday' },
    { name: 'Friday' },
    { name: 'Saturday' },
    { name: 'Sunday' },
  ],
  seasons: [
    {
      name: 'Spring',
      startMonth: 3,
      endMonth: 5,
      icon: 'leaf',
      description: 'Spring season',
    },
    {
      name: 'Summer',
      startMonth: 6,
      endMonth: 8,
      icon: 'sun',
      description: 'Summer season',
    },
  ],
  moons: [
    {
      name: 'Luna',
      cycle: 30,
      icon: 'moon',
    },
  ],
};

const sampleCalendarNoSeasons: SeasonsStarsCalendar = {
  id: 'no-seasons-calendar',
  translations: {
    en: {
      label: 'No Seasons Calendar',
      description: 'A calendar without seasons',
    },
  },
  months: [
    { name: 'Month1', days: 30 },
    { name: 'Month2', days: 30 },
  ],
  weekdays: [
    { name: 'Day1' },
    { name: 'Day2' },
  ],
};

describe('TemplateContextProviderRegistry', () => {
  let registry: TemplateContextProviderRegistry;
  let sampleDate: CalendarDate;

  beforeEach(() => {
    // Create fresh instance for each test
    // @ts-expect-error - Access private static property for testing
    TemplateContextProviderRegistry.instance = null;
    registry = TemplateContextProviderRegistry.getInstance();
    mockHooks.callAll.mockClear();

    sampleDate = new CalendarDate({ year: 2023, month: 4, day: 15 }, sampleCalendar);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const registry1 = TemplateContextProviderRegistry.getInstance();
      const registry2 = TemplateContextProviderRegistry.getInstance();
      expect(registry1).toBe(registry2);
    });
  });

  describe('Built-in Providers', () => {
    it('should register built-in providers on creation', () => {
      const providers = registry.getAllProviders();
      const providerNames = providers.map(p => p.name);

      expect(providerNames).toContain('Base Calendar Information');
      expect(providerNames).toContain('Season Information');
      expect(providerNames).toContain('Moon Phases');
    });

    it('should have proper built-in base calendar provider', () => {
      const providers = registry.getProvidersFor('main');
      const baseProvider = providers.find(p => p.name === 'Base Calendar Information');

      expect(baseProvider).toBeDefined();
      expect(baseProvider?.priority).toBe(10);
      expect(baseProvider?.moduleId).toBe('seasons-and-stars');
      expect(baseProvider?.supports).toContain('main');
    });

    it('should provide base calendar context', async () => {
      const baseContext = { testProp: 'test' };
      const mergedContext = await registry.mergeContext('main', baseContext, sampleCalendar, sampleDate);

      expect(mergedContext.calendarId).toBe('test-calendar');
      expect(mergedContext.currentYear).toBe(2023);
      expect(mergedContext.currentMonth).toBe(4);
      expect(mergedContext.currentDay).toBe(15);
      expect(mergedContext.testProp).toBe('test'); // Original context preserved
    });

    it('should provide season context when seasons are available', async () => {
      const baseContext = {};
      const mergedContext = await registry.mergeContext('main', baseContext, sampleCalendar, sampleDate);

      expect(mergedContext.currentSeason).toBeDefined();
      expect(mergedContext.currentSeason.name).toBe('Spring');
      expect(mergedContext.currentSeason.icon).toBe('leaf');
    });

    it('should not provide season context when no seasons available', async () => {
      const baseContext = {};
      const mergedContext = await registry.mergeContext('main', baseContext, sampleCalendarNoSeasons, sampleDate);

      expect(mergedContext.currentSeason).toBeUndefined();
    });

    it('should provide moon context when moons are available', async () => {
      const baseContext = {};
      const mergedContext = await registry.mergeContext('main', baseContext, sampleCalendar, sampleDate);

      expect(mergedContext.moons).toBeDefined();
      expect(mergedContext.moons).toHaveLength(1);
      expect(mergedContext.moons[0].name).toBe('Luna');
      expect(mergedContext.primaryMoon).toBeDefined();
      expect(mergedContext.primaryMoon.name).toBe('Luna');
    });
  });

  describe('Provider Registration', () => {
    const testRegistration: TemplateContextProviderRegistration = {
      name: 'Test Provider',
      priority: 60,
      supports: ['main', 'grid'],
      provideContext: (_widgetType, baseContext) => ({
        testData: 'from-test-provider',
        customValue: 42,
      }),
      description: 'Test provider for unit tests',
    };

    it('should register a new provider', () => {
      const providerId = registry.registerProvider('test-module', testRegistration);

      expect(providerId).toBeTruthy();
      expect(providerId).toMatch(/test-module-provider-\d+/);

      const providers = registry.getProvidersFor('main');
      const testProvider = providers.find(p => p.name === 'Test Provider');
      expect(testProvider).toBeDefined();
      expect(testProvider?.moduleId).toBe('test-module');
      expect(testProvider?.priority).toBe(60);
    });

    it('should emit hook when provider is registered', () => {
      registry.registerProvider('test-module', testRegistration);

      expect(mockHooks.callAll).toHaveBeenCalledWith('seasons-stars:contextProviderRegistered', {
        id: expect.stringMatching(/test-module-provider-\d+/),
        moduleId: 'test-module',
        name: 'Test Provider',
        provider: expect.any(Object),
      });
    });

    it('should use default values for optional properties', () => {
      const minimalRegistration: TemplateContextProviderRegistration = {
        name: 'Minimal Provider',
        provideContext: () => ({ minimal: true }),
      };

      const providerId = registry.registerProvider('test-module', minimalRegistration);
      const providers = registry.getAllProviders();
      const provider = providers.find(p => p.id === providerId);

      expect(provider?.priority).toBe(50); // default
      expect(provider?.supports).toEqual(['main', 'mini', 'grid', 'dialog']); // default
    });
  });

  describe('Provider Unregistration', () => {
    let providerId: string;

    beforeEach(() => {
      providerId = registry.registerProvider('test-module', {
        name: 'Test Provider',
        provideContext: () => ({ test: true }),
      });
    });

    it('should unregister a provider', () => {
      const result = registry.unregisterProvider(providerId, 'test-module');

      expect(result).toBe(true);
      const providers = registry.getAllProviders();
      expect(providers.find(p => p.id === providerId)).toBeUndefined();
    });

    it('should emit hook when provider is unregistered', () => {
      mockHooks.callAll.mockClear();
      registry.unregisterProvider(providerId, 'test-module');

      expect(mockHooks.callAll).toHaveBeenCalledWith('seasons-stars:contextProviderUnregistered', {
        id: providerId,
        moduleId: 'test-module',
        provider: expect.any(Object),
      });
    });

    it('should prevent unauthorized unregistration', () => {
      const result = registry.unregisterProvider(providerId, 'different-module');

      expect(result).toBe(false);
      const providers = registry.getAllProviders();
      expect(providers.find(p => p.id === providerId)).toBeDefined();
    });

    it('should return false for non-existent provider', () => {
      const result = registry.unregisterProvider('nonexistent', 'test-module');
      expect(result).toBe(false);
    });
  });

  describe('Context Merging', () => {
    beforeEach(() => {
      registry.registerProvider('module-a', {
        name: 'Provider A',
        priority: 40,
        supports: ['main'],
        provideContext: () => ({
          fromA: 'value-a',
          shared: 'from-a',
        }),
      });

      registry.registerProvider('module-b', {
        name: 'Provider B',
        priority: 60,
        supports: ['main'],
        provideContext: () => ({
          fromB: 'value-b',
          shared: 'from-b', // Should override Provider A
        }),
      });

      registry.registerProvider('module-c', {
        name: 'Conditional Provider',
        priority: 70,
        supports: ['main'],
        provideContext: () => ({ conditional: true }),
        shouldApply: calendar => calendar.id === 'test-calendar',
      });
    });

    it('should merge context from multiple providers in priority order', async () => {
      const baseContext = { base: 'value' };
      const mergedContext = await registry.mergeContext('main', baseContext, sampleCalendar, sampleDate);

      expect(mergedContext.base).toBe('value');
      expect(mergedContext.fromA).toBe('value-a');
      expect(mergedContext.fromB).toBe('value-b');
      expect(mergedContext.shared).toBe('from-b'); // Higher priority wins
    });

    it('should apply conditional providers based on shouldApply', async () => {
      const baseContext = {};
      const mergedContext = await registry.mergeContext('main', baseContext, sampleCalendar, sampleDate);

      expect(mergedContext.conditional).toBe(true);
    });

    it('should skip conditional providers when condition fails', async () => {
      const baseContext = {};
      const mergedContext = await registry.mergeContext('main', baseContext, sampleCalendarNoSeasons, sampleDate);

      expect(mergedContext.conditional).toBeUndefined();
    });

    it('should filter providers by widget type', async () => {
      registry.registerProvider('mini-only', {
        name: 'Mini Only Provider',
        supports: ['mini'],
        provideContext: () => ({ miniOnly: true }),
      });

      const mainContext = await registry.mergeContext('main', {}, sampleCalendar, sampleDate);
      const miniContext = await registry.mergeContext('mini', {}, sampleCalendar, sampleDate);

      expect(mainContext.miniOnly).toBeUndefined();
      expect(miniContext.miniOnly).toBe(true);
    });

    it('should handle async providers', async () => {
      registry.registerProvider('async-module', {
        name: 'Async Provider',
        supports: ['main'],
        provideContext: async () => {
          // Simulate async operation
          await new Promise(resolve => setTimeout(resolve, 1));
          return { asyncData: 'loaded' };
        },
      });

      const baseContext = {};
      const mergedContext = await registry.mergeContext('main', baseContext, sampleCalendar, sampleDate);

      expect(mergedContext.asyncData).toBe('loaded');
    });

    it('should handle provider errors gracefully', async () => {
      registry.registerProvider('error-module', {
        name: 'Error Provider',
        supports: ['main'],
        provideContext: () => {
          throw new Error('Provider error');
        },
      });

      const baseContext = { base: 'value' };
      const mergedContext = await registry.mergeContext('main', baseContext, sampleCalendar, sampleDate);

      // Should continue with other providers despite error
      expect(mergedContext.base).toBe('value');
      expect(mergedContext.fromA).toBe('value-a');
    });
  });

  describe('Module Cleanup', () => {
    beforeEach(() => {
      registry.registerProvider('cleanup-test', {
        name: 'Provider 1',
        provideContext: () => ({ test1: true }),
      });

      registry.registerProvider('cleanup-test', {
        name: 'Provider 2',
        provideContext: () => ({ test2: true }),
      });

      registry.registerProvider('other-module', {
        name: 'Other Provider',
        provideContext: () => ({ other: true }),
      });
    });

    it('should unregister all providers for a module', () => {
      registry.unregisterModuleProviders('cleanup-test');

      const providers = registry.getAllProviders();
      const testProviders = providers.filter(p => p.moduleId === 'cleanup-test');
      const otherProviders = providers.filter(p => p.moduleId === 'other-module');

      expect(testProviders).toHaveLength(0);
      expect(otherProviders).toHaveLength(1);
    });
  });

  describe('Debug Information', () => {
    beforeEach(() => {
      registry.registerProvider('debug-test', {
        name: 'Debug Provider',
        priority: 75,
        supports: ['main', 'grid'],
        provideContext: () => ({ debug: true }),
        shouldApply: () => true,
        description: 'Provider for debugging',
      });
    });

    it('should provide debug information', () => {
      const debug = registry.getDebugInfo();

      expect(debug.providerCount).toBeGreaterThan(0);
      expect(debug.providers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Debug Provider',
            moduleId: 'debug-test',
            priority: 75,
            supports: ['main', 'grid'],
            hasCondition: true,
            description: 'Provider for debugging',
          }),
        ])
      );
    });
  });
});

describe('Template Context Providers Global API', () => {
  beforeEach(() => {
    // Reset singleton for clean tests
    // @ts-expect-error - Access private static property for testing
    TemplateContextProviderRegistry.instance = null;
    mockHooks.callAll.mockClear();
  });

  it('should register provider through global API', () => {
    const providerId = templateContextProviders.register('test-module', {
      name: 'Global API Provider',
      provideContext: () => ({ global: true }),
    });

    expect(providerId).toBeTruthy();
    const providers = templateContextProviders.getProvidersFor('main');
    expect(providers.some(p => p.name === 'Global API Provider')).toBe(true);
  });

  it('should unregister provider through global API', () => {
    const providerId = templateContextProviders.register('test-module', {
      name: 'Test Provider',
      provideContext: () => ({ test: true }),
    });

    const result = templateContextProviders.unregister(providerId, 'test-module');
    expect(result).toBe(true);

    const providers = templateContextProviders.getProvidersFor('main');
    expect(providers.some(p => p.id === providerId)).toBe(false);
  });

  it('should merge context through global API', async () => {
    templateContextProviders.register('test-module', {
      name: 'API Test Provider',
      provideContext: () => ({ apiTest: 'success' }),
    });

    const sampleDate = new CalendarDate({ year: 2023, month: 1, day: 1 }, sampleCalendar);
    const baseContext = { base: 'value' };
    const mergedContext = await templateContextProviders.mergeContext(
      'main',
      baseContext,
      sampleCalendar,
      sampleDate
    );

    expect(mergedContext.apiTest).toBe('success');
    expect(mergedContext.base).toBe('value');
  });

  it('should get debug info through global API', () => {
    templateContextProviders.register('debug-module', {
      name: 'Debug Provider',
      provideContext: () => ({ debug: true }),
    });

    const debug = templateContextProviders.getDebugInfo();
    expect(debug.providerCount).toBeGreaterThan(0);
    expect(debug.providers.some(p => p.name === 'Debug Provider')).toBe(true);
  });
});