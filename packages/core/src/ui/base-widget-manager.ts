/**
 * Base widget manager to handle common widget patterns
 * Eliminates repeated code across calendar widgets
 */

import { Logger } from '../core/logger';
import type { SidebarButton } from '../types/widget-types';

interface RenderableWidget {
  rendered: boolean;
  render(force?: boolean): void;
  bringToTop?(): void;
  close(): void;
}

function isRenderableWidget(obj: unknown): obj is RenderableWidget {
  if (!obj || typeof obj !== 'object') return false;
  const candidate = obj as {
    rendered?: unknown;
    render?: unknown;
    close?: unknown;
  };
  return (
    typeof candidate.rendered === 'boolean' &&
    typeof candidate.render === 'function' &&
    typeof candidate.close === 'function'
  );
}

/**
 * Base widget instance management (without generics for static compatibility)
 */
export class WidgetInstanceManager {
  protected static activeInstance: RenderableWidget | null = null;

  /**
   * Get the active instance of this widget
   */
  static getInstance(): RenderableWidget | null {
    return this.activeInstance;
  }

  /**
   * Show the widget
   */
  static show(this: { new (): RenderableWidget; activeInstance: RenderableWidget | null }): void {
    if (this.activeInstance) {
      if (!this.activeInstance.rendered) {
        this.activeInstance.render(true);
      } else {
        this.activeInstance.bringToTop?.();
      }
    } else {
      this.activeInstance = new this();
      this.activeInstance.render(true);
    }
  }

  /**
   * Hide the widget
   */
  static hide(this: { activeInstance: RenderableWidget | null }): void {
    if (this.activeInstance?.rendered) {
      this.activeInstance.close();
    }
  }

  /**
   * Toggle the widget visibility
   */
  static toggle(this: { new (): RenderableWidget; activeInstance: RenderableWidget | null }): void {
    if (this.activeInstance?.rendered) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Register hooks for automatic updates
   */
  static registerHooks(this: { activeInstance: RenderableWidget | null }): void {
    // Use arrow function to maintain proper 'this' context
    Hooks.on('seasons-stars:dateChanged', () => {
      if (this.activeInstance?.rendered) {
        this.activeInstance.render();
      }
    });

    Hooks.on('seasons-stars:calendarChanged', () => {
      if (this.activeInstance?.rendered) {
        this.activeInstance.render();
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
  addSidebarButton(name: string, icon: string, tooltip: string, callback: () => void): void {
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
    if (isRenderableWidget(this) && this.rendered) {
      this.render();
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
      if (isRenderableWidget(this) && this.rendered) {
        this.render();
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

    if (isRenderableWidget(this) && this.rendered) {
      this.render();
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
