/**
 * Centralized sidebar button registry
 *
 * Maintains a registry of sidebar buttons that should be added to widgets.
 * Supports targeting specific widgets or excluding certain widgets.
 */

import { Logger } from '../core/logger';

export type WidgetType = 'main' | 'mini' | 'grid';

export interface SidebarButtonConfig {
  name: string;
  icon: string;
  tooltip: string;
  callback: () => void;
  only?: WidgetType[];
  except?: WidgetType[];
}

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
      Logger.debug(`Sidebar button "${config.name}" already registered, updating`);
    }

    this.buttons.set(config.name, config);
    Logger.debug(`Registered sidebar button "${config.name}" in global registry`);
  }

  /**
   * Unregister a sidebar button
   */
  unregister(name: string): void {
    if (this.buttons.delete(name)) {
      Logger.debug(`Unregistered sidebar button "${name}" from global registry`);
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
  }

  /**
   * Get count of registered buttons
   */
  get count(): number {
    return this.buttons.size;
  }
}
