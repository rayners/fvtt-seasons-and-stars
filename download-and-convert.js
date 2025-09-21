const https = require('https');
const fs = require('fs');
const path = require('path');

// URL provided by user
const attachmentUrl = 'https://github.com/user-attachments/files/22454450/Aspicientis.json';

// Function to download the file
function downloadFile(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        downloadFile(response.headers.location).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// Convert Simple Calendar to S&S format
function convertSimpleCalendarToSS(simpleCalendar) {
  const ss = {
    id: simpleCalendar.id || 'aspicientis',
    translations: {
      en: {
        label: simpleCalendar.name || 'Aspicientis Calendar',
        description: simpleCalendar.description || 'Custom calendar system',
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
      rule: simpleCalendar.year?.leapYearRule?.rule || 'none'
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
  if (simpleCalendar.year?.leapYearRule?.rule && simpleCalendar.year.leapYearRule.rule !== 'none') {
    ss.leapYear.interval = simpleCalendar.year.leapYearRule.customMod || 4;
  }

  // Convert months
  if (simpleCalendar.months) {
    ss.months = simpleCalendar.months.map(month => ({
      name: month.name,
      abbreviation: month.abbreviation || month.name.slice(0, 3),
      days: month.numberOfDays,
      description: month.description || ''
    }));
  }

  // Convert weekdays
  if (simpleCalendar.weekdays) {
    ss.weekdays = simpleCalendar.weekdays.map(weekday => ({
      name: weekday.name,
      abbreviation: weekday.abbreviation || weekday.name.slice(0, 3),
      description: weekday.description || ''
    }));
  }

  // Convert intercalary days
  if (simpleCalendar.months) {
    simpleCalendar.months.forEach(month => {
      if (month.intercalary) {
        ss.intercalary.push({
          name: month.name,
          after: month.intercalaryInclude && simpleCalendar.months[month.intercalaryInclude - 1]
            ? simpleCalendar.months[month.intercalaryInclude - 1].name
            : undefined,
          leapYearOnly: month.numberOfLeapYearDays > 0 && month.numberOfDays === 0,
          countsForWeekdays: !month.intercalaryNoDayCount,
          description: month.description || ''
        });
      }
    });
  }

  // Convert moons
  if (simpleCalendar.moons) {
    ss.moons = simpleCalendar.moons.map(moon => {
      const moonObj = {
        name: moon.name,
        cycleLength: moon.cycleLength,
        firstNewMoon: moon.firstNewMoon ? {
          year: moon.firstNewMoon.year,
          month: moon.firstNewMoon.month + 1, // Convert from 0-based to 1-based
          day: moon.firstNewMoon.day + 1     // Convert from 0-based to 1-based
        } : { year: 1, month: 1, day: 1 },
        phases: [],
        color: moon.color || '#e0e0e0'
      };

      // Convert moon phases
      if (moon.phases) {
        moonObj.phases = moon.phases.map(phase => ({
          name: phase.name,
          length: phase.length,
          singleDay: phase.length === 1,
          icon: phase.icon || 'full'
        }));
      }

      return moonObj;
    });
  }

  // Convert seasons
  if (simpleCalendar.seasons) {
    ss.seasons = simpleCalendar.seasons.map(season => ({
      name: season.name,
      startMonth: season.startingMonth + 1, // Convert from 0-based to 1-based
      endMonth: season.endingMonth !== undefined ? season.endingMonth + 1 : season.startingMonth + 1,
      icon: season.icon || 'spring',
      description: season.description || ''
    }));
  }

  return ss;
}

// Main execution
async function main() {
  try {
    console.log('Downloading Aspicientis.json from GitHub...');
    const jsonContent = await downloadFile(attachmentUrl);

    console.log('Parsing JSON...');
    const simpleCalendar = JSON.parse(jsonContent);

    console.log('Converting to S&S format...');
    const ssCalendar = convertSimpleCalendarToSS(simpleCalendar);

    // Save the converted calendar
    const outputPath = path.join(__dirname, 'packages/fantasy-pack/calendars/aspicientis.json');
    fs.writeFileSync(outputPath, JSON.stringify(ssCalendar, null, 2));

    console.log(`Successfully converted and saved to: ${outputPath}`);
    console.log('\nConverted calendar:');
    console.log(JSON.stringify(ssCalendar, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();