/**
 * Calendar localization utilities for Seasons & Stars
 */

import type {
  SeasonsStarsCalendar,
  CalendarMonth,
  CalendarWeekday,
  CalendarIntercalary,
} from '../types/calendar';

export class CalendarLocalization {
  /**
   * Get the current language code from Foundry
   */
  private static getCurrentLanguage(): string {
    // Default to English if no game object available (testing)
    if (typeof game === 'undefined') return 'en';

    // Use Foundry's language setting
    return game.i18n?.lang || 'en';
  }

  /**
   * Get translated calendar label
   */
  static getCalendarLabel(calendar: SeasonsStarsCalendar): string {
    const lang = this.getCurrentLanguage();

    // Try current language first
    if (calendar.translations[lang]?.label) {
      return calendar.translations[lang].label;
    }

    // Fall back to English
    if (calendar.translations.en?.label) {
      return calendar.translations.en.label;
    }

    // Last resort: use calendar ID
    return calendar.id;
  }

  /**
   * Get translated calendar description
   */
  static getCalendarDescription(calendar: SeasonsStarsCalendar): string | undefined {
    const lang = this.getCurrentLanguage();

    // Try current language first
    if (calendar.translations[lang]?.description) {
      return calendar.translations[lang].description;
    }

    // Fall back to English
    return calendar.translations.en?.description;
  }

  /**
   * Get translated calendar setting
   */
  static getCalendarSetting(calendar: SeasonsStarsCalendar): string | undefined {
    const lang = this.getCurrentLanguage();

    // Try current language first
    if (calendar.translations[lang]?.setting) {
      return calendar.translations[lang].setting;
    }

    // Fall back to English
    return calendar.translations.en?.setting;
  }

  /**
   * Get translated month description
   */
  static getMonthDescription(month: CalendarMonth): string | undefined {
    const lang = this.getCurrentLanguage();

    // Try translated description first
    if (month.translations?.[lang]?.description) {
      return month.translations[lang].description;
    }

    // Fall back to English translation
    if (month.translations?.en?.description) {
      return month.translations.en.description;
    }

    // Fall back to base description
    return month.description;
  }

  /**
   * Get translated weekday description
   */
  static getWeekdayDescription(weekday: CalendarWeekday): string | undefined {
    const lang = this.getCurrentLanguage();

    // Try translated description first
    if (weekday.translations?.[lang]?.description) {
      return weekday.translations[lang].description;
    }

    // Fall back to English translation
    if (weekday.translations?.en?.description) {
      return weekday.translations.en.description;
    }

    // Fall back to base description
    return weekday.description;
  }

  /**
   * Get translated intercalary description
   */
  static getIntercalaryDescription(intercalary: CalendarIntercalary): string | undefined {
    const lang = this.getCurrentLanguage();

    // Try translated description first
    if (intercalary.translations?.[lang]?.description) {
      return intercalary.translations[lang].description;
    }

    // Fall back to English translation
    if (intercalary.translations?.en?.description) {
      return intercalary.translations.en.description;
    }

    // Fall back to base description
    return intercalary.description;
  }

  /**
   * Get all available languages for a calendar
   */
  static getAvailableLanguages(calendar: SeasonsStarsCalendar): string[] {
    return Object.keys(calendar.translations);
  }

  /**
   * Check if a calendar has translations for a specific language
   */
  static hasLanguage(calendar: SeasonsStarsCalendar, language: string): boolean {
    return language in calendar.translations;
  }

  /**
   * Create a localized calendar object for UI display
   */
  static getLocalizedCalendarInfo(calendar: SeasonsStarsCalendar): {
    id: string;
    label: string;
    description: string;
    setting: string;
    availableLanguages: string[];
    currentLanguage: string;
  } {
    return {
      id: calendar.id,
      label: this.getCalendarLabel(calendar),
      description: this.getCalendarDescription(calendar) || '',
      setting: this.getCalendarSetting(calendar) || '',
      availableLanguages: this.getAvailableLanguages(calendar),
      currentLanguage: this.getCurrentLanguage(),
    };
  }

  /**
   * Get translated name for a calendar element (month, weekday, etc.)
   */
  static getCalendarTranslation(
    calendar: SeasonsStarsCalendar,
    path: string,
    fallback: string
  ): string {
    const lang = this.getCurrentLanguage();
    const pathParts = path.split('.');

    if (pathParts.length !== 2) {
      return fallback;
    }

    const [type, id] = pathParts;

    // Try current language first
    if (calendar.translations[lang]) {
      const translation =
        calendar.translations[lang][type as keyof (typeof calendar.translations)[typeof lang]];
      if (translation && typeof translation === 'object' && id in translation) {
        return (translation as any)[id];
      }
    }

    // Fall back to English
    if (calendar.translations.en) {
      const translation = calendar.translations.en[type as keyof typeof calendar.translations.en];
      if (translation && typeof translation === 'object' && id in translation) {
        return (translation as any)[id];
      }
    }

    // Last resort: use fallback
    return fallback;
  }

  /**
   * Create settings choices for calendar selection
   */
  static createCalendarChoices(calendars: SeasonsStarsCalendar[]): { [key: string]: string } {
    const choices: { [key: string]: string } = {};

    // Sort calendars alphabetically by their display labels
    const sortedCalendars = [...calendars].sort((a, b) => {
      const labelA = this.getCalendarLabel(a);
      const labelB = this.getCalendarLabel(b);
      return labelA.localeCompare(labelB);
    });

    for (const calendar of sortedCalendars) {
      choices[calendar.id] = this.getCalendarLabel(calendar);
    }

    return choices;
  }
}
