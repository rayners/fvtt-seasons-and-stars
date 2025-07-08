/**
 * Template Context Provider System
 *
 * Allows modules to register context providers that inject data into widget templates.
 * This enables rich integrations without modifying core widget code.
 *
 * Examples of providers:
 * - Season and weather data providers
 * - Moon phase providers  
 * - Game system specific providers (PF2e, D&D5e)
 * - Module integration providers (SimpleWeather, etc.)
 */

import { Logger } from './logger';
import type { SeasonsStarsCalendar } from '../types/calendar';
import { CalendarDate } from './calendar-date';

export interface TemplateContextProvider {
  /** Unique identifier for this provider */
  id: string;
  /** Module that registered this provider */
  moduleId: string;
  /** Human-readable name for debugging */
  name: string;
  /** Priority for provider ordering (higher = applied later) */
  priority: number;
  /** Widget types this provider supports */
  supports: Array<'main' | 'mini' | 'grid' | 'dialog'>;
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

export interface TemplateContextProviderRegistration {
  /** Human-readable name for debugging */
  name: string;
  /** Priority for provider ordering (higher = applied later) */
  priority?: number;
  /** Widget types this provider supports */
  supports?: Array<'main' | 'mini' | 'grid' | 'dialog'>;
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

/**
 * Registry for managing template context providers
 */
export class TemplateContextProviderRegistry {
  private static instance: TemplateContextProviderRegistry | null = null;
  private providers = new Map<string, TemplateContextProvider>();
  private providerCounter = 0;

  private constructor() {
    this.registerBuiltInProviders();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): TemplateContextProviderRegistry {
    if (!TemplateContextProviderRegistry.instance) {
      TemplateContextProviderRegistry.instance = new TemplateContextProviderRegistry();
    }
    return TemplateContextProviderRegistry.instance;
  }

  /**
   * Register a context provider
   */
  registerProvider(moduleId: string, registration: TemplateContextProviderRegistration): string {
    // Generate unique ID
    const id = `${moduleId}-provider-${++this.providerCounter}`;

    const provider: TemplateContextProvider = {
      id,
      moduleId,
      name: registration.name,
      priority: registration.priority ?? 50,
      supports: registration.supports ?? ['main', 'mini', 'grid', 'dialog'],
      provideContext: registration.provideContext,
      shouldApply: registration.shouldApply,
      description: registration.description,
    };

    this.providers.set(id, provider);

    Logger.info(`Template context provider registered: ${registration.name} by ${moduleId}`);

    // Emit hook for other modules to know about new provider
    Hooks.callAll('seasons-stars:contextProviderRegistered', {
      id,
      moduleId,
      name: registration.name,
      provider,
    });

    return id;
  }

  /**
   * Unregister a context provider
   */
  unregisterProvider(id: string, moduleId: string): boolean {
    const provider = this.providers.get(id);
    if (!provider) {
      return false;
    }

    // Only allow the registering module to unregister
    if (provider.moduleId !== moduleId) {
      Logger.warn(
        `Module ${moduleId} attempted to unregister provider ${id} owned by ${provider.moduleId}`
      );
      return false;
    }

    this.providers.delete(id);
    Logger.info(`Template context provider unregistered: ${provider.name} by ${moduleId}`);

    // Emit hook for cleanup
    Hooks.callAll('seasons-stars:contextProviderUnregistered', {
      id,
      moduleId,
      provider,
    });

    return true;
  }

  /**
   * Get all providers for a specific widget type
   */
  getProvidersFor(widgetType: string): TemplateContextProvider[] {
    const providers = Array.from(this.providers.values())
      .filter(provider => provider.supports.includes(widgetType as any))
      .sort((a, b) => a.priority - b.priority); // Lower priority first

    Logger.debug(`Found ${providers.length} providers for widget type: ${widgetType}`);
    return providers;
  }

  /**
   * Merge context from all applicable providers
   */
  async mergeContext(
    widgetType: string,
    baseContext: Record<string, any>,
    calendar: SeasonsStarsCalendar,
    currentDate: CalendarDate
  ): Promise<Record<string, any>> {
    const providers = this.getProvidersFor(widgetType);
    let mergedContext = { ...baseContext };

    Logger.debug(`Merging context for ${widgetType} with ${providers.length} providers`);

    for (const provider of providers) {
      try {
        // Check if provider should be applied
        if (provider.shouldApply && !provider.shouldApply(calendar, currentDate)) {
          Logger.debug(`Provider ${provider.name} skipped due to shouldApply condition`);
          continue;
        }

        Logger.debug(`Applying provider: ${provider.name} (priority: ${provider.priority})`);

        // Get context from provider
        const providerContext = await Promise.resolve(
          provider.provideContext(widgetType, mergedContext, calendar, currentDate)
        );

        if (providerContext && typeof providerContext === 'object') {
          // Merge provider context (later providers can override earlier ones)
          mergedContext = { ...mergedContext, ...providerContext };
          Logger.debug(`Provider ${provider.name} added context:`, Object.keys(providerContext));
        } else {
          Logger.debug(`Provider ${provider.name} returned no context`);
        }
      } catch (error) {
        Logger.error(
          `Error in context provider ${provider.name}:`,
          error instanceof Error ? error : new Error(String(error))
        );
        // Continue with other providers
      }
    }

    return mergedContext;
  }

  /**
   * Unregister all providers for a module (cleanup)
   */
  unregisterModuleProviders(moduleId: string): void {
    const providersToRemove = Array.from(this.providers.values()).filter(
      provider => provider.moduleId === moduleId
    );

    for (const provider of providersToRemove) {
      this.unregisterProvider(provider.id, moduleId);
    }

    if (providersToRemove.length > 0) {
      Logger.info(
        `Unregistered ${providersToRemove.length} context providers for module ${moduleId}`
      );
    }
  }

  /**
   * Get all registered providers
   */
  getAllProviders(): TemplateContextProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get debug information about registered providers
   */
  getDebugInfo() {
    return {
      providerCount: this.providers.size,
      providers: this.getAllProviders().map(p => ({
        id: p.id,
        name: p.name,
        moduleId: p.moduleId,
        priority: p.priority,
        supports: p.supports,
        hasCondition: !!p.shouldApply,
        description: p.description,
      })),
    };
  }

  /**
   * Register built-in context providers
   */
  private registerBuiltInProviders(): void {
    // Base calendar info provider (lowest priority)
    this.providers.set('base-calendar-info', {
      id: 'base-calendar-info',
      moduleId: 'seasons-and-stars',
      name: 'Base Calendar Information',
      priority: 10,
      supports: ['main', 'mini', 'grid', 'dialog'],
      provideContext: (_widgetType, baseContext, calendar, currentDate) => {
        return {
          // Ensure these base properties are always available
          calendarId: calendar.id,
          currentYear: currentDate.year,
          currentMonth: currentDate.month,
          currentDay: currentDate.day,
          weekdayIndex: currentDate.weekday,
          yearDay: currentDate.month * 30 + currentDate.day, // Simplified calculation
          isIntercalary: !!currentDate.intercalary,
        };
      },
      description: 'Provides fundamental calendar properties',
    });

    // Season information provider
    this.providers.set('season-info', {
      id: 'season-info',
      moduleId: 'seasons-and-stars',
      name: 'Season Information',
      priority: 20,
      supports: ['main', 'mini', 'grid'],
      provideContext: (_widgetType, baseContext, calendar, currentDate) => {
        if (!calendar.seasons || calendar.seasons.length === 0) {
          return {};
        }

        // Find current season (simplified logic for now)
        const currentSeason = calendar.seasons.find(season => {
          if (season.startMonth && season.endMonth) {
            return currentDate.month >= season.startMonth && currentDate.month <= season.endMonth;
          }
          return false;
        });

        if (currentSeason) {
          return {
            currentSeason: {
              name: currentSeason.name,
              icon: currentSeason.icon || currentSeason.name.toLowerCase(),
              description: currentSeason.description,
              startMonth: currentSeason.startMonth,
              endMonth: currentSeason.endMonth,
            },
          };
        }

        return {};
      },
      shouldApply: calendar => !!(calendar.seasons && calendar.seasons.length > 0),
      description: 'Provides current season information when available',
    });

    // Moon phase provider (placeholder for future implementation)
    this.providers.set('moon-phases', {
      id: 'moon-phases',
      moduleId: 'seasons-and-stars',
      name: 'Moon Phases',
      priority: 30,
      supports: ['main', 'grid'],
      provideContext: (_widgetType, baseContext, calendar, currentDate) => {
        if (!calendar.moons || calendar.moons.length === 0) {
          return {};
        }

        // Basic moon phase calculation (placeholder)
        const moonData = calendar.moons.map(moon => ({
          name: moon.name,
          phase: 'full', // Placeholder - would calculate actual phase
          icon: (moon as any).icon || 'moon',
          phaseIcon: 'fas fa-moon',
        }));

        return {
          moons: moonData,
          primaryMoon: moonData[0] || null,
        };
      },
      shouldApply: calendar => !!(calendar.moons && calendar.moons.length > 0),
      description: 'Provides moon phase information when calendar has moons',
    });

    Logger.debug('Built-in template context providers registered');
  }
}

/**
 * Global API for template context provider management
 */
export const templateContextProviders = {
  /**
   * Register a context provider
   */
  register(moduleId: string, registration: TemplateContextProviderRegistration): string {
    return TemplateContextProviderRegistry.getInstance().registerProvider(moduleId, registration);
  },

  /**
   * Unregister a context provider
   */
  unregister(id: string, moduleId: string): boolean {
    return TemplateContextProviderRegistry.getInstance().unregisterProvider(id, moduleId);
  },

  /**
   * Get all providers for a widget type
   */
  getProvidersFor(widgetType: string): TemplateContextProvider[] {
    return TemplateContextProviderRegistry.getInstance().getProvidersFor(widgetType);
  },

  /**
   * Merge context from all applicable providers
   */
  mergeContext(
    widgetType: string,
    baseContext: Record<string, any>,
    calendar: SeasonsStarsCalendar,
    currentDate: CalendarDate
  ): Promise<Record<string, any>> {
    return TemplateContextProviderRegistry.getInstance().mergeContext(
      widgetType,
      baseContext,
      calendar,
      currentDate
    );
  },

  /**
   * Get debug information
   */
  getDebugInfo() {
    return TemplateContextProviderRegistry.getInstance().getDebugInfo();
  },
};