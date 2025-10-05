/**
 * Centralized sidebar button registry
 *
 * Maintains a registry of sidebar buttons that should be added to widgets.
 * Supports targeting specific widgets or excluding certain widgets.
 *
 * ## Availability and Timing
 *
 * The registry is exposed to external modules during Seasons & Stars' `setup` hook via:
 * - `game.seasonsStars.buttonRegistry` - Available starting in the `ready` hook
 * - `window.SeasonsStars.buttonRegistry` - Available starting in the `ready` hook
 *
 * **Recommended Registration Timing:**
 * - **Register during `ready` hook**: This is the safest and recommended approach. The registry
 *   is guaranteed to be available, and widgets will be rendering soon after.
 * - **Dynamic registration**: Buttons can be registered at any time after `ready` and will
 *   trigger widget updates via the `seasons-stars:widgetButtonsChanged` hook.
 *
 * ⚠️ **Hook Order Dependency**: Although the registry is exposed during the `setup` hook,
 * external modules should NOT attempt to access it during their own `setup` hooks because
 * Foundry does not guarantee hook execution order. Always wait until `ready`.
 *
 * @example Registering during ready (recommended)
 * ```typescript
 * Hooks.once('ready', () => {
 *   const registry = game.seasonsStars?.buttonRegistry;
 *   if (registry) {
 *     registry.register({
 *       name: 'my-module-button',
 *       icon: 'fas fa-cog',
 *       tooltip: 'My Module Settings',
 *       callback: () => {
 *         new MyModuleSettings().render(true);
 *       }
 *     });
 *   }
 * });
 * ```
 *
 * @example Dynamic registration at runtime
 * ```typescript
 * // Buttons can be registered dynamically after ready
 * function addWeatherButton() {
 *   const registry = game.seasonsStars?.buttonRegistry;
 *   if (registry) {
 *     registry.register({
 *       name: 'weather-panel',
 *       icon: 'fas fa-cloud',
 *       tooltip: 'Weather Panel',
 *       callback: () => weatherPanel.render(true)
 *     });
 *   }
 * }
 * ```
 */

import { Logger } from '../core/logger';
import type { SidebarButtonConfig, WidgetType } from '../types/widget-types';

export class SidebarButtonRegistry {
  private static instance: SidebarButtonRegistry | null = null;
  private buttons: Map<string, SidebarButtonConfig> = new Map();

  private constructor() {}

  static getInstance(): SidebarButtonRegistry {
    if (!SidebarButtonRegistry.instance) {
      SidebarButtonRegistry.instance = new SidebarButtonRegistry();
    }
    return SidebarButtonRegistry.instance;
  }

  /**
   * Register a sidebar button
   *
   * @param config - Button configuration including name, icon, tooltip, and callback
   *
   * @remarks
   * **Duplicate Handling**: If a button with the same name is already registered,
   * this method will silently ignore the duplicate registration. This prevents
   * accidental overwrites but means you cannot update a button configuration after
   * initial registration. To update a button, you must first `unregister()` it,
   * then register the new configuration.
   *
   * @example
   * ```typescript
   * // First registration succeeds
   * registry.register({
   *   name: 'my-button',
   *   icon: 'fas fa-star',
   *   tooltip: 'Click me',
   *   callback: () => console.log('clicked')
   * });
   *
   * // Duplicate registration is ignored (no error, no update)
   * registry.register({
   *   name: 'my-button',
   *   icon: 'fas fa-heart',  // This won't replace the star icon
   *   tooltip: 'Different tooltip',
   *   callback: () => console.log('different')
   * });
   *
   * // To update, unregister first
   * registry.unregister('my-button');
   * registry.register({ name: 'my-button', ... });
   * ```
   */
  register(config: SidebarButtonConfig): void {
    if (this.buttons.has(config.name)) {
      Logger.warn(
        `Sidebar button "${config.name}" is already registered. ` +
          `Duplicate registration ignored. To update a button, unregister it first.`
      );
      return;
    }

    // Validate that only and except are not both specified
    if (config.only && config.except) {
      Logger.warn(
        `Sidebar button "${config.name}" specifies both "only" and "except" filters. ` +
          `This is likely a configuration error. When both filters are present, "only" ` +
          `takes precedence and "except" is ignored.`
      );
    }

    this.buttons.set(config.name, config);
    Logger.debug(`Registered sidebar button "${config.name}" in global registry`);

    this.callHook('seasons-stars:widgetButtonRegistered', { config, registry: this });
    this.callHook('seasons-stars:widgetButtonsChanged', {
      action: 'registered',
      buttonName: config.name,
    });
  }

  /**
   * Update an existing sidebar button configuration
   *
   * This method allows updating a button's configuration without triggering
   * unregister/register hook pairs. Use this when merging or modifying button
   * properties to reduce hook emission overhead.
   *
   * @param config - Updated button configuration (must have matching name)
   * @returns true if button was updated, false if button doesn't exist
   */
  update(config: SidebarButtonConfig): boolean {
    if (!this.buttons.has(config.name)) {
      return false;
    }

    this.buttons.set(config.name, config);
    Logger.debug(`Updated sidebar button "${config.name}" in global registry`);

    this.callHook('seasons-stars:widgetButtonsChanged', {
      action: 'updated',
      buttonName: config.name,
    });

    return true;
  }

  /**
   * Unregister a sidebar button
   */
  unregister(name: string): void {
    if (this.buttons.delete(name)) {
      Logger.debug(`Unregistered sidebar button "${name}" from global registry`);
      this.callHook('seasons-stars:widgetButtonUnregistered', { buttonName: name, registry: this });
      this.callHook('seasons-stars:widgetButtonsChanged', {
        action: 'unregistered',
        buttonName: name,
      });
    }
  }

  /**
   * Check if a button is registered
   */
  has(name: string): boolean {
    return this.buttons.has(name);
  }

  /**
   * Get a specific button configuration
   */
  get(name: string): SidebarButtonConfig | undefined {
    return this.buttons.get(name);
  }

  /**
   * Get all registered buttons for a specific widget type
   *
   * **Filter Precedence**: When a button specifies both `only` and `except` filters
   * (which is a configuration error), the `only` filter takes precedence and `except`
   * is ignored.
   *
   * @param widgetType - The widget type to filter for ('main', 'mini', or 'grid')
   * @returns Array of button configs that should appear on this widget type
   */
  getForWidget(widgetType: WidgetType): SidebarButtonConfig[] {
    return Array.from(this.buttons.values()).filter(button => {
      // If 'only' is specified, widget must be in the list
      if (button.only && !button.only.includes(widgetType)) {
        return false;
      }

      // If 'except' is specified, widget must NOT be in the list
      if (button.except && button.except.includes(widgetType)) {
        return false;
      }

      return true;
    });
  }

  /**
   * Get all registered buttons (regardless of widget targeting)
   */
  getAll(): SidebarButtonConfig[] {
    return Array.from(this.buttons.values());
  }

  /**
   * Clear all registered buttons
   */
  clear(): void {
    this.buttons.clear();
    Logger.debug('Cleared all sidebar buttons from global registry');

    this.callHook('seasons-stars:widgetButtonsChanged', {
      action: 'cleared',
    });
  }

  /**
   * Get count of registered buttons
   */
  get count(): number {
    return this.buttons.size;
  }

  private callHook(event: string, payload: Record<string, unknown>): void {
    const hooks = (globalThis as any).Hooks;
    if (!hooks || typeof hooks.callAll !== 'function') {
      return;
    }

    try {
      hooks.callAll(event, payload);
    } catch (error) {
      Logger.warn(`Failed to emit hook "${event}"`, error as Error);
    }
  }
}
