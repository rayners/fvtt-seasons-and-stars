/**
 * Test namespace support for external calendar IDs
 */

import { describe, test, expect } from 'vitest';
import { ExternalCalendarRegistry } from '../src/core/external-calendar-registry';

describe('Calendar ID Namespace Support', () => {
  let registry: ExternalCalendarRegistry;

  beforeEach(() => {
    registry = new ExternalCalendarRegistry();
  });

  describe('parseExternalCalendarId', () => {
    test('should parse multi-path namespace correctly', () => {
      const result = registry.parseExternalCalendarId('github:user/repo/calendar.json');

      expect(result.protocol).toBe('github');
      expect(result.location).toBe('user/repo/calendar.json');
      expect(result.namespace).toBe('user/repo');
      expect(result.calendarId).toBe('calendar.json');
    });

    test('should parse slash-separated namespace', () => {
      const result = registry.parseExternalCalendarId('module:rayners/dark-sun-calendar');

      expect(result.protocol).toBe('module');
      expect(result.location).toBe('rayners/dark-sun-calendar');
      expect(result.namespace).toBe('rayners');
      expect(result.calendarId).toBe('dark-sun-calendar');
    });

    test('should parse colon-separated namespace', () => {
      const result = registry.parseExternalCalendarId('https:rayners:my-calendar');

      expect(result.protocol).toBe('https');
      expect(result.location).toBe('rayners:my-calendar');
      expect(result.namespace).toBe('rayners');
      expect(result.calendarId).toBe('my-calendar');
    });

    test('should parse URL-based namespace', () => {
      const result = registry.parseExternalCalendarId('github:github.com/user/repo/calendar.json');

      expect(result.protocol).toBe('github');
      expect(result.location).toBe('github.com/user/repo/calendar.json');
      expect(result.namespace).toBe('github.com/user/repo');
      expect(result.calendarId).toBe('calendar.json');
    });

    test('should handle no namespace', () => {
      const result = registry.parseExternalCalendarId('local:calendar.json');

      expect(result.protocol).toBe('local');
      expect(result.location).toBe('calendar.json');
      expect(result.namespace).toBeUndefined();
      expect(result.calendarId).toBe('calendar.json');
    });
  });

  describe('generateUniqueCalendarId', () => {
    test('should generate namespaced ID when namespace exists', () => {
      const result = registry.generateUniqueCalendarId('github:rayners/my-calendar', 'dark-sun');

      expect(result).toBe('rayners/dark-sun');
    });

    test('should return original ID when no namespace', () => {
      const result = registry.generateUniqueCalendarId('local:calendar.json', 'gregorian');

      expect(result).toBe('gregorian');
    });

    test('should sanitize namespace correctly', () => {
      const result = registry.generateUniqueCalendarId(
        'github:github.com/user/repo.git/calendar',
        'test-calendar'
      );

      expect(result).toBe('gh/user/repo/test-calendar');
    });
  });

  describe('resolveCalendarIdConflict', () => {
    test('should return original ID when no conflict', () => {
      const existingIds = new Set(['gregorian', 'vale-reckoning']);
      const result = registry.resolveCalendarIdConflict('rayners/dark-sun', existingIds);

      expect(result).toBe('rayners/dark-sun');
    });

    test('should append number when conflict exists', () => {
      const existingIds = new Set(['gregorian', 'rayners/dark-sun']);
      const result = registry.resolveCalendarIdConflict('rayners/dark-sun', existingIds);

      expect(result).toBe('rayners/dark-sun-1');
    });

    test('should increment number for multiple conflicts', () => {
      const existingIds = new Set(['gregorian', 'rayners/dark-sun', 'rayners/dark-sun-1']);
      const result = registry.resolveCalendarIdConflict('rayners/dark-sun', existingIds);

      expect(result).toBe('rayners/dark-sun-2');
    });
  });

  describe('getNamespaceDisplayName', () => {
    test('should format GitHub namespace', () => {
      const result = registry.getNamespaceDisplayName('github:github.com/user/repo/calendar');

      expect(result).toBe('GitHub: user/repo');
    });

    test('should format GitLab namespace', () => {
      const result = registry.getNamespaceDisplayName('gitlab:gitlab.com/user/repo/calendar');

      expect(result).toBe('GitLab: user/repo');
    });

    test('should format generic namespace', () => {
      const result = registry.getNamespaceDisplayName('module:rayners/calendar');

      expect(result).toBe('Source: rayners');
    });

    test('should return null for no namespace', () => {
      const result = registry.getNamespaceDisplayName('local:calendar.json');

      expect(result).toBeNull();
    });
  });
});
