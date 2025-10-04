/**
 * Centralized sidebar button registry
 *
 * Maintains a registry of sidebar buttons that should be added to widgets.
 * Supports targeting specific widgets or excluding certain widgets.
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
   */
  register(config: SidebarButtonConfig): void {
    if (this.buttons.has(config.name)) {
      Logger.debug(`Sidebar button "${config.name}" already registered, ignoring duplicate`);
      return;
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
