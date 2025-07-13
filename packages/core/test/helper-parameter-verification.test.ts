import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DateFormatter } from '../src/core/date-formatter';
import { CalendarDate } from '../src/core/calendar-date';
import type { SeasonsStarsCalendar } from '../src/types/calendar';

describe('Helper Parameter Verification', () => {
  let mockCalendar: SeasonsStarsCalendar;
  let mockHandlebars: any;
  let capturedHelper: any;

  beforeEach(() => {
    // Create a mock Handlebars that captures helper registrations
    mockHandlebars = {
      compile: vi.fn(),
      registerHelper: vi.fn((name: string, helper: any) => {
        if (name === 'ss-hour') {
          capturedHelper = helper;
        }
      }),
    };

    // Replace global Handlebars
    (global as any).Handlebars = mockHandlebars;

    mockCalendar = {
      id: 'test-calendar',
      months: [{ name: 'January', days: 31 }],
      weekdays: [{ name: 'Sunday' }],
      year: { prefix: '', suffix: '' },
      time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
    } as SeasonsStarsCalendar;
  });

  it('should register ss-hour helper with correct parameter handling', () => {
    // Create DateFormatter to trigger helper registration
    new DateFormatter(mockCalendar);

    // Verify ss-hour helper was registered
    expect(mockHandlebars.registerHelper).toHaveBeenCalledWith('ss-hour', expect.any(Function));
    expect(capturedHelper).toBeDefined();
  });

  it('should handle ss-hour helper parameters correctly', () => {
    // Create DateFormatter to trigger helper registration
    new DateFormatter(mockCalendar);

    // Simulate calling the helper with parameters like {{ss-hour hour format='pad'}}
    const mockOptions = {
      hash: { format: 'pad' },
    };

    // Test with hour value 5 (should pad to "05")
    const result1 = capturedHelper(5, mockOptions);
    expect(result1).toBe('05');

    // Test with hour value 14 (should stay "14")
    const result2 = capturedHelper(14, mockOptions);
    expect(result2).toBe('14');

    // Test without padding
    const mockOptionsNoPad = { hash: {} };
    const result3 = capturedHelper(5, mockOptionsNoPad);
    expect(result3).toBe('5');
  });

  it('should handle undefined/null hour values gracefully', () => {
    // Create DateFormatter to trigger helper registration
    new DateFormatter(mockCalendar);

    const mockOptions = {
      hash: { format: 'pad' },
    };

    // Test with undefined hour (when passed undefined with pad format, should apply padding)
    const result1 = capturedHelper(undefined, mockOptions);
    expect(result1).toBe('00');

    // Test with null hour (when passed null with pad format, should apply padding)
    const result2 = capturedHelper(null, mockOptions);
    expect(result2).toBe('00');
  });
});
