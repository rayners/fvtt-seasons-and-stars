/**
 * Calendar Widget Manager
 *
 * Centralized widget management to break circular dependencies between widget classes.
 * Each widget type can be managed independently without direct references to other widgets.
 */

import { Logger } from '../core/logger';

export type WidgetType = 'main' | 'mini' | 'grid';

export interface WidgetInstance {
  show(): Promise<void>;
  hide(): Promise<void>;
  toggle(): Promise<void>;
  getInstance(): any;
  isVisible(): boolean;
}

/**
 * Central manager for all calendar widgets
 * Eliminates the need for widgets to directly import each other
 */
export class CalendarWidgetManager {
  private static instances: Map<WidgetType, WidgetInstance> = new Map();
  private static factories: Map<WidgetType, () => WidgetInstance> = new Map();

  /**
   * Register a widget factory function
   */
  static registerWidget(type: WidgetType, factory: () => WidgetInstance): void {
    this.factories.set(type, factory);
    Logger.debug(`Registered widget factory for ${type}`);
  }

  /**
   * Get or create a widget instance
   */
  static getWidget(type: WidgetType): WidgetInstance | null {
    let instance = this.instances.get(type);

    if (!instance) {
      const factory = this.factories.get(type);
      if (factory) {
        try {
          instance = factory();
          this.instances.set(type, instance);
          Logger.debug(`Created widget instance for ${type}`);
        } catch (error) {
          Logger.error(
            `Failed to create widget ${type}:`,
            error instanceof Error ? error : new Error(String(error))
          );
          return null;
        }
      } else {
        Logger.warn(`No factory registered for widget type: ${type}`);
        return null;
      }
    }

    return instance;
  }

  /**
   * Show a specific widget type
   */
  static async showWidget(type: WidgetType): Promise<void> {
    const widget = this.getWidget(type);
    if (widget) {
      try {
        await widget.show();
        Logger.debug(`Showed widget: ${type}`);
      } catch (error) {
        Logger.error(
          `Failed to show widget ${type}:`,
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }
  }

  /**
   * Hide a specific widget type
   */
  static async hideWidget(type: WidgetType): Promise<void> {
    const widget = this.getWidget(type);
    if (widget) {
      try {
        await widget.hide();
        Logger.debug(`Hid widget: ${type}`);
      } catch (error) {
        Logger.error(
          `Failed to hide widget ${type}:`,
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }
  }

  /**
   * Toggle a specific widget type
   */
  static async toggleWidget(type: WidgetType): Promise<void> {
    const widget = this.getWidget(type);
    if (widget) {
      try {
        await widget.toggle();
        Logger.debug(`Toggled widget: ${type}`);
      } catch (error) {
        Logger.error(
          `Failed to toggle widget ${type}:`,
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }
  }

  /**
   * Switch to a specific widget type, hiding others
   */
  static async switchToWidget(type: WidgetType, hideOthers: boolean = false): Promise<void> {
    if (hideOthers) {
      // Hide all other widgets first
      for (const [otherType] of this.instances) {
        if (otherType !== type) {
          await this.hideWidget(otherType);
        }
      }
    }

    await this.showWidget(type);
  }

  /**
   * Check if a widget is visible
   */
  static isWidgetVisible(type: WidgetType): boolean {
    const widget = this.getWidget(type);
    return widget ? widget.isVisible() : false;
  }

  /**
   * Get the actual widget instance for direct access
   */
  static getWidgetInstance(type: WidgetType): any {
    const widget = this.getWidget(type);
    return widget ? widget.getInstance() : null;
  }

  /**
   * Hide all widgets
   */
  static async hideAllWidgets(): Promise<void> {
    const hidePromises = Array.from(this.instances.keys()).map(type => this.hideWidget(type));
    await Promise.all(hidePromises);
    Logger.debug('Hid all widgets');
  }

  /**
   * Get list of currently visible widgets
   */
  static getVisibleWidgets(): WidgetType[] {
    const visible: WidgetType[] = [];
    for (const [type] of this.instances) {
      if (this.isWidgetVisible(type)) {
        visible.push(type);
      }
    }
    return visible;
  }

  /**
   * Clear all widget instances (useful for cleanup)
   */
  static clearInstances(): void {
    this.instances.clear();
    Logger.debug('Cleared all widget instances');
  }

  /**
   * Get registered widget types
   */
  static getRegisteredTypes(): WidgetType[] {
    return Array.from(this.factories.keys());
  }
}

/**
 * Widget wrapper class to make any widget compatible with the manager
 */
export class WidgetWrapper implements WidgetInstance {
  constructor(
    private widget: any,
    private showMethod: string = 'render',
    private hideMethod: string = 'close',
    private toggleMethod: string = 'toggle',
    private getInstanceMethod: string = 'getInstance',
    private isVisibleProperty: string = 'rendered'
  ) {}

  async show(): Promise<void> {
    if (this.widget && typeof this.widget[this.showMethod] === 'function') {
      await this.widget[this.showMethod]();
    }
  }

  async hide(): Promise<void> {
    if (this.widget && typeof this.widget[this.hideMethod] === 'function') {
      await this.widget[this.hideMethod]();
    }
  }

  async toggle(): Promise<void> {
    if (this.widget && typeof this.widget[this.toggleMethod] === 'function') {
      await this.widget[this.toggleMethod]();
    } else {
      // Fallback toggle implementation
      if (this.isVisible()) {
        await this.hide();
      } else {
        await this.show();
      }
    }
  }

  getInstance(): any {
    if (this.widget && typeof this.widget[this.getInstanceMethod] === 'function') {
      return this.widget[this.getInstanceMethod]();
    }
    return this.widget;
  }

  isVisible(): boolean {
    if (this.widget && this.isVisibleProperty in this.widget) {
      return Boolean(this.widget[this.isVisibleProperty]);
    }
    return false;
  }
}
