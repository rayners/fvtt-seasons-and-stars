# Template Context Extensibility Implementation Summary

## Overview

I have successfully implemented a comprehensive template context extensibility system for Seasons & Stars that allows external modules to extend and modify widget template contexts safely and efficiently.

## What Was Implemented

### 1. Core Extension System (`src/core/template-context-extensions.ts`)

- **TemplateContextExtensions** class - Central system for managing extensibility
- **Extension Registration** - Allows modules to register functions that add data to contexts
- **Hook System** - Before/after hooks for context preparation phases
- **Priority-based Execution** - Extensions execute in priority order (lower numbers first)
- **Widget Type Filtering** - Target specific widgets ('main', 'mini', 'grid') or all ('\*')
- **Error Handling** - Graceful failure without breaking widgets
- **Module-scoped APIs** - Automatic cleanup when modules are disabled

### 2. Widget Integration

Updated all three main widgets to use the extension system:

#### CalendarWidget (Main Widget)

- Integrated `TemplateContextExtensions.processContext()` in `_prepareContext()`
- Proper typing with `MainWidgetContext`
- Handles error states through extension system

#### CalendarMiniWidget (Mini Widget)

- Integrated `TemplateContextExtensions.processContext()` in `_prepareContext()`
- Proper typing with `MiniWidgetContext`
- Maintains compatibility with SmallTime integration

#### CalendarGridWidget (Grid Widget)

- Integrated `TemplateContextExtensions.processContext()` in `_prepareContext()`
- Supports complex context data (month grids, notes, etc.)
- Maintains performance for large calendar grids

### 3. Type Definitions

#### Enhanced Type System

- **ContextExtensionAPI** interface for external modules
- **Extension and Hook function signatures** with proper typing
- **Widget-specific context types** (MainWidgetContext, MiniWidgetContext, etc.)

### 4. API Integration

#### Public API (`game.seasonsStars.api.widgets`)

- **`createContextAPI(moduleId)`** - Creates scoped API for modules
- **`getRegisteredExtensions()`** - Debug/inspection method
- **`getRegisteredHooks()`** - Debug/inspection method

### 5. Documentation and Examples

#### Comprehensive Documentation

- **TEMPLATE-CONTEXT-EXTENSIBILITY.md** - Complete guide with examples
- **Example integrations** showing weather module patterns
- **Best practices** for performance and error handling
- **API reference** with TypeScript signatures

#### Example Implementations

- **Weather integration example** showing real-world usage patterns
- **Multiple widget targeting** examples
- **Error handling patterns** and safe extension design

### 6. Testing

#### Complete Test Suite

- **Extension registration** validation
- **Hook execution order** verification
- **Context processing** through full pipeline
- **Error handling** and graceful degradation
- **Module cleanup** and scoped APIs
- **Async extension support** testing

## Key Features

### Extension System

```typescript
// Register extension that adds weather data to all widgets
const extensionId = contextAPI.registerExtension({
  priority: 10,
  widgetTypes: ['*'], // All widgets
  extensionFunction: (context, widgetType) => ({
    ...context,
    weather: {
      temperature: game.myWeatherModule?.getCurrentTemperature(),
      condition: game.myWeatherModule?.getCurrentCondition(),
    },
  }),
  metadata: {
    name: 'Weather Integration',
    description: 'Adds weather data to S&S widgets',
  },
});
```

### Hook System

```typescript
// Register hook that runs before context preparation
const hookId = contextAPI.registerHook({
  phase: 'before',
  widgetTypes: ['*'],
  hookFunction: (context, widgetType, phase) => {
    // Refresh data if needed
    if (game.myModule?.isDataStale()) {
      game.myModule.refreshData();
    }
  },
});
```

### Module-Scoped API

```typescript
// In external module
const contextAPI = game.seasonsStars.api.widgets.createContextAPI('my-module');

// Automatic cleanup when module disabled
Hooks.once('destroy', () => {
  contextAPI.cleanup(); // Removes all extensions/hooks for this module
});
```

## Execution Pipeline

1. **Before Hooks** - Run before any context processing
2. **Extensions** - Execute in priority order (lower priority first)
3. **After Hooks** - Run after all extensions complete
4. **Error Recovery** - Return original context if any step fails

## Widget Type Support

- **`main`** - Full-featured calendar widget with time controls
- **`mini`** - Compact widget that pairs with SmallTime
- **`grid`** - Monthly grid calendar with note management
- **`*`** - Wildcard that targets all widget types

## Safety Features

### Error Handling

- Extensions that throw errors don't break other extensions
- Failed context processing returns original context
- Detailed error logging for debugging
- Graceful degradation in all failure scenarios

### Performance

- Efficient Map-based storage for extensions/hooks
- Minimal overhead when no extensions registered
- Async extension support without blocking render
- Priority-based execution prevents dependency issues

### Module Isolation

- Scoped APIs prevent module interference
- Automatic cleanup prevents memory leaks
- Unique ID generation prevents conflicts
- Module-specific error reporting

## Usage Patterns

### Simple Data Addition

```typescript
// Add simple data to all widgets
contextAPI.registerExtension({
  priority: 10,
  widgetTypes: ['*'],
  extensionFunction: context => ({
    ...context,
    myData: getMyModuleData(),
  }),
  metadata: { name: 'My Extension' },
});
```

### Widget-Specific Customization

```typescript
// Different data for different widgets
contextAPI.registerExtension({
  priority: 15,
  widgetTypes: ['main', 'grid'],
  extensionFunction: (context, widgetType) => {
    const baseData = getBaseData();

    if (widgetType === 'grid') {
      return { ...context, ...baseData, gridSpecific: getGridData() };
    }

    return { ...context, ...baseData };
  },
  metadata: { name: 'Widget-Specific Extension' },
});
```

### Complex Integration

```typescript
// Full integration with settings and async data
contextAPI.registerExtension({
  priority: 20,
  widgetTypes: ['*'],
  extensionFunction: async (context, widgetType) => {
    if (!game.settings.get('my-module', 'showInWidgets')) {
      return context;
    }

    try {
      const data = await fetchMyAsyncData();
      return {
        ...context,
        myModule: {
          enabled: true,
          data: data,
          displayMode: getDisplayModeForWidget(widgetType),
        },
      };
    } catch (error) {
      console.error('Failed to load my module data:', error);
      return context;
    }
  },
  metadata: {
    name: 'Complex Integration',
    description: 'Full integration with async data and settings',
  },
});
```

## Integration Examples

### Weather Module Integration

The system enables clean integration with weather modules:

- Add current weather to all widgets
- Show detailed weather in main widget
- Display forecast in grid widget
- Refresh data automatically via hooks

### Time Management Modules

Perfect for modules that add time-related functionality:

- Sunrise/sunset calculations
- Time zone support
- Custom calendar events
- Scheduling integration

### Campaign Management

Ideal for campaign management modules:

- Session notes and summaries
- Important date tracking
- Quest deadline reminders
- Character availability

## Future Extensibility

The system is designed to support future enhancements:

### Template System Integration

- Could be extended to allow custom templates
- Support for custom widget types
- Template partial injection

### Advanced Filtering

- Conditional extensions based on game state
- User permission-based extensions
- Scene-specific extensions

### Performance Optimization

- Caching layer for expensive computations
- Lazy loading of extension data
- Background data refresh

## Conclusion

This template context extensibility system provides a robust, safe, and performant way for external modules to enhance Seasons & Stars widgets. It maintains clean separation between modules while enabling rich integrations that enhance the user experience.

The system is fully tested, well-documented, and ready for use by external module developers. It follows Foundry VTT best practices and provides patterns that other modules can easily adopt.
