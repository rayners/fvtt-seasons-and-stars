/**
 * Protocol Handler Wrapper System
 * Converts simple functions to full ProtocolHandler interface
 */

import type {
  ProtocolHandler,
  LoadCalendarOptions,
  CalendarProtocol,
  CalendarLocation,
} from '../types/external-calendar';
import type { SeasonsStarsCalendar } from '../types/calendar';
import type { SimpleProtocolHandler, ProtocolHandlerLike } from '../types/foundry-extensions';
import { Logger } from './logger';

/**
 * Wrapper class that converts simple protocol handlers to full ProtocolHandler interface
 */
export class ProtocolHandlerWrapper implements ProtocolHandler {
  readonly protocol: CalendarProtocol;
  private simpleHandler: SimpleProtocolHandler;

  constructor(simpleHandler: SimpleProtocolHandler) {
    this.protocol = simpleHandler.protocol;
    this.simpleHandler = simpleHandler;
  }

  /**
   * Basic location validation - accept all locations by default
   * Simple handlers can focus on just loading calendars
   */
  canHandle(location: CalendarLocation): boolean {
    // Basic validation - ensure location is not empty and doesn't contain obvious URL schemes
    if (!location || location.trim() === '') {
      return false;
    }

    // Avoid conflicts with other protocols
    const lowerLocation = location.toLowerCase();
    if (
      lowerLocation.startsWith('https://') ||
      lowerLocation.startsWith('http://') ||
      lowerLocation.startsWith('ftp://') ||
      lowerLocation.startsWith('file://')
    ) {
      return false;
    }

    return true;
  }

  /**
   * Load calendar using the simple handler function
   */
  async loadCalendar(
    location: CalendarLocation,
    _options?: LoadCalendarOptions
  ): Promise<SeasonsStarsCalendar> {
    try {
      Logger.debug(`Loading calendar via wrapped handler (${this.protocol}): ${location}`);
      
      // Call the simple handler's loadCalendar function
      const calendar = await this.simpleHandler.loadCalendar(location);
      
      // Basic validation of returned calendar
      if (!calendar || typeof calendar !== 'object') {
        throw new Error(`Invalid calendar data returned from ${this.protocol} handler`);
      }

      if (!calendar.id || !calendar.months || !calendar.weekdays) {
        throw new Error(`Invalid calendar data: missing required fields (id, months, weekdays)`);
      }

      Logger.info(`Successfully loaded calendar via wrapped handler (${this.protocol}): ${calendar.id}`);
      return calendar;
    } catch (error) {
      Logger.error(`Error in wrapped protocol handler (${this.protocol}):`, error as Error);
      throw error;
    }
  }

  /**
   * Optional update checking - not implemented by default for simple handlers
   */
  async checkForUpdates?(_location: CalendarLocation, _lastEtag?: string): Promise<boolean> {
    Logger.debug(`Update checking not implemented for simple handler: ${this.protocol}`);
    return false; // Assume no updates for simple handlers
  }
}

/**
 * Type guard to check if a handler is a simple protocol handler
 */
export function isSimpleProtocolHandler(handler: ProtocolHandlerLike): handler is SimpleProtocolHandler {
  return (
    typeof handler === 'object' &&
    handler !== null &&
    'protocol' in handler &&
    'loadCalendar' in handler &&
    typeof handler.loadCalendar === 'function' &&
    !('canHandle' in handler) // Full ProtocolHandler has canHandle method
  );
}

/**
 * Type guard to check if a handler is a full protocol handler
 */
export function isFullProtocolHandler(handler: ProtocolHandlerLike): handler is ProtocolHandler {
  return (
    typeof handler === 'object' &&
    handler !== null &&
    'protocol' in handler &&
    'canHandle' in handler &&
    'loadCalendar' in handler &&
    typeof handler.canHandle === 'function' &&
    typeof handler.loadCalendar === 'function'
  );
}

/**
 * Convert a ProtocolHandlerLike to a full ProtocolHandler
 */
export function normalizeProtocolHandler(handler: ProtocolHandlerLike): ProtocolHandler {
  if (isFullProtocolHandler(handler)) {
    return handler;
  } else if (isSimpleProtocolHandler(handler)) {
    return new ProtocolHandlerWrapper(handler);
  } else {
    throw new Error('Invalid protocol handler: must implement either ProtocolHandler or SimpleProtocolHandler interface');
  }
}