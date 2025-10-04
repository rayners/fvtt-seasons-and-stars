/**
 * Sidebar Button Mixin
 *
 * Provides common sidebar button management functionality for all widget types.
 * All button state is managed through the global registry - widgets query it fresh each render.
 */

import { Logger } from '../core/logger';
import { SidebarButtonRegistry } from './sidebar-button-registry';
import type { SidebarButton, SidebarButtonConfig, WidgetType } from '../types/widget-types';

export type AddSidebarButtonOptions = SidebarButtonConfig;

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
 * Add a sidebar button via the global registry
 * The button will appear on all applicable widgets automatically
 */
export function addSidebarButton(
  widgetType: WidgetType,
  options: AddSidebarButtonOptions,
  onButtonAdded?: () => void
): void {
  // Register in global registry - widgets will query it on next render
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

  Logger.debug(`Registered sidebar button "${options.name}" for ${widgetType} widget`);

  if (onButtonAdded) {
    onButtonAdded();
  }
}

/**
 * Remove a sidebar button from the global registry
 * The button will disappear from all widgets automatically
 */
export function removeSidebarButton(
  widgetType: WidgetType,
  name: string,
  onButtonRemoved?: () => void
): void {
  // Remove from global registry - widgets will update on next render
  const registry = SidebarButtonRegistry.getInstance();
  registry.unregister(name);

  Logger.debug(`Unregistered sidebar button "${name}"`);

  if (onButtonRemoved) {
    onButtonRemoved();
  }
}

/**
 * Check if a button is registered and applicable to a widget type
 */
export function hasSidebarButton(widgetType: WidgetType, name: string): boolean {
  const registry = SidebarButtonRegistry.getInstance();
  const config = registry.get(name);

  if (!config) {
    return false;
  }

  return isApplicableToWidget(config, widgetType);
}

/**
 * Get buttons from global registry for a specific widget type
 * This is the single source of truth - called during each render
 */
export function loadButtonsFromRegistry(widgetType: WidgetType): SidebarButton[] {
  const registry = SidebarButtonRegistry.getInstance();
  const applicableButtons = registry.getForWidget(widgetType);
  const normalizedButtons = applicableButtons.map(toSidebarButton);

  if (normalizedButtons.length > 0) {
    Logger.debug(
      `Loaded ${normalizedButtons.length} sidebar button(s) from registry for ${widgetType} widget`
    );
  }

  return normalizedButtons;
}
