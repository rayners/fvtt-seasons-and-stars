/**
 * Example Weather Context Provider
 * 
 * This example demonstrates how external modules can register template context
 * providers to add weather information to calendar widgets.
 * 
 * Usage:
 * ```typescript
 * import { templateContextProviders } from 'game.seasonsStars.templateContextProviders';
 * import { WeatherContextProvider } from './weather-context-provider';
 * 
 * // Register the provider
 * const providerId = templateContextProviders.register('my-weather-module', 
 *   new WeatherContextProvider()
 * );
 * ```
 */

import type { TemplateContextProviderRegistration } from '../core/template-context-provider';
import type { SeasonsStarsCalendar } from '../types/calendar';
import { CalendarDate } from '../core/calendar-date';

export interface WeatherData {
  condition: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  icon: string;
  description: string;
}

export interface SeasonalWeatherConfig {
  /** Temperature range for this season */
  temperatureRange: [number, number];
  /** Common weather conditions for this season */
  conditions: Array<{
    name: string;
    probability: number;
    icon: string;
    description: string;
  }>;
  /** Humidity range for this season */
  humidityRange: [number, number];
  /** Wind speed range for this season */
  windRange: [number, number];
}

/**
 * Example weather context provider that adds seasonal weather data to templates
 */
export class WeatherContextProvider implements TemplateContextProviderRegistration {
  name = 'Weather Information';
  priority = 40; // Apply after seasons but before UI-specific providers
  supports: Array<'main' | 'mini' | 'grid' | 'dialog'> = ['main', 'grid']; // Only main and grid widgets show weather
  description = 'Provides seasonal weather information for calendar widgets';

  private weatherConfig = new Map<string, SeasonalWeatherConfig>([
    ['spring', {
      temperatureRange: [50, 70],
      conditions: [
        { name: 'Partly Cloudy', probability: 0.4, icon: 'fas fa-cloud-sun', description: 'Mild with scattered clouds' },
        { name: 'Rainy', probability: 0.3, icon: 'fas fa-cloud-rain', description: 'Spring showers' },
        { name: 'Sunny', probability: 0.2, icon: 'fas fa-sun', description: 'Clear and pleasant' },
        { name: 'Overcast', probability: 0.1, icon: 'fas fa-cloud', description: 'Cloudy skies' },
      ],
      humidityRange: [60, 80],
      windRange: [5, 15],
    }],
    ['summer', {
      temperatureRange: [70, 95],
      conditions: [
        { name: 'Sunny', probability: 0.5, icon: 'fas fa-sun', description: 'Hot and clear' },
        { name: 'Partly Cloudy', probability: 0.2, icon: 'fas fa-cloud-sun', description: 'Warm with some clouds' },
        { name: 'Thunderstorm', probability: 0.2, icon: 'fas fa-bolt', description: 'Afternoon storms' },
        { name: 'Hazy', probability: 0.1, icon: 'fas fa-smog', description: 'Hot and humid' },
      ],
      humidityRange: [40, 70],
      windRange: [3, 12],
    }],
    ['autumn', {
      temperatureRange: [40, 65],
      conditions: [
        { name: 'Crisp', probability: 0.3, icon: 'fas fa-leaf', description: 'Cool and clear' },
        { name: 'Overcast', probability: 0.3, icon: 'fas fa-cloud', description: 'Gray autumn skies' },
        { name: 'Drizzle', probability: 0.2, icon: 'fas fa-cloud-drizzle', description: 'Light rain' },
        { name: 'Windy', probability: 0.2, icon: 'fas fa-wind', description: 'Blustery conditions' },
      ],
      humidityRange: [50, 75],
      windRange: [8, 20],
    }],
    ['winter', {
      temperatureRange: [20, 45],
      conditions: [
        { name: 'Snow', probability: 0.3, icon: 'fas fa-snowflake', description: 'Snow falling' },
        { name: 'Clear Cold', probability: 0.3, icon: 'fas fa-sun', description: 'Cold but clear' },
        { name: 'Overcast', probability: 0.2, icon: 'fas fa-cloud', description: 'Gray winter skies' },
        { name: 'Blizzard', probability: 0.1, icon: 'fas fa-wind', description: 'Heavy snow and wind' },
        { name: 'Freezing Rain', probability: 0.1, icon: 'fas fa-icicles', description: 'Icy conditions' },
      ],
      humidityRange: [30, 60],
      windRange: [5, 25],
    }],
  ]);

  shouldApply(calendar: SeasonsStarsCalendar, currentDate: CalendarDate): boolean {
    // Only apply weather to calendars that have seasons defined
    return !!(calendar.seasons && calendar.seasons.length > 0);
  }

  provideContext(
    widgetType: string,
    baseContext: Record<string, any>,
    calendar: SeasonsStarsCalendar,
    currentDate: CalendarDate
  ): Record<string, any> {
    // Get current season from base context (provided by built-in season provider)
    const currentSeason = baseContext.currentSeason;
    if (!currentSeason) {
      return {}; // No season data available
    }

    // Generate weather data for the current season
    const weather = this.generateWeatherForSeason(currentSeason.name.toLowerCase(), currentDate);

    // Provide different detail levels based on widget type
    if (widgetType === 'main') {
      // Main widget gets full weather details
      return {
        weather: weather,
        weatherSummary: `${weather.condition}, ${weather.temperature}°F`,
        showWeatherIcon: true,
        weatherTooltip: `${weather.description}. Humidity: ${weather.humidity}%, Wind: ${weather.windSpeed} mph`,
      };
    } else if (widgetType === 'grid') {
      // Grid widget gets minimal weather info
      return {
        weatherIcon: weather.icon,
        weatherCondition: weather.condition,
        weatherTemp: weather.temperature,
      };
    }

    return {};
  }

  private generateWeatherForSeason(seasonName: string, currentDate: CalendarDate): WeatherData {
    const config = this.weatherConfig.get(seasonName);
    if (!config) {
      // Fallback for unknown seasons
      return {
        condition: 'Unknown',
        temperature: 60,
        humidity: 50,
        windSpeed: 10,
        icon: 'fas fa-question',
        description: 'Weather data unavailable',
      };
    }

    // Use date as seed for consistent weather per day
    const seed = this.createSeed(currentDate);
    
    // Generate deterministic but varying weather
    const condition = this.selectWeightedCondition(config.conditions, seed);
    const temperature = this.generateInRange(config.temperatureRange, seed * 1.1);
    const humidity = this.generateInRange(config.humidityRange, seed * 1.2);
    const windSpeed = this.generateInRange(config.windRange, seed * 1.3);

    return {
      condition: condition.name,
      temperature: Math.round(temperature),
      humidity: Math.round(humidity),
      windSpeed: Math.round(windSpeed * 10) / 10, // One decimal place
      icon: condition.icon,
      description: condition.description,
    };
  }

  private createSeed(date: CalendarDate): number {
    // Create a deterministic seed based on the date
    // This ensures weather is consistent for the same date
    return (date.year * 10000 + date.month * 100 + date.day) % 1000 / 1000;
  }

  private selectWeightedCondition(
    conditions: Array<{ name: string; probability: number; icon: string; description: string }>,
    seed: number
  ): { name: string; probability: number; icon: string; description: string } {
    let cumulative = 0;
    for (const condition of conditions) {
      cumulative += condition.probability;
      if (seed <= cumulative) {
        return condition;
      }
    }
    // Fallback to last condition if probabilities don't sum to 1
    return conditions[conditions.length - 1];
  }

  private generateInRange(range: [number, number], seed: number): number {
    const [min, max] = range;
    return min + (max - min) * seed;
  }
}

/**
 * Example integration code for external modules
 */
export function registerWeatherProvider(moduleId: string): string {
  // Access the template context provider system through the global API
  const providers = (game as any).seasonsStars?.templateContextProviders;
  
  if (!providers) {
    console.warn(`${moduleId}: Seasons & Stars template context providers not available`);
    return '';
  }

  // Register the weather provider
  const provider = new WeatherContextProvider();
  const providerId = providers.register(moduleId, provider);

  console.log(`${moduleId}: Registered weather context provider with ID: ${providerId}`);
  return providerId;
}

/**
 * Example cleanup code for external modules
 */
export function unregisterWeatherProvider(moduleId: string, providerId: string): boolean {
  const providers = (game as any).seasonsStars?.templateContextProviders;
  
  if (!providers) {
    return false;
  }

  return providers.unregister(providerId, moduleId);
}