#!/usr/bin/env node
/**
 * Simple Calendar to Seasons & Stars Calendar Converter
 *
 * Usage:
 * 1. Download your Simple Calendar JSON file (e.g., Aspicientis.json)
 * 2. Run: node convert-simple-calendar.js < Aspicientis.json > aspicientis-converted.json
 *
 * Or if you have the file saved:
 * node convert-simple-calendar.js Aspicientis.json
 */

const fs = require('fs');
const path = require('path');

// Convert Simple Calendar to S&S format
function convertSimpleCalendarToSS(simpleCalendar) {
  // Generate ID from name if not provided
  const calendarId = simpleCalendar.id ||
    (simpleCalendar.name ? simpleCalendar.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'custom-calendar');

  const ss = {
    id: calendarId,
    translations: {
      en: {
        label: simpleCalendar.name || 'Custom Calendar',
        description: simpleCalendar.description || 'Converted from Simple Calendar format',
        setting: simpleCalendar.setting || 'Custom'
      }
    },
    year: {
      epoch: simpleCalendar.year?.numericRepresentation?.epoch || 0,
      currentYear: simpleCalendar.currentDate?.year || 1,
      prefix: simpleCalendar.year?.numericRepresentation?.prefix || '',
      suffix: simpleCalendar.year?.numericRepresentation?.postfix || '',
      startDay: simpleCalendar.general?.dateFormat?.startsOnZero ? 0 : 1
    },
    leapYear: {
      rule: 'none'
    },
    months: [],
    weekdays: [],
    intercalary: [],
    moons: [],
    seasons: [],
    time: {
      hoursInDay: simpleCalendar.time?.hoursInDay || 24,
      minutesInHour: simpleCalendar.time?.minutesInHour || 60,
      secondsInMinute: simpleCalendar.time?.secondsInMinute || 60
    }
  };

  // Convert leap year settings
  if (simpleCalendar.year?.leapYearRule) {
    const leapRule = simpleCalendar.year.leapYearRule;
    if (leapRule.rule === 'gregorian') {
      ss.leapYear = {
        rule: 'gregorian',
        interval: 4,
        month: 'February',
        extraDays: 1
      };
    } else if (leapRule.rule === 'custom') {
      ss.leapYear = {
        rule: 'custom',
        interval: leapRule.customMod || 4
      };
      // Find which month gets the extra day
      if (simpleCalendar.months) {
        for (const month of simpleCalendar.months) {
          if (month.numberOfLeapYearDays && month.numberOfLeapYearDays > month.numberOfDays) {
            ss.leapYear.month = month.name;
            ss.leapYear.extraDays = month.numberOfLeapYearDays - month.numberOfDays;
            break;
          }
        }
      }
    }
  }

  // Track non-intercalary months for mapping
  const regularMonths = [];

  // Convert months (excluding intercalary days which are handled separately)
  if (simpleCalendar.months) {
    simpleCalendar.months.forEach(month => {
      if (!month.intercalary) {
        const convertedMonth = {
          name: month.name,
          abbreviation: month.abbreviation || month.name.slice(0, 3),
          days: month.numberOfDays || 30,
          description: month.description || ''
        };
        ss.months.push(convertedMonth);
        regularMonths.push(month);
      }
    });
  }

  // Convert weekdays
  if (simpleCalendar.weekdays) {
    ss.weekdays = simpleCalendar.weekdays.map(weekday => ({
      name: weekday.name,
      abbreviation: weekday.abbreviation || weekday.name.slice(0, 2),
      description: weekday.description || ''
    }));
  }

  // Convert intercalary days
  if (simpleCalendar.months) {
    simpleCalendar.months.forEach((month, index) => {
      if (month.intercalary) {
        const intercalaryDay = {
          name: month.name,
          days: month.numberOfDays || 1,
          leapYearOnly: month.numberOfLeapYearDays > 0 && month.numberOfDays === 0,
          countsForWeekdays: true,
          description: month.description || ''
        };

        // Determine "after" month - look for previous non-intercalary month
        for (let i = index - 1; i >= 0; i--) {
          if (!simpleCalendar.months[i].intercalary) {
            intercalaryDay.after = simpleCalendar.months[i].name;
            break;
          }
        }

        // If intercalaryInclude is set, use that instead
        if (month.intercalaryInclude !== undefined && month.intercalaryInclude !== null) {
          const includeIndex = month.intercalaryInclude;
          if (simpleCalendar.months[includeIndex]) {
            intercalaryDay.after = simpleCalendar.months[includeIndex].name;
          }
        }

        ss.intercalary.push(intercalaryDay);
      }
    });
  }

  // Convert moons
  if (simpleCalendar.moons && simpleCalendar.moons.length > 0) {
    ss.moons = simpleCalendar.moons.map(moon => {
      const moonObj = {
        name: moon.name,
        cycleLength: moon.cycleLength || 29.5,
        firstNewMoon: { year: 1, month: 1, day: 1 },
        phases: [],
        color: moon.color || '#e0e0e0'
      };

      // Handle first new moon date
      if (moon.firstNewMoon) {
        moonObj.firstNewMoon = {
          year: moon.firstNewMoon.year || 1,
          month: (moon.firstNewMoon.month || 0) + 1, // Convert from 0-based to 1-based
          day: (moon.firstNewMoon.day || 0) + 1      // Convert from 0-based to 1-based
        };
      } else if (moon.cycleDayAdjust) {
        // Some calendars use cycleDayAdjust instead
        moonObj.firstNewMoon = {
          year: 1,
          month: 1,
          day: Math.max(1, moon.cycleDayAdjust)
        };
      }

      // Convert moon phases
      if (moon.phases && moon.phases.length > 0) {
        moonObj.phases = moon.phases.map(phase => ({
          name: phase.name,
          length: phase.length || 1,
          singleDay: phase.length === 1,
          icon: mapPhaseIcon(phase.name, phase.icon)
        }));
      } else {
        // Default moon phases if not specified
        moonObj.phases = [
          { name: 'New Moon', length: 1, singleDay: true, icon: 'new' },
          { name: 'Waxing Crescent', length: 7, singleDay: false, icon: 'waxing-crescent' },
          { name: 'First Quarter', length: 1, singleDay: true, icon: 'first-quarter' },
          { name: 'Waxing Gibbous', length: 6, singleDay: false, icon: 'waxing-gibbous' },
          { name: 'Full Moon', length: 1, singleDay: true, icon: 'full' },
          { name: 'Waning Gibbous', length: 6, singleDay: false, icon: 'waning-gibbous' },
          { name: 'Last Quarter', length: 1, singleDay: true, icon: 'last-quarter' },
          { name: 'Waning Crescent', length: 7, singleDay: false, icon: 'waning-crescent' }
        ];
      }

      // Add description if available
      if (moon.description) {
        moonObj.translations = {
          en: {
            description: moon.description
          }
        };
      }

      return moonObj;
    });
  }

  // Convert seasons
  if (simpleCalendar.seasons && simpleCalendar.seasons.length > 0) {
    ss.seasons = simpleCalendar.seasons.map(season => {
      // Find the actual month indices in the regular (non-intercalary) months
      let startMonthIndex = season.startingMonth || 0;
      let endMonthIndex = season.endingMonth !== undefined ? season.endingMonth : startMonthIndex;

      // Map to 1-based index for regular months
      const seasonObj = {
        name: season.name,
        startMonth: Math.min(startMonthIndex + 1, ss.months.length),
        endMonth: Math.min(endMonthIndex + 1, ss.months.length),
        icon: mapSeasonIcon(season.name, season.icon),
        description: season.description || ''
      };

      // Handle color if provided
      if (season.color) {
        seasonObj.color = season.color;
      }

      return seasonObj;
    });
  }

  return ss;
}

// Helper function to map phase icons
function mapPhaseIcon(name, originalIcon) {
  if (originalIcon) return originalIcon;

  const nameLower = name.toLowerCase();
  if (nameLower.includes('new')) return 'new';
  if (nameLower.includes('full')) return 'full';
  if (nameLower.includes('first quarter')) return 'first-quarter';
  if (nameLower.includes('last quarter') || nameLower.includes('third quarter')) return 'last-quarter';
  if (nameLower.includes('waxing crescent')) return 'waxing-crescent';
  if (nameLower.includes('waxing gibbous')) return 'waxing-gibbous';
  if (nameLower.includes('waning crescent')) return 'waning-crescent';
  if (nameLower.includes('waning gibbous')) return 'waning-gibbous';

  return 'full'; // default
}

// Helper function to map season icons
function mapSeasonIcon(name, originalIcon) {
  if (originalIcon) return originalIcon;

  const nameLower = name.toLowerCase();
  if (nameLower.includes('spring')) return 'spring';
  if (nameLower.includes('summer')) return 'summer';
  if (nameLower.includes('fall') || nameLower.includes('autumn')) return 'fall';
  if (nameLower.includes('winter')) return 'winter';

  return 'spring'; // default
}

// Main execution
function main() {
  let inputData = '';
  let inputFile = process.argv[2];

  if (inputFile) {
    // Read from file
    try {
      inputData = fs.readFileSync(inputFile, 'utf8');
    } catch (error) {
      console.error(`Error reading file ${inputFile}:`, error.message);
      process.exit(1);
    }
  } else {
    // Read from stdin
    inputData = fs.readFileSync(0, 'utf8');
  }

  try {
    const simpleCalendar = JSON.parse(inputData);
    const ssCalendar = convertSimpleCalendarToSS(simpleCalendar);

    // Output the converted calendar
    console.log(JSON.stringify(ssCalendar, null, 2));

    // If an input file was provided, also save to a file
    if (inputFile) {
      const outputFile = inputFile.replace('.json', '-converted.json');
      fs.writeFileSync(outputFile, JSON.stringify(ssCalendar, null, 2));
      console.error(`\nConverted calendar saved to: ${outputFile}`);
    }
  } catch (error) {
    console.error('Error converting calendar:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

// Export for use as module
module.exports = { convertSimpleCalendarToSS };