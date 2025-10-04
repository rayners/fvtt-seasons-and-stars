# Simple Calendar Compatibility Bridge - Required Updates

**Date**: 2025-10-03
**Seasons & Stars Version**: 0.19.0
**Related Commits**:

- `d495ab72` - Sidebar button registry implementation
- `29da9869` - Mini widget footer layout fixes

---

## Overview

Seasons & Stars has introduced a new **Sidebar Button Registry** system that allows modules to dynamically add buttons to calendar widgets. The Simple Calendar Compatibility Bridge needs to be updated to expose this functionality through the bridge interface.

## What Changed in Seasons & Stars

### 1. New Sidebar Button Registry System

A centralized registry (`SidebarButtonRegistry`) now manages buttons that can be added to calendar widgets:

- **Location**: `packages/core/src/ui/sidebar-button-registry.ts`
- **Purpose**: Allow external modules to register buttons that appear in widget sidebars
- **Widget Support**: Works with `main`, `mini`, and `grid` widgets

### 2. Widget Integration Changes

All three widget types now support sidebar buttons:

- **CalendarWidget** (main): Sidebar buttons in dedicated sidebar area
- **CalendarMiniWidget**: Sidebar buttons in footer row alongside quick time controls
- **CalendarGridWidget**: Sidebar buttons in widget controls area

### 3. Bridge Integration Interface Updates

The `BridgeIntegration` class has new methods for sidebar button management:

```typescript
// Added to packages/core/src/core/bridge-integration.ts
addSidebarButton(config: SidebarButtonConfig): void
removeSidebarButton(name: string): void
hasSidebarButton(name: string): boolean
```

---

## Required Updates for Simple Calendar Bridge

### 1. Add Sidebar Button Management to Bridge API

**File**: `src/bridge/seasons-stars-adapter.ts` (or equivalent)

Add methods to expose the sidebar button functionality:

```typescript
/**
 * Register a button to appear in Seasons & Stars widget sidebars
 * @param config Button configuration
 */
addCalendarButton(config: {
  name: string;
  icon: string;
  tooltip: string;
  callback: () => void;
  only?: ('main' | 'mini' | 'grid')[];
  except?: ('main' | 'mini' | 'grid')[];
}): void {
  const integration = game.seasonsStars?.integration;
  if (!integration) {
    throw new Error('Seasons & Stars integration not available');
  }

  integration.addSidebarButton(config);
}

/**
 * Remove a previously registered button
 * @param name The button name to remove
 */
removeCalendarButton(name: string): void {
  const integration = game.seasonsStars?.integration;
  if (!integration) {
    throw new Error('Seasons & Stars integration not available');
  }

  integration.removeSidebarButton(name);
}

/**
 * Check if a button is registered
 * @param name The button name to check
 */
hasCalendarButton(name: string): boolean {
  const integration = game.seasonsStars?.integration;
  if (!integration) {
    return false;
  }

  return integration.hasSidebarButton(name);
}
```

### 2. Update Simple Calendar Hook Integration

**File**: `src/bridge/simple-calendar-hooks.ts` (or equivalent)

When the Simple Calendar needs to show its interface, it can now add a button directly to Seasons & Stars widgets:

```typescript
// Example: Add "Open Simple Calendar" button
function registerSimpleCalendarButton(): void {
  const bridge = game.modules.get('simple-calendar-compat')?.api;

  bridge.addCalendarButton({
    name: 'open-simple-calendar',
    icon: 'fas fa-calendar-alt',
    tooltip: 'Open Simple Calendar',
    callback: () => {
      // Open Simple Calendar interface
      SimpleCalendar.show();
    },
    // Only show on main and grid widgets, not mini
    except: ['mini'],
  });
}

// Call during initialization
Hooks.once('ready', () => {
  if (game.modules.get('seasons-and-stars')?.active) {
    registerSimpleCalendarButton();
  }
});
```

### 3. Add Feature Detection

**File**: `src/bridge/seasons-stars-adapter.ts`

Add feature detection for the sidebar button capability:

```typescript
hasFeature(feature: string): boolean {
  const integration = game.seasonsStars?.integration;
  if (!integration) {
    return false;
  }

  // Check for sidebar button support
  if (feature === 'sidebar-buttons') {
    return typeof integration.addSidebarButton === 'function';
  }

  // ... existing feature checks
  return integration.hasFeature?.(feature) ?? false;
}
```

### 4. Update TypeScript Definitions

**File**: `src/types/seasons-stars.d.ts` (or equivalent)

Update the type definitions to include the new methods:

```typescript
interface SeasonsStarsBridgeIntegration {
  // ... existing properties

  /**
   * Register a button to appear in widget sidebars
   */
  addSidebarButton(config: SidebarButtonConfig): void;

  /**
   * Remove a registered sidebar button
   */
  removeSidebarButton(name: string): void;

  /**
   * Check if a sidebar button is registered
   */
  hasSidebarButton(name: string): boolean;
}

interface SidebarButtonConfig {
  /** Unique identifier for this button */
  name: string;

  /** Font Awesome icon class (e.g., 'fas fa-calendar') */
  icon: string;

  /** Tooltip text shown on hover */
  tooltip: string;

  /** Function to execute when button is clicked */
  callback: () => void;

  /** If specified, button only appears on these widget types */
  only?: ('main' | 'mini' | 'grid')[];

  /** If specified, button is excluded from these widget types */
  except?: ('main' | 'mini' | 'grid')[];
}
```

---

## Implementation Notes

### Button Lifecycle

1. **Registration**: Buttons should be registered during the `ready` hook, after Seasons & Stars has initialized
2. **Cleanup**: Buttons are automatically cleaned up when widgets are destroyed
3. **Re-render**: Widget re-renders automatically when buttons are added/removed

### Widget-Specific Behavior

- **Main Widget**: Buttons appear in a dedicated sidebar section
- **Mini Widget**: Buttons appear in the footer row next to quick time controls
- **Grid Widget**: Buttons appear in the widget controls area

### Styling

Buttons use Seasons & Stars' built-in styling:

- Green gradient background (`#10b981` to `#14b8a6`)
- Hover effects and transitions
- Consistent sizing with other widget controls

### Button Constraints

The mini widget has limited space. Consider:

- Use `except: ['mini']` for buttons that need more space
- Keep button counts reasonable (2-3 max for mini widget)
- Icons should be Font Awesome classes for consistency

---

## Testing Checklist

- [ ] Buttons register successfully on all three widget types
- [ ] Button callbacks execute correctly
- [ ] Buttons respect `only` and `except` filters
- [ ] Buttons are removed when `removeSidebarButton()` is called
- [ ] Feature detection returns correct values
- [ ] TypeScript types are correct and complete
- [ ] Documentation updated for new API methods
- [ ] Integration tests cover sidebar button functionality

---

## Example Use Cases

### 1. Add "Sync with Simple Calendar" Button

```typescript
bridge.addCalendarButton({
  name: 'sync-simple-calendar',
  icon: 'fas fa-sync',
  tooltip: 'Sync with Simple Calendar',
  callback: async () => {
    await SimpleCalendar.sync();
    ui.notifications.info('Calendar synced');
  },
  only: ['main'], // Only on main widget
});
```

### 2. Add "Quick Note" Button

```typescript
bridge.addCalendarButton({
  name: 'quick-note',
  icon: 'fas fa-sticky-note',
  tooltip: 'Add Quick Note',
  callback: () => {
    SimpleCalendar.showNoteDialog();
  },
  except: ['grid'], // Not on grid widget
});
```

### 3. Conditional Registration

```typescript
// Only register if user has permission
if (game.user.isGM) {
  bridge.addCalendarButton({
    name: 'admin-settings',
    icon: 'fas fa-cog',
    tooltip: 'Calendar Settings',
    callback: () => {
      new CalendarSettingsDialog().render(true);
    },
  });
}
```

---

## Questions or Issues?

If you encounter any issues implementing these changes, please:

1. Check the Seasons & Stars integration guide: `docs/INTEGRATION-GUIDE.md`
2. Review the test files: `packages/core/test/sidebar-button-*.test.ts`
3. Open an issue in the Seasons & Stars repository with the `bridge-integration` label

---

## Version Compatibility

These changes are compatible with:

- **Seasons & Stars**: v0.19.0+
- **Foundry VTT**: v11.0+

For earlier versions of Seasons & Stars, check `hasFeature('sidebar-buttons')` before attempting to use this functionality.
