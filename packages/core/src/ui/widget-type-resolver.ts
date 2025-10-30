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
 * Built-in widget type options for the defaultWidget setting
 */
export type BuiltInWidgetOption = 'none' | 'main' | 'mini' | 'grid';

/**
 * Built-in widget type identifiers (excludes 'none' which isn't a real widget)
 */
export type BuiltInWidgetType = 'main' | 'mini' | 'grid';

/**
 * Context for widget operations
 */
export type WidgetOperationContext = 'show' | 'hide' | 'toggle';

/**
 * Get the target widget type for a given default widget setting and operation.
 *
 * Supports both built-in widgets ('none', 'main', 'mini', 'grid') and custom widgets
 * registered by third-party modules via the widget registration API.
 *
 * @param defaultWidget - The user's defaultWidget setting (built-in or custom widget type)
 * @param operation - The operation being performed (show/hide/toggle)
 * @returns The widget type to operate on, or null if no widget should be affected
 *
 * @example Built-in widget behavior
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
 *
 * @example Custom widget behavior
 * ```typescript
 * // Custom widget registered by third-party module
 * const widget = getTargetWidgetType('lunar-calendar', 'show');
 * // Returns: 'lunar-calendar' (pass through custom type)
 * ```
 */
export function getTargetWidgetType(
  defaultWidget: string,
  operation: WidgetOperationContext
): string | null {
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
      return 'main';

    default:
      // Assume it's a custom widget type registered by a third-party module
      // Pass through as-is to allow custom widgets to work as default widgets
      return defaultWidget;
  }
}

/**
 * Check if a value is a valid built-in widget option
 *
 * @param value - The value to check
 * @returns True if the value is a built-in widget option
 */
export function isBuiltInWidgetOption(value: unknown): value is BuiltInWidgetOption {
  return value === 'none' || value === 'main' || value === 'mini' || value === 'grid';
}

/**
 * Get a safe default widget option, falling back to 'main' if the value is not a string
 *
 * Note: This function intentionally does NOT validate against known widget types,
 * as it needs to support custom widgets registered by third-party modules.
 * It only ensures the value is a non-empty string.
 *
 * @param value - The value to validate
 * @returns A valid widget type string, or 'main' if the value is invalid
 */
export function getSafeDefaultWidgetOption(value: unknown): string {
  // Accept any non-empty string (built-in or custom widget type)
  if (typeof value === 'string' && value.trim() !== '') {
    return value;
  }

  // Fall back to 'main' for invalid values
  return 'main';
}
