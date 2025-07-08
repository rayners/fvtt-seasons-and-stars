# Template Context Provider System

The Template Context Provider System allows external modules to extend Seasons & Stars widget templates with custom data without modifying core widget code. This enables rich integrations for weather, season effects, game system specific data, and module-specific functionality.

## Overview

Template context providers are functions that can inject additional data into widget templates during rendering. They follow a priority-based system where multiple providers can contribute data, with later providers able to override data from earlier ones.

### Supported Widget Types

- `main` - The main calendar widget with time controls
- `mini` - The compact mini widget that pairs with SmallTime  
- `grid` - The monthly calendar grid widget
- `dialog` - Calendar selection and other dialogs

## Basic Usage

### Registering a Provider

```typescript
// Access the provider system through the global API
const providers = game.seasonsStars.templateContextProviders;

// Register a simple provider
const providerId = providers.register('my-module', {
  name: 'My Custom Provider',
  priority: 50, // Optional, defaults to 50
  supports: ['main', 'grid'], // Optional, defaults to all widget types
  
  provideContext: (widgetType, baseContext, calendar, currentDate) => {
    return {
      myCustomData: 'Hello from my module!',
      currentWeather: 'Sunny',
      customIcon: 'fas fa-sun'
    };
  },
  
  // Optional: Only apply under certain conditions
  shouldApply: (calendar, currentDate) => {
    return calendar.seasons && calendar.seasons.length > 0;
  },
  
  description: 'Adds custom weather data to calendar widgets'
});
```

### Using Provider Data in Templates

The data provided by your context provider becomes available in the widget templates:

```handlebars
{{!-- In calendar-widget.hbs --}}
{{#if myCustomData}}
  <div class="custom-section">
    <i class="{{customIcon}}"></i>
    <span>{{myCustomData}}</span>
    <div class="weather">Weather: {{currentWeather}}</div>
  </div>
{{/if}}
```

### Unregistering a Provider

```typescript
// Clean up when your module is disabled
const success = providers.unregister(providerId, 'my-module');
```

## Provider Interface

### TemplateContextProviderRegistration

```typescript
interface TemplateContextProviderRegistration {
  /** Human-readable name for debugging */
  name: string;
  
  /** Priority for provider ordering (higher = applied later) */
  priority?: number; // Default: 50
  
  /** Widget types this provider supports */
  supports?: Array<'main' | 'mini' | 'grid' | 'dialog'>; // Default: all types
  
  /** Provide additional context for template rendering */
  provideContext(
    widgetType: string,
    baseContext: Record<string, any>,
    calendar: SeasonsStarsCalendar,
    currentDate: CalendarDate
  ): Promise<Record<string, any>> | Record<string, any>;
  
  /** Optional condition to determine if provider should be applied */
  shouldApply?(calendar: SeasonsStarsCalendar, currentDate: CalendarDate): boolean;
  
  /** Optional description for debugging */
  description?: string;
}
```

### Context Parameters

- `widgetType`: The type of widget being rendered ('main', 'mini', 'grid', 'dialog')
- `baseContext`: The existing context data from the widget and other providers
- `calendar`: The active calendar configuration
- `currentDate`: The current calendar date object

## Built-in Providers

Seasons & Stars includes several built-in providers that demonstrate the system:

### Base Calendar Information (Priority: 10)
Provides fundamental calendar properties:
```typescript
{
  calendarId: string,
  currentYear: number,
  currentMonth: number,
  currentDay: number,
  weekdayIndex: number,
  yearDay: number,
  isIntercalary: boolean
}
```

### Season Information (Priority: 20)
Provides current season data when available:
```typescript
{
  currentSeason: {
    name: string,
    icon: string,
    description: string,
    startMonth: number,
    endMonth: number
  }
}
```

### Moon Phases (Priority: 30)
Provides moon phase information for calendars with moons:
```typescript
{
  moons: Array<{
    name: string,
    phase: string,
    icon: string,
    phaseIcon: string
  }>,
  primaryMoon: object | null
}
```

## Advanced Usage Examples

### Weather Provider with Seasonal Variation

```typescript
providers.register('weather-module', {
  name: 'Seasonal Weather',
  priority: 40, // After seasons but before UI providers
  supports: ['main', 'grid'],
  
  provideContext: (widgetType, baseContext, calendar, currentDate) => {
    const season = baseContext.currentSeason?.name?.toLowerCase();
    const weather = generateWeatherForSeason(season, currentDate);
    
    if (widgetType === 'main') {
      return {
        weather: weather,
        weatherSummary: `${weather.condition}, ${weather.temperature}°F`,
        showWeatherControls: true
      };
    } else if (widgetType === 'grid') {
      return {
        weatherIcon: weather.icon,
        weatherTemp: weather.temperature
      };
    }
    
    return {};
  },
  
  shouldApply: (calendar, currentDate) => {
    return calendar.seasons && calendar.seasons.length > 0;
  }
});
```

### Game System Integration Provider

```typescript
providers.register('pf2e-integration', {
  name: 'Pathfinder 2e Data',
  priority: 60,
  supports: ['main'],
  
  provideContext: (widgetType, baseContext, calendar, currentDate) => {
    if (game.system.id !== 'pf2e') return {};
    
    return {
      pf2eWorldTime: game.time.worldTime,
      kingmakerDate: convertToKingmakerDate(currentDate),
      showPF2eControls: game.user.isGM,
      pf2eCompatibilityMode: true
    };
  }
});
```

### Module Integration Provider

```typescript
providers.register('simple-weather', {
  name: 'Simple Weather Integration',
  priority: 70,
  
  async provideContext(widgetType, baseContext, calendar, currentDate) {
    // Check if Simple Weather module is active
    const simpleWeather = game.modules.get('simple-weather');
    if (!simpleWeather?.active) return {};
    
    // Fetch weather data from Simple Weather API
    const weatherData = await simpleWeather.api.getCurrentWeather();
    
    return {
      externalWeather: weatherData,
      hasExternalWeather: true,
      weatherSource: 'Simple Weather'
    };
  }
});
```

## Template Integration

### Accessing Provider Data

Provider data is merged into the template context and can be accessed directly:

```handlebars
{{!-- Check if data exists before using --}}
{{#if weather}}
  <div class="weather-display">
    <i class="{{weather.icon}}"></i>
    <span class="condition">{{weather.condition}}</span>
    <span class="temperature">{{weather.temperature}}°F</span>
  </div>
{{/if}}

{{!-- Use conditional data for enhanced UI --}}
{{#if showWeatherControls}}
  <div class="weather-controls">
    <button class="change-weather">Change Weather</button>
  </div>
{{/if}}

{{!-- Access season data from built-in providers --}}
{{#if currentSeason}}
  <div class="season-indicator">
    <i class="{{currentSeason.icon}}"></i>
    <span>{{currentSeason.name}}</span>
  </div>
{{/if}}
```

### Widget-Specific Templates

Different widgets receive different context based on their needs:

```handlebars
{{!-- calendar-widget.hbs - Full details --}}
{{#if weather}}
  <div class="weather-section">
    <h4>Current Weather</h4>
    <div class="weather-details">
      <i class="{{weather.icon}}"></i>
      <span>{{weather.condition}}</span>
      <span>{{weather.temperature}}°F</span>
      <div class="weather-description">{{weather.description}}</div>
    </div>
  </div>
{{/if}}

{{!-- calendar-mini-widget.hbs - Compact display --}}
{{#if weatherIcon}}
  <i class="{{weatherIcon}}" title="{{weatherCondition}}"></i>
{{/if}}

{{!-- calendar-grid-widget.hbs - Per-day indicators --}}
{{#each monthData.days}}
  <div class="calendar-day">
    <span class="day-number">{{this.day}}</span>
    {{#if this.weatherIcon}}
      <i class="{{this.weatherIcon}} weather-icon"></i>
    {{/if}}
  </div>
{{/each}}
```

## Best Practices

### Provider Design

1. **Use Descriptive Names**: Choose clear, specific names for your providers
2. **Set Appropriate Priorities**: Lower priorities for fundamental data, higher for UI enhancements
3. **Widget-Specific Data**: Provide different detail levels for different widget types
4. **Conditional Application**: Use `shouldApply` to only activate when appropriate
5. **Error Handling**: Handle missing data gracefully in your provider functions

### Data Structure

1. **Flat Objects**: Prefer flat data structures for easier template access
2. **Consistent Naming**: Use consistent naming conventions across your data
3. **Type Safety**: Document expected data types for template authors
4. **Null Checks**: Always check for data existence before providing it

### Performance

1. **Async Operations**: Use async functions only when necessary
2. **Caching**: Cache expensive calculations in your provider
3. **Minimal Processing**: Keep provider functions lightweight
4. **Conditional Logic**: Exit early when data isn't needed

### Integration

1. **Module Detection**: Check if dependent modules are available and active
2. **Graceful Degradation**: Work without optional dependencies
3. **API Compatibility**: Handle API changes in dependent modules
4. **Cleanup**: Always unregister providers when your module is disabled

## Debugging

### Debug Information

Get information about registered providers:

```typescript
const debug = providers.getDebugInfo();
console.log('Registered providers:', debug);
```

### Provider Testing

Test your provider in isolation:

```typescript
const testContext = await providers.mergeContext(
  'main',
  { /* base context */ },
  calendar,
  currentDate
);
console.log('Merged context:', testContext);
```

### Template Debugging

Add debug output to templates during development:

```handlebars
{{!-- Debug: Show all available context --}}
<!-- Debug Context: {{json this}} -->

{{!-- Debug: Check specific values --}}
{{#if debugMode}}
  <div class="debug-panel">
    <h4>Template Context Debug</h4>
    <pre>{{json weather}}</pre>
    <pre>{{json currentSeason}}</pre>
  </div>
{{/if}}
```

## Migration Guide

If you were previously modifying widget templates directly, here's how to migrate to the provider system:

### Before (Direct Template Modification)
```handlebars
{{!-- This required modifying core templates --}}
<div class="my-custom-data">
  {{!-- Hard-coded custom logic --}}
</div>
```

### After (Provider System)
```typescript
// Register provider in your module
providers.register('my-module', {
  name: 'My Custom Data',
  provideContext: (widgetType, baseContext, calendar, currentDate) => {
    return {
      myCustomData: computeCustomData(calendar, currentDate)
    };
  }
});
```

```handlebars
{{!-- Templates remain clean and extensible --}}
{{#if myCustomData}}
  <div class="my-custom-data">
    {{myCustomData}}
  </div>
{{/if}}
```

## API Reference

### Global API Access

```typescript
// Via game object
const providers = game.seasonsStars.templateContextProviders;

// Via window object (for debugging)
const providers = window.SeasonsStars.templateContextProviders;
```

### Methods

- `register(moduleId: string, registration: TemplateContextProviderRegistration): string`
- `unregister(id: string, moduleId: string): boolean`
- `getProvidersFor(widgetType: string): TemplateContextProvider[]`
- `mergeContext(widgetType: string, baseContext: any, calendar: any, currentDate: any): Promise<any>`
- `getDebugInfo(): object`

### Hooks

The system emits hooks for other modules to monitor provider registration:

```typescript
// Provider registered
Hooks.on('seasons-stars:contextProviderRegistered', (data) => {
  console.log('Provider registered:', data.name, 'by', data.moduleId);
});

// Provider unregistered  
Hooks.on('seasons-stars:contextProviderUnregistered', (data) => {
  console.log('Provider unregistered:', data.name, 'by', data.moduleId);
});
```

## Examples

See `src/examples/weather-context-provider.ts` for a complete working example of a sophisticated weather provider that demonstrates seasonal variation, widget-specific data, and proper integration patterns.