/**
 * Events API
 *
 * Public API for calendar events, exposed via game.seasonsStars.api.events
 * Provides methods for retrieving events, managing world-level customizations,
 * and integrating with journal entries.
 */

import { Logger } from './logger';
import type { EventsManager } from './events-manager';
import type { CalendarEvent, EventOccurrence, WorldEventSettings } from '../types/calendar';

/**
 * Public Events API
 *
 * Provides access to calendar events and world-level event management.
 * Available via `game.seasonsStars.api.events`
 *
 * @example
 * // Get all events for a specific date
 * const events = game.seasonsStars.api.events.getEventsForDate(2024, 7, 4);
 *
 * @example
 * // Add a custom world event (GM only)
 * await game.seasonsStars.api.events.setWorldEvent({
 *   id: 'my-custom-event',
 *   name: 'Custom Event',
 *   recurrence: { type: 'fixed', month: 6, day: 15 },
 * });
 */
export class EventsAPI {
  constructor(private getEventsManager: () => EventsManager | null) {}

  /**
   * Get all events occurring on a specific date
   *
   * Returns event occurrences with full context (event + date) ready for
   * hook consumers and UI display. No manual transformation needed.
   *
   * @param year The year to check
   * @param month The month to check (1-based)
   * @param day The day to check
   * @returns Array of event occurrences on this date
   *
   * @example
   * // Get events for July 4th, 2024
   * const occurrences = game.seasonsStars.api.events.getEventsForDate(2024, 7, 4);
   * occurrences.forEach(occ => {
   *   console.log(`${occ.event.name} on ${occ.month}/${occ.day}/${occ.year}`);
   * });
   */
  getEventsForDate(year: number, month: number, day: number): EventOccurrence[] {
    const manager = this.getEventsManager();
    if (!manager) {
      Logger.warn('Events manager not initialized');
      return [];
    }

    return manager.getEventsForDate(year, month, day);
  }

  /**
   * Get all event occurrences in a date range
   *
   * Returns events with their computed occurrence dates
   *
   * @param startYear Start year
   * @param startMonth Start month (1-based)
   * @param startDay Start day
   * @param endYear End year
   * @param endMonth End month (1-based)
   * @param endDay End day
   * @returns Array of event occurrences with computed dates
   *
   * @example
   * // Get all events in January 2024
   * const occurrences = game.seasonsStars.api.events.getEventsInRange(
   *   2024, 1, 1,
   *   2024, 1, 31
   * );
   * occurrences.forEach(occ => {
   *   console.log(`${occ.event.name} on ${occ.month}/${occ.day}/${occ.year}`);
   * });
   */
  getEventsInRange(
    startYear: number,
    startMonth: number,
    startDay: number,
    endYear: number,
    endMonth: number,
    endDay: number
  ): EventOccurrence[] {
    const manager = this.getEventsManager();
    if (!manager) {
      Logger.warn('Events manager not initialized');
      return [];
    }

    return manager.getEventsInRange(startYear, startMonth, startDay, endYear, endMonth, endDay);
  }

  /**
   * Get next occurrence of a specific event after given date
   *
   * @param eventId The event ID
   * @param afterYear Year to search after
   * @param afterMonth Month to search after (1-based)
   * @param afterDay Day to search after
   * @returns Next occurrence or null if none found
   *
   * @example
   * // Find when New Year's Day occurs next after today
   * const next = game.seasonsStars.api.events.getNextOccurrence(
   *   'new-year',
   *   2024, 6, 15
   * );
   * console.log(next); // { event: {...}, year: 2025, month: 1, day: 1 }
   */
  getNextOccurrence(
    eventId: string,
    afterYear: number,
    afterMonth: number,
    afterDay: number
  ): EventOccurrence | null {
    const manager = this.getEventsManager();
    if (!manager) {
      Logger.warn('Events manager not initialized');
      return null;
    }

    return manager.getNextOccurrence(eventId, afterYear, afterMonth, afterDay);
  }

  /**
   * Check if a specific date has any events (fast check)
   *
   * @param year The year to check
   * @param month The month to check (1-based)
   * @param day The day to check
   * @returns true if the date has events
   *
   * @example
   * if (game.seasonsStars.api.events.hasEventsOnDate(2024, 7, 4)) {
   *   console.log('This date has events!');
   * }
   */
  hasEventsOnDate(year: number, month: number, day: number): boolean {
    const manager = this.getEventsManager();
    if (!manager) {
      return false;
    }

    return manager.hasEventsOnDate(year, month, day);
  }

  /**
   * Get all event definitions (merged calendar + world)
   *
   * Returns the complete list of events after merging calendar-defined
   * events with world customizations and removing disabled events.
   *
   * @returns Array of all active events
   *
   * @example
   * const allEvents = game.seasonsStars.api.events.getAllEvents();
   * allEvents.forEach(event => {
   *   console.log(`${event.name}: ${event.description}`);
   * });
   */
  getAllEvents(): CalendarEvent[] {
    const manager = this.getEventsManager();
    if (!manager) {
      Logger.warn('Events manager not initialized');
      return [];
    }

    return manager.getAllEvents();
  }

  /**
   * Get event definition by ID
   *
   * @param eventId The event ID
   * @returns Event definition or null if not found
   *
   * @example
   * const event = game.seasonsStars.api.events.getEvent('new-year');
   * console.log(event?.name); // "New Year's Day"
   */
  getEvent(eventId: string): CalendarEvent | null {
    const manager = this.getEventsManager();
    if (!manager) {
      Logger.warn('Events manager not initialized');
      return null;
    }

    return manager.getEvent(eventId);
  }

  /**
   * Set world-level event (GM only)
   *
   * Adds new event or fully replaces existing event by ID.
   * Can be used to override calendar-defined events or add world-specific events.
   *
   * @param event The event to add or update
   * @throws Error if not GM
   *
   * @example
   * // Add a new custom event
   * await game.seasonsStars.api.events.setWorldEvent({
   *   id: 'harvest-festival',
   *   name: 'Harvest Festival',
   *   description: 'Annual celebration of the harvest',
   *   recurrence: { type: 'fixed', month: 9, day: 15 },
   *   color: '#ff8800',
   * });
   *
   * @example
   * // Override a calendar event
   * await game.seasonsStars.api.events.setWorldEvent({
   *   id: 'new-year',
   *   name: 'New Year Celebration',
   *   description: 'Modified description',
   *   recurrence: { type: 'fixed', month: 1, day: 1 },
   * });
   */
  async setWorldEvent(event: CalendarEvent): Promise<void> {
    if (!game.user?.isGM) {
      throw new Error('Only GMs can modify world events');
    }

    try {
      // Get current world event settings
      const currentSettings = (game.settings?.get('seasons-and-stars', 'worldEvents') || {
        events: [],
        disabledEventIds: [],
      }) as WorldEventSettings;

      // Find if event already exists in world settings
      const existingIndex = currentSettings.events.findIndex(e => e.id === event.id);

      if (existingIndex >= 0) {
        // Replace existing world event
        currentSettings.events[existingIndex] = event;
      } else {
        // Add new world event
        currentSettings.events.push(event);
      }

      // Save updated settings
      await game.settings?.set('seasons-and-stars', 'worldEvents', currentSettings);

      Logger.info(`World event ${event.id} updated`);

      // Trigger calendar refresh
      Hooks.callAll('seasons-stars:worldEventsChanged', currentSettings);
    } catch (error) {
      Logger.error(
        'Failed to set world event',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Remove world event override/addition (GM only)
   *
   * If event ID was a calendar event, it will reappear from calendar definition.
   * If event ID was world-only, it will be completely removed.
   *
   * @param eventId The event ID to remove
   * @throws Error if not GM
   *
   * @example
   * // Remove a world event customization
   * await game.seasonsStars.api.events.removeWorldEvent('harvest-festival');
   */
  async removeWorldEvent(eventId: string): Promise<void> {
    if (!game.user?.isGM) {
      throw new Error('Only GMs can modify world events');
    }

    try {
      const currentSettings = (game.settings?.get('seasons-and-stars', 'worldEvents') || {
        events: [],
        disabledEventIds: [],
      }) as WorldEventSettings;

      // Remove from world events
      currentSettings.events = currentSettings.events.filter(e => e.id !== eventId);

      await game.settings?.set('seasons-and-stars', 'worldEvents', currentSettings);

      Logger.info(`World event ${eventId} removed`);

      Hooks.callAll('seasons-stars:worldEventsChanged', currentSettings);
    } catch (error) {
      Logger.error(
        'Failed to remove world event',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Hide a calendar-defined event (GM only)
   *
   * Adds to disabledEventIds list
   *
   * @param eventId The calendar event ID to disable
   * @throws Error if not GM
   *
   * @example
   * // Hide a calendar event
   * await game.seasonsStars.api.events.disableCalendarEvent('new-year');
   */
  async disableCalendarEvent(eventId: string): Promise<void> {
    if (!game.user?.isGM) {
      throw new Error('Only GMs can modify world events');
    }

    try {
      const currentSettings = (game.settings?.get('seasons-and-stars', 'worldEvents') || {
        events: [],
        disabledEventIds: [],
      }) as WorldEventSettings;

      if (!currentSettings.disabledEventIds.includes(eventId)) {
        currentSettings.disabledEventIds.push(eventId);
        await game.settings?.set('seasons-and-stars', 'worldEvents', currentSettings);

        Logger.info(`Calendar event ${eventId} disabled`);

        Hooks.callAll('seasons-stars:worldEventsChanged', currentSettings);
      }
    } catch (error) {
      Logger.error(
        'Failed to disable calendar event',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Show a previously hidden calendar event (GM only)
   *
   * Removes from disabledEventIds list
   *
   * @param eventId The calendar event ID to enable
   * @throws Error if not GM
   *
   * @example
   * // Re-enable a hidden calendar event
   * await game.seasonsStars.api.events.enableCalendarEvent('new-year');
   */
  async enableCalendarEvent(eventId: string): Promise<void> {
    if (!game.user?.isGM) {
      throw new Error('Only GMs can modify world events');
    }

    try {
      const currentSettings = (game.settings?.get('seasons-and-stars', 'worldEvents') || {
        events: [],
        disabledEventIds: [],
      }) as WorldEventSettings;

      currentSettings.disabledEventIds = currentSettings.disabledEventIds.filter(
        id => id !== eventId
      );

      await game.settings?.set('seasons-and-stars', 'worldEvents', currentSettings);

      Logger.info(`Calendar event ${eventId} enabled`);

      Hooks.callAll('seasons-stars:worldEventsChanged', currentSettings);
    } catch (error) {
      Logger.error(
        'Failed to enable calendar event',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Get the journal entry associated with an event
   *
   * Returns null if no journal is linked or user lacks permission
   *
   * @param eventId The event ID
   * @returns JournalEntry or null
   *
   * @example
   * const journal = game.seasonsStars.api.events.getEventJournal('winter-solstice');
   * if (journal) {
   *   journal.sheet.render(true);
   * }
   */
  getEventJournal(eventId: string): JournalEntry | null {
    const event = this.getEvent(eventId);
    if (!event?.journalEntryId) {
      return null;
    }

    // Try to resolve journal entry using Foundry's fromUuidSync
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const foundryGlobal = globalThis as any;
    const journal = foundryGlobal.fromUuidSync?.(event.journalEntryId) as JournalEntry | null;

    if (!journal || !game.user) {
      return null;
    }

    // Check if user has permission to view the journal
    // GMs can always view
    if (game.user.isGM) {
      return journal;
    }

    // Check ownership level (same pattern as note-permissions)
    const ownership = journal.ownership;
    const userLevel =
      ownership[game.user.id] || ownership.default || CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE;

    // Require at least OBSERVER permission
    if (userLevel >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER) {
      return journal;
    }

    return null;
  }

  /**
   * Set the journal entry for an event (GM only)
   *
   * Updates world event settings if event is world-defined or calendar override
   *
   * @param eventId The event ID
   * @param journalEntryId The journal entry UUID or ID
   * @throws Error if not GM
   *
   * @example
   * // Link a journal to an event
   * const journal = game.journal.getName('Winter Solstice');
   * await game.seasonsStars.api.events.setEventJournal('winter-solstice', journal.uuid);
   */
  async setEventJournal(eventId: string, journalEntryId: string): Promise<void> {
    if (!game.user?.isGM) {
      throw new Error('Only GMs can modify event journals');
    }

    const event = this.getEvent(eventId);
    if (!event) {
      throw new Error(`Event ${eventId} not found`);
    }

    // Create updated event with journal reference
    const updatedEvent: CalendarEvent = {
      ...event,
      journalEntryId,
    };

    await this.setWorldEvent(updatedEvent);
  }

  /**
   * Clear the journal entry association for an event (GM only)
   *
   * If event was from calendar, reverts to calendar's journal (if any).
   * If event was world-only, removes the journal reference.
   *
   * @param eventId The event ID
   * @throws Error if not GM
   *
   * @example
   * // Clear journal link
   * await game.seasonsStars.api.events.clearEventJournal('winter-solstice');
   */
  async clearEventJournal(eventId: string): Promise<void> {
    if (!game.user?.isGM) {
      throw new Error('Only GMs can modify event journals');
    }

    const event = this.getEvent(eventId);
    if (!event) {
      throw new Error(`Event ${eventId} not found`);
    }

    // Create updated event without journal reference
    const updatedEvent: CalendarEvent = {
      ...event,
      journalEntryId: undefined,
    };

    await this.setWorldEvent(updatedEvent);
  }
}
