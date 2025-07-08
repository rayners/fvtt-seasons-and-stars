/**
 * Star Trek Calendar Syntax Validation Tests
 * Tests the actual helper syntax used in gregorian-star-trek-variants.json
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DateFormatter } from '../src/core/date-formatter';
import { CalendarDate } from '../src/core/calendar-date';
import fs from 'fs';
import path from 'path';

// Mock Handlebars for testing but with more realistic behavior
const mockHandlebars = {
  compile: vi.fn(),
  registerHelper: vi.fn(),
};

global.Handlebars = mockHandlebars;

describe('Star Trek Calendar Syntax Validation', () => {
  let starTrekCalendar: any;
  let formatter: DateFormatter;
  let mockDate: CalendarDate;

  beforeEach(() => {
    vi.clearAllMocks();
    DateFormatter.resetHelpersForTesting();

    // Load the actual Star Trek calendar file
    const calendarPath = path.join(process.cwd(), 'calendars', 'gregorian-star-trek-variants.json');
    const calendarData = fs.readFileSync(calendarPath, 'utf8');
    starTrekCalendar = JSON.parse(calendarData);

    mockDate = {
      year: 2370,
      month: 1,
      day: 15,
      hour: 14,
      minute: 30,
      second: 45,
    } as CalendarDate;

    // Create formatter with base gregorian calendar structure
    const baseCalendar = {
      id: 'gregorian-star-trek-variants',
      name: 'Star Trek Calendar Variants',
      months: Array.from({ length: 12 }, (_, i) => ({
        name: [
          'January',
          'February',
          'March',
          'April',
          'May',
          'June',
          'July',
          'August',
          'September',
          'October',
          'November',
          'December',
        ][i],
        abbreviation: [
          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'May',
          'Jun',
          'Jul',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec',
        ][i],
        days: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][i],
      })),
      weekdays: [
        { name: 'Sunday', abbreviation: 'Sun' },
        { name: 'Monday', abbreviation: 'Mon' },
        { name: 'Tuesday', abbreviation: 'Tue' },
        { name: 'Wednesday', abbreviation: 'Wed' },
        { name: 'Thursday', abbreviation: 'Thu' },
        { name: 'Friday', abbreviation: 'Fri' },
        { name: 'Saturday', abbreviation: 'Sat' },
      ],
      year: { prefix: '', suffix: '' },
      time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
    };

    formatter = new DateFormatter(baseCalendar);
  });

  describe('Real Calendar File Format Validation', () => {
    it('should use correct parameter syntax in time format (fixed from colon syntax)', () => {
      // This verifies the fix for the problematic line from the calendar file
      const federationVariant = starTrekCalendar.variants['federation-standard'];
      const timeFormat = federationVariant.overrides.dateFormats.time;

      // Should now use correct parameter syntax instead of colon syntax
      expect(timeFormat).toBe(
        '{{ss-hour format="pad"}}:{{ss-minute format="pad"}}:{{ss-second format="pad"}} UTC'
      );

      // Mock Handlebars to succeed with correct syntax
      const mockTemplate = vi.fn().mockReturnValue('14:30:45 UTC');
      mockHandlebars.compile.mockReturnValue(mockTemplate);

      // This should work correctly with the fixed syntax
      const result = formatter.format(mockDate, timeFormat);

      // Verify that the compilation was successful
      expect(mockHandlebars.compile).toHaveBeenCalledWith(timeFormat);
      expect(result).toBe('14:30:45 UTC');
    });

    it('should validate that ss-stardate helper calls are properly formed', () => {
      const federationVariant = starTrekCalendar.variants['federation-standard'];
      const formats = federationVariant.overrides.dateFormats;

      const stardateFormats = [
        formats['tng-stardate'],
        formats['ds9-stardate'],
        formats['voyager-stardate'],
        formats['enterprise-stardate'],
      ];

      stardateFormats.forEach((format, index) => {
        // These all use complex parameter syntax that may not be supported
        expect(format).toContain('ss-stardate');
        expect(format).toContain('prefix=');
        expect(format).toContain('baseYear=');
        expect(format).toContain('dayOfYear=');
        expect(format).toContain('precision=');
      });
    });
  });

  describe('Array Bounds in calculateDayOfYear', () => {
    it('should fail when accessing months array with invalid indices', () => {
      // Create a date with an invalid month index that would cause array bounds error
      const invalidDate = {
        ...mockDate,
        month: 13, // January = 1, so 13 is out of bounds for 12-month calendar
      } as CalendarDate;

      // Mock a template that would call calculateDayOfYear
      const templateThatNeedsDayOfYear = 'Day {{dayOfYear}} of {{year}}';

      let capturedContext: any;
      const mockTemplate = vi.fn().mockImplementation(context => {
        capturedContext = context;
        return `Day ${context.dayOfYear || 'ERROR'} of ${context.year}`;
      });

      mockHandlebars.compile.mockReturnValue(mockTemplate);

      const result = formatter.format(invalidDate, templateThatNeedsDayOfYear);

      // This test will expose if calculateDayOfYear properly handles bounds
      expect(mockTemplate).toHaveBeenCalled();
      expect(capturedContext).toBeDefined();

      // The dayOfYear should not be undefined or cause an error
      expect(capturedContext.dayOfYear).toBeDefined();
      expect(typeof capturedContext.dayOfYear).toBe('number');
    });
  });
});
