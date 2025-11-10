import { describe, it, expect } from 'vitest';
import { parseEventStartTime, parseEventDuration } from '../../../src/core/event-time-utils';

describe('parseEventStartTime', () => {
  describe('valid formats', () => {
    it('should parse hh format', () => {
      expect(parseEventStartTime('9')).toEqual({ hour: 9, minute: 0, second: 0 });
      expect(parseEventStartTime('23')).toEqual({ hour: 23, minute: 0, second: 0 });
      expect(parseEventStartTime('0')).toEqual({ hour: 0, minute: 0, second: 0 });
    });

    it('should parse hh:mm format', () => {
      expect(parseEventStartTime('14:30')).toEqual({ hour: 14, minute: 30, second: 0 });
      expect(parseEventStartTime('9:05')).toEqual({ hour: 9, minute: 5, second: 0 });
      expect(parseEventStartTime('0:0')).toEqual({ hour: 0, minute: 0, second: 0 });
    });

    it('should parse hh:mm:ss format', () => {
      expect(parseEventStartTime('14:30:45')).toEqual({ hour: 14, minute: 30, second: 45 });
      expect(parseEventStartTime('9:05:03')).toEqual({ hour: 9, minute: 5, second: 3 });
      expect(parseEventStartTime('23:59:59')).toEqual({ hour: 23, minute: 59, second: 59 });
      expect(parseEventStartTime('0:0:0')).toEqual({ hour: 0, minute: 0, second: 0 });
    });

    it('should handle multi-digit hours', () => {
      expect(parseEventStartTime('100', 200)).toEqual({ hour: 100, minute: 0, second: 0 });
      expect(parseEventStartTime('999:45:30', 1000)).toEqual({ hour: 999, minute: 45, second: 30 });
    });

    it('should handle custom calendar time units', () => {
      expect(parseEventStartTime('5:10:15', 10, 100, 100)).toEqual({
        hour: 5,
        minute: 10,
        second: 15,
      });
      expect(parseEventStartTime('9', 10)).toEqual({ hour: 9, minute: 0, second: 0 });
    });

    it('should trim whitespace', () => {
      expect(parseEventStartTime('  14:30:00  ')).toEqual({ hour: 14, minute: 30, second: 0 });
      expect(parseEventStartTime(' 9 ')).toEqual({ hour: 9, minute: 0, second: 0 });
    });
  });

  describe('default values', () => {
    it('should return 00:00:00 for undefined', () => {
      expect(parseEventStartTime(undefined)).toEqual({ hour: 0, minute: 0, second: 0 });
    });

    it('should return 00:00:00 for empty string', () => {
      expect(parseEventStartTime('')).toEqual({ hour: 0, minute: 0, second: 0 });
    });

    it('should return 00:00:00 for whitespace-only', () => {
      expect(parseEventStartTime('   ')).toEqual({ hour: 0, minute: 0, second: 0 });
    });
  });

  describe('invalid formats', () => {
    it('should handle invalid format and return default', () => {
      expect(parseEventStartTime('abc')).toEqual({ hour: 0, minute: 0, second: 0 });
      expect(parseEventStartTime('12:34:56:78')).toEqual({ hour: 0, minute: 0, second: 0 });
      expect(parseEventStartTime('12:ab')).toEqual({ hour: 0, minute: 0, second: 0 });
      expect(parseEventStartTime('12.5')).toEqual({ hour: 0, minute: 0, second: 0 });
    });

    it('should handle out-of-range hours', () => {
      expect(parseEventStartTime('24')).toEqual({ hour: 0, minute: 0, second: 0 });
      expect(parseEventStartTime('100')).toEqual({ hour: 0, minute: 0, second: 0 });
      expect(parseEventStartTime('-1')).toEqual({ hour: 0, minute: 0, second: 0 });
    });

    it('should handle out-of-range minutes', () => {
      expect(parseEventStartTime('12:60')).toEqual({ hour: 0, minute: 0, second: 0 });
      expect(parseEventStartTime('12:100')).toEqual({ hour: 0, minute: 0, second: 0 });
      expect(parseEventStartTime('12:-1')).toEqual({ hour: 0, minute: 0, second: 0 });
    });

    it('should handle out-of-range seconds', () => {
      expect(parseEventStartTime('12:30:60')).toEqual({ hour: 0, minute: 0, second: 0 });
      expect(parseEventStartTime('12:30:100')).toEqual({ hour: 0, minute: 0, second: 0 });
      expect(parseEventStartTime('12:30:-1')).toEqual({ hour: 0, minute: 0, second: 0 });
    });

    it('should respect custom calendar bounds', () => {
      expect(parseEventStartTime('10', 10)).toEqual({ hour: 0, minute: 0, second: 0 });
      expect(parseEventStartTime('5:50', 24, 50)).toEqual({ hour: 0, minute: 0, second: 0 });
      expect(parseEventStartTime('5:30:50', 24, 60, 50)).toEqual({ hour: 0, minute: 0, second: 0 });
    });
  });
});

describe('parseEventDuration', () => {
  describe('valid formats', () => {
    it('should parse seconds', () => {
      expect(parseEventDuration('0s')).toEqual({ seconds: 0 });
      expect(parseEventDuration('30s')).toEqual({ seconds: 30 });
      expect(parseEventDuration('3600s')).toEqual({ seconds: 3600 });
    });

    it('should parse minutes', () => {
      expect(parseEventDuration('1m')).toEqual({ seconds: 60 });
      expect(parseEventDuration('15m')).toEqual({ seconds: 15 * 60 });
      expect(parseEventDuration('60m')).toEqual({ seconds: 60 * 60 });
    });

    it('should parse hours', () => {
      expect(parseEventDuration('1h')).toEqual({ seconds: 60 * 60 });
      expect(parseEventDuration('2h')).toEqual({ seconds: 2 * 60 * 60 });
      expect(parseEventDuration('24h')).toEqual({ seconds: 24 * 60 * 60 });
    });

    it('should parse days', () => {
      expect(parseEventDuration('1d')).toEqual({ seconds: 24 * 60 * 60 });
      expect(parseEventDuration('3d')).toEqual({ seconds: 3 * 24 * 60 * 60 });
      expect(parseEventDuration('7d')).toEqual({ seconds: 7 * 24 * 60 * 60 });
    });

    it('should parse weeks', () => {
      expect(parseEventDuration('1w')).toEqual({ seconds: 7 * 24 * 60 * 60 });
      expect(parseEventDuration('2w')).toEqual({ seconds: 2 * 7 * 24 * 60 * 60 });
    });

    it('should handle custom calendar time units', () => {
      expect(parseEventDuration('1d', 10, 100, 100)).toEqual({ seconds: 10 * 100 * 100 });
      expect(parseEventDuration('1h', 10, 100, 100)).toEqual({ seconds: 100 * 100 });
      expect(parseEventDuration('1m', 10, 100, 100)).toEqual({ seconds: 100 });
      expect(parseEventDuration('1w', 10, 100, 100, 5)).toEqual({ seconds: 5 * 10 * 100 * 100 });
    });

    it('should trim whitespace', () => {
      expect(parseEventDuration('  3d  ')).toEqual({ seconds: 3 * 24 * 60 * 60 });
      expect(parseEventDuration(' 2h ')).toEqual({ seconds: 2 * 60 * 60 });
    });
  });

  describe('default values', () => {
    it('should return 1 day for undefined', () => {
      expect(parseEventDuration(undefined)).toEqual({ seconds: 24 * 60 * 60 });
    });

    it('should return 1 day for empty string', () => {
      expect(parseEventDuration('')).toEqual({ seconds: 24 * 60 * 60 });
    });

    it('should return 1 day for whitespace-only', () => {
      expect(parseEventDuration('   ')).toEqual({ seconds: 24 * 60 * 60 });
    });
  });

  describe('invalid formats', () => {
    it('should handle invalid format and return default', () => {
      expect(parseEventDuration('abc')).toEqual({ seconds: 24 * 60 * 60 });
      expect(parseEventDuration('12')).toEqual({ seconds: 24 * 60 * 60 });
      expect(parseEventDuration('12x')).toEqual({ seconds: 24 * 60 * 60 });
      expect(parseEventDuration('12.5d')).toEqual({ seconds: 24 * 60 * 60 });
    });

    it('should handle negative values', () => {
      expect(parseEventDuration('-1d')).toEqual({ seconds: 24 * 60 * 60 });
      expect(parseEventDuration('-5h')).toEqual({ seconds: 24 * 60 * 60 });
    });
  });

  describe('edge cases', () => {
    it('should handle zero-duration events', () => {
      expect(parseEventDuration('0s')).toEqual({ seconds: 0 });
      expect(parseEventDuration('0m')).toEqual({ seconds: 0 });
      expect(parseEventDuration('0h')).toEqual({ seconds: 0 });
      expect(parseEventDuration('0d')).toEqual({ seconds: 0 });
      expect(parseEventDuration('0w')).toEqual({ seconds: 0 });
    });

    it('should handle large durations', () => {
      expect(parseEventDuration('365d')).toEqual({ seconds: 365 * 24 * 60 * 60 });
      expect(parseEventDuration('52w')).toEqual({ seconds: 52 * 7 * 24 * 60 * 60 });
    });
  });
});
