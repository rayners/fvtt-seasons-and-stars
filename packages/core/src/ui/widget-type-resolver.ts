/**
 * Widget Type Resolution Utility
 *
 * Centralizes the logic for determining which widget should be shown/hidden/toggled
 * based on the defaultWidget setting and the operation context.
 *
 * Design Decision:
 * ================
 * When 'none' is selected, the behavior depends on the operation:
 * - show: null (don't auto-show on startup)
 * - hide/toggle: 'main' (manual operations use main widget as fallback)
 *
 * This ensures:
 * 1. Clean startup with no automatic widget display
 * 2. Consistent manual control via scene controls and keybindings
 * 3. Predictable behavior that matches user expectations
 */

/**
 * Valid widget type options for the defaultWidget setting
 */
export type DefaultWidgetOption = 'none' | 'main' | 'mini' | 'grid';

/**
 * Valid widget type identifiers (excludes 'none' which isn't a real widget)
 */
export type WidgetType = 'main' | 'mini' | 'grid';

/**
 * Context for widget operations
 */
export type WidgetOperationContext = 'show' | 'hide' | 'toggle';

/**
 * Get the target widget type for a given default widget setting and operation.
 *
 * @param defaultWidget - The user's defaultWidget setting
 * @param operation - The operation being performed (show/hide/toggle)
 * @returns The widget type to operate on, or null if no widget should be affected
 *
 * @example
 * ```typescript
 * // Startup (show operation)
 * const widget = getTargetWidgetType('none', 'show');
 * // Returns: null (don't auto-show)
 *
 * // Scene control click (toggle operation)
 * const widget = getTargetWidgetType('none', 'toggle');
 * // Returns: 'main' (toggle main widget for manual action)
 *
 * // Normal widget setting
 * const widget = getTargetWidgetType('mini', 'show');
 * // Returns: 'mini' (show mini widget)
 * ```
 */
export function getTargetWidgetType(
  defaultWidget: DefaultWidgetOption,
  operation: WidgetOperationContext
): WidgetType | null {
  switch (defaultWidget) {
    case 'none':
      // 'none' means don't auto-show on startup,
      // but manual operations (hide/toggle) use main widget as fallback
      return operation === 'show' ? null : 'main';

    case 'mini':
      return 'mini';

    case 'grid':
      return 'grid';

    case 'main':
    default:
      return 'main';
  }
}

/**
 * Check if a value is a valid default widget option
 *
 * @param value - The value to check
 * @returns True if the value is a valid default widget option
 */
export function isValidDefaultWidgetOption(value: unknown): value is DefaultWidgetOption {
  return value === 'none' || value === 'main' || value === 'mini' || value === 'grid';
}

/**
 * Get a safe default widget option, falling back to 'main' if invalid
 *
 * @param value - The value to validate
 * @returns A valid default widget option
 */
export function getSafeDefaultWidgetOption(value: unknown): DefaultWidgetOption {
  return isValidDefaultWidgetOption(value) ? value : 'main';
}
