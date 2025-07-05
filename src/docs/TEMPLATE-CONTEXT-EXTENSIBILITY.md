# Template Context Extensibility

Seasons & Stars provides a powerful system for other modules to extend or modify the template contexts of widgets. This allows modules to add custom data, weather information, or other contextual information to the calendar widgets.

## Overview

The Template Context Extensions system allows external modules to:

- **Add custom data** to widget template contexts
- **Modify existing context** properties safely
- **Run hooks** before and after context preparation
- **Target specific widgets** or all widgets universally
- **Maintain clean separation** between modules

## Basic Usage

### Creating a Context API

Each module should create its own scoped context API:

```typescript
// In your module's initialization
const contextAPI = game.seasonsStars.api.widgets.createContextAPI('my-module-id');
```

### Adding Data to Widget Contexts

#### Simple Extension Example

```typescript
// Add weather data to all widgets
const extensionId = contextAPI.registerExtension({
  priority: 10,
  widgetTypes: ['*'], // All widgets
  extensionFunction: (context, widgetType) => {
    return {
      ...context,
      weather: {
        temperature: game.myWeatherModule?.getCurrentTemperature() || 'Unknown',
        condition: game.myWeatherModule?.getCurrentCondition() || 'Clear',
        icon: game.myWeatherModule?.getWeatherIcon() || 'sun',
      },
    };
  },
  metadata: {
    name: 'Weather Integration',
    description: 'Adds current weather information to S&S widgets',
    version: '1.0.0',
    author: 'My Weather Module',
  },
});
```

#### Targeted Extension Example

```typescript
// Add detailed info only to the grid widget
const gridExtensionId = contextAPI.registerExtension({
  priority: 20,
  widgetTypes: ['grid'], // Only grid widget
  extensionFunction: (context, widgetType) => {
    if (widgetType === 'grid') {
      return {
        ...context,
        moonPhases: calculateMoonPhases(context.currentDate),
        astrologicalEvents: getAstrologicalEvents(context.viewDate),
        seasonalEvents: getSeasonalEvents(context.currentDate),
      };
    }
    return context;
  },
  metadata: {
    name: 'Astrological Calendar',
    description: 'Adds moon phases and astrological events to calendar grid',
  },
});
```

### Using Hooks for Context Modification

Hooks allow you to run code before or after context preparation:

```typescript
// Log context preparation for debugging
const hookId = contextAPI.registerHook({
  phase: 'before',
  widgetTypes: ['*'],
  hookFunction: (context, widgetType, phase) => {
    console.log(`Preparing context for ${widgetType} widget`, context);

    // You can modify context in place
    if (context.calendar) {
      context.debugInfo = {
        preparedAt: new Date(),
        widgetType: widgetType,
      };
    }
  },
});
```

## Advanced Examples

### Complex Weather Integration

```typescript
// Comprehensive weather module integration
const weatherAPI = game.seasonsStars.api.widgets.createContextAPI('simple-weather');

// Main extension for weather data
weatherAPI.registerExtension({
  priority: 5, // High priority (runs early)
  widgetTypes: ['*'],
  extensionFunction: async (context, widgetType) => {
    const weather = await game.simpleWeather?.getDetailedWeather();

    if (!weather) return context;

    const weatherContext = {
      temperature: weather.temperature,
      condition: weather.condition,
      humidity: weather.humidity,
      windSpeed: weather.windSpeed,
      icon: weather.icon,
      description: weather.description,
    };

    // Customize data based on widget type
    switch (widgetType) {
      case 'mini':
        // Minimal data for mini widget
        return {
          ...context,
          weather: {
            temperature: weatherContext.temperature,
            icon: weatherContext.icon,
          },
        };

      case 'main':
        // Moderate data for main widget
        return {
          ...context,
          weather: {
            ...weatherContext,
            showDetails: true,
          },
        };

      case 'grid':
        // Full data for grid widget
        return {
          ...context,
          weather: {
            ...weatherContext,
            forecast: await game.simpleWeather?.getForecast(7),
            showForecast: true,
          },
        };

      default:
        return { ...context, weather: weatherContext };
    }
  },
  metadata: {
    name: 'Simple Weather Integration',
    description: 'Comprehensive weather data integration for S&S widgets',
    version: '2.1.0',
    author: 'Simple Weather',
  },
});

// Hook to ensure weather data is current
weatherAPI.registerHook({
  phase: 'before',
  widgetTypes: ['*'],
  hookFunction: (context, widgetType, phase) => {
    // Refresh weather if it's stale
    if (game.simpleWeather?.isDataStale()) {
      game.simpleWeather.refreshWeather();
    }
  },
});
```

### Module Settings Integration

```typescript
// Module that adds custom settings-based context
const myModuleAPI = game.seasonsStars.api.widgets.createContextAPI('my-custom-module');

myModuleAPI.registerExtension({
  priority: 15,
  widgetTypes: ['main', 'grid'],
  extensionFunction: (context, widgetType) => {
    // Get module-specific settings
    const showCustomInfo = game.settings.get('my-custom-module', 'showInWidgets');
    const customFormat = game.settings.get('my-custom-module', 'displayFormat');

    if (!showCustomInfo) return context;

    return {
      ...context,
      customModule: {
        enabled: true,
        format: customFormat,
        data: getMyCustomData(context.currentDate),
        widgetSpecific: widgetType === 'grid' ? getGridSpecificData() : null,
      },
    };
  },
  metadata: {
    name: 'Custom Module Integration',
    description: 'Adds custom module data based on user settings',
  },
});
```

## API Reference

### ContextExtensionAPI

#### `registerExtension(extensionData)`

Registers a function that extends widget template contexts.

**Parameters:**

- `extensionData` (object):
  - `id?` (string): Optional unique identifier
  - `priority?` (number): Execution priority (lower = earlier), default: 50
  - `widgetTypes` (string[]): Widget types to target (['main', 'mini', 'grid'] or ['*'])
  - `extensionFunction` (function): Function that receives and returns context
  - `metadata` (object): Information about the extension
    - `name` (string): Human-readable name
    - `description?` (string): Description of what the extension does
    - `version?` (string): Extension version
    - `author?` (string): Extension author

**Returns:** Extension ID (string) for later cleanup

#### `registerHook(hookData)`

Registers a hook that runs before or after context preparation.

**Parameters:**

- `hookData` (object):
  - `id?` (string): Optional unique identifier
  - `phase` ('before' | 'after'): When to run the hook
  - `widgetTypes?` (string[]): Widget types to target, default: ['*']
  - `hookFunction` (function): Hook function

**Returns:** Hook ID (string) for later cleanup

#### `unregisterExtension(extensionId)` / `unregisterHook(hookId)`

Remove specific extensions or hooks.

#### `cleanup()`

Remove all extensions and hooks registered by this module.

### Extension Function Signature

```typescript
type ContextExtensionFunction = (
  context: Record<string, unknown>,
  widgetType: string,
  options?: Record<string, unknown>
) => Record<string, unknown> | Promise<Record<string, unknown>>;
```

### Hook Function Signature

```typescript
type ContextModificationHook = (
  context: Record<string, unknown>,
  widgetType: string,
  phase: 'before' | 'after',
  options?: Record<string, unknown>
) => Record<string, unknown> | Promise<Record<string, unknown>> | void;
```

## Widget Types

- **`main`**: Full-featured calendar widget with time controls
- **`mini`**: Compact widget that pairs with SmallTime
- **`grid`**: Monthly grid calendar with note management
- **`*`**: Special wildcard that targets all widget types

## Execution Order

1. **Before Hooks** (all applicable hooks run)
2. **Extensions** (run in priority order: lower priority first)
3. **After Hooks** (all applicable hooks run)

## Best Practices

### Module Design

1. **Use scoped APIs**: Always create a module-specific context API
2. **Clean up on disable**: Call `cleanup()` when your module is disabled
3. **Handle missing data**: Extensions should gracefully handle missing dependencies
4. **Respect widget types**: Customize data appropriately for each widget type

### Performance

1. **Avoid heavy computation**: Extensions run on every widget render
2. **Cache expensive operations**: Store computed results when possible
3. **Use appropriate priorities**: Higher-priority extensions should be faster
4. **Handle async carefully**: Async extensions may impact render performance

### Error Handling

1. **Use try-catch**: Wrap extension logic in error handling
2. **Return gracefully**: Always return a valid context object
3. **Log errors appropriately**: Use the module's logging system

### Example Error Handling

```typescript
contextAPI.registerExtension({
  priority: 10,
  widgetTypes: ['*'],
  extensionFunction: (context, widgetType) => {
    try {
      const myData = getMyData();
      return {
        ...context,
        myModule: myData,
      };
    } catch (error) {
      console.error('My Module extension failed:', error);
      // Return context unchanged on error
      return context;
    }
  },
  metadata: {
    name: 'Safe Extension',
    description: 'Extension with proper error handling',
  },
});
```

## Debugging

### Inspect Registered Extensions

```typescript
// Get all registered extensions
const extensions = game.seasonsStars.api.widgets.getRegisteredExtensions();
console.log('Registered extensions:', extensions);

// Get all registered hooks
const hooks = game.seasonsStars.api.widgets.getRegisteredHooks();
console.log('Registered hooks:', hooks);
```

### Debug Hook

```typescript
// Add a debug hook to log all context processing
const debugAPI = game.seasonsStars.api.widgets.createContextAPI('debug');

debugAPI.registerHook({
  phase: 'after',
  widgetTypes: ['*'],
  hookFunction: (context, widgetType, phase) => {
    console.log(`Final context for ${widgetType}:`, context);
  },
});
```

## Integration Examples

### Simple Calendar Bridge

```typescript
// Example of how a Simple Calendar bridge might work
const bridgeAPI = game.seasonsStars.api.widgets.createContextAPI('simple-calendar-bridge');

bridgeAPI.registerExtension({
  priority: 1, // Very high priority
  widgetTypes: ['*'],
  extensionFunction: (context, widgetType) => {
    // Add Simple Calendar compatibility data
    return {
      ...context,
      simpleCalendar: {
        isActive: !!game.modules.get('foundryvtt-simple-calendar')?.active,
        bridgeMode: true,
        syncedDate: getSimpleCalendarDate(),
      },
    };
  },
  metadata: {
    name: 'Simple Calendar Bridge',
    description: 'Provides compatibility data for Simple Calendar integration',
  },
});
```

This extensibility system provides a clean, safe way for modules to enhance Seasons & Stars widgets without modifying the core module code.
