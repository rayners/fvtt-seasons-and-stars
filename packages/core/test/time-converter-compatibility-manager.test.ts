/**
 * Time Converter CompatibilityManager Integration Tests
 *
 * Tests for the new CompatibilityManager data provider pattern that enables
 * time converter to request world creation timestamps from system integrations.
 */

import { describe, it, expect, beforeEach, vi, beforeAll, afterEach } from 'vitest';
import { TimeConverter } from '../src/core/time-converter';
import { CalendarEngine } from '../src/core/calendar-engine';
import { compatibilityManager } from '../src/core/compatibility-manager';
import type { SeasonsStarsCalendar } from '../src/types/calendar-types';
import { loadTestCalendar } from './utils/calendar-loader';

// Use the actual Golarion calendar JSON file instead of duplicating definitions
const golarionCalendar: SeasonsStarsCalendar = loadTestCalendar('golarion-pf2e.json');

describe('TimeConverter - CompatibilityManager Integration', () => {
  let engine: CalendarEngine;
  let timeConverter: TimeConverter;
  let mockHooks: any;

  beforeAll(() => {
    // Setup mock Foundry globals
    mockHooks = {
      callAll: vi.fn(),
      on: vi.fn(),
      once: vi.fn(),
      off: vi.fn(),
    };

    global.Hooks = mockHooks;
    global.game = {
      time: { worldTime: 0 },
      user: { isGM: true },
      system: { id: 'pf2e' },
    } as any;
  });

  beforeEach(() => {
    engine = new CalendarEngine(golarionCalendar);
    timeConverter = new TimeConverter(engine);

    // Reset global.game.system to default for each test
    global.game.system = { id: 'pf2e' };

    // Clear compatibility manager data providers
    (compatibilityManager as any).dataProviderRegistry.clear();

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Data Provider Integration in getCurrentDate', () => {
    it('should use data provider when system has registered provider', () => {
      // Register a data provider for PF2e
      const mockTimestamp = new Date('2025-01-01T00:00:00.000Z').getTime() / 1000;
      compatibilityManager.registerDataProvider(
        'pf2e',
        'worldCreationTimestamp',
        () => mockTimestamp
      );

      // Call getCurrentDate
      const currentDate = timeConverter.getCurrentDate();

      // The exact date will depend on calendar engine logic, but we can verify
      // that it used a different calculation than the default epoch
      expect(currentDate).toBeDefined();
      expect(currentDate.year).toBeGreaterThan(2700); // Should be > epoch due to real-world timestamp
    });

    it('should fall back to epoch calculation when no data provider registered', () => {
      // Ensure no data provider is registered for PF2e
      expect(compatibilityManager.hasDataProvider('pf2e', 'worldCreationTimestamp')).toBe(false);

      // Call getCurrentDate
      const currentDate = timeConverter.getCurrentDate();

      // Should use standard epoch-based calculation
      expect(currentDate).toBeDefined();
      expect(currentDate.year).toBe(2700); // Standard epoch year
    });

    it('should handle different game systems correctly', () => {
      // Register data provider for PF2e
      const pf2eTimestamp = new Date('2025-01-01T00:00:00.000Z').getTime() / 1000;
      compatibilityManager.registerDataProvider(
        'pf2e',
        'worldCreationTimestamp',
        () => pf2eTimestamp
      );

      // Test with PF2e system
      global.game.system = { id: 'pf2e' };
      const pf2eDate = timeConverter.getCurrentDate();
      expect(pf2eDate.year).toBeGreaterThan(2700);

      // Test with different system (no data provider)
      global.game.system = { id: 'dnd5e' };
      const dnd5eDate = timeConverter.getCurrentDate();
      expect(dnd5eDate.year).toBe(2700); // Should use epoch calculation
    });

    it('should handle data provider errors gracefully', () => {
      // Register a data provider that throws an error
      compatibilityManager.registerDataProvider('pf2e', 'worldCreationTimestamp', () => {
        throw new Error('Mock provider error');
      });

      // Should not throw and should fall back to standard calculation
      expect(() => {
        const currentDate = timeConverter.getCurrentDate();
        expect(currentDate.year).toBe(2700); // Should fall back to epoch
      }).not.toThrow();
    });

    it('should handle null/undefined returns from data provider', () => {
      // Register data provider that returns null
      compatibilityManager.registerDataProvider('pf2e', 'worldCreationTimestamp', () => null);

      const currentDate = timeConverter.getCurrentDate();
      expect(currentDate.year).toBe(2700); // Should fall back to epoch when null returned
    });
  });

  describe('Data Provider Integration in onWorldTimeUpdate', () => {
    it('should use data provider when handling world time updates', () => {
      // Register a data provider
      const mockTimestamp = new Date('2025-01-01T00:00:00.000Z').getTime() / 1000;
      compatibilityManager.registerDataProvider(
        'pf2e',
        'worldCreationTimestamp',
        () => mockTimestamp
      );

      // Simulate a world time update
      const newTime = 86400; // 1 day

      // Call the private method via the time converter's public interface
      // We'll trigger this indirectly by calling getCurrentDate after setting worldTime
      global.game.time.worldTime = newTime;
      const currentDate = timeConverter.getCurrentDate();

      // Should use the data provider timestamp in calculation
      expect(currentDate).toBeDefined();
      expect(currentDate.year).toBeGreaterThan(2700);
    });

    it('should handle system ID changes dynamically', () => {
      // Register data providers for different systems
      const pf2eTimestamp = new Date('2025-01-01T00:00:00.000Z').getTime() / 1000;
      const dnd5eTimestamp = new Date('2024-01-01T00:00:00.000Z').getTime() / 1000;

      compatibilityManager.registerDataProvider(
        'pf2e',
        'worldCreationTimestamp',
        () => pf2eTimestamp
      );
      compatibilityManager.registerDataProvider(
        'dnd5e',
        'worldCreationTimestamp',
        () => dnd5eTimestamp
      );

      // Test with PF2e
      global.game.system = { id: 'pf2e' };
      const pf2eDate = timeConverter.getCurrentDate();

      // Test with D&D 5e
      global.game.system = { id: 'dnd5e' };
      const dnd5eDate = timeConverter.getCurrentDate();

      // Both should use their respective data providers (different from epoch)
      expect(pf2eDate.year).toBeGreaterThan(2700);
      expect(dnd5eDate.year).toBeGreaterThan(2700);
      // The exact years may be different due to different timestamps
    });
  });

  describe('Error Handling and Robustness', () => {
    it('should provide consistent timestamps across multiple calls', () => {
      // Register a data provider
      const mockTimestamp = new Date('2025-01-01T00:00:00.000Z').getTime() / 1000;
      compatibilityManager.registerDataProvider(
        'pf2e',
        'worldCreationTimestamp',
        () => mockTimestamp
      );

      // Multiple calls should be consistent
      const date1 = timeConverter.getCurrentDate();
      const date2 = timeConverter.getCurrentDate();
      const date3 = timeConverter.getCurrentDate();

      expect(date1.year).toBe(date2.year);
      expect(date2.year).toBe(date3.year);
      expect(date1.month).toBe(date2.month);
      expect(date2.month).toBe(date3.month);
    });

    it('should handle timestamp changes between calls', () => {
      // Register a data provider that changes its return value
      let timestampValue = new Date('2025-01-01T00:00:00.000Z').getTime() / 1000;
      compatibilityManager.registerDataProvider(
        'pf2e',
        'worldCreationTimestamp',
        () => timestampValue
      );

      const date1 = timeConverter.getCurrentDate();

      // Change the timestamp
      timestampValue = new Date('2024-01-01T00:00:00.000Z').getTime() / 1000;

      const date2 = timeConverter.getCurrentDate();

      // Should reflect the new timestamp (may result in different years)
      // The exact assertion depends on calendar logic, but dates should be valid
      expect(date1).toBeDefined();
      expect(date2).toBeDefined();
      expect(date1.year).toBeGreaterThan(2700);
      expect(date2.year).toBeGreaterThan(2700);
    });
  });
});
