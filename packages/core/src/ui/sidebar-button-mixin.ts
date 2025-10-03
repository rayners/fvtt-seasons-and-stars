/**
 * Sidebar Button Mixin
 *
 * Provides common sidebar button management functionality for all widget types.
 * Handles both local button storage and global registry synchronization.
 */

import { Logger } from '../core/logger';
import { SidebarButtonRegistry, type SidebarButtonConfig, type WidgetType } from './sidebar-button-registry';
import type { SidebarButton } from '../types/widget-types';

export interface SidebarButtonCapable {
  sidebarButtons: SidebarButton[];
  readonly rendered: boolean;
}

export interface AddSidebarButtonOptions {
  name: string;
  icon: string;
  tooltip: string;
  callback: () => void;
  only?: WidgetType[];
  except?: WidgetType[];
}

/**
 * Add a sidebar button to a widget
 * Registers the button globally and stores it locally
 */
export function addSidebarButton(
  widget: SidebarButtonCapable,
  widgetType: WidgetType,
  options: AddSidebarButtonOptions,
  onButtonAdded?: () => void
): void {
  // Register in global registry so all widgets get this button
  const registry = SidebarButtonRegistry.getInstance();
  registry.register(options);

  // Check if this widget should have this button based on only/except rules
  const config: SidebarButtonConfig = options;
  if (config.only && !config.only.includes(widgetType)) {
    Logger.debug(`Button "${options.name}" not applicable to ${widgetType} widget (only: ${config.only.join(', ')})`);
    return;
  }
  if (config.except && config.except.includes(widgetType)) {
    Logger.debug(`Button "${options.name}" excluded from ${widgetType} widget (except: ${config.except.join(', ')})`);
    return;
  }

  // Check if button already exists locally
  const existingButton = widget.sidebarButtons.find(btn => btn.name === options.name);
  if (existingButton) {
    Logger.debug(`Button "${options.name}" already exists in ${widgetType} widget`);
    return;
  }

  // Add to local buttons array
  widget.sidebarButtons.push({
    name: options.name,
    icon: options.icon,
    tooltip: options.tooltip,
    callback: options.callback,
  });
  Logger.debug(`Added sidebar button "${options.name}" to ${widgetType} widget`);

  // Trigger callback if provided (e.g., to re-render or update DOM)
  if (onButtonAdded) {
    onButtonAdded();
  }
}

/**
 * Remove a sidebar button from a widget
 * Unregisters from global registry and removes locally
 */
export function removeSidebarButton(
  widget: SidebarButtonCapable,
  widgetType: WidgetType,
  name: string,
  onButtonRemoved?: () => void
): void {
  // Remove from global registry
  const registry = SidebarButtonRegistry.getInstance();
  registry.unregister(name);

  const index = widget.sidebarButtons.findIndex(btn => btn.name === name);
  if (index !== -1) {
    widget.sidebarButtons.splice(index, 1);
    Logger.debug(`Removed sidebar button "${name}" from ${widgetType} widget`);

    // Trigger callback if provided (e.g., to re-render or update DOM)
    if (onButtonRemoved) {
      onButtonRemoved();
    }
  }
}

/**
 * Check if a widget has a specific sidebar button
 */
export function hasSidebarButton(widget: SidebarButtonCapable, name: string): boolean {
  return widget.sidebarButtons.some(btn => btn.name === name);
}

/**
 * Load buttons from global registry into a widget
 * Called during widget initialization to sync with globally registered buttons
 */
export function loadButtonsFromRegistry(widget: SidebarButtonCapable, widgetType: WidgetType): void {
  const registry = SidebarButtonRegistry.getInstance();
  const applicableButtons = registry.getForWidget(widgetType);

  // Add any applicable buttons that aren't already in the local list
  for (const button of applicableButtons) {
    if (!widget.sidebarButtons.some(b => b.name === button.name)) {
      widget.sidebarButtons.push({
        name: button.name,
        icon: button.icon,
        tooltip: button.tooltip,
        callback: button.callback,
      });
    }
  }

  if (applicableButtons.length > 0) {
    Logger.debug(`Loaded ${applicableButtons.length} sidebar button(s) from registry for ${widgetType} widget`);
  }
}
