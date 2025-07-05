/**
 * Template Context Extensions System
 *
 * Allows external modules to extend or modify template context for widgets.
 * Provides a clean, safe way for modules to add custom data to widget templates.
 */

import { Logger } from './logger';
import type {
  BaseWidgetContext,
  MiniWidgetContext,
  MainWidgetContext,
  GridWidgetContext,
} from '../types/widget-types';

// Type for context extension functions
export type ContextExtensionFunction<T = Record<string, unknown>> = (
  context: T,
  widgetType: string,
  options?: Record<string, unknown>
) => T | Promise<T>;

// Type for context modification hooks
export type ContextModificationHook<T = Record<string, unknown>> = (
  context: T,
  widgetType: string,
  phase: 'before' | 'after',
  options?: Record<string, unknown>
) => T | Promise<T> | void;

// Extension registration data
interface ContextExtension {
  id: string;
  moduleId: string;
  priority: number;
  widgetTypes: string[]; // ['main', 'mini', 'grid', '*'] - '*' means all widgets
  extensionFunction: ContextExtensionFunction;
  metadata: {
    name: string;
    description?: string;
    version?: string;
    author?: string;
  };
}

// Hook registration data
interface ContextHook {
  id: string;
  moduleId: string;
  phase: 'before' | 'after';
  widgetTypes: string[];
  hookFunction: ContextModificationHook;
}

/**
 * Template Context Extensions Manager
 *
 * Central system for managing template context extensibility.
 * Provides safe, ordered execution of extensions and proper error handling.
 */
export class TemplateContextExtensions {
  private static extensions = new Map<string, ContextExtension>();
  private static hooks = new Map<string, ContextHook>();
  private static initialized = false;
  private static idCounter = 0;

  /**
   * Initialize the extensions system
   */
  static initialize(): void {
    if (this.initialized) return;

    Logger.debug('Initializing Template Context Extensions system');
    this.initialized = true;

    // Register cleanup on module destruction
    Hooks.once('destroy', () => {
      this.cleanup();
    });
  }

  /**
   * Register a context extension function
   *
   * @param extensionData Extension configuration
   * @returns Extension ID for later removal
   *
   * @example
   * ```typescript
   * // Register extension that adds weather data to all widgets
   * const extensionId = TemplateContextExtensions.registerExtension({
   *   id: 'simple-weather-widget-integration',
   *   moduleId: 'simple-weather',
   *   priority: 10,
   *   widgetTypes: ['*'], // All widgets
   *   extensionFunction: (context, widgetType) => {
   *     return {
   *       ...context,
   *       weather: {
   *         temperature: game.simpleWeather?.getCurrentTemperature() || 'Unknown',
   *         condition: game.simpleWeather?.getCurrentCondition() || 'Clear'
   *       }
   *     };
   *   },
   *   metadata: {
   *     name: 'Simple Weather Widget Integration',
   *     description: 'Adds current weather information to S&S widgets',
   *     version: '1.0.0',
   *     author: 'Simple Weather Module'
   *   }
   * });
   * ```
   */
  static registerExtension(extensionData: Omit<ContextExtension, 'id'> & { id?: string }): string {
    this.initialize();

    // Generate ID if not provided
    const id = extensionData.id || `${extensionData.moduleId}-${++this.idCounter}`;

    // Validate input
    if (!extensionData.moduleId) {
      throw new Error('Extension must have a moduleId');
    }

    if (!extensionData.extensionFunction || typeof extensionData.extensionFunction !== 'function') {
      throw new Error('Extension must have a valid extensionFunction');
    }

    if (!Array.isArray(extensionData.widgetTypes) || extensionData.widgetTypes.length === 0) {
      throw new Error('Extension must specify widgetTypes array');
    }

    // Validate widget types
    const validWidgetTypes = ['main', 'mini', 'grid', '*'];
    for (const widgetType of extensionData.widgetTypes) {
      if (!validWidgetTypes.includes(widgetType)) {
        throw new Error(
          `Invalid widget type: ${widgetType}. Valid types: ${validWidgetTypes.join(', ')}`
        );
      }
    }

    const extension: ContextExtension = {
      id,
      moduleId: extensionData.moduleId,
      priority: extensionData.priority || 50,
      widgetTypes: extensionData.widgetTypes,
      extensionFunction: extensionData.extensionFunction,
      metadata: {
        name: extensionData.metadata?.name || `Extension ${id}`,
        description: extensionData.metadata?.description,
        version: extensionData.metadata?.version,
        author: extensionData.metadata?.author,
      },
    };

    this.extensions.set(id, extension);

    Logger.debug('Registered template context extension', {
      id,
      moduleId: extension.moduleId,
      priority: extension.priority,
      widgetTypes: extension.widgetTypes,
      name: extension.metadata.name,
    });

    return id;
  }

  /**
   * Register a context modification hook
   *
   * @param hookData Hook configuration
   * @returns Hook ID for later removal
   *
   * @example
   * ```typescript
   * // Register hook that runs before context preparation
   * const hookId = TemplateContextExtensions.registerHook({
   *   id: 'my-module-pre-context',
   *   moduleId: 'my-module',
   *   phase: 'before',
   *   widgetTypes: ['main', 'grid'],
   *   hookFunction: (context, widgetType, phase) => {
   *     Logger.debug(`Context preparation starting for ${widgetType} widget`);
   *     // Modify context in-place or return modified context
   *     if (context.calendar) {
   *       context.customFlag = true;
   *     }
   *   }
   * });
   * ```
   */
  static registerHook(hookData: Omit<ContextHook, 'id'> & { id?: string }): string {
    this.initialize();

    const id = hookData.id || `${hookData.moduleId}-hook-${++this.idCounter}`;

    // Validate input
    if (!hookData.moduleId) {
      throw new Error('Hook must have a moduleId');
    }

    if (!hookData.hookFunction || typeof hookData.hookFunction !== 'function') {
      throw new Error('Hook must have a valid hookFunction');
    }

    if (!['before', 'after'].includes(hookData.phase)) {
      throw new Error('Hook phase must be "before" or "after"');
    }

    const hook: ContextHook = {
      id,
      moduleId: hookData.moduleId,
      phase: hookData.phase,
      widgetTypes: hookData.widgetTypes || ['*'],
      hookFunction: hookData.hookFunction,
    };

    this.hooks.set(id, hook);

    Logger.debug('Registered template context hook', {
      id,
      moduleId: hook.moduleId,
      phase: hook.phase,
      widgetTypes: hook.widgetTypes,
    });

    return id;
  }

  /**
   * Unregister an extension by ID
   */
  static unregisterExtension(extensionId: string): boolean {
    const removed = this.extensions.delete(extensionId);
    if (removed) {
      Logger.debug('Unregistered template context extension', { extensionId });
    }
    return removed;
  }

  /**
   * Unregister a hook by ID
   */
  static unregisterHook(hookId: string): boolean {
    const removed = this.hooks.delete(hookId);
    if (removed) {
      Logger.debug('Unregistered template context hook', { hookId });
    }
    return removed;
  }

  /**
   * Unregister all extensions and hooks for a specific module
   */
  static unregisterModule(moduleId: string): void {
    let removedCount = 0;

    // Remove extensions
    for (const [id, extension] of this.extensions.entries()) {
      if (extension.moduleId === moduleId) {
        this.extensions.delete(id);
        removedCount++;
      }
    }

    // Remove hooks
    for (const [id, hook] of this.hooks.entries()) {
      if (hook.moduleId === moduleId) {
        this.hooks.delete(id);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      Logger.debug('Unregistered all template context extensions/hooks for module', {
        moduleId,
        removedCount,
      });
    }
  }

  /**
   * Process template context through all applicable extensions and hooks
   *
   * @param context Initial context object
   * @param widgetType Widget type ('main', 'mini', 'grid')
   * @param options Optional processing options
   * @returns Extended context
   */
  static async processContext<T extends Record<string, unknown>>(
    context: T,
    widgetType: string,
    options?: Record<string, unknown>
  ): Promise<T> {
    if (!this.initialized) {
      this.initialize();
    }

    let processedContext = { ...context };

    try {
      // Phase 1: Run 'before' hooks
      processedContext = await this.runHooks(processedContext, widgetType, 'before', options);

      // Phase 2: Apply extensions in priority order
      processedContext = await this.applyExtensions(processedContext, widgetType, options);

      // Phase 3: Run 'after' hooks
      processedContext = await this.runHooks(processedContext, widgetType, 'after', options);

      Logger.debug('Template context processing complete', {
        widgetType,
        extensionsApplied: this.getApplicableExtensions(widgetType).length,
        hooksRun: this.getApplicableHooks(widgetType).length,
      });

      return processedContext;
    } catch (error) {
      Logger.error(
        'Failed to process template context extensions',
        error instanceof Error ? error : new Error(String(error))
      );

      // Return original context on error to prevent breaking widgets
      return context;
    }
  }

  /**
   * Run hooks for a specific phase
   */
  private static async runHooks<T extends Record<string, unknown>>(
    context: T,
    widgetType: string,
    phase: 'before' | 'after',
    options?: Record<string, unknown>
  ): Promise<T> {
    const applicableHooks = Array.from(this.hooks.values())
      .filter(hook => hook.phase === phase)
      .filter(hook => this.isWidgetTypeApplicable(hook.widgetTypes, widgetType));

    let processedContext = context;

    for (const hook of applicableHooks) {
      try {
        const result = await hook.hookFunction(processedContext, widgetType, phase, options);

        // If hook returns a value, use it as the new context
        if (result !== undefined && result !== null) {
          processedContext = result as T;
        }
      } catch (error) {
        Logger.error(
          `Failed to execute context hook ${hook.id} from module ${hook.moduleId}`,
          error instanceof Error ? error : new Error(String(error))
        );

        // Continue with other hooks even if one fails
        continue;
      }
    }

    return processedContext;
  }

  /**
   * Apply extensions in priority order
   */
  private static async applyExtensions<T extends Record<string, unknown>>(
    context: T,
    widgetType: string,
    options?: Record<string, unknown>
  ): Promise<T> {
    const applicableExtensions = this.getApplicableExtensions(widgetType);

    let processedContext = context;

    for (const extension of applicableExtensions) {
      try {
        const result = await extension.extensionFunction(processedContext, widgetType, options);

        if (result && typeof result === 'object') {
          processedContext = result as T;
        }
      } catch (error) {
        Logger.error(
          `Failed to execute context extension ${extension.id} from module ${extension.moduleId}`,
          error instanceof Error ? error : new Error(String(error))
        );

        // Continue with other extensions even if one fails
        continue;
      }
    }

    return processedContext;
  }

  /**
   * Get applicable extensions for a widget type, sorted by priority
   */
  private static getApplicableExtensions(widgetType: string): ContextExtension[] {
    return Array.from(this.extensions.values())
      .filter(extension => this.isWidgetTypeApplicable(extension.widgetTypes, widgetType))
      .sort((a, b) => a.priority - b.priority); // Lower priority numbers execute first
  }

  /**
   * Get applicable hooks for a widget type
   */
  private static getApplicableHooks(widgetType: string): ContextHook[] {
    return Array.from(this.hooks.values()).filter(hook =>
      this.isWidgetTypeApplicable(hook.widgetTypes, widgetType)
    );
  }

  /**
   * Check if extension/hook applies to a specific widget type
   */
  private static isWidgetTypeApplicable(widgetTypes: string[], targetWidgetType: string): boolean {
    return widgetTypes.includes('*') || widgetTypes.includes(targetWidgetType);
  }

  /**
   * Get information about registered extensions
   */
  static getRegisteredExtensions(): Array<{
    id: string;
    moduleId: string;
    priority: number;
    widgetTypes: string[];
    metadata: ContextExtension['metadata'];
  }> {
    return Array.from(this.extensions.values()).map(ext => ({
      id: ext.id,
      moduleId: ext.moduleId,
      priority: ext.priority,
      widgetTypes: ext.widgetTypes,
      metadata: ext.metadata,
    }));
  }

  /**
   * Get information about registered hooks
   */
  static getRegisteredHooks(): Array<{
    id: string;
    moduleId: string;
    phase: 'before' | 'after';
    widgetTypes: string[];
  }> {
    return Array.from(this.hooks.values()).map(hook => ({
      id: hook.id,
      moduleId: hook.moduleId,
      phase: hook.phase,
      widgetTypes: hook.widgetTypes,
    }));
  }

  /**
   * Cleanup all extensions and hooks
   */
  private static cleanup(): void {
    this.extensions.clear();
    this.hooks.clear();
    this.initialized = false;
    this.idCounter = 0;
    Logger.debug('Template Context Extensions system cleaned up');
  }

  /**
   * Create a scoped API for a specific module
   *
   * This provides a convenient way for modules to register extensions
   * and automatically clean them up when the module is disabled.
   */
  static createModuleAPI(moduleId: string) {
    return {
      /**
       * Register an extension for this module
       */
      registerExtension: (
        extensionData: Omit<ContextExtension, 'id' | 'moduleId'> & { id?: string }
      ): string => {
        return this.registerExtension({
          ...extensionData,
          moduleId,
        });
      },

      /**
       * Register a hook for this module
       */
      registerHook: (hookData: Omit<ContextHook, 'id' | 'moduleId'> & { id?: string }): string => {
        return this.registerHook({
          ...hookData,
          moduleId,
        });
      },

      /**
       * Unregister a specific extension
       */
      unregisterExtension: (extensionId: string): boolean => {
        return this.unregisterExtension(extensionId);
      },

      /**
       * Unregister a specific hook
       */
      unregisterHook: (hookId: string): boolean => {
        return this.unregisterHook(hookId);
      },

      /**
       * Unregister all extensions and hooks for this module
       */
      cleanup: (): void => {
        this.unregisterModule(moduleId);
      },
    };
  }
}

// Convenience exports for common widget context types
export type { BaseWidgetContext, MiniWidgetContext, MainWidgetContext, GridWidgetContext };
