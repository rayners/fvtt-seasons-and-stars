/**
 * Chat Integration - Chat log functionality for Seasons & Stars
 *
 * This module provides chat-related features including:
 * - Day change notifications posted to chat
 * - (Future) Per-message timestamps
 *
 * @module chat-integration
 */

import { Logger } from './logger';
import { SETTINGS_KEYS, SYSTEM_CONSTANTS } from './constants';
import { CalendarDate } from './calendar-date';
import { DateFormatter } from './date-formatter';
import type { CalendarDate as ICalendarDate } from '../types/calendar';
import type { CalendarManagerInterface } from '../types/foundry-extensions';

// Default format template for day change notifications
const DEFAULT_DAY_FORMAT =
  "It is now {{ss-weekday format='name'}}, {{ss-month format='name'}} {{ss-day format='ordinal'}}, {{ss-year}}";

/**
 * Service for managing chat integration features in Seasons & Stars
 *
 * This service provides chat log notifications when the game day changes,
 * allowing players to track in-game time progression through the chat log.
 *
 * Uses a singleton pattern to ensure consistent behavior across the module.
 *
 * @example Posting a day change notification
 * ```javascript
 * const chatIntegration = ChatIntegration.getInstance();
 * chatIntegration.postDayChangeNotification(currentDate);
 * ```
 */
export class ChatIntegration {
  private static instance: ChatIntegration | null = null;
  private calendarManager: CalendarManagerInterface | null = null;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    Logger.debug('ChatIntegration instance created');
  }

  /**
   * Get the singleton instance of ChatIntegration
   *
   * @returns The singleton ChatIntegration instance
   */
  static getInstance(): ChatIntegration {
    if (!ChatIntegration.instance) {
      ChatIntegration.instance = new ChatIntegration();
    }
    return ChatIntegration.instance;
  }

  /**
   * Reset the singleton instance (for testing purposes)
   * @internal
   */
  static resetInstance(): void {
    ChatIntegration.instance = null;
  }

  /**
   * Set the calendar manager reference
   * Called during module initialization
   *
   * @param manager - The calendar manager instance
   */
  setCalendarManager(manager: CalendarManagerInterface): void {
    this.calendarManager = manager;
  }

  /**
   * Check if day change notifications are enabled
   *
   * @returns true if notifications are enabled
   */
  isDayChangeNotificationsEnabled(): boolean {
    try {
      return (
        game.settings?.get(SYSTEM_CONSTANTS.MODULE_ID, SETTINGS_KEYS.CHAT_DAY_NOTIFICATIONS) ===
        true
      );
    } catch {
      // Settings not registered yet or game not ready
      return false;
    }
  }

  /**
   * Get the configured day change notification format
   *
   * @returns The format template string
   */
  getDayChangeFormat(): string {
    try {
      const format = game.settings?.get(
        SYSTEM_CONSTANTS.MODULE_ID,
        SETTINGS_KEYS.CHAT_DAY_FORMAT
      ) as string | undefined;
      return format || DEFAULT_DAY_FORMAT;
    } catch {
      // Return default format if settings not available
      return DEFAULT_DAY_FORMAT;
    }
  }

  /**
   * Post a day change notification to chat
   *
   * This method formats the current date using the configured format template
   * and posts it as an OOC (out-of-character) chat message.
   *
   * Only posts if:
   * - Day change notifications are enabled in settings
   * - The calendar manager is available
   * - The current user is a GM (to prevent duplicate messages)
   *
   * @param dateData - The calendar date data to format and display
   */
  async postDayChangeNotification(dateData: ICalendarDate): Promise<void> {
    // Only GMs should post day change notifications to prevent duplicates
    if (!game.user?.isGM) {
      Logger.debug('Skipping day change notification - not a GM');
      return;
    }

    if (!this.isDayChangeNotificationsEnabled()) {
      Logger.debug('Day change notifications are disabled');
      return;
    }

    if (!this.calendarManager) {
      Logger.warn('Cannot post day change notification - calendar manager not available');
      return;
    }

    const activeCalendar = this.calendarManager.getActiveCalendar();
    if (!activeCalendar) {
      Logger.warn('Cannot post day change notification - no active calendar');
      return;
    }

    try {
      const format = this.getDayChangeFormat();
      const calendarDate = new CalendarDate(dateData, activeCalendar);
      const formatter = new DateFormatter(activeCalendar);
      const formattedDate = formatter.format(calendarDate, format);

      await ChatMessage.create({
        content: formattedDate,
        speaker: { alias: 'Seasons & Stars' },
        type: CONST.CHAT_MESSAGE_STYLES.OOC,
        flags: {
          [SYSTEM_CONSTANTS.MODULE_ID]: {
            dayChangeNotification: true,
          },
        },
      });

      Logger.debug('Posted day change notification', { formattedDate });
    } catch (error) {
      Logger.error(
        'Failed to post day change notification',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
}
