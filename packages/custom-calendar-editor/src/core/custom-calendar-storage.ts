/**
 * Storage and management of custom calendars
 */

import { Logger } from './logger';
import type { SeasonsStarsCalendar } from '../types/calendar';

export interface CustomCalendarData {
  [calendarId: string]: SeasonsStarsCalendar;
}

export class CustomCalendarStorage {
  private customCalendars: CustomCalendarData = {};
  
  /**
   * Load custom calendars from world settings
   */
  async loadCustomCalendars(): Promise<void> {
    try {
      const stored = game.settings.get('seasons-and-stars-custom-calendar-editor', 'customCalendars') as CustomCalendarData;
      this.customCalendars = stored || {};
      
      Logger.info(`Loaded ${Object.keys(this.customCalendars).length} custom calendars`);
    } catch (error) {
      Logger.error('Failed to load custom calendars:', error);
      this.customCalendars = {};
    }
  }
  
  /**
   * Save custom calendars to world settings
   */
  async saveCustomCalendars(): Promise<void> {
    try {
      await game.settings.set('seasons-and-stars-custom-calendar-editor', 'customCalendars', this.customCalendars);
      Logger.debug('Custom calendars saved to settings');
    } catch (error) {
      Logger.error('Failed to save custom calendars:', error);
      throw error;
    }
  }
  
  /**
   * Get all custom calendars
   */
  getCustomCalendars(): CustomCalendarData {
    return { ...this.customCalendars };
  }
  
  /**
   * Get a specific custom calendar
   */
  getCustomCalendar(calendarId: string): SeasonsStarsCalendar | null {
    return this.customCalendars[calendarId] || null;
  }
  
  /**
   * Check if a calendar is a custom calendar
   */
  isCustomCalendar(calendarId: string): boolean {
    return calendarId in this.customCalendars;
  }
  
  /**
   * Save a custom calendar
   */
  async saveCustomCalendar(calendar: SeasonsStarsCalendar): Promise<void> {
    // Validate calendar
    if (!calendar.id) {
      throw new Error('Calendar must have an ID');
    }
    
    // Generate unique ID if needed
    if (this.customCalendars[calendar.id]) {
      calendar.id = this.generateUniqueId(calendar.id);
    }
    
    // Store calendar
    this.customCalendars[calendar.id] = { ...calendar };
    
    // Save to settings
    await this.saveCustomCalendars();
    
    Logger.info(`Saved custom calendar: ${calendar.id}`);
  }
  
  /**
   * Update an existing custom calendar
   */
  async updateCustomCalendar(calendarId: string, calendar: SeasonsStarsCalendar): Promise<void> {
    if (!this.customCalendars[calendarId]) {
      throw new Error(`Custom calendar ${calendarId} not found`);
    }
    
    // Preserve original ID
    calendar.id = calendarId;
    
    // Update calendar
    this.customCalendars[calendarId] = { ...calendar };
    
    // Save to settings
    await this.saveCustomCalendars();
    
    Logger.info(`Updated custom calendar: ${calendarId}`);
  }
  
  /**
   * Delete a custom calendar
   */
  async deleteCustomCalendar(calendarId: string): Promise<void> {
    if (!this.customCalendars[calendarId]) {
      throw new Error(`Custom calendar ${calendarId} not found`);
    }
    
    delete this.customCalendars[calendarId];
    
    // Save to settings
    await this.saveCustomCalendars();
    
    Logger.info(`Deleted custom calendar: ${calendarId}`);
  }
  
  /**
   * Create a variant of an existing calendar
   */
  async createCalendarVariant(baseCalendarId: string, variantName: string): Promise<SeasonsStarsCalendar> {
    const baseCalendar = this.getCustomCalendar(baseCalendarId);
    if (!baseCalendar) {
      throw new Error(`Base calendar ${baseCalendarId} not found`);
    }
    
    // Create variant calendar
    const variant: SeasonsStarsCalendar = {
      ...JSON.parse(JSON.stringify(baseCalendar)), // Deep clone
      id: this.generateUniqueId(baseCalendarId + '-variant'),
      name: variantName,
      label: variantName
    };
    
    // Update translations
    if (variant.translations) {
      Object.keys(variant.translations).forEach(lang => {
        variant.translations[lang].label = variantName;
      });
    }
    
    // Save variant
    await this.saveCustomCalendar(variant);
    
    return variant;
  }
  
  /**
   * Generate a unique calendar ID
   */
  private generateUniqueId(baseId: string): string {
    let counter = 1;
    let newId = baseId;
    
    while (this.customCalendars[newId]) {
      newId = `${baseId}-${counter}`;
      counter++;
    }
    
    return newId;
  }
  
  /**
   * Import a calendar from external data
   */
  async importCalendar(calendarData: SeasonsStarsCalendar, name?: string): Promise<string> {
    // Create a copy with unique ID
    const importedCalendar: SeasonsStarsCalendar = {
      ...JSON.parse(JSON.stringify(calendarData)),
      id: this.generateUniqueId(calendarData.id || 'imported-calendar')
    };
    
    // Update name if provided
    if (name) {
      importedCalendar.name = name;
      importedCalendar.label = name;
      
      // Update translations
      if (importedCalendar.translations) {
        Object.keys(importedCalendar.translations).forEach(lang => {
          importedCalendar.translations[lang].label = name;
        });
      }
    }
    
    // Save imported calendar
    await this.saveCustomCalendar(importedCalendar);
    
    return importedCalendar.id;
  }
  
  /**
   * Export a calendar as JSON
   */
  exportCalendar(calendarId: string, formatted: boolean = true): string {
    const calendar = this.getCustomCalendar(calendarId);
    if (!calendar) {
      throw new Error(`Calendar ${calendarId} not found`);
    }
    
    if (formatted) {
      return JSON.stringify(calendar, null, 2);
    } else {
      return JSON.stringify(calendar);
    }
  }
  
  /**
   * Get calendar statistics
   */
  getCalendarStats(calendarId: string): object {
    const calendar = this.getCustomCalendar(calendarId);
    if (!calendar) {
      throw new Error(`Calendar ${calendarId} not found`);
    }
    
    return {
      id: calendar.id,
      name: calendar.name || calendar.label,
      monthCount: calendar.months?.length || 0,
      weekdayCount: calendar.weekdays?.length || 0,
      intercalaryCount: calendar.intercalary?.length || 0,
      seasonCount: calendar.seasons?.length || 0,
      moonCount: calendar.moons?.length || 0,
      hasLeapYear: calendar.leapYear?.rule !== 'none',
      hoursInDay: calendar.time?.hoursInDay || 24
    };
  }
}