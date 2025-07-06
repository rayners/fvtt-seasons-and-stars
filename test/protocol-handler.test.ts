/**
 * Tests for Protocol Handler System
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ProtocolHandlerRegistry, protocolHandlers } from '../src/core/protocol-handler';
import type {
  ProtocolHandlerRegistration,
  ProtocolHandlerOptions,
} from '../src/core/protocol-handler';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

// Mock the global Hooks object
const mockHooks = {
  callAll: vi.fn(),
};

// @ts-expect-error - Mocking global Hooks object
global.Hooks = mockHooks;

// Sample calendar data for testing
const sampleCalendar: SeasonsStarsCalendar = {
  id: 'test-calendar',
  translations: {
    en: {
      label: 'Test Calendar',
      description: 'A test calendar for unit tests',
    },
  },
  months: [
    { name: 'January', days: 31 },
    { name: 'February', days: 28 },
  ],
  weekdays: [
    { name: 'Monday' },
    { name: 'Tuesday' },
    { name: 'Wednesday' },
    { name: 'Thursday' },
    { name: 'Friday' },
    { name: 'Saturday' },
    { name: 'Sunday' },
  ],
};

describe('ProtocolHandlerRegistry', () => {
  let registry: ProtocolHandlerRegistry;

  beforeEach(() => {
    // Create fresh instance for each test
    // @ts-expect-error - Access private static property for testing
    ProtocolHandlerRegistry.instance = null;
    registry = ProtocolHandlerRegistry.getInstance();
    mockHooks.callAll.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const registry1 = ProtocolHandlerRegistry.getInstance();
      const registry2 = ProtocolHandlerRegistry.getInstance();
      expect(registry1).toBe(registry2);
    });
  });

  describe('Built-in Handlers', () => {
    it('should register built-in handlers on creation', () => {
      const handlers = registry.getHandlers();
      const protocols = handlers.map(h => h.protocol);

      expect(protocols).toContain('file');
      expect(protocols).toContain('data');
    });

    it('should have proper built-in file handler', () => {
      const fileHandler = registry.getHandlerByProtocol('file');
      expect(fileHandler).toBeDefined();
      expect(fileHandler?.name).toBe('Local File System');
      expect(fileHandler?.moduleId).toBe('seasons-and-stars');
    });

    it('should have proper built-in data handler', () => {
      const dataHandler = registry.getHandlerByProtocol('data');
      expect(dataHandler).toBeDefined();
      expect(dataHandler?.name).toBe('Inline Data');
      expect(dataHandler?.moduleId).toBe('seasons-and-stars');
    });
  });

  describe('Protocol Registration', () => {
    const testRegistration: ProtocolHandlerRegistration = {
      protocol: 'github',
      name: 'GitHub Calendar Loader',
      handler: async (path: string) => ({
        success: true,
        calendar: { ...sampleCalendar, id: `github-${path}` },
        fromCache: false,
        sourceUrl: `github:${path}`,
      }),
      validatePath: (path: string) => path.includes('/'),
      description: 'Load calendars from GitHub repositories',
    };

    it('should register a new protocol handler', () => {
      const handlerId = registry.registerHandler('test-module', testRegistration);

      expect(handlerId).toBeTruthy();
      expect(registry.isProtocolSupported('github')).toBe(true);

      const handler = registry.getHandlerByProtocol('github');
      expect(handler?.protocol).toBe('github');
      expect(handler?.name).toBe('GitHub Calendar Loader');
      expect(handler?.moduleId).toBe('test-module');
    });

    it('should emit hook when handler is registered', () => {
      registry.registerHandler('test-module', testRegistration);

      expect(mockHooks.callAll).toHaveBeenCalledWith('seasons-stars:protocolHandlerRegistered', {
        protocol: 'github',
        moduleId: 'test-module',
        handler: expect.any(Object),
      });
    });

    it('should prevent duplicate protocol registration', () => {
      registry.registerHandler('test-module', testRegistration);

      expect(() => {
        registry.registerHandler('another-module', testRegistration);
      }).toThrow("Protocol 'github' is already registered by module 'test-module'");
    });

    it('should validate protocol format', () => {
      const invalidRegistration = { ...testRegistration, protocol: '123invalid' };

      expect(() => {
        registry.registerHandler('test-module', invalidRegistration);
      }).toThrow('Invalid protocol format: 123invalid');
    });

    it('should accept valid protocol formats', () => {
      const validProtocols = ['http', 'https', 'ftp', 'custom-protocol', 'a1', 'test123'];

      for (const protocol of validProtocols) {
        const registration = { ...testRegistration, protocol };
        expect(() => {
          registry.registerHandler('test-module', registration);
        }).not.toThrow();
      }
    });
  });

  describe('Protocol Unregistration', () => {
    beforeEach(() => {
      registry.registerHandler('test-module', {
        protocol: 'github',
        name: 'GitHub Loader',
        handler: async () => ({ success: false, error: 'test' }),
      });
    });

    it('should unregister a protocol handler', () => {
      const result = registry.unregisterHandler('github', 'test-module');

      expect(result).toBe(true);
      expect(registry.isProtocolSupported('github')).toBe(false);
    });

    it('should emit hook when handler is unregistered', () => {
      mockHooks.callAll.mockClear();
      registry.unregisterHandler('github', 'test-module');

      expect(mockHooks.callAll).toHaveBeenCalledWith('seasons-stars:protocolHandlerUnregistered', {
        protocol: 'github',
        moduleId: 'test-module',
        handler: expect.any(Object),
      });
    });

    it('should prevent unauthorized unregistration', () => {
      const result = registry.unregisterHandler('github', 'different-module');

      expect(result).toBe(false);
      expect(registry.isProtocolSupported('github')).toBe(true);
    });

    it('should return false for non-existent protocol', () => {
      const result = registry.unregisterHandler('nonexistent', 'test-module');
      expect(result).toBe(false);
    });
  });

  describe('Handler Queries', () => {
    beforeEach(() => {
      registry.registerHandler('module-a', {
        protocol: 'github',
        name: 'GitHub Loader',
        handler: async () => ({ success: false, error: 'test' }),
      });

      registry.registerHandler('module-b', {
        protocol: 'google',
        name: 'Google Loader',
        handler: async () => ({ success: false, error: 'test' }),
      });

      registry.registerHandler('module-a', {
        protocol: 'custom',
        name: 'Custom Loader',
        handler: async () => ({ success: false, error: 'test' }),
      });
    });

    it('should get all handlers', () => {
      const handlers = registry.getHandlers();
      const protocols = handlers.map(h => h.protocol);

      expect(protocols).toContain('github');
      expect(protocols).toContain('google');
      expect(protocols).toContain('custom');
      expect(protocols).toContain('file'); // built-in
      expect(protocols).toContain('data'); // built-in
    });

    it('should get handlers by module', () => {
      const moduleAHandlers = registry.getHandlersByModule('module-a');
      const protocols = moduleAHandlers.map(h => h.protocol);

      expect(protocols).toContain('github');
      expect(protocols).toContain('custom');
      expect(protocols).not.toContain('google');
    });

    it('should get handler by protocol', () => {
      const handler = registry.getHandlerByProtocol('github');

      expect(handler?.protocol).toBe('github');
      expect(handler?.moduleId).toBe('module-a');
    });
  });

  describe('URL Parsing', () => {
    it('should parse valid protocol URLs', () => {
      const testCases = [
        {
          url: 'github:user/repo/calendar.json',
          protocol: 'github',
          path: 'user/repo/calendar.json',
        },
        { url: 'google:calendar-id', protocol: 'google', path: 'calendar-id' },
        { url: 'custom-proto:some/path', protocol: 'custom-proto', path: 'some/path' },
        { url: 'a:b', protocol: 'a', path: 'b' },
      ];

      for (const testCase of testCases) {
        const result = registry.parseProtocolUrl(testCase.url);
        expect(result).toEqual({
          protocol: testCase.protocol,
          path: testCase.path,
        });
      }
    });

    it('should return null for invalid URLs', () => {
      const invalidUrls = [
        'not-a-protocol-url',
        ':missing-protocol',
        'proto:',
        '123:invalid-start',
      ];

      for (const url of invalidUrls) {
        const result = registry.parseProtocolUrl(url);
        expect(result).toBeNull();
      }
    });
  });

  describe('Calendar Loading', () => {
    beforeEach(() => {
      registry.registerHandler('test-module', {
        protocol: 'github',
        name: 'GitHub Loader',
        handler: async (path: string) => ({
          success: true,
          calendar: { ...sampleCalendar, id: `github-${path}` },
          fromCache: false,
        }),
        validatePath: (path: string) => path.includes('/'),
      });
    });

    it('should load calendar using protocol handler', async () => {
      const result = await registry.loadFromProtocol('github:user/repo/calendar.json');

      expect(result.success).toBe(true);
      expect(result.calendar?.id).toBe('github-user/repo/calendar.json');
      expect(result.sourceUrl).toBe('github:user/repo/calendar.json');
    });

    it('should handle invalid protocol URL format', async () => {
      const result = await registry.loadFromProtocol('invalid-url');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid protocol URL format');
    });

    it('should handle unsupported protocol', async () => {
      const result = await registry.loadFromProtocol('unsupported:some/path');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No handler registered for protocol: unsupported');
    });

    it('should handle path validation failure', async () => {
      const result = await registry.loadFromProtocol('github:invalid-path');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid path format for protocol github');
    });

    it('should handle handler errors', async () => {
      registry.registerHandler('error-module', {
        protocol: 'error',
        name: 'Error Loader',
        handler: async () => {
          throw new Error('Handler error');
        },
      });

      const result = await registry.loadFromProtocol('error:some/path');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Protocol handler error: Handler error');
    });
  });

  describe('Built-in Data Protocol', () => {
    it('should load calendar from base64 data', async () => {
      const calendarJson = JSON.stringify(sampleCalendar);
      const base64Data = btoa(calendarJson);

      const result = await registry.loadFromProtocol(`data:${base64Data}`);

      expect(result.success).toBe(true);
      expect(result.calendar).toEqual(sampleCalendar);
      expect(result.fromCache).toBe(false);
    });

    it('should handle invalid base64 data', async () => {
      const result = await registry.loadFromProtocol('data:invalid-base64');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid path format for protocol data');
    });

    it('should validate base64 paths', () => {
      const dataHandler = registry.getHandlerByProtocol('data');
      expect(dataHandler?.validatePath?.('dGVzdA==')).toBe(true); // Valid base64
      expect(dataHandler?.validatePath?.('invalid!')).toBe(false); // Invalid base64
    });
  });

  describe('Module Cleanup', () => {
    beforeEach(() => {
      registry.registerHandler('test-module', {
        protocol: 'github',
        name: 'GitHub Loader',
        handler: async () => ({ success: false, error: 'test' }),
      });

      registry.registerHandler('test-module', {
        protocol: 'custom',
        name: 'Custom Loader',
        handler: async () => ({ success: false, error: 'test' }),
      });

      registry.registerHandler('other-module', {
        protocol: 'other',
        name: 'Other Loader',
        handler: async () => ({ success: false, error: 'test' }),
      });
    });

    it('should unregister all handlers for a module', () => {
      registry.unregisterModuleHandlers('test-module');

      expect(registry.isProtocolSupported('github')).toBe(false);
      expect(registry.isProtocolSupported('custom')).toBe(false);
      expect(registry.isProtocolSupported('other')).toBe(true); // Different module
    });
  });

  describe('Debug Information', () => {
    beforeEach(() => {
      registry.registerHandler('test-module', {
        protocol: 'github',
        name: 'GitHub Loader',
        handler: async () => ({ success: false, error: 'test' }),
        description: 'GitHub integration',
      });
    });

    it('should provide debug information', () => {
      const debug = registry.getDebugInfo();

      expect(debug.handlerCount).toBeGreaterThan(0);
      expect(debug.protocols).toContain('github');
      expect(debug.protocols).toContain('file');
      expect(debug.protocols).toContain('data');

      const githubHandler = debug.handlers.find(h => h.protocol === 'github');
      expect(githubHandler?.name).toBe('GitHub Loader');
      expect(githubHandler?.moduleId).toBe('test-module');
      expect(githubHandler?.description).toBe('GitHub integration');
    });
  });
});

describe('Protocol Handlers Global API', () => {
  beforeEach(() => {
    // Reset singleton for clean tests
    // @ts-expect-error - Access private static property for testing
    ProtocolHandlerRegistry.instance = null;
    mockHooks.callAll.mockClear();
  });

  it('should register handler through global API', () => {
    const handlerId = protocolHandlers.register('test-module', {
      protocol: 'github',
      name: 'GitHub Loader',
      handler: async () => ({ success: false, error: 'test' }),
    });

    expect(handlerId).toBeTruthy();
    expect(protocolHandlers.isSupported('github')).toBe(true);
  });

  it('should unregister handler through global API', () => {
    protocolHandlers.register('test-module', {
      protocol: 'github',
      name: 'GitHub Loader',
      handler: async () => ({ success: false, error: 'test' }),
    });

    const result = protocolHandlers.unregister('github', 'test-module');
    expect(result).toBe(true);
    expect(protocolHandlers.isSupported('github')).toBe(false);
  });

  it('should get all handlers through global API', () => {
    protocolHandlers.register('test-module', {
      protocol: 'github',
      name: 'GitHub Loader',
      handler: async () => ({ success: false, error: 'test' }),
    });

    const handlers = protocolHandlers.getAll();
    const protocols = handlers.map(h => h.protocol);
    expect(protocols).toContain('github');
  });

  it('should get specific handler through global API', () => {
    protocolHandlers.register('test-module', {
      protocol: 'github',
      name: 'GitHub Loader',
      handler: async () => ({ success: false, error: 'test' }),
    });

    const handler = protocolHandlers.get('github');
    expect(handler?.name).toBe('GitHub Loader');
  });

  it('should load calendar through global API', async () => {
    protocolHandlers.register('test-module', {
      protocol: 'github',
      name: 'GitHub Loader',
      handler: async (path: string) => ({
        success: true,
        calendar: { ...sampleCalendar, id: `github-${path}` },
        fromCache: false,
      }),
    });

    const result = await protocolHandlers.load('github:user/repo/calendar.json');
    expect(result.success).toBe(true);
    expect(result.calendar?.id).toBe('github-user/repo/calendar.json');
  });

  it('should parse URLs through global API', () => {
    const result = protocolHandlers.parseUrl('github:user/repo/calendar.json');
    expect(result).toEqual({
      protocol: 'github',
      path: 'user/repo/calendar.json',
    });
  });
});
