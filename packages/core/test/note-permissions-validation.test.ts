import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotePermissions } from '../src/core/note-permissions';

// Mock Foundry globals
global.CONST = {
  DOCUMENT_OWNERSHIP_LEVELS: {
    NONE: 0,
    LIMITED: 1,
    OBSERVER: 2,
    OWNER: 3,
  },
} as any;

global.game = {
  settings: {
    get: vi.fn((module: string, key: string) => {
      if (key === 'allowPlayerNotes') return false;
      if (key === 'defaultPlayerVisible') return false;
      if (key === 'defaultPlayerEditable') return false;
      return null;
    }),
  },
  journal: {
    filter: vi.fn(() => []),
  },
  user: {
    id: 'user1',
    isGM: false,
  },
} as any;

describe('NotePermissions - Ownership Validation', () => {
  let notePermissions: NotePermissions;

  beforeEach(() => {
    notePermissions = new NotePermissions();
    vi.clearAllMocks();
  });

  describe('validateOwnership', () => {
    it('should validate correct ownership structure', () => {
      const validOwnership = {
        default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE,
        user1: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER,
        user2: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER,
      };

      const result = notePermissions.validateOwnership(validOwnership);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject non-object ownership', () => {
      const result1 = notePermissions.validateOwnership(null);
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('Ownership must be an object');

      const result2 = notePermissions.validateOwnership(undefined);
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('Ownership must be an object');

      const result3 = notePermissions.validateOwnership('string');
      expect(result3.isValid).toBe(false);
      expect(result3.errors).toContain('Ownership must be an object');
    });

    it('should reject invalid default ownership level', () => {
      const invalidOwnership = {
        default: 999, // Invalid level
      };

      const result = notePermissions.validateOwnership(invalidOwnership);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('Invalid default ownership level'))).toBe(true);
    });

    it('should reject invalid user-specific ownership levels', () => {
      const invalidOwnership = {
        default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE,
        user1: 999, // Invalid level
        user2: -1, // Invalid level
      };

      const result = notePermissions.validateOwnership(invalidOwnership);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('user1'))).toBe(true);
      expect(result.errors.some(e => e.includes('user2'))).toBe(true);
    });

    it('should accept ownership without default level', () => {
      const ownershipWithoutDefault = {
        user1: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER,
      };

      const result = notePermissions.validateOwnership(ownershipWithoutDefault);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject non-number ownership levels', () => {
      const invalidOwnership = {
        default: 'OWNER', // Should be number
        user1: true, // Should be number
      };

      const result = notePermissions.validateOwnership(invalidOwnership);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate all standard Foundry ownership levels', () => {
      const ownership = {
        default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE,
        user1: CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED,
        user2: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER,
        user3: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER,
      };

      const result = notePermissions.validateOwnership(ownership);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle empty ownership object', () => {
      const result = notePermissions.validateOwnership({});

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should provide detailed error messages', () => {
      const invalidOwnership = {
        default: 100,
        user1: 200,
        user2: 300,
      };

      const result = notePermissions.validateOwnership(invalidOwnership);

      expect(result.isValid).toBe(false);
      // Should have errors for default and both users
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('getDefaultOwnership', () => {
    it('should create ownership with NONE when settings are disabled', () => {
      const ownership = notePermissions.getDefaultOwnership('creator1');

      expect(ownership.creator1).toBe(CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
      expect(ownership.default).toBe(CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE);
    });

    it('should create ownership with OBSERVER when playerVisible is enabled', () => {
      vi.mocked(game.settings.get).mockImplementation((module: string, key: string) => {
        if (key === 'defaultPlayerVisible') return true;
        if (key === 'defaultPlayerEditable') return false;
        return false;
      });

      const ownership = notePermissions.getDefaultOwnership('creator1');

      expect(ownership.creator1).toBe(CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
      expect(ownership.default).toBe(CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER);
    });

    it('should create ownership with OWNER when playerEditable is enabled', () => {
      vi.mocked(game.settings.get).mockImplementation((module: string, key: string) => {
        if (key === 'defaultPlayerEditable') return true;
        return false;
      });

      const ownership = notePermissions.getDefaultOwnership('creator1');

      expect(ownership.creator1).toBe(CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
      expect(ownership.default).toBe(CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
    });

    it('should prioritize playerEditable over playerVisible', () => {
      vi.mocked(game.settings.get).mockImplementation((module: string, key: string) => {
        if (key === 'defaultPlayerVisible') return true;
        if (key === 'defaultPlayerEditable') return true;
        return false;
      });

      const ownership = notePermissions.getDefaultOwnership('creator1');

      expect(ownership.default).toBe(CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
    });
  });
});
