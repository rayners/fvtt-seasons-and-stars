/**
 * Simple tests for NotesManager synchronous initialization functionality
 *
 * Tests the core logic without complex Foundry mocking.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Use real TestLogger instead of mocks for better testing
import { TestLogger } from './utils/test-logger';
vi.mock('../src/core/logger', () => ({
  Logger: TestLogger,
}));

import { NotesManager } from '../src/core/notes-manager';

// Mock Foundry globals with minimal functionality
const mockGame = {
  user: { isGM: true },
  settings: {
    get: vi.fn(),
    set: vi.fn(),
  },
  folders: {
    find: vi.fn(),
    create: vi.fn(),
  },
  journal: {
    find: vi.fn(),
    forEach: vi.fn(),
    filter: vi.fn().mockReturnValue([]), // Return empty array for filtering
  },
} as any;

// Set up global mocks
globalThis.game = mockGame;
globalThis.setTimeout = global.setTimeout;

describe('NotesManager Synchronous Initialization - Core Logic', () => {
  let manager: NotesManager;

  beforeEach(() => {
    manager = new NotesManager();
    vi.clearAllMocks();
    TestLogger.clearLogs();
  });

  describe('initializeSync() core logic', () => {
    it('should mark manager as initialized immediately', () => {
      expect(manager.isInitialized()).toBe(false);

      manager.initializeSync();

      expect(manager.isInitialized()).toBe(true);
      expect(
        TestLogger.getLogsContaining('Initializing Notes Manager synchronously').length
      ).toBeGreaterThan(0);
      expect(
        TestLogger.getLogsContaining('Notes Manager synchronous initialization complete').length
      ).toBeGreaterThan(0);
    });

    it('should not re-initialize if already initialized', () => {
      manager.initializeSync();
      TestLogger.clearLogs();

      manager.initializeSync();

      expect(TestLogger.getLogsContaining('Initializing Notes Manager synchronously').length).toBe(
        0
      );
    });

    it('should call storage.initialize()', () => {
      const storageSpy = vi.spyOn(manager.storage, 'initialize').mockImplementation(() => {});

      manager.initializeSync();

      expect(storageSpy).toHaveBeenCalled();

      storageSpy.mockRestore();
    });

    it('should schedule async initialization with setTimeout', () => {
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

      manager.initializeSync();

      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 0);

      setTimeoutSpy.mockRestore();
    });

    it('should handle storage initialization errors gracefully', () => {
      const storageSpy = vi.spyOn(manager.storage, 'initialize').mockImplementation(() => {
        throw new Error('Storage init failed');
      });

      // Should not throw error and should still mark as initialized
      expect(() => manager.initializeSync()).not.toThrow();
      expect(manager.isInitialized()).toBe(true);

      storageSpy.mockRestore();
    });
  });

  describe('async initialization scheduling', () => {
    it('should call initializeNotesFolder in async callback', async () => {
      const initializeFolderSpy = vi
        .spyOn(manager as any, 'initializeNotesFolder')
        .mockResolvedValue(undefined);

      manager.initializeSync();

      // Wait for setTimeout callback
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(initializeFolderSpy).toHaveBeenCalled();

      initializeFolderSpy.mockRestore();
    });

    it('should handle async initialization errors gracefully', async () => {
      const initializeFolderSpy = vi
        .spyOn(manager as any, 'initializeNotesFolder')
        .mockRejectedValue(new Error('Async init failed'));

      manager.initializeSync();

      // Wait for setTimeout callback and error handling
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(
        TestLogger.getLogsContaining('Failed to complete notes manager async initialization').length
      ).toBeGreaterThan(0);

      initializeFolderSpy.mockRestore();
    });

    it('should optimize for large collections when note count > 500', async () => {
      // Mock getAllCalendarNotes to return large collection
      const getAllNotesSpy = vi.spyOn(manager, 'getAllCalendarNotes').mockReturnValue(
        new Array(600).fill(null).map((_, i) => ({
          id: `note-${i}`,
          title: `Note ${i}`,
          date: '2024-01-01',
          content: 'Test content',
        }))
      );

      // Mock initializeNotesFolder to prevent errors
      const initializeFolderSpy = vi
        .spyOn(manager as any, 'initializeNotesFolder')
        .mockResolvedValue(undefined);

      const optimizeSpy = vi
        .spyOn(manager.storage as any, 'optimizeForLargeCollections')
        .mockResolvedValue(undefined);

      manager.initializeSync();

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(optimizeSpy).toHaveBeenCalled();
      expect(
        TestLogger.getLogsContaining('Large note collection detected (600 notes)').length
      ).toBeGreaterThan(0);

      getAllNotesSpy.mockRestore();
      initializeFolderSpy.mockRestore();
      optimizeSpy.mockRestore();
    });

    it('should not optimize for small collections when note count <= 500', async () => {
      // Mock getAllCalendarNotes to return small collection
      const getAllNotesSpy = vi
        .spyOn(manager, 'getAllCalendarNotes')
        .mockReturnValue([{ id: 'note-1', title: 'Note 1', date: '2024-01-01', content: 'Test' }]);

      const optimizeSpy = vi
        .spyOn(manager.storage as any, 'optimizeForLargeCollections')
        .mockResolvedValue(undefined);

      manager.initializeSync();

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(optimizeSpy).not.toHaveBeenCalled();

      getAllNotesSpy.mockRestore();
      optimizeSpy.mockRestore();
    });
  });

  describe('compatibility with async initialize()', () => {
    it('should maintain isInitialized() consistency', async () => {
      // Mock async dependencies
      const initializeFolderSpy = vi
        .spyOn(manager as any, 'initializeNotesFolder')
        .mockResolvedValue(undefined);

      await manager.initialize();

      expect(manager.isInitialized()).toBe(true);

      initializeFolderSpy.mockRestore();
    });

    it('should handle both sync and async initialization calls', async () => {
      // Initialize synchronously first
      manager.initializeSync();
      expect(manager.isInitialized()).toBe(true);

      // Then try async initialization
      const initializeFolderSpy = vi
        .spyOn(manager as any, 'initializeNotesFolder')
        .mockResolvedValue(undefined);

      await manager.initialize();

      // Should return early since already initialized (no return value expected)
      expect(manager.isInitialized()).toBe(true);

      initializeFolderSpy.mockRestore();
    });
  });

  describe('API availability after sync initialization', () => {
    beforeEach(() => {
      manager.initializeSync();
    });

    it('should provide consistent initialization state', () => {
      expect(manager.isInitialized()).toBe(true);
      expect(manager.isInitialized()).toBe(true); // Multiple calls should be consistent
    });

    it('should allow note operations without throwing', () => {
      // Basic note operations should not throw after sync initialization
      expect(() => {
        manager.getAllCalendarNotes();
      }).not.toThrow();

      expect(() => {
        manager.getNotesForDate({ year: 2024, month: 1, day: 1 } as any);
      }).not.toThrow();

      expect(() => {
        manager.searchNotes('test');
      }).not.toThrow();
    });
  });
});
