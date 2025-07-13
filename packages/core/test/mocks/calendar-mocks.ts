/**
 * Shared calendar mock objects for testing
 */

// Standard mock calendar with typical 24-hour days, 7-day weeks
export const mockStandardCalendar = {
  id: 'test-calendar',
  translations: { en: { label: 'Test Calendar' } },
  year: { epoch: 2024, currentYear: 2024, prefix: '', suffix: '', startDay: 0 },
  months: [{ name: 'January', days: 31 }],
  weekdays: [
    { name: 'Monday' },
    { name: 'Tuesday' },
    { name: 'Wednesday' },
    { name: 'Thursday' },
    { name: 'Friday' },
    { name: 'Saturday' },
    { name: 'Sunday' },
  ], // 7 days per week
  intercalary: [],
  time: {
    hoursInDay: 24,
    minutesInHour: 60,
    secondsInMinute: 60,
  },
  leapYear: { rule: 'none' as const },
};

// Custom calendar with non-standard time units for testing edge cases
export const mockCustomCalendar = {
  id: 'custom-calendar',
  translations: { en: { label: 'Custom Calendar' } },
  year: { epoch: 2024, currentYear: 2024, prefix: '', suffix: '', startDay: 0 },
  months: [{ name: 'CustomMonth', days: 20 }],
  weekdays: [
    { name: 'Day1' },
    { name: 'Day2' },
    { name: 'Day3' },
    { name: 'Day4' },
    { name: 'Day5' },
    { name: 'Day6' },
  ], // 6 days per week
  intercalary: [],
  time: {
    hoursInDay: 20,
    minutesInHour: 50,
    secondsInMinute: 60,
  },
  leapYear: { rule: 'none' as const },
};

// Minimal calendar object for integration tests
export const mockMinimalCalendar = {
  id: 'test-calendar',
  time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
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

// Standard mock date for widget tests
export const mockStandardDate = {
  year: 2024,
  month: 1,
  day: 1,
  weekday: 0,
};
