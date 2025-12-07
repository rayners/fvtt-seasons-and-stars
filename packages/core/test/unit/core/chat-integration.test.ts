/**
 * Tests for ChatIntegration - Chat log functionality for Seasons & Stars
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ChatIntegration } from '../../../src/core/chat-integration';
import type { CalendarManagerInterface } from '../../../src/types/foundry-extensions';
import type { SeasonsStarsCalendar } from '../../../src/types/calendar';

// Create a minimal calendar for testing
const mockCalendar: SeasonsStarsCalendar = {
  id: 'test-calendar',
  name: 'Test Calendar',
  version: '1.0.0',
  months: [
    { name: 'January', abbreviation: 'Jan', days: 31 },
    { name: 'February', abbreviation: 'Feb', days: 28 },
    { name: 'March', abbreviation: 'Mar', days: 31 },
  ],
  weekdays: [
    { name: 'Sunday', abbreviation: 'Sun' },
    { name: 'Monday', abbreviation: 'Mon' },
    { name: 'Tuesday', abbreviation: 'Tue' },
    { name: 'Wednesday', abbreviation: 'Wed' },
    { name: 'Thursday', abbreviation: 'Thu' },
    { name: 'Friday', abbreviation: 'Fri' },
    { name: 'Saturday', abbreviation: 'Sat' },
  ],
  time: {
    hoursPerDay: 24,
    minutesPerHour: 60,
    secondsPerMinute: 60,
  },
  startingDate: {
    year: 2024,
    month: 0,
    day: 1,
    weekday: 1,
  },
};

// Mock Foundry globals
const mockGame = {
  settings: {
    get: vi.fn(),
  },
  user: {
    isGM: true,
  },
} as any;

const mockChatMessage = {
  create: vi.fn().mockResolvedValue({}),
};

const mockCONST = {
  CHAT_MESSAGE_STYLES: {
    OTHER: 0,
    OOC: 1,
    IC: 2,
    EMOTE: 3,
  },
};

// Mock Handlebars for template compilation
const mockHandlebars = {
  compile: vi.fn((template: string) => {
    return () => `Formatted: ${template}`;
  }),
  SafeString: class {
    constructor(public value: string) {}
    toString() {
      return this.value;
    }
  },
  registerHelper: vi.fn(),
};

describe('ChatIntegration', () => {
  let mockCalendarManager: CalendarManagerInterface;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Reset the singleton instance
    ChatIntegration.resetInstance();

    // Setup global mocks
    globalThis.game = mockGame;
    globalThis.ChatMessage = mockChatMessage as any;
    globalThis.CONST = mockCONST as any;
    globalThis.Handlebars = mockHandlebars as any;

    // Default user is GM
    mockGame.user = { isGM: true };

    // Create mock calendar manager
    mockCalendarManager = {
      getActiveCalendar: vi.fn().mockReturnValue(mockCalendar),
    } as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    ChatIntegration.resetInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = ChatIntegration.getInstance();
      const instance2 = ChatIntegration.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should create a new instance after reset', () => {
      const instance1 = ChatIntegration.getInstance();
      ChatIntegration.resetInstance();
      const instance2 = ChatIntegration.getInstance();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('isDayChangeNotificationsEnabled', () => {
    it('should return true when setting is enabled', () => {
      mockGame.settings.get.mockReturnValue(true);

      const integration = ChatIntegration.getInstance();
      const result = integration.isDayChangeNotificationsEnabled();

      expect(result).toBe(true);
      expect(mockGame.settings.get).toHaveBeenCalledWith(
        'seasons-and-stars',
        'chatDayChangeNotifications'
      );
    });

    it('should return false when setting is disabled', () => {
      mockGame.settings.get.mockReturnValue(false);

      const integration = ChatIntegration.getInstance();
      const result = integration.isDayChangeNotificationsEnabled();

      expect(result).toBe(false);
    });

    it('should return false when settings throw an error', () => {
      mockGame.settings.get.mockImplementation(() => {
        throw new Error('Settings not initialized');
      });

      const integration = ChatIntegration.getInstance();
      const result = integration.isDayChangeNotificationsEnabled();

      expect(result).toBe(false);
    });
  });

  describe('getDayChangeFormat', () => {
    it('should return the configured format', () => {
      const customFormat = '{{ss-day}} of {{ss-month format="name"}}';
      mockGame.settings.get.mockReturnValue(customFormat);

      const integration = ChatIntegration.getInstance();
      const result = integration.getDayChangeFormat();

      expect(result).toBe(customFormat);
    });

    it('should return default format when setting is empty', () => {
      mockGame.settings.get.mockReturnValue('');

      const integration = ChatIntegration.getInstance();
      const result = integration.getDayChangeFormat();

      expect(result).toContain('{{ss-weekday');
    });

    it('should return default format when settings throw an error', () => {
      mockGame.settings.get.mockImplementation(() => {
        throw new Error('Settings not initialized');
      });

      const integration = ChatIntegration.getInstance();
      const result = integration.getDayChangeFormat();

      expect(result).toContain('{{ss-weekday');
    });
  });

  describe('postDayChangeNotification', () => {
    it('should not post when notifications are disabled', async () => {
      mockGame.settings.get.mockReturnValue(false);

      const integration = ChatIntegration.getInstance();
      integration.setCalendarManager(mockCalendarManager);

      await integration.postDayChangeNotification({
        year: 2024,
        month: 0,
        day: 15,
        weekday: 1,
      });

      expect(mockChatMessage.create).not.toHaveBeenCalled();
    });

    it('should not post when user is not GM', async () => {
      mockGame.settings.get.mockReturnValue(true);
      mockGame.user = { isGM: false };

      const integration = ChatIntegration.getInstance();
      integration.setCalendarManager(mockCalendarManager);

      await integration.postDayChangeNotification({
        year: 2024,
        month: 0,
        day: 15,
        weekday: 1,
      });

      expect(mockChatMessage.create).not.toHaveBeenCalled();
    });

    it('should not post when calendar manager is not set', async () => {
      mockGame.settings.get.mockReturnValue(true);

      const integration = ChatIntegration.getInstance();
      // Don't set calendar manager

      await integration.postDayChangeNotification({
        year: 2024,
        month: 0,
        day: 15,
        weekday: 1,
      });

      expect(mockChatMessage.create).not.toHaveBeenCalled();
    });

    it('should not post when no active calendar', async () => {
      mockGame.settings.get.mockReturnValue(true);
      const managerWithNoCalendar = {
        getActiveCalendar: vi.fn().mockReturnValue(null),
      } as any;

      const integration = ChatIntegration.getInstance();
      integration.setCalendarManager(managerWithNoCalendar);

      await integration.postDayChangeNotification({
        year: 2024,
        month: 0,
        day: 15,
        weekday: 1,
      });

      expect(mockChatMessage.create).not.toHaveBeenCalled();
    });

    it('should post chat message when all conditions are met', async () => {
      mockGame.settings.get.mockReturnValue(true);

      const integration = ChatIntegration.getInstance();
      integration.setCalendarManager(mockCalendarManager);

      await integration.postDayChangeNotification({
        year: 2024,
        month: 0,
        day: 15,
        weekday: 1,
      });

      expect(mockChatMessage.create).toHaveBeenCalledTimes(1);
      expect(mockChatMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          speaker: {
            alias: '📅 Seasons & Stars',
            actor: '',
            token: '',
            scene: '',
          },
          style: 0, // OTHER - uncategorized message
          flags: {
            'seasons-and-stars': {
              dayChangeNotification: true,
            },
          },
        })
      );
    });

    it('should handle errors gracefully', async () => {
      mockGame.settings.get.mockReturnValue(true);
      mockChatMessage.create.mockRejectedValue(new Error('Chat error'));

      const integration = ChatIntegration.getInstance();
      integration.setCalendarManager(mockCalendarManager);

      // Should not throw
      await expect(
        integration.postDayChangeNotification({
          year: 2024,
          month: 0,
          day: 15,
          weekday: 1,
        })
      ).resolves.not.toThrow();
    });
  });

  describe('setCalendarManager', () => {
    it('should store the calendar manager reference', async () => {
      mockGame.settings.get.mockReturnValue(true);

      const integration = ChatIntegration.getInstance();
      integration.setCalendarManager(mockCalendarManager);

      await integration.postDayChangeNotification({
        year: 2024,
        month: 0,
        day: 15,
        weekday: 1,
      });

      expect(mockCalendarManager.getActiveCalendar).toHaveBeenCalled();
    });
  });
});
