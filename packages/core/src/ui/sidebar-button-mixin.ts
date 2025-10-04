/**
 * Sidebar Button Mixin
 *
 * Provides common sidebar button management functionality for all widget types.
 * Handles both local button storage and global registry synchronization.
 */

import { Logger } from '../core/logger';
import { SidebarButtonRegistry } from './sidebar-button-registry';
import type { SidebarButton, SidebarButtonConfig, WidgetType } from '../types/widget-types';

export interface SidebarButtonCapable {
  sidebarButtons?: SidebarButton[];
  readonly rendered?: boolean;
}

export type AddSidebarButtonOptions = SidebarButtonConfig;

function ensureSidebarButtonArray(widget?: SidebarButtonCapable | null): SidebarButton[] | null {
  if (!widget) {
    return null;
  }

  if (!Array.isArray(widget.sidebarButtons)) {
    widget.sidebarButtons = [];
  }

  return widget.sidebarButtons ?? null;
}

function isApplicableToWidget(config: SidebarButtonConfig, widgetType: WidgetType): boolean {
  if (config.only && !config.only.includes(widgetType)) {
    return false;
  }

  if (config.except && config.except.includes(widgetType)) {
    return false;
  }

  return true;
}

function toSidebarButton(config: SidebarButtonConfig): SidebarButton {
  return {
    name: config.name,
    icon: config.icon,
    tooltip: config.tooltip,
    callback: config.callback,
  };
}

/**
 * Add a sidebar button to a widget
 * Registers the button globally and stores it locally
 */
export function addSidebarButton(
  widget: SidebarButtonCapable | null,
  widgetType: WidgetType,
  options: AddSidebarButtonOptions,
  onButtonAdded?: () => void
): void {
  // Register in global registry so all widgets get this button
  const registry = SidebarButtonRegistry.getInstance();
  registry.register(options);

  if (!isApplicableToWidget(options, widgetType)) {
    Logger.debug(
      `Button "${options.name}" not applicable to ${widgetType} widget (only: ${
        options.only?.join(', ') || 'all'
      }, except: ${options.except?.join(', ') || 'none'})`
    );
    return;
  }

  const sidebarButtons = ensureSidebarButtonArray(widget);
  if (sidebarButtons) {
    const existingButton = sidebarButtons.find(btn => btn.name === options.name);
    if (existingButton) {
      Logger.debug(`Button "${options.name}" already exists in ${widgetType} widget`);
    } else {
      sidebarButtons.push(toSidebarButton(options));
      Logger.debug(`Added sidebar button "${options.name}" to ${widgetType} widget`);
    }
  }

  if (onButtonAdded) {
    onButtonAdded();
  }
}

/**
 * Remove a sidebar button from a widget
 * Unregisters from global registry and removes locally
 */
export function removeSidebarButton(
  widget: SidebarButtonCapable | null,
  widgetType: WidgetType,
  name: string,
  onButtonRemoved?: () => void
): void {
  // Remove from global registry
  const registry = SidebarButtonRegistry.getInstance();
  registry.unregister(name);

  const sidebarButtons = ensureSidebarButtonArray(widget);
  if (!sidebarButtons) {
    return;
  }

  const index = sidebarButtons.findIndex(btn => btn.name === name);
  if (index === -1) {
    if (onButtonRemoved) {
      onButtonRemoved();
    }
    return;
  }

  sidebarButtons.splice(index, 1);
  Logger.debug(`Removed sidebar button "${name}" from ${widgetType} widget`);

  if (onButtonRemoved) {
    onButtonRemoved();
  }
}

/**
 * Check if a widget has a specific sidebar button
 */
export function hasSidebarButton(
  widget: SidebarButtonCapable | null,
  widgetType: WidgetType,
  name: string
): boolean {
  const registry = SidebarButtonRegistry.getInstance();
  const config = registry.get(name);

  if (config) {
    return isApplicableToWidget(config, widgetType);
  }

  const sidebarButtons = ensureSidebarButtonArray(widget);
  return sidebarButtons ? sidebarButtons.some(btn => btn.name === name) : false;
}

/**
 * Load buttons from global registry into a widget
 * Called during widget initialization to sync with globally registered buttons
 */
export function loadButtonsFromRegistry(
  widget: SidebarButtonCapable | null,
  widgetType: WidgetType
): SidebarButton[] {
  const registry = SidebarButtonRegistry.getInstance();
  const applicableButtons = registry.getForWidget(widgetType);
  const sidebarButtons = ensureSidebarButtonArray(widget);
  const normalizedButtons = applicableButtons.map(toSidebarButton);

  if (sidebarButtons) {
    sidebarButtons.length = 0;
    sidebarButtons.push(...normalizedButtons);
  }

  if (normalizedButtons.length > 0) {
    Logger.debug(
      `Loaded ${normalizedButtons.length} sidebar button(s) from registry for ${widgetType} widget`
    );
  }

  return normalizedButtons;
}
