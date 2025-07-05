/**
 * Template Context Extensions Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TemplateContextExtensions } from '../src/core/template-context-extensions';

describe('Template Context Extensions', () => {
  beforeEach(() => {
    // Clean up before each test
    (TemplateContextExtensions as any).extensions.clear();
    (TemplateContextExtensions as any).hooks.clear();
    (TemplateContextExtensions as any).initialized = false;
    (TemplateContextExtensions as any).idCounter = 0;
  });

  afterEach(() => {
    // Clean up after each test
    (TemplateContextExtensions as any).extensions.clear();
    (TemplateContextExtensions as any).hooks.clear();
    (TemplateContextExtensions as any).initialized = false;
    (TemplateContextExtensions as any).idCounter = 0;
  });

  describe('Extension Registration', () => {
    it('should register an extension successfully', () => {
      const extensionId = TemplateContextExtensions.registerExtension({
        moduleId: 'test-module',
        priority: 10,
        widgetTypes: ['*'],
        extensionFunction: context => ({ ...context, test: true }),
        metadata: {
          name: 'Test Extension',
          description: 'A test extension',
        },
      });

      expect(extensionId).toBeDefined();
      expect(typeof extensionId).toBe('string');

      const registered = TemplateContextExtensions.getRegisteredExtensions();
      expect(registered).toHaveLength(1);
      expect(registered[0].moduleId).toBe('test-module');
      expect(registered[0].metadata.name).toBe('Test Extension');
    });

    it('should validate extension parameters', () => {
      expect(() => {
        TemplateContextExtensions.registerExtension({
          moduleId: '',
          priority: 10,
          widgetTypes: ['*'],
          extensionFunction: context => context,
          metadata: { name: 'Test' },
        });
      }).toThrow('Extension must have a moduleId');

      expect(() => {
        TemplateContextExtensions.registerExtension({
          moduleId: 'test',
          priority: 10,
          widgetTypes: ['invalid'] as any,
          extensionFunction: context => context,
          metadata: { name: 'Test' },
        });
      }).toThrow('Invalid widget type: invalid');
    });

    it('should support all valid widget types', () => {
      const validTypes = ['main', 'mini', 'grid', '*'];

      validTypes.forEach(type => {
        expect(() => {
          TemplateContextExtensions.registerExtension({
            moduleId: 'test',
            priority: 10,
            widgetTypes: [type],
            extensionFunction: context => context,
            metadata: { name: 'Test' },
          });
        }).not.toThrow();
      });
    });
  });

  describe('Hook Registration', () => {
    it('should register hooks successfully', () => {
      const hookId = TemplateContextExtensions.registerHook({
        moduleId: 'test-module',
        phase: 'before',
        widgetTypes: ['main'],
        hookFunction: context => context,
      });

      expect(hookId).toBeDefined();
      expect(typeof hookId).toBe('string');

      const registered = TemplateContextExtensions.getRegisteredHooks();
      expect(registered).toHaveLength(1);
      expect(registered[0].phase).toBe('before');
      expect(registered[0].widgetTypes).toEqual(['main']);
    });

    it('should validate hook phases', () => {
      expect(() => {
        TemplateContextExtensions.registerHook({
          moduleId: 'test',
          phase: 'invalid' as any,
          hookFunction: context => context,
        });
      }).toThrow('Hook phase must be "before" or "after"');
    });
  });

  describe('Context Processing', () => {
    it('should process context through extensions', async () => {
      // Register an extension that adds weather data
      TemplateContextExtensions.registerExtension({
        moduleId: 'weather-module',
        priority: 10,
        widgetTypes: ['*'],
        extensionFunction: context => ({
          ...context,
          weather: {
            temperature: 72,
            condition: 'sunny',
          },
        }),
        metadata: { name: 'Weather Extension' },
      });

      const originalContext = {
        calendar: { id: 'test' },
        currentDate: { year: 2024, month: 1, day: 1 },
        isGM: true,
      };

      const processedContext = await TemplateContextExtensions.processContext(
        originalContext,
        'main'
      );

      expect(processedContext).toHaveProperty('weather');
      expect(processedContext.weather).toEqual({
        temperature: 72,
        condition: 'sunny',
      });
      expect(processedContext.calendar).toEqual({ id: 'test' });
    });

    it('should execute extensions in priority order', async () => {
      const executionOrder: number[] = [];

      // Register extensions with different priorities
      TemplateContextExtensions.registerExtension({
        moduleId: 'module-1',
        priority: 20,
        widgetTypes: ['*'],
        extensionFunction: context => {
          executionOrder.push(20);
          return { ...context, second: true };
        },
        metadata: { name: 'Second Extension' },
      });

      TemplateContextExtensions.registerExtension({
        moduleId: 'module-2',
        priority: 10,
        widgetTypes: ['*'],
        extensionFunction: context => {
          executionOrder.push(10);
          return { ...context, first: true };
        },
        metadata: { name: 'First Extension' },
      });

      TemplateContextExtensions.registerExtension({
        moduleId: 'module-3',
        priority: 30,
        widgetTypes: ['*'],
        extensionFunction: context => {
          executionOrder.push(30);
          return { ...context, third: true };
        },
        metadata: { name: 'Third Extension' },
      });

      const originalContext = { base: true };
      const processedContext = await TemplateContextExtensions.processContext(
        originalContext,
        'main'
      );

      expect(executionOrder).toEqual([10, 20, 30]);
      expect(processedContext).toHaveProperty('first', true);
      expect(processedContext).toHaveProperty('second', true);
      expect(processedContext).toHaveProperty('third', true);
    });

    it('should run hooks before and after extensions', async () => {
      const executionOrder: string[] = [];

      // Register before hook
      const beforeId = TemplateContextExtensions.registerHook({
        moduleId: 'test',
        phase: 'before',
        widgetTypes: ['*'],
        hookFunction: context => {
          executionOrder.push('before-hook');
          return { ...context, beforeHook: true };
        },
      });

      // Register extension
      const extensionId = TemplateContextExtensions.registerExtension({
        moduleId: 'test',
        priority: 10,
        widgetTypes: ['*'],
        extensionFunction: context => {
          executionOrder.push('extension');
          return { ...context, extension: true };
        },
        metadata: { name: 'Test Extension' },
      });

      // Register after hook
      const afterId = TemplateContextExtensions.registerHook({
        moduleId: 'test',
        phase: 'after',
        widgetTypes: ['*'],
        hookFunction: context => {
          executionOrder.push('after-hook');
          return { ...context, afterHook: true };
        },
      });

      // Verify registration
      const registeredHooks = TemplateContextExtensions.getRegisteredHooks();
      const registeredExtensions = TemplateContextExtensions.getRegisteredExtensions();

      expect(registeredHooks).toHaveLength(2);
      expect(registeredExtensions).toHaveLength(1);

      const originalContext = { base: true };
      const processedContext = await TemplateContextExtensions.processContext(
        originalContext,
        'main'
      );

      expect(executionOrder).toEqual(['before-hook', 'extension', 'after-hook']);
      expect(processedContext).toHaveProperty('beforeHook', true);
      expect(processedContext).toHaveProperty('extension', true);
      expect(processedContext).toHaveProperty('afterHook', true);
    });

    it('should filter extensions by widget type', async () => {
      // Extension for all widgets
      TemplateContextExtensions.registerExtension({
        moduleId: 'universal',
        priority: 10,
        widgetTypes: ['*'],
        extensionFunction: context => ({ ...context, universal: true }),
        metadata: { name: 'Universal' },
      });

      // Extension only for main widget
      TemplateContextExtensions.registerExtension({
        moduleId: 'main-only',
        priority: 10,
        widgetTypes: ['main'],
        extensionFunction: context => ({ ...context, mainOnly: true }),
        metadata: { name: 'Main Only' },
      });

      // Extension only for mini widget
      TemplateContextExtensions.registerExtension({
        moduleId: 'mini-only',
        priority: 10,
        widgetTypes: ['mini'],
        extensionFunction: context => ({ ...context, miniOnly: true }),
        metadata: { name: 'Mini Only' },
      });

      const originalContext = { base: true };

      // Test main widget
      const mainContext = await TemplateContextExtensions.processContext(originalContext, 'main');
      expect(mainContext).toHaveProperty('universal', true);
      expect(mainContext).toHaveProperty('mainOnly', true);
      expect(mainContext).not.toHaveProperty('miniOnly');

      // Test mini widget
      const miniContext = await TemplateContextExtensions.processContext(originalContext, 'mini');
      expect(miniContext).toHaveProperty('universal', true);
      expect(miniContext).not.toHaveProperty('mainOnly');
      expect(miniContext).toHaveProperty('miniOnly', true);
    });

    it('should handle errors gracefully', async () => {
      // Register a failing extension
      TemplateContextExtensions.registerExtension({
        moduleId: 'failing',
        priority: 10,
        widgetTypes: ['*'],
        extensionFunction: () => {
          throw new Error('Extension failed!');
        },
        metadata: { name: 'Failing Extension' },
      });

      // Register a working extension
      TemplateContextExtensions.registerExtension({
        moduleId: 'working',
        priority: 20,
        widgetTypes: ['*'],
        extensionFunction: context => ({ ...context, working: true }),
        metadata: { name: 'Working Extension' },
      });

      const originalContext = { base: true };
      const processedContext = await TemplateContextExtensions.processContext(
        originalContext,
        'main'
      );

      // Should return original context when all extensions fail
      expect(processedContext).toHaveProperty('base', true);
      // Working extension should still run
      expect(processedContext).toHaveProperty('working', true);
    });
  });

  describe('Module API', () => {
    it('should create scoped module APIs', () => {
      const api = TemplateContextExtensions.createModuleAPI('test-module');

      expect(api).toHaveProperty('registerExtension');
      expect(api).toHaveProperty('registerHook');
      expect(api).toHaveProperty('cleanup');
      expect(typeof api.registerExtension).toBe('function');
      expect(typeof api.registerHook).toBe('function');
      expect(typeof api.cleanup).toBe('function');
    });

    it('should auto-assign module ID in scoped APIs', () => {
      const api = TemplateContextExtensions.createModuleAPI('test-module');

      const extensionId = api.registerExtension({
        priority: 10,
        widgetTypes: ['*'],
        extensionFunction: context => context,
        metadata: { name: 'Test' },
      });

      const registered = TemplateContextExtensions.getRegisteredExtensions();
      expect(registered).toHaveLength(1);
      expect(registered[0].moduleId).toBe('test-module');
    });

    it('should allow module cleanup', () => {
      const api = TemplateContextExtensions.createModuleAPI('test-module');

      // Register multiple items
      api.registerExtension({
        priority: 10,
        widgetTypes: ['*'],
        extensionFunction: context => context,
        metadata: { name: 'Test Extension' },
      });

      api.registerHook({
        phase: 'before',
        hookFunction: context => context,
      });

      // Verify they're registered
      expect(TemplateContextExtensions.getRegisteredExtensions()).toHaveLength(1);
      expect(TemplateContextExtensions.getRegisteredHooks()).toHaveLength(1);

      // Clean up
      api.cleanup();

      // Verify they're removed
      expect(TemplateContextExtensions.getRegisteredExtensions()).toHaveLength(0);
      expect(TemplateContextExtensions.getRegisteredHooks()).toHaveLength(0);
    });
  });

  describe('Async Extensions', () => {
    it('should handle async extensions', async () => {
      TemplateContextExtensions.registerExtension({
        moduleId: 'async-module',
        priority: 10,
        widgetTypes: ['*'],
        extensionFunction: async context => {
          // Simulate async operation
          await new Promise(resolve => setTimeout(resolve, 10));
          return {
            ...context,
            asyncData: 'loaded',
          };
        },
        metadata: { name: 'Async Extension' },
      });

      const originalContext = { base: true };
      const processedContext = await TemplateContextExtensions.processContext(
        originalContext,
        'main'
      );

      expect(processedContext).toHaveProperty('asyncData', 'loaded');
    });
  });
});
