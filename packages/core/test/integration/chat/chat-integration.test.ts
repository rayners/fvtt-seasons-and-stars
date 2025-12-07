/**
 * Tests for ChatIntegration service
 * Tests both day change notifications (Phase 1) and per-message timestamps (Phase 2)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ChatIntegration } from '../../../src/core/chat-integration';
import { SETTINGS_KEYS, SYSTEM_CONSTANTS } from '../../../src/core/constants';

// Mock Foundry globals
const mockSettings = new Map<string, unknown>();

const mockChatMessageCreate = vi.fn();

globalThis.game = {
  user: { isGM: true },
  settings: {
    get: vi.fn((module: string, key: string) => mockSettings.get(`${module}.${key}`)),
    set: vi.fn(),
  },
  time: {
    worldTime: 3600, // 1 hour in seconds
  },
  messages: {
    get: vi.fn(),
  },
} as any;

globalThis.CONST = {
  CHAT_MESSAGE_STYLES: {
    OTHER: 0,
  },
} as any;

globalThis.ChatMessage = {
  create: mockChatMessageCreate,
} as any;

globalThis.ui = {
  notifications: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
} as any;

// Mock DateFormatter
vi.mock('../../../src/core/date-formatter', () => ({
  DateFormatter: vi.fn().mockImplementation(() => ({
    format: vi.fn().mockReturnValue('Formatted Date'),
  })),
}));

// Mock CalendarDate
vi.mock('../../../src/core/calendar-date', () => ({
  CalendarDate: vi.fn().mockImplementation(() => ({})),
}));

describe('ChatIntegration', () => {
  let chatIntegration: ChatIntegration;
  let mockCalendarManager: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSettings.clear();
    ChatIntegration.resetInstance();

    // Setup mock calendar manager
    mockCalendarManager = {
      getActiveCalendar: vi.fn().mockReturnValue({
        id: 'test-calendar',
        time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
      }),
      getActiveEngine: vi.fn().mockReturnValue({
        worldTimeToDate: vi.fn().mockReturnValue({
          year: 2024,
          month: 1,
          day: 15,
          hour: 14,
          minute: 30,
        }),
      }),
    };

    chatIntegration = ChatIntegration.getInstance();
    chatIntegration.setCalendarManager(mockCalendarManager);
  });

  afterEach(() => {
    ChatIntegration.resetInstance();
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ChatIntegration.getInstance();
      const instance2 = ChatIntegration.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', () => {
      const instance1 = ChatIntegration.getInstance();
      ChatIntegration.resetInstance();
      const instance2 = ChatIntegration.getInstance();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('day change notifications', () => {
    describe('isDayChangeNotificationsEnabled', () => {
      it('should return true when setting is enabled', () => {
        mockSettings.set(
          `${SYSTEM_CONSTANTS.MODULE_ID}.${SETTINGS_KEYS.CHAT_DAY_NOTIFICATIONS}`,
          true
        );
        expect(chatIntegration.isDayChangeNotificationsEnabled()).toBe(true);
      });

      it('should return false when setting is disabled', () => {
        mockSettings.set(
          `${SYSTEM_CONSTANTS.MODULE_ID}.${SETTINGS_KEYS.CHAT_DAY_NOTIFICATIONS}`,
          false
        );
        expect(chatIntegration.isDayChangeNotificationsEnabled()).toBe(false);
      });

      it('should return false when settings are not available', () => {
        const originalGame = globalThis.game;
        globalThis.game = { settings: null } as any;
        expect(chatIntegration.isDayChangeNotificationsEnabled()).toBe(false);
        globalThis.game = originalGame;
      });
    });

    describe('getDayChangeFormat', () => {
      it('should return configured format', () => {
        const customFormat = '{{ss-day}} of {{ss-month}}';
        mockSettings.set(
          `${SYSTEM_CONSTANTS.MODULE_ID}.${SETTINGS_KEYS.CHAT_DAY_FORMAT}`,
          customFormat
        );
        expect(chatIntegration.getDayChangeFormat()).toBe(customFormat);
      });

      it('should return default format when not configured', () => {
        mockSettings.set(
          `${SYSTEM_CONSTANTS.MODULE_ID}.${SETTINGS_KEYS.CHAT_DAY_FORMAT}`,
          undefined
        );
        const format = chatIntegration.getDayChangeFormat();
        expect(format).toContain('ss-weekday');
      });
    });

    describe('postDayChangeNotification', () => {
      const mockDateData = {
        year: 2024,
        month: 1,
        day: 15,
        hour: 0,
        minute: 0,
        second: 0,
        weekday: 2,
      };

      it('should post notification when enabled and GM', async () => {
        mockSettings.set(
          `${SYSTEM_CONSTANTS.MODULE_ID}.${SETTINGS_KEYS.CHAT_DAY_NOTIFICATIONS}`,
          true
        );
        globalThis.game.user = { isGM: true };

        await chatIntegration.postDayChangeNotification(mockDateData);

        expect(mockChatMessageCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            content: 'Formatted Date',
            style: CONST.CHAT_MESSAGE_STYLES.OTHER,
            flags: expect.objectContaining({
              [SYSTEM_CONSTANTS.MODULE_ID]: { dayChangeNotification: true },
            }),
          })
        );
      });

      it('should not post notification when user is not GM', async () => {
        mockSettings.set(
          `${SYSTEM_CONSTANTS.MODULE_ID}.${SETTINGS_KEYS.CHAT_DAY_NOTIFICATIONS}`,
          true
        );
        globalThis.game.user = { isGM: false };

        await chatIntegration.postDayChangeNotification(mockDateData);

        expect(mockChatMessageCreate).not.toHaveBeenCalled();
      });

      it('should not post notification when disabled', async () => {
        mockSettings.set(
          `${SYSTEM_CONSTANTS.MODULE_ID}.${SETTINGS_KEYS.CHAT_DAY_NOTIFICATIONS}`,
          false
        );
        globalThis.game.user = { isGM: true };

        await chatIntegration.postDayChangeNotification(mockDateData);

        expect(mockChatMessageCreate).not.toHaveBeenCalled();
      });

      it('should not post notification when calendar manager not available', async () => {
        mockSettings.set(
          `${SYSTEM_CONSTANTS.MODULE_ID}.${SETTINGS_KEYS.CHAT_DAY_NOTIFICATIONS}`,
          true
        );
        globalThis.game.user = { isGM: true };

        ChatIntegration.resetInstance();
        const freshInstance = ChatIntegration.getInstance();

        await freshInstance.postDayChangeNotification(mockDateData);

        expect(mockChatMessageCreate).not.toHaveBeenCalled();
      });

      it('should not post notification when no active calendar', async () => {
        mockSettings.set(
          `${SYSTEM_CONSTANTS.MODULE_ID}.${SETTINGS_KEYS.CHAT_DAY_NOTIFICATIONS}`,
          true
        );
        globalThis.game.user = { isGM: true };
        mockCalendarManager.getActiveCalendar.mockReturnValue(null);

        await chatIntegration.postDayChangeNotification(mockDateData);

        expect(mockChatMessageCreate).not.toHaveBeenCalled();
      });
    });
  });

  describe('per-message timestamps', () => {
    describe('isTimestampsEnabled', () => {
      it('should return true when setting is enabled', () => {
        mockSettings.set(
          `${SYSTEM_CONSTANTS.MODULE_ID}.${SETTINGS_KEYS.CHAT_TIMESTAMPS_ENABLED}`,
          true
        );
        expect(chatIntegration.isTimestampsEnabled()).toBe(true);
      });

      it('should return false when setting is disabled', () => {
        mockSettings.set(
          `${SYSTEM_CONSTANTS.MODULE_ID}.${SETTINGS_KEYS.CHAT_TIMESTAMPS_ENABLED}`,
          false
        );
        expect(chatIntegration.isTimestampsEnabled()).toBe(false);
      });

      it('should return false when settings are not available', () => {
        const originalGame = globalThis.game;
        globalThis.game = { settings: null } as any;
        expect(chatIntegration.isTimestampsEnabled()).toBe(false);
        globalThis.game = originalGame;
      });
    });

    describe('getTimestampFormat', () => {
      it('should return configured format', () => {
        const customFormat = "{{ss-time format='12hour'}}";
        mockSettings.set(
          `${SYSTEM_CONSTANTS.MODULE_ID}.${SETTINGS_KEYS.CHAT_TIMESTAMPS_FORMAT}`,
          customFormat
        );
        expect(chatIntegration.getTimestampFormat()).toBe(customFormat);
      });

      it('should return default format when not configured', () => {
        mockSettings.set(
          `${SYSTEM_CONSTANTS.MODULE_ID}.${SETTINGS_KEYS.CHAT_TIMESTAMPS_FORMAT}`,
          undefined
        );
        const format = chatIntegration.getTimestampFormat();
        expect(format).toContain('ss-time');
      });
    });

    describe('addTimestampToMessage', () => {
      it('should add timestamp data to message when enabled', () => {
        mockSettings.set(
          `${SYSTEM_CONSTANTS.MODULE_ID}.${SETTINGS_KEYS.CHAT_TIMESTAMPS_ENABLED}`,
          true
        );

        const mockMessage = {
          flags: {},
          updateSource: vi.fn(),
        };

        chatIntegration.addTimestampToMessage(mockMessage);

        expect(mockMessage.updateSource).toHaveBeenCalledWith({
          flags: {
            [SYSTEM_CONSTANTS.MODULE_ID]: {
              timestamp: {
                calendarId: 'test-calendar',
                worldTime: 3600,
              },
            },
          },
        });
      });

      it('should not add timestamp when disabled', () => {
        mockSettings.set(
          `${SYSTEM_CONSTANTS.MODULE_ID}.${SETTINGS_KEYS.CHAT_TIMESTAMPS_ENABLED}`,
          false
        );

        const mockMessage = {
          flags: {},
          updateSource: vi.fn(),
        };

        chatIntegration.addTimestampToMessage(mockMessage);

        expect(mockMessage.updateSource).not.toHaveBeenCalled();
      });

      it('should not add timestamp when calendar manager not available', () => {
        mockSettings.set(
          `${SYSTEM_CONSTANTS.MODULE_ID}.${SETTINGS_KEYS.CHAT_TIMESTAMPS_ENABLED}`,
          true
        );

        ChatIntegration.resetInstance();
        const freshInstance = ChatIntegration.getInstance();

        const mockMessage = {
          flags: {},
          updateSource: vi.fn(),
        };

        freshInstance.addTimestampToMessage(mockMessage);

        expect(mockMessage.updateSource).not.toHaveBeenCalled();
      });

      it('should not add timestamp when no active calendar', () => {
        mockSettings.set(
          `${SYSTEM_CONSTANTS.MODULE_ID}.${SETTINGS_KEYS.CHAT_TIMESTAMPS_ENABLED}`,
          true
        );
        mockCalendarManager.getActiveCalendar.mockReturnValue(null);

        const mockMessage = {
          flags: {},
          updateSource: vi.fn(),
        };

        chatIntegration.addTimestampToMessage(mockMessage);

        expect(mockMessage.updateSource).not.toHaveBeenCalled();
      });

      it('should handle message with existing flags', () => {
        mockSettings.set(
          `${SYSTEM_CONSTANTS.MODULE_ID}.${SETTINGS_KEYS.CHAT_TIMESTAMPS_ENABLED}`,
          true
        );

        const mockMessage = {
          flags: {
            'other-module': { someData: 'value' },
          },
          updateSource: vi.fn(),
        };

        chatIntegration.addTimestampToMessage(mockMessage);

        expect(mockMessage.updateSource).toHaveBeenCalledWith({
          flags: {
            'other-module': { someData: 'value' },
            [SYSTEM_CONSTANTS.MODULE_ID]: {
              timestamp: {
                calendarId: 'test-calendar',
                worldTime: 3600,
              },
            },
          },
        });
      });
    });

    describe('getFormattedTimestamp', () => {
      it('should return formatted timestamp for message with timestamp data', () => {
        const mockMessage = {
          getFlag: vi.fn().mockReturnValue({
            calendarId: 'test-calendar',
            worldTime: 3600,
          }),
        };

        const result = chatIntegration.getFormattedTimestamp(mockMessage);

        expect(result).toBe('Formatted Date');
        expect(mockMessage.getFlag).toHaveBeenCalledWith(SYSTEM_CONSTANTS.MODULE_ID, 'timestamp');
      });

      it('should return empty string for message without timestamp data', () => {
        const mockMessage = {
          getFlag: vi.fn().mockReturnValue(undefined),
        };

        const result = chatIntegration.getFormattedTimestamp(mockMessage);

        expect(result).toBe('');
      });

      it('should return empty string when calendar manager not available', () => {
        ChatIntegration.resetInstance();
        const freshInstance = ChatIntegration.getInstance();

        const mockMessage = {
          getFlag: vi.fn().mockReturnValue({
            calendarId: 'test-calendar',
            worldTime: 3600,
          }),
        };

        const result = freshInstance.getFormattedTimestamp(mockMessage);

        expect(result).toBe('');
      });

      it('should return empty string when no active calendar', () => {
        mockCalendarManager.getActiveCalendar.mockReturnValue(null);

        const mockMessage = {
          getFlag: vi.fn().mockReturnValue({
            calendarId: 'test-calendar',
            worldTime: 3600,
          }),
        };

        const result = chatIntegration.getFormattedTimestamp(mockMessage);

        expect(result).toBe('');
      });

      it('should return empty string when no active engine', () => {
        mockCalendarManager.getActiveEngine.mockReturnValue(null);

        const mockMessage = {
          getFlag: vi.fn().mockReturnValue({
            calendarId: 'test-calendar',
            worldTime: 3600,
          }),
        };

        const result = chatIntegration.getFormattedTimestamp(mockMessage);

        expect(result).toBe('');
      });
    });

    describe('renderTimestamp', () => {
      let mockElement: HTMLElement;
      let mockFoundryTimestamp: HTMLElement;

      beforeEach(() => {
        mockFoundryTimestamp = document.createElement('time');
        mockFoundryTimestamp.classList.add('message-timestamp');

        const mockMetadata = document.createElement('div');
        mockMetadata.classList.add('message-metadata');
        mockMetadata.appendChild(mockFoundryTimestamp);

        const mockHeader = document.createElement('div');
        mockHeader.classList.add('message-header');
        mockHeader.appendChild(mockMetadata);

        mockElement = document.createElement('div');
        mockElement.appendChild(mockHeader);
      });

      it('should hide Foundry timestamp and add custom timestamp', () => {
        mockSettings.set(
          `${SYSTEM_CONSTANTS.MODULE_ID}.${SETTINGS_KEYS.CHAT_TIMESTAMPS_ENABLED}`,
          true
        );

        const mockMessage = {
          getFlag: vi.fn().mockReturnValue({
            calendarId: 'test-calendar',
            worldTime: 3600,
          }),
        };

        // Override methods directly on the instance for this test
        const originalIsEnabled = chatIntegration.isTimestampsEnabled;
        const originalGetFormatted = chatIntegration.getFormattedTimestamp;
        chatIntegration.isTimestampsEnabled = () => true;
        chatIntegration.getFormattedTimestamp = () => '14:30';

        chatIntegration.renderTimestamp(mockMessage, mockElement);

        // Restore original methods
        chatIntegration.isTimestampsEnabled = originalIsEnabled;
        chatIntegration.getFormattedTimestamp = originalGetFormatted;

        expect(mockFoundryTimestamp.style.display).toBe('none');
        const ssTimestamp = mockElement.querySelector('.ss-timestamp') as HTMLElement;
        expect(ssTimestamp).toBeTruthy();
        // innerText in JSDOM needs to be accessed properly
        expect(ssTimestamp?.innerText || ssTimestamp?.textContent).toBe('14:30');
      });

      it('should update existing custom timestamp', () => {
        mockSettings.set(
          `${SYSTEM_CONSTANTS.MODULE_ID}.${SETTINGS_KEYS.CHAT_TIMESTAMPS_ENABLED}`,
          true
        );

        // Add existing timestamp
        const existingTimestamp = document.createElement('time');
        existingTimestamp.classList.add('ss-timestamp');
        existingTimestamp.textContent = 'Old Time';
        mockFoundryTimestamp.after(existingTimestamp);

        const mockMessage = {
          getFlag: vi.fn().mockReturnValue({
            calendarId: 'test-calendar',
            worldTime: 3600,
          }),
        };

        // Override methods directly on the instance for this test
        const originalIsEnabled = chatIntegration.isTimestampsEnabled;
        const originalGetFormatted = chatIntegration.getFormattedTimestamp;
        chatIntegration.isTimestampsEnabled = () => true;
        chatIntegration.getFormattedTimestamp = () => '15:45';

        chatIntegration.renderTimestamp(mockMessage, mockElement);

        // Restore original methods
        chatIntegration.isTimestampsEnabled = originalIsEnabled;
        chatIntegration.getFormattedTimestamp = originalGetFormatted;

        const ssTimestamps = mockElement.querySelectorAll('.ss-timestamp');
        expect(ssTimestamps.length).toBe(1);
        const timestamp = ssTimestamps[0] as HTMLElement;
        // innerText in JSDOM needs to be accessed properly
        expect(timestamp.innerText || timestamp.textContent).toBe('15:45');
      });

      it('should remove custom timestamp when disabled', () => {
        mockSettings.set(
          `${SYSTEM_CONSTANTS.MODULE_ID}.${SETTINGS_KEYS.CHAT_TIMESTAMPS_ENABLED}`,
          false
        );

        // Add existing custom timestamp
        const existingTimestamp = document.createElement('time');
        existingTimestamp.classList.add('ss-timestamp');
        mockFoundryTimestamp.after(existingTimestamp);
        mockFoundryTimestamp.style.display = 'none';

        const mockMessage = {
          getFlag: vi.fn().mockReturnValue({
            calendarId: 'test-calendar',
            worldTime: 3600,
          }),
        };

        chatIntegration.renderTimestamp(mockMessage, mockElement);

        expect(mockFoundryTimestamp.style.display).toBe('');
        expect(mockElement.querySelector('.ss-timestamp')).toBeNull();
      });

      it('should handle jQuery-like object', () => {
        mockSettings.set(
          `${SYSTEM_CONSTANTS.MODULE_ID}.${SETTINGS_KEYS.CHAT_TIMESTAMPS_ENABLED}`,
          true
        );

        const mockMessage = {
          getFlag: vi.fn().mockReturnValue({
            calendarId: 'test-calendar',
            worldTime: 3600,
          }),
        };

        // Mock isTimestampsEnabled and getFormattedTimestamp
        vi.spyOn(chatIntegration, 'isTimestampsEnabled').mockReturnValue(true);
        vi.spyOn(chatIntegration, 'getFormattedTimestamp').mockReturnValue('16:00');

        // jQuery-like array with element at index 0
        const jQueryLike = [mockElement] as any;

        chatIntegration.renderTimestamp(mockMessage, jQueryLike);

        expect(mockFoundryTimestamp.style.display).toBe('none');
        expect(mockElement.querySelector('.ss-timestamp')).toBeTruthy();
      });

      it('should not render when no timestamp data', () => {
        mockSettings.set(
          `${SYSTEM_CONSTANTS.MODULE_ID}.${SETTINGS_KEYS.CHAT_TIMESTAMPS_ENABLED}`,
          true
        );

        const mockMessage = {
          getFlag: vi.fn().mockReturnValue(undefined),
        };

        chatIntegration.renderTimestamp(mockMessage, mockElement);

        expect(mockFoundryTimestamp.style.display).toBe('');
        expect(mockElement.querySelector('.ss-timestamp')).toBeNull();
      });
    });

    describe('updateAllTimestamps', () => {
      it('should update all visible chat messages', () => {
        mockSettings.set(
          `${SYSTEM_CONSTANTS.MODULE_ID}.${SETTINGS_KEYS.CHAT_TIMESTAMPS_ENABLED}`,
          true
        );

        // Create mock chat log
        const chatLog = document.createElement('div');
        chatLog.id = 'chat-log';

        const message1 = document.createElement('div');
        message1.classList.add('message');
        message1.dataset.messageId = 'msg-1';

        const message2 = document.createElement('div');
        message2.classList.add('message');
        message2.dataset.messageId = 'msg-2';

        chatLog.appendChild(message1);
        chatLog.appendChild(message2);
        document.body.appendChild(chatLog);

        // Mock game.messages.get
        const mockChatMessage = {
          getFlag: vi.fn().mockReturnValue({
            calendarId: 'test-calendar',
            worldTime: 3600,
          }),
        };
        (game.messages as any).get = vi.fn().mockReturnValue(mockChatMessage);

        // Spy on renderTimestamp
        const renderSpy = vi.spyOn(chatIntegration, 'renderTimestamp');

        chatIntegration.updateAllTimestamps();

        expect(renderSpy).toHaveBeenCalledTimes(2);
        expect((game.messages as any).get).toHaveBeenCalledWith('msg-1');
        expect((game.messages as any).get).toHaveBeenCalledWith('msg-2');

        // Cleanup
        document.body.removeChild(chatLog);
      });

      it('should handle missing chat log gracefully', () => {
        // Ensure no chat log exists
        const existingChatLog = document.getElementById('chat-log');
        existingChatLog?.remove();

        expect(() => chatIntegration.updateAllTimestamps()).not.toThrow();
      });

      it('should skip messages without message ID', () => {
        mockSettings.set(
          `${SYSTEM_CONSTANTS.MODULE_ID}.${SETTINGS_KEYS.CHAT_TIMESTAMPS_ENABLED}`,
          true
        );

        const chatLog = document.createElement('div');
        chatLog.id = 'chat-log';

        const messageWithoutId = document.createElement('div');
        messageWithoutId.classList.add('message');
        // No dataset.messageId

        chatLog.appendChild(messageWithoutId);
        document.body.appendChild(chatLog);

        const renderSpy = vi.spyOn(chatIntegration, 'renderTimestamp');

        chatIntegration.updateAllTimestamps();

        expect(renderSpy).not.toHaveBeenCalled();

        // Cleanup
        document.body.removeChild(chatLog);
      });

      it('should skip messages not found in game.messages', () => {
        mockSettings.set(
          `${SYSTEM_CONSTANTS.MODULE_ID}.${SETTINGS_KEYS.CHAT_TIMESTAMPS_ENABLED}`,
          true
        );

        const chatLog = document.createElement('div');
        chatLog.id = 'chat-log';

        const message = document.createElement('div');
        message.classList.add('message');
        message.dataset.messageId = 'msg-not-found';

        chatLog.appendChild(message);
        document.body.appendChild(chatLog);

        (game.messages as any).get = vi.fn().mockReturnValue(null);

        const renderSpy = vi.spyOn(chatIntegration, 'renderTimestamp');

        chatIntegration.updateAllTimestamps();

        expect(renderSpy).not.toHaveBeenCalled();

        // Cleanup
        document.body.removeChild(chatLog);
      });
    });
  });
});
