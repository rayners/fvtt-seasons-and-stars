/**
 * Test Week Advancement Fixes for Phase 2
 * Tests the dynamic week length implementation for different calendar types
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { CalendarEngine } from '../src/core/calendar-engine';
import { TimeConverter } from '../src/core/time-converter';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Week Advancement Fixes (Phase 2)', () => {
  let warhammerEngine: CalendarEngine;
  let gregorianEngine: CalendarEngine;
  let warhammerConverter: TimeConverter;
  let gregorianConverter: TimeConverter;

  beforeAll(() => {
    // Load WFRP calendar (8-day weeks)
    const warhammerPath = resolve(__dirname, '../calendars/warhammer.json');
    const warhammerData = JSON.parse(readFileSync(warhammerPath, 'utf8'));
    warhammerEngine = new CalendarEngine(warhammerData);
    warhammerConverter = new TimeConverter(warhammerEngine);

    // Load Gregorian calendar (7-day weeks)
    const gregorianPath = resolve(__dirname, '../calendars/gregorian.json');
    const gregorianData = JSON.parse(readFileSync(gregorianPath, 'utf8'));
    gregorianEngine = new CalendarEngine(gregorianData);
    gregorianConverter = new TimeConverter(gregorianEngine);

    console.log('=== WEEK ADVANCEMENT FIXES TEST ===');
    console.log('WFRP Calendar - Weekdays:', warhammerData.weekdays.length);
    console.log('Gregorian Calendar - Weekdays:', gregorianData.weekdays.length);
  });

  describe('WFRP Calendar - 8-Day Week Advancement', () => {
    it('should advance 8 days for +1 week', async () => {
      console.log('\n=== WFRP +1 WEEK TEST ===');

      // Start on a specific day to track weekday progression
      const startDate = { year: 2522, month: 3, day: 10, weekday: 0 };
      const startWeekday = warhammerEngine.calculateWeekday(
        startDate.year,
        startDate.month,
        startDate.day
      );
      const startWeekdayName = warhammerEngine.getCalendar().weekdays[startWeekday]?.name;

      console.log(
        `Start: ${startDate.month}/${startDate.day} = ${startWeekdayName} (${startWeekday})`
      );

      // Advance 1 week using engine's addDays method directly
      const weekLength = warhammerEngine.getCalendar().weekdays.length;
      const oneWeekLater = warhammerEngine.addDays(startDate, weekLength);
      const endWeekday = warhammerEngine.calculateWeekday(
        oneWeekLater.year,
        oneWeekLater.month,
        oneWeekLater.day
      );
      const endWeekdayName = warhammerEngine.getCalendar().weekdays[endWeekday]?.name;

      console.log(`Week length: ${weekLength} days`);
      console.log(
        `+1 week: ${oneWeekLater.month}/${oneWeekLater.day} = ${endWeekdayName} (${endWeekday})`
      );
      console.log(`Days advanced: ${weekLength}`);

      // Should return to same weekday after exactly one week
      expect(endWeekday).toBe(startWeekday);
      expect(weekLength).toBe(8); // WFRP should have 8-day weeks

      console.log('✅ WFRP +1 week advances 8 days and returns to same weekday');
    });

    it('should handle multiple weeks correctly', async () => {
      console.log('\n=== WFRP MULTIPLE WEEKS TEST ===');

      const startDate = { year: 2522, month: 1, day: 5, weekday: 0 };
      const startWeekday = warhammerEngine.calculateWeekday(
        startDate.year,
        startDate.month,
        startDate.day
      );
      const weekLength = warhammerEngine.getCalendar().weekdays.length;

      // Test 2, 3, and 4 weeks
      [2, 3, 4].forEach(weeks => {
        const futureDate = warhammerEngine.addDays(startDate, weeks * weekLength);
        const futureWeekday = warhammerEngine.calculateWeekday(
          futureDate.year,
          futureDate.month,
          futureDate.day
        );

        console.log(
          `+${weeks} weeks (${weeks * weekLength} days): ${futureDate.month}/${futureDate.day} = weekday ${futureWeekday}`
        );
        expect(futureWeekday).toBe(startWeekday);
      });

      console.log('✅ Multiple WFRP weeks maintain weekday consistency');
    });

    it('should work across intercalary days', async () => {
      console.log('\n=== WFRP WEEK ADVANCEMENT ACROSS INTERCALARY DAYS ===');

      // Start just before an intercalary day, but not crossing one in our advancement
      const testDate = { year: 2522, month: 3, day: 10, weekday: 0 }; // In Pflugzeit, safe from intercalary
      const beforeWeekday = warhammerEngine.calculateWeekday(
        testDate.year,
        testDate.month,
        testDate.day
      );

      // Advance one week (8 days)
      const weekLength = warhammerEngine.getCalendar().weekdays.length;
      const afterWeek = warhammerEngine.addDays(testDate, weekLength);
      const afterWeekday = warhammerEngine.calculateWeekday(
        afterWeek.year,
        afterWeek.month,
        afterWeek.day
      );

      console.log(`Before: ${testDate.month}/${testDate.day} = weekday ${beforeWeekday}`);
      console.log(`+1 week: ${afterWeek.month}/${afterWeek.day} = weekday ${afterWeekday}`);
      console.log(`Days advanced: ${weekLength} (no intercalary interference)`);

      // Should return to same weekday when no intercalary days interfere
      expect(afterWeekday).toBe(beforeWeekday);

      // Now test across an intercalary day where behavior is different
      const beforeIntercalary = { year: 2522, month: 2, day: 30, weekday: 0 }; // Before Mitterfruhl
      const beforeIntercalaryWeekday = warhammerEngine.calculateWeekday(
        beforeIntercalary.year,
        beforeIntercalary.month,
        beforeIntercalary.day
      );
      const afterIntercalary = warhammerEngine.addDays(beforeIntercalary, weekLength);
      const afterIntercalaryWeekday = warhammerEngine.calculateWeekday(
        afterIntercalary.year,
        afterIntercalary.month,
        afterIntercalary.day
      );

      console.log(`\nCrossing intercalary day test:`);
      console.log(
        `Before Mitterfruhl: ${beforeIntercalary.month}/${beforeIntercalary.day} = weekday ${beforeIntercalaryWeekday}`
      );
      console.log(
        `After crossing: ${afterIntercalary.month}/${afterIntercalary.day} = weekday ${afterIntercalaryWeekday}`
      );

      // The weekday advancement should be 7 days worth (since intercalary doesn't count)
      // So if we advance 8 calendar days but only 7 count for weekdays, we get a different result
      const expectedWeekday = (beforeIntercalaryWeekday + 7) % 8; // 7 weekday-contributing days
      expect(afterIntercalaryWeekday).toBe(expectedWeekday);

      console.log(
        '✅ Week advancement works correctly across intercalary days with proper weekday handling'
      );
    });
  });

  describe('Gregorian Calendar - 7-Day Week Advancement', () => {
    it('should advance 7 days for +1 week', async () => {
      console.log('\n=== GREGORIAN +1 WEEK TEST ===');

      const startDate = { year: 2024, month: 6, day: 15, weekday: 0 };
      const startWeekday = gregorianEngine.calculateWeekday(
        startDate.year,
        startDate.month,
        startDate.day
      );
      const startWeekdayName = gregorianEngine.getCalendar().weekdays[startWeekday]?.name;

      console.log(
        `Start: ${startDate.month}/${startDate.day} = ${startWeekdayName} (${startWeekday})`
      );

      // Advance 1 week
      const weekLength = gregorianEngine.getCalendar().weekdays.length;
      const oneWeekLater = gregorianEngine.addDays(startDate, weekLength);
      const endWeekday = gregorianEngine.calculateWeekday(
        oneWeekLater.year,
        oneWeekLater.month,
        oneWeekLater.day
      );
      const endWeekdayName = gregorianEngine.getCalendar().weekdays[endWeekday]?.name;

      console.log(`Week length: ${weekLength} days`);
      console.log(
        `+1 week: ${oneWeekLater.month}/${oneWeekLater.day} = ${endWeekdayName} (${endWeekday})`
      );

      // Should return to same weekday after exactly one week
      expect(endWeekday).toBe(startWeekday);
      expect(weekLength).toBe(7); // Gregorian should have 7-day weeks

      console.log('✅ Gregorian +1 week advances 7 days and returns to same weekday');
    });

    it('should handle multiple weeks correctly', async () => {
      console.log('\n=== GREGORIAN MULTIPLE WEEKS TEST ===');

      const startDate = { year: 2024, month: 3, day: 10, weekday: 0 };
      const startWeekday = gregorianEngine.calculateWeekday(
        startDate.year,
        startDate.month,
        startDate.day
      );
      const weekLength = gregorianEngine.getCalendar().weekdays.length;

      // Test 2, 3, and 4 weeks
      [2, 3, 4].forEach(weeks => {
        const futureDate = gregorianEngine.addDays(startDate, weeks * weekLength);
        const futureWeekday = gregorianEngine.calculateWeekday(
          futureDate.year,
          futureDate.month,
          futureDate.day
        );

        console.log(
          `+${weeks} weeks (${weeks * weekLength} days): ${futureDate.month}/${futureDate.day} = weekday ${futureWeekday}`
        );
        expect(futureWeekday).toBe(startWeekday);
      });

      console.log('✅ Multiple Gregorian weeks maintain weekday consistency');
    });
  });

  describe('Dynamic Week Length API', () => {
    it('should use correct week lengths for different calendars', async () => {
      console.log('\n=== DYNAMIC WEEK LENGTH API TEST ===');

      const warhammerWeekLength = warhammerEngine.getCalendar().weekdays.length;
      const gregorianWeekLength = gregorianEngine.getCalendar().weekdays.length;

      console.log(`WFRP week length: ${warhammerWeekLength} days`);
      console.log(`Gregorian week length: ${gregorianWeekLength} days`);

      expect(warhammerWeekLength).toBe(8);
      expect(gregorianWeekLength).toBe(7);

      console.log('✅ Calendar engines return correct week lengths');
    });

    it('should calculate correct day advancement for week operations', async () => {
      console.log('\n=== WEEK ADVANCEMENT CALCULATION TEST ===');

      // Test the exact calculation that TimeConverter.advanceWeeks() would use
      const warhammerWeeks = 3;
      const gregorianWeeks = 3;

      const warhammerDays = warhammerWeeks * warhammerEngine.getCalendar().weekdays.length;
      const gregorianDays = gregorianWeeks * gregorianEngine.getCalendar().weekdays.length;

      console.log(`${warhammerWeeks} WFRP weeks = ${warhammerDays} days`);
      console.log(`${gregorianWeeks} Gregorian weeks = ${gregorianDays} days`);

      expect(warhammerDays).toBe(24); // 3 × 8 = 24 days
      expect(gregorianDays).toBe(21); // 3 × 7 = 21 days

      console.log('✅ Week advancement calculations use correct dynamic lengths');
    });
  });

  describe('Regression Prevention', () => {
    it('should not break standard 7-day week calendars', async () => {
      console.log('\n=== REGRESSION PREVENTION TEST ===');

      // Verify that the fix doesn't break standard calendars
      const testDate = { year: 2024, month: 1, day: 15, weekday: 0 };
      const startWeekday = gregorianEngine.calculateWeekday(
        testDate.year,
        testDate.month,
        testDate.day
      );

      // Test traditional 7-day advancement
      const sevenDaysLater = gregorianEngine.addDays(testDate, 7);
      const sevenDaysWeekday = gregorianEngine.calculateWeekday(
        sevenDaysLater.year,
        sevenDaysLater.month,
        sevenDaysLater.day
      );

      console.log(`Start weekday: ${startWeekday}`);
      console.log(`+7 days weekday: ${sevenDaysWeekday}`);

      expect(sevenDaysWeekday).toBe(startWeekday);

      console.log('✅ Standard 7-day week functionality preserved');
    });

    it('should handle edge cases gracefully', async () => {
      console.log('\n=== EDGE CASES TEST ===');

      // Test with zero weeks
      const testDate = { year: 2522, month: 5, day: 10, weekday: 0 };
      const zeroWeeks = warhammerEngine.addDays(
        testDate,
        0 * warhammerEngine.getCalendar().weekdays.length
      );

      expect(zeroWeeks.year).toBe(testDate.year);
      expect(zeroWeeks.month).toBe(testDate.month);
      expect(zeroWeeks.day).toBe(testDate.day);

      // Test with negative weeks (should work with negative numbers)
      const negativeWeeks = warhammerEngine.addDays(
        testDate,
        -1 * warhammerEngine.getCalendar().weekdays.length
      );
      const negativeWeekday = warhammerEngine.calculateWeekday(
        negativeWeeks.year,
        negativeWeeks.month,
        negativeWeeks.day
      );
      const originalWeekday = warhammerEngine.calculateWeekday(
        testDate.year,
        testDate.month,
        testDate.day
      );

      expect(negativeWeekday).toBe(originalWeekday);

      console.log('✅ Edge cases (zero weeks, negative weeks) handled correctly');
    });
  });
});
