/**
 * Chat Integration - Chat log functionality for Seasons & Stars
 *
 * This module provides chat-related features including:
 * - Day change notifications posted to chat
 * - Per-message in-game timestamps
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

// Default format template for per-message timestamps
const DEFAULT_TIMESTAMP_FORMAT = "{{ss-time format='short'}}";

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
   * and posts it as a chat message with style OTHER (uncategorized).
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
        speaker: {
          alias: '📅 Seasons & Stars',
          actor: '',
          token: '',
          scene: '',
        },
        style: CONST.CHAT_MESSAGE_STYLES.OTHER,
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

  // ============================================================
  // Per-message timestamp functionality
  // ============================================================

  /**
   * Check if per-message timestamps are enabled
   *
   * @returns true if timestamps are enabled
   */
  isTimestampsEnabled(): boolean {
    try {
      return (
        game.settings?.get(SYSTEM_CONSTANTS.MODULE_ID, SETTINGS_KEYS.CHAT_TIMESTAMPS_ENABLED) ===
        true
      );
    } catch {
      return false;
    }
  }

  /**
   * Get the configured timestamp format
   *
   * @returns The format template string
   */
  getTimestampFormat(): string {
    try {
      const format = game.settings?.get(
        SYSTEM_CONSTANTS.MODULE_ID,
        SETTINGS_KEYS.CHAT_TIMESTAMPS_FORMAT
      ) as string | undefined;
      return format || DEFAULT_TIMESTAMP_FORMAT;
    } catch {
      return DEFAULT_TIMESTAMP_FORMAT;
    }
  }

  /**
   * Add timestamp data to a chat message before it's created
   * Called from the preCreateChatMessage hook
   *
   * @param chatMessage - The chat message being created
   */
  addTimestampToMessage(chatMessage: any): void {
    if (!this.isTimestampsEnabled()) {
      return;
    }

    if (!this.calendarManager) {
      Logger.debug('Cannot add timestamp - calendar manager not available');
      return;
    }

    const activeCalendar = this.calendarManager.getActiveCalendar();
    if (!activeCalendar) {
      Logger.debug('Cannot add timestamp - no active calendar');
      return;
    }

    try {
      // Store the current worldTime as a timestamp
      const worldTime = game.time?.worldTime ?? 0;
      const calendarId = activeCalendar.id;

      // Get existing flags or create new object
      const messageFlags = chatMessage.flags || {};
      if (!Object.prototype.hasOwnProperty.call(messageFlags, SYSTEM_CONSTANTS.MODULE_ID)) {
        messageFlags[SYSTEM_CONSTANTS.MODULE_ID] = {};
      }

      // Add timestamp data
      messageFlags[SYSTEM_CONSTANTS.MODULE_ID]['timestamp'] = {
        calendarId,
        worldTime,
      };

      // Update the message source
      chatMessage.updateSource({ flags: messageFlags });

      Logger.debug('Added timestamp to chat message', { calendarId, worldTime });
    } catch (error) {
      Logger.error(
        'Failed to add timestamp to chat message',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Get the formatted timestamp for a chat message
   *
   * @param chatMessage - The chat message to get timestamp for
   * @returns The formatted timestamp string, or empty string if not available
   */
  getFormattedTimestamp(chatMessage: any): string {
    const timestampData = chatMessage.getFlag?.(SYSTEM_CONSTANTS.MODULE_ID, 'timestamp') as
      | { calendarId: string; worldTime: number }
      | undefined;

    if (!timestampData) {
      return '';
    }

    if (!this.calendarManager) {
      return '';
    }

    const activeCalendar = this.calendarManager.getActiveCalendar();
    if (!activeCalendar) {
      return '';
    }

    try {
      // Convert worldTime to calendar date
      const engine = this.calendarManager.getActiveEngine?.();
      if (!engine) {
        return '';
      }

      const dateData = engine.worldTimeToDate(timestampData.worldTime);
      const calendarDate = new CalendarDate(dateData, activeCalendar);
      const formatter = new DateFormatter(activeCalendar);
      const format = this.getTimestampFormat();

      return formatter.format(calendarDate, format);
    } catch (error) {
      Logger.debug('Failed to format timestamp', error);
      return '';
    }
  }

  /**
   * Render a timestamp on a chat message element
   * Called from the renderChatMessage hook
   *
   * @param chatMessage - The chat message document
   * @param html - The HTML element (jQuery or HTMLElement)
   */
  renderTimestamp(chatMessage: any, html: any): void {
    if (!this.isTimestampsEnabled()) {
      // If disabled, remove any existing timestamps and show Foundry's
      this.removeTimestampFromElement(html);
      return;
    }

    const formattedTimestamp = this.getFormattedTimestamp(chatMessage);
    if (!formattedTimestamp) {
      return;
    }

    // Get the HTML element (handle both jQuery and native element)
    const element = html instanceof HTMLElement ? html : html[0];
    if (!element) {
      return;
    }

    // Find Foundry's timestamp element
    const foundryTimestamp = element.querySelector(
      '.message-header .message-metadata .message-timestamp'
    ) as HTMLElement | null;

    if (!foundryTimestamp) {
      return;
    }

    // Hide Foundry's timestamp
    foundryTimestamp.style.display = 'none';

    // Check if we already added our timestamp
    let ssTimestamp = element.querySelector('.ss-timestamp') as HTMLElement | null;

    if (ssTimestamp) {
      // Update existing timestamp
      ssTimestamp.innerText = formattedTimestamp;
    } else {
      // Create new timestamp element
      ssTimestamp = document.createElement('time');
      ssTimestamp.classList.add('ss-timestamp');
      ssTimestamp.innerText = formattedTimestamp;
      foundryTimestamp.after(ssTimestamp);
    }
  }

  /**
   * Remove our timestamp from an element and restore Foundry's
   *
   * @param html - The HTML element (jQuery or HTMLElement)
   */
  private removeTimestampFromElement(html: any): void {
    const element = html instanceof HTMLElement ? html : html[0];
    if (!element) {
      return;
    }

    // Show Foundry's timestamp
    const foundryTimestamp = element.querySelector(
      '.message-header .message-metadata .message-timestamp'
    ) as HTMLElement | null;
    if (foundryTimestamp) {
      foundryTimestamp.style.display = '';
    }

    // Remove our timestamp
    const ssTimestamp = element.querySelector('.ss-timestamp');
    ssTimestamp?.remove();
  }

  /**
   * Update all visible chat message timestamps
   * Called when the setting is toggled or calendar changes
   */
  updateAllTimestamps(): void {
    const chatLog = document.getElementById('chat-log');
    if (!chatLog) {
      return;
    }

    const messages = chatLog.querySelectorAll('.message');
    messages.forEach(messageElement => {
      const messageId = (messageElement as HTMLElement).dataset.messageId;
      if (!messageId) {
        return;
      }

      const chatMessage = game.messages?.get(messageId);
      if (chatMessage) {
        this.renderTimestamp(chatMessage, messageElement);
      }
    });
  }
}
