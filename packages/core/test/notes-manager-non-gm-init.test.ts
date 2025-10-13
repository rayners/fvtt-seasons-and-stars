/**
 * Tests for NotesManager initialization behavior with non-GM users
 *
 * Verifies that non-GM users cannot create folders but can use existing ones.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Use real TestLogger instead of mocks for better testing
import { TestLogger } from './utils/test-logger';
vi.mock('../src/core/logger', () => ({
  Logger: TestLogger,
}));

import { NotesManager } from '../src/core/notes-manager';

describe('NotesManager Non-GM Initialization', () => {
  let manager: NotesManager;
  let mockFolders: any;

  beforeEach(() => {
    manager = new NotesManager();
    vi.clearAllMocks();
    TestLogger.clearLogs();

    // Mock Foundry folders collection
    mockFolders = {
      find: vi.fn(),
      create: vi.fn(),
    };

    // Set up global game mock
    globalThis.game = {
      user: { isGM: false }, // Non-GM user
      settings: {
        get: vi.fn(),
        set: vi.fn(),
      },
      folders: mockFolders,
      journal: {
        find: vi.fn(),
        forEach: vi.fn(),
        filter: vi.fn().mockReturnValue([]),
      },
    } as any;

    globalThis.setTimeout = global.setTimeout;
  });

  describe('initializeNotesFolder() with non-GM user', () => {
    it('should skip folder creation for non-GM users', async () => {
      const initializeNotesFolder = (manager as any).initializeNotesFolder.bind(manager);

      await initializeNotesFolder();

      expect(mockFolders.create).not.toHaveBeenCalled();
      expect(TestLogger.getLogsContaining('Skipping folder creation for non-GM user').length).toBe(
        1
      );
    });

    it('should not throw error for non-GM users during initialization', async () => {
      const initializeNotesFolder = (manager as any).initializeNotesFolder.bind(manager);

      await expect(initializeNotesFolder()).resolves.not.toThrow();
    });
  });

  describe('getOrCreateNotesFolder() with non-GM user', () => {
    it('should return existing folder if found', async () => {
      const existingFolder = {
        id: 'folder-123',
        type: 'JournalEntry',
        getFlag: vi.fn((scope, key) => {
          if (scope === 'seasons-and-stars' && key === 'notesFolder') {
            return true;
          }
          return undefined;
        }),
      };

      mockFolders.find.mockReturnValue(existingFolder);

      const result = await manager.getOrCreateNotesFolder();

      expect(result).toBe(existingFolder);
      expect(mockFolders.create).not.toHaveBeenCalled();
    });

    it('should throw error when folder does not exist and user is not GM', async () => {
      mockFolders.find.mockReturnValue(undefined);

      await expect(manager.getOrCreateNotesFolder()).rejects.toThrow(
        'Calendar Notes folder does not exist and only GMs can create it'
      );

      expect(mockFolders.create).not.toHaveBeenCalled();
    });
  });

  describe('initializeSync() with non-GM user', () => {
    it('should not attempt folder creation during async initialization', async () => {
      manager.initializeSync();

      expect(manager.isInitialized()).toBe(true);

      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(mockFolders.create).not.toHaveBeenCalled();
      expect(TestLogger.getLogsContaining('Skipping folder creation for non-GM user').length).toBe(
        1
      );
    });

    it('should not throw error during async initialization for non-GM', async () => {
      manager.initializeSync();

      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(
        TestLogger.getLogsContaining('Failed to complete notes manager async initialization').length
      ).toBe(0);
    });
  });

  describe('GM user comparison', () => {
    it('should create folder when user is GM', async () => {
      // Change user to GM
      globalThis.game.user.isGM = true;

      const newFolder = {
        id: 'new-folder-123',
        type: 'JournalEntry',
      };

      mockFolders.find.mockReturnValue(undefined);

      // Mock Folder.create
      const mockFolderCreate = vi.fn().mockResolvedValue(newFolder);
      globalThis.Folder = {
        create: mockFolderCreate,
      } as any;

      const initializeNotesFolder = (manager as any).initializeNotesFolder.bind(manager);
      await initializeNotesFolder();

      expect(mockFolderCreate).toHaveBeenCalledWith({
        name: 'Calendar Notes',
        type: 'JournalEntry',
        flags: {
          'seasons-and-stars': {
            notesFolder: true,
            version: '1.0',
          },
        },
      });
    });

    it('should not skip initialization for GM users', async () => {
      // Change user to GM
      globalThis.game.user.isGM = true;

      mockFolders.find.mockReturnValue(undefined);

      // Mock Folder.create
      const mockFolderCreate = vi.fn().mockResolvedValue({
        id: 'new-folder-123',
        type: 'JournalEntry',
      });
      globalThis.Folder = {
        create: mockFolderCreate,
      } as any;

      const initializeNotesFolder = (manager as any).initializeNotesFolder.bind(manager);
      await initializeNotesFolder();

      expect(TestLogger.getLogsContaining('Skipping folder creation for non-GM user').length).toBe(
        0
      );
      expect(mockFolderCreate).toHaveBeenCalled();
    });
  });
});
