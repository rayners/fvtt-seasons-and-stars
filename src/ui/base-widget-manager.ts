/**
 * Base widget manager to handle common widget patterns
 * Eliminates repeated code across calendar widgets
 */

import { Logger } from '../core/logger';
import type { SidebarButton } from '../types/widget-types';

/**
 * Base widget instance management (without generics for static compatibility)
 */
export class WidgetInstanceManager {
  protected static activeInstance: unknown = null;

  /**
   * Get the active instance of this widget
   */
  static getInstance(): unknown {
    return this.activeInstance;
  }

  /**
   * Show the widget
   */
  static show(): void {
    if (this.activeInstance) {
      if (!(this.activeInstance as any).rendered) {
        (this.activeInstance as any).render(true);
      } else {
        (this.activeInstance as any).bringToTop();
      }
    } else {
      this.activeInstance = new (this as any)();
      (this.activeInstance as any).render(true);
    }
  }

  /**
   * Hide the widget
   */
  static hide(): void {
    if ((this.activeInstance as any)?.rendered) {
      (this.activeInstance as any).close();
    }
  }

  /**
   * Toggle the widget visibility
   */
  static toggle(): void {
    if ((this.activeInstance as any)?.rendered) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Register hooks for automatic updates
   */
  static registerHooks(): void {
    // Use arrow function to maintain proper 'this' context
    Hooks.on('seasons-stars:dateChanged', () => {
      const instance = this.activeInstance as unknown;
      if (instance && (instance as any)?.rendered) {
        (instance as any).render();
      }
    });

    Hooks.on('seasons-stars:calendarChanged', () => {
      const instance = this.activeInstance as unknown;
      if (instance && (instance as any)?.rendered) {
        (instance as any).render();
      }
    });
  }
}

/**
 * Sidebar button management utility
 */
export class SidebarButtonManager {
  private sidebarButtons: SidebarButton[] = [];

  /**
   * Add a sidebar button
   */
  addSidebarButton(name: string, icon: string, tooltip: string, callback: Function): void {
    // Check if button already exists
    const existingButton = this.sidebarButtons.find(btn => btn.name === name);
    if (existingButton) {
      Logger.debug(`Button "${name}" already exists in widget`);
      return;
    }

    // Store the button
    this.sidebarButtons.push({ name, icon, tooltip, callback });
    Logger.debug(`Added sidebar button "${name}"`);

    // Trigger re-render if widget is already rendered
    if ((this as unknown as { rendered: boolean }).rendered) {
      (this as unknown as { render: () => void }).render();
    }
  }

  /**
   * Remove a sidebar button
   */
  removeSidebarButton(name: string): void {
    const index = this.sidebarButtons.findIndex(btn => btn.name === name);
    if (index !== -1) {
      this.sidebarButtons.splice(index, 1);
      Logger.debug(`Removed sidebar button "${name}"`);

      // Trigger re-render if widget is already rendered
      if ((this as unknown as { rendered: boolean }).rendered) {
        (this as unknown as { render: () => void }).render();
      }
    }
  }

  /**
   * Check if a sidebar button exists
   */
  hasSidebarButton(name: string): boolean {
    return this.sidebarButtons.some(btn => btn.name === name);
  }

  /**
   * Get all sidebar buttons for template rendering
   */
  getSidebarButtons(): SidebarButton[] {
    return [...this.sidebarButtons]; // Return copy
  }

  /**
   * Clear all sidebar buttons
   */
  clearSidebarButtons(): void {
    this.sidebarButtons = [];
    Logger.debug('Cleared all sidebar buttons');

    if ((this as unknown as { rendered: boolean }).rendered) {
      (this as unknown as { render: () => void }).render();
    }
  }
}

/**
 * SmallTime integration utility
 */
export class SmallTimeUtils {
  /**
   * Check if SmallTime module is installed and active
   */
  static isSmallTimeAvailable(): boolean {
    const smallTimeModule = game.modules?.get('smalltime');
    return smallTimeModule?.active === true;
  }

  /**
   * Get SmallTime element for positioning (only if module is active)
   */
  static getSmallTimeElement(): HTMLElement | null {
    if (!this.isSmallTimeAvailable()) {
      return null;
    }

    // Only search for the element if the module is actually active
    const selectors = ['#smalltime-app', '.smalltime-app', '#timeDisplay', '#slideContainer'];

    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element) {
        Logger.debug(`SmallTime element found: ${selector}`);
        return element;
      }
    }

    Logger.debug('SmallTime module active but element not found');
    return null;
  }
}
