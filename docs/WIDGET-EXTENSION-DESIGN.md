# Widget Extension Architecture (Design Proposal)

## Summary

- Allow third-party modules to register their own Seasons & Stars (S&S) widgets without modifying core files.
- Surface registered widgets as selectable "primary" widgets in S&S' module settings and as quick-access controls inside the main calendar widget.
- Provide lifecycle hooks, metadata, and cleanup rules so external widgets coexist with core widgets and survive module reloads or configuration changes, including a hook-based registration handshake that mirrors the existing calendar workflow.

## Goals

- Enable external modules to supply fully custom UI widgets that integrate with the existing `CalendarWidgetManager` lifecycle.
- Make registered widgets first-class citizens for default widget selection and launch controls.
- Avoid breaking existing widgets or forcing external modules to manipulate S&S internals directly.
- Support localization, permission checks, and graceful fallbacks if a widget becomes unavailable.

## Non-Goals

- Implement the registry or modify existing widgets (this document only defines the design).
- Define styling guidelines for third-party widgets beyond the metadata required for integration.
- Replace existing S&S widgets or remove current settings/options.

## Terminology

- **Widget Slot** – A named location inside S&S where a widget can be mounted (e.g., `main`, `mini`, `grid`).
- **Primary Widget** – The widget launched automatically for a user when `showTimeWidget` is enabled. Core default today is the `main` calendar widget.
- **Widget Handle** – The object returned by the registry that encapsulates lifecycle control for a widget (show/hide/toggle).

## Proposed Public API Surface

Expose a `widgets` service from `game.seasonsStars` once S&S finishes initialization:

```ts
interface SeasonsStarsWidgetAccess {
  /** Location where S&S should surface a launch affordance. */
  slot: 'main-widget-sidebar' | 'main-widget-footer';
  /** Font Awesome icon class or similar. */
  icon: string;
  /** Localized label for UI text (or translation key). */
  label: string;
  /** Tooltip text shown on hover. */
  tooltip?: string;
  /** Sort order relative to other buttons. */
  order?: number;
}

interface SeasonsStarsWidgetDefinition {
  /** Unique identifier provided by the registering module. */
  id: string;
  /** Human-readable name or localization key. */
  title: string;
  /** Optional description shown in settings. */
  description?: string;
  /** Module id registering the widget (for cleanup). */
  moduleId: string;
  /** Slot that this widget primarily targets (default `main`). */
  slot?: WidgetType | string;
  /** True if widget should appear in the "default widget" setting. */
  supportsPrimary?: boolean;
  /** Lifecycle factory returning a WidgetInstance-compatible object. */
  create: () => WidgetInstance | Application;
  /** Optional metadata for automatic access points in core UI. */
  access?: SeasonsStarsWidgetAccess | SeasonsStarsWidgetAccess[];
  /** Predicate to check if the current user may control the widget. */
  canShow?: () => boolean;
}
```

The registry service would be available as:

```ts
interface SeasonsStarsWidgetService {
  register(def: SeasonsStarsWidgetDefinition): void;
  unregister(id: string): void;
  get(id: string): SeasonsStarsWidgetDefinition | undefined;
  list(): SeasonsStarsWidgetDefinition[];
  /**
   * Resolve a widget handle ready for show/hide/toggle operations.
   */
  getHandle(id: string): WidgetInstance | null;
  /** Subscribe to registry mutations for UI reactions. */
  onChange(listener: (event: WidgetRegistryEvent) => void): () => void;
}
```

`WidgetRegistryEvent` would cover registration, unregistration, and metadata updates. The `register` call should throw or warn on duplicate ids, unknown modules, or invalid lifecycle factories.

### Hook-Based Registration Handshake

To align with established extension patterns (e.g., `seasons-stars:registerExternalCalendars`), S&S also fires a hook so modules can register widgets without reaching into globals:

```ts
type RegisterWidgetFn = (definition: SeasonsStarsWidgetDefinition) => void;
type UnregisterWidgetFn = (widgetId: string) => void;

interface RegisterWidgetsPayload {
  registerWidget: RegisterWidgetFn;
  unregisterWidget: UnregisterWidgetFn;
  service: SeasonsStarsWidgetService;
  manager: CalendarWidgetManager;
}

Hooks.callAll('seasons-stars:registerWidgets', payload: RegisterWidgetsPayload);
```

- `registerWidget` and `unregisterWidget` proxy to the public service while ensuring validation and logging remain centralized.
- `service` gives advanced consumers full access to the registry API if they need to listen for changes or inspect other widgets.
- `manager` (optional) preserves parity with the calendar hook by exposing the low-level widget manager for legacy integrations.
- The hook is emitted after core widgets register so third-party modules can rely on complete metadata when building UI.

### Lifecycle & Hooks

- Registry becomes available during `Hooks.once('ready')` after core widgets register their factories with `CalendarWidgetManager`.
- S&S fires new hooks for integration:
  - `Hooks.callAll('seasons-stars:widgetRegistered', definition)`
  - `Hooks.callAll('seasons-stars:widgetUnregistered', definition)`
  - `Hooks.callAll('seasons-stars:primaryWidgetChanged', widgetId)`
- External modules are encouraged to register widgets during or after Foundry's `ready` hook to ensure the registry exists and localization is loaded.
- When a module is disabled/unloaded, S&S will iterate over registered widgets tied to that module and unregister them, ensuring stale references are removed.

### Widget Handle Resolution

`getHandle` should internally:

1. Check the existing `CalendarWidgetManager` cache for the widget id (core widgets already register there).
2. If absent, call the widget definition's `create` function, wrap the result in the existing `WidgetWrapper`, and register it with `CalendarWidgetManager` for future reuse.
3. Cache the wrapper so repeated calls reuse the same handle and respect lifecycle semantics.

This ensures all widgets, core or external, use the same show/hide/toggle pathways.

## Module Settings Integration

### Dynamic Default Widget Choices

- The existing `defaultWidget` client setting is updated so its `choices` map is generated at render-time by querying the registry.
- Each `SeasonsStarsWidgetDefinition` with `supportsPrimary === true` contributes an entry:
  - Key: `definition.id`
  - Value: `definition.title` (resolved via localization if the string starts with `SEASONS_STARS.`).
- Core widgets (`main`, `mini`, `grid`) register themselves with `supportsPrimary: true`.

### Reacting to Registry Changes

- When a new primary-capable widget registers, S&S updates the cached choices and triggers `game.settings.settings.get('seasons-and-stars.defaultWidget')?.onChange?.(...)` if the saved value no longer exists.
- If a user selected widget becomes unavailable (module disabled or unregistered), S&S automatically falls back to the previous primary (e.g., `main`) and notifies the user via `ui.notifications?.warn`.
- The settings UI should listen to registry `onChange` events to re-render the select dropdown if it is open.

### Persisting Selection

- The stored `defaultWidget` value remains a string id. When loading the default widget on startup, S&S asks the registry for a handle. If unavailable, it falls back gracefully and logs a warning.

## Main Widget UI Integration

### Sidebar/Toolbar Button Injection

- The main calendar widget already exposes a `SidebarButtonManager`. Extend it so, when rendering, it merges core sidebar buttons with access metadata from registered widgets where `access.slot === 'main-widget-sidebar'`.
- Each injected button references the widget id. Clicking the button calls `CalendarWidgetManager.toggleWidget(widgetId)`.
- Ordering honors the `order` field so modules can influence relative placement. Core buttons default to an order value (e.g., 0–99) while third-party defaults start at 100 to appear after core controls unless specified otherwise.

### Visibility & Permissions

- Before rendering a button, S&S evaluates `definition.canShow?.()` (default `true`) to respect GM-only widgets or other constraints.
- If the widget is not available to the current user, the button is omitted.

### Other Access Points

- The access metadata array allows future placement (e.g., footer buttons). For v1, S&S only implements `main-widget-sidebar`. Unknown slots are ignored but logged so module authors know why their affordance did not appear.

## CalendarWidgetManager Adjustments

- Replace the literal `WidgetType` union (`'main' | 'mini' | 'grid'`) with a string-based type while preserving backwards compatibility by exporting constants for core ids.
- Store factories keyed by arbitrary string ids. Core widgets register themselves using their existing ids.
- Provide optional `unregisterWidget(id: string)` to remove factories when modules unload.
- Ensure error handling remains consistent (debug logs on register, warn on duplicate, error on instantiation failure).

## Example Registration Flow (External Module)

```ts
Hooks.once('ready', () => {
  const service = game.seasonsStars?.widgets;
  if (!service) return;

  service.register({
    id: 'mymodule-weather-overlay',
    moduleId: 'my-weather-module',
    title: 'MYMODULE.widgets.weatherOverlay',
    description: 'Shows regional weather forecasts.',
    supportsPrimary: true,
    create: () => new MyWeatherWidgetApplication(),
    access: {
      slot: 'main-widget-sidebar',
      icon: 'fa-cloud-sun',
      label: 'MYMODULE.widgets.weatherOverlayLabel',
      order: 120,
    },
    canShow: () => game.user?.isGM ?? false,
  });
});
```

Modules that prefer the hook workflow can instead rely on the registration handshake:

```ts
Hooks.on('seasons-stars:registerWidgets', ({ registerWidget }) => {
  registerWidget({
    id: 'mymodule-weather-overlay',
    moduleId: 'my-weather-module',
    title: 'MYMODULE.widgets.weatherOverlay',
    supportsPrimary: true,
    create: () => new MyWeatherWidgetApplication(),
  });
});
```

## Implementation Plan (High-Level)

1. **Registry Service** – Create `WidgetRegistry` class handling storage, lifecycle, and event emission. Instantiate during module `ready` and expose as `game.seasonsStars.widgets`.
2. **CalendarWidgetManager Updates** – Allow string ids, add `unregisterWidget`, and integrate with the registry for handle resolution.
3. **Core Widget Registration** – Adapt existing widgets to self-register through the new registry (still exporting helper statics for direct calls).
4. **Settings Update** – Refactor `defaultWidget` setting to build choices from the registry. Add guard logic for missing widgets and emit change hooks.
5. **UI Wiring** – Update `CalendarWidget` rendering to query registry access metadata, inject sidebar buttons, and listen for registry updates to re-render when necessary.
6. **Hooks & Cleanup** – Fire registry hooks on changes and ensure module disable/uninstall removes corresponding widget definitions.
7. **Documentation & Samples** – Document the API in the developer guide with examples similar to the snippet above.
8. **Testing Strategy** – Add unit tests for the registry, integration tests for settings fallback, and UI tests verifying that dynamic buttons appear and toggle the correct widget.

## Backwards Compatibility & Migration

- Existing code calling `CalendarWidgetManager.showWidget('mini')` continues to work because core widgets retain their ids.
- `defaultWidget` values stored prior to this change still resolve (`'main'`, `'mini'`, `'grid'`).
- Modules that relied on internal widget singletons now have an officially supported surface. No breaking changes expected if they migrate to the registry.

## Registration Approach Trade-Offs

| Approach                                                                                                  | Pros                                                                                                                                                                                                                                                                                                                                                                | Cons                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Direct service access (`game.seasonsStars.widgets.register`)                                              | _ Familiar API surface for macros or scripts already using `game.seasonsStars`.<br>_ Supports late or dynamic registration/unregistration (feature toggles, dev hot reload) because consumers can call the methods at any time after `ready`.<br>\* Enables richer TypeScript typings by importing the shared interfaces and avoiding loose `Hook` argument typing. | _ Requires callers to wait until `game.seasonsStars` is initialized, which can lead to race conditions if modules register during `init`.<br>_ Encourages tighter coupling to the global API, complicating testing or future refactors.<br>\* Modules must manually tear down registrations on disable unless they also listen for lifecycle hooks.                                 |
| Hook handshake (`Hooks.on('seasons-stars:registerWidgets', ({ registerWidget }) => registerWidget(def))`) | _ Mirrors the existing calendar registration experience, so external authors reuse learned patterns.<br>_ Guarantees registration happens only after S&S finishes bootstrapping and core widgets exist.<br>\* Works even if `game.seasonsStars` is unavailable (e.g., sandboxed macros) because the hook payload supplies the necessary functions.                  | _ Primarily fires during initialization; modules needing runtime toggles must retain the provided functions or fall back to the service.<br>_ Hook arguments are loosely typed at runtime, increasing the need for defensive coding or provided TypeScript declarations.<br>\* Discoverability depends on documentation—developers may overlook the hook without explicit guidance. |

In practice, both mechanisms can coexist: the hook offers a safe, declarative registration point, while the service enables runtime control and introspection. Documentation and examples should highlight how to choose the appropriate path based on module needs.

## Open Questions / Future Enhancements

- Should widgets support multiple slots simultaneously (e.g., both main sidebar and a scene control button)? The metadata structure supports it, but initial implementation may limit scope.
- Do we need a way for external modules to supply custom settings panels or configuration metadata for their widgets? (Deferred.)
- How should localization keys be validated? We may offer a helper to detect missing translations during registration.
- Is there demand for an ordering API that lets core widgets opt into being after third-party widgets?
- Should registry metadata persist across hot module replacement in development mode? (Likely yes, via re-registering on `canvasReady`.)
