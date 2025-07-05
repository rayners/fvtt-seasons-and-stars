/**
 * Example: Weather Module Integration with Seasons & Stars
 *
 * This example demonstrates how an external weather module could integrate
 * with Seasons & Stars widgets to display weather information.
 *
 * This is example code that shows the pattern - it would be implemented
 * in the external weather module, not in Seasons & Stars itself.
 */

// This would be in the external weather module's code
export class WeatherIntegrationExample {
  private contextAPI: any;
  private extensionIds: string[] = [];
  private hookIds: string[] = [];

  /**
   * Initialize weather integration with Seasons & Stars
   */
  async initialize() {
    // Check if Seasons & Stars is available
    if (!game.seasonsStars?.widgets?.createContextAPI) {
      console.log('Seasons & Stars not available - skipping integration');
      return;
    }

    try {
      // Create scoped API for this module
      this.contextAPI = game.seasonsStars.widgets.createContextAPI('simple-weather');

      // Register our extensions and hooks
      this.registerWeatherExtensions();
      this.registerWeatherHooks();

      console.log('Weather integration with Seasons & Stars initialized successfully');
    } catch (error) {
      console.error('Failed to initialize weather integration:', error);
    }
  }

  /**
   * Register weather data extensions for different widget types
   */
  private registerWeatherExtensions() {
    // Universal weather extension - adds basic weather to all widgets
    const universalId = this.contextAPI.registerExtension({
      priority: 10,
      widgetTypes: ['*'],
      extensionFunction: this.addBasicWeatherData.bind(this),
      metadata: {
        name: 'Universal Weather Data',
        description: 'Adds basic weather information to all S&S widgets',
        version: '1.0.0',
        author: 'Simple Weather Module',
      },
    });
    this.extensionIds.push(universalId);

    // Enhanced weather for main widget
    const mainId = this.contextAPI.registerExtension({
      priority: 15,
      widgetTypes: ['main'],
      extensionFunction: this.addDetailedWeatherData.bind(this),
      metadata: {
        name: 'Detailed Weather for Main Widget',
        description: 'Adds detailed weather information to the main calendar widget',
      },
    });
    this.extensionIds.push(mainId);

    // Weather forecast for grid widget
    const gridId = this.contextAPI.registerExtension({
      priority: 20,
      widgetTypes: ['grid'],
      extensionFunction: this.addWeatherForecast.bind(this),
      metadata: {
        name: 'Weather Forecast for Grid',
        description: 'Adds weather forecast data to the calendar grid widget',
      },
    });
    this.extensionIds.push(gridId);
  }

  /**
   * Register weather-related hooks
   */
  private registerWeatherHooks() {
    // Pre-processing hook to ensure weather data is fresh
    const beforeId = this.contextAPI.registerHook({
      phase: 'before',
      widgetTypes: ['*'],
      hookFunction: this.refreshWeatherIfNeeded.bind(this),
    });
    this.hookIds.push(beforeId);

    // Post-processing hook for debugging
    const afterId = this.contextAPI.registerHook({
      phase: 'after',
      widgetTypes: ['*'],
      hookFunction: this.logWeatherContext.bind(this),
    });
    this.hookIds.push(afterId);
  }

  /**
   * Add basic weather data to context
   */
  private addBasicWeatherData(context: any, widgetType: string): any {
    const weather = this.getCurrentWeather();

    if (!weather) return context;

    return {
      ...context,
      weather: {
        temperature: weather.temperature,
        condition: weather.condition,
        icon: weather.icon,
        description: weather.description,
        // Add widget type for template logic
        displayMode: this.getDisplayModeForWidget(widgetType),
      },
    };
  }

  /**
   * Add detailed weather data for main widget
   */
  private addDetailedWeatherData(context: any, widgetType: string): any {
    if (widgetType !== 'main') return context;

    const weather = this.getCurrentWeather();
    const details = this.getWeatherDetails();

    if (!weather || !details) return context;

    return {
      ...context,
      weather: {
        ...context.weather, // Preserve basic weather data
        humidity: details.humidity,
        windSpeed: details.windSpeed,
        windDirection: details.windDirection,
        pressure: details.pressure,
        visibility: details.visibility,
        uvIndex: details.uvIndex,
        showDetails: true,
      },
    };
  }

  /**
   * Add weather forecast for grid widget
   */
  private async addWeatherForecast(context: any, widgetType: string): Promise<any> {
    if (widgetType !== 'grid') return context;

    try {
      const forecast = await this.getWeatherForecast(7); // 7-day forecast

      if (!forecast) return context;

      return {
        ...context,
        weather: {
          ...context.weather, // Preserve existing weather data
          forecast: forecast,
          showForecast: true,
          forecastDays: forecast.length,
        },
      };
    } catch (error) {
      console.error('Failed to load weather forecast:', error);
      return context;
    }
  }

  /**
   * Hook: Refresh weather data if it's stale
   */
  private refreshWeatherIfNeeded(_context: any, _widgetType: string, _phase: string): void {
    if (this.isWeatherDataStale()) {
      console.log('Weather data is stale, refreshing...');
      this.refreshWeatherData();
    }
  }

  /**
   * Hook: Log weather context for debugging
   */
  private logWeatherContext(context: any, widgetType: string, _phase: string): void {
    if (game.settings?.get('simple-weather', 'debugMode')) {
      console.log(`Weather context for ${widgetType} widget:`, context.weather);
    }
  }

  /**
   * Get display mode based on widget type
   */
  private getDisplayModeForWidget(widgetType: string): string {
    switch (widgetType) {
      case 'mini':
        return 'compact';
      case 'main':
        return 'standard';
      case 'grid':
        return 'detailed';
      default:
        return 'basic';
    }
  }

  /**
   * Mock weather API methods (would be real in actual weather module)
   */
  private getCurrentWeather() {
    // This would call the actual weather module's API
    return {
      temperature: 72,
      condition: 'partly-cloudy',
      icon: 'wi-day-cloudy',
      description: 'Partly cloudy with a chance of adventure',
    };
  }

  private getWeatherDetails() {
    return {
      humidity: 65,
      windSpeed: 8,
      windDirection: 'NW',
      pressure: 30.12,
      visibility: 10,
      uvIndex: 6,
    };
  }

  private async getWeatherForecast(days: number) {
    // Simulate async forecast fetching
    return Array.from({ length: days }, (_, i) => ({
      date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
      temperature: { high: 75 + i, low: 55 + i },
      condition: i % 2 === 0 ? 'sunny' : 'cloudy',
      icon: i % 2 === 0 ? 'wi-day-sunny' : 'wi-cloudy',
      precipitation: Math.random() * 100,
    }));
  }

  private isWeatherDataStale(): boolean {
    // Check if weather data needs refreshing
    return false; // Mock implementation
  }

  private refreshWeatherData(): void {
    // Refresh weather data from API
    console.log('Refreshing weather data...');
  }

  /**
   * Clean up integration when module is disabled
   */
  cleanup() {
    if (this.contextAPI) {
      this.contextAPI.cleanup();
      console.log('Weather integration cleaned up');
    }
  }
}

// Example usage in an external weather module:
/*
// In the weather module's init hook:
Hooks.once('seasons-stars:ready', () => {
  const weatherIntegration = new WeatherIntegrationExample();
  weatherIntegration.initialize();
  
  // Store reference for cleanup
  game.simpleWeather.seasonsStarsIntegration = weatherIntegration;
});

// In the weather module's cleanup:
Hooks.once('destroy', () => {
  if (game.simpleWeather?.seasonsStarsIntegration) {
    game.simpleWeather.seasonsStarsIntegration.cleanup();
  }
});
*/
