import type { SimpleCalendarExport, SimpleCalendarData } from './simple-calendar-types';

export interface ConversionWarning {
  path: string;
  property: string;
  value: unknown;
  reason: string;
}

export interface ConversionResult {
  calendar: any;
  warnings: ConversionWarning[];
}

export class SimpleCalendarConverter {
  private warnings: ConversionWarning[] = [];

  static isSimpleCalendarFormat(data: unknown): data is SimpleCalendarExport {
    if (typeof data !== 'object' || data === null) {
      return false;
    }

    const obj = data as any;

    if ('exportVersion' in obj && typeof obj.exportVersion === 'number') {
      return true;
    }

    if ('calendars' in obj && Array.isArray(obj.calendars)) {
      return true;
    }

    return false;
  }

  convert(scData: SimpleCalendarData): ConversionResult {
    this.warnings = [];

    const calendar: any = {
      id: this.convertId(scData.id || scData.name),
      translations: this.convertTranslations(scData),
      year: this.convertYear(scData),
      months: this.convertMonths(scData),
      weekdays: this.convertWeekdays(scData),
      leapYear: this.convertLeapYear(scData),
      intercalary: this.convertIntercalary(scData),
      time: this.convertTime(scData),
    };

    if (scData.seasons && scData.seasons.length > 0) {
      calendar.seasons = this.convertSeasons(scData);
    }

    if (scData.moons && scData.moons.length > 0) {
      calendar.moons = this.convertMoons(scData);
    }

    return {
      calendar,
      warnings: this.warnings,
    };
  }

  private convertId(id: string): string {
    return id.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/--+/g, '-');
  }

  private convertTranslations(scData: SimpleCalendarData): any {
    return {
      en: {
        label: scData.name || 'Imported Calendar',
        description: scData.description || 'Calendar imported from Simple Calendar',
        setting: 'Imported'
      }
    };
  }

  private convertYear(scData: SimpleCalendarData): any {
    const yearConfig: any = {
      epoch: scData.years?.yearZero || 0,
      currentYear: scData.currentDate?.year || 1,
      prefix: scData.years?.prefix || '',
      suffix: scData.years?.postfix || '',
      startDay: 0,
    };

    if (scData.years?.yearNames && scData.years.yearNames.length > 0) {
      this.addWarning('root.years.yearNames', 'yearNames', scData.years.yearNames,
        'Named year cycles are not supported in S&S format');
    }

    if (scData.years?.yearNamingRule) {
      this.addWarning('root.years.yearNamingRule', 'yearNamingRule', scData.years.yearNamingRule,
        'Year naming rules are not supported in S&S format');
    }

    return yearConfig;
  }

  private convertMonths(scData: SimpleCalendarData): any[] {
    if (!scData.months || scData.months.length === 0) {
      return [];
    }

    return scData.months
      .filter(month => !month.intercalary)
      .map((month, index) => {
        const converted: any = {
          name: month.name,
          abbreviation: month.abbreviation || month.name.substring(0, 3),
          days: month.numberOfDays || 30,
        };

        if (month.description) {
          converted.description = month.description;
        }

        if (month.numberOfLeapYearDays && month.numberOfLeapYearDays !== month.numberOfDays) {
          this.addWarning(`root.months[${index}].numberOfLeapYearDays`,
            'numberOfLeapYearDays', month.numberOfLeapYearDays,
            'Per-month leap year days not directly supported - use leapYear.month instead');
        }

        if (month.startingWeekday !== undefined && month.startingWeekday !== null) {
          this.addWarning(`root.months[${index}].startingWeekday`,
            'startingWeekday', month.startingWeekday,
            'Per-month starting weekday not supported - use year.startDay instead');
        }

        return converted;
      });
  }

  private convertWeekdays(scData: SimpleCalendarData): any[] {
    if (!scData.weekdays || scData.weekdays.length === 0) {
      return [];
    }

    return scData.weekdays.map(weekday => {
      const converted: any = {
        name: weekday.name,
        abbreviation: weekday.abbreviation || weekday.name.substring(0, 3),
      };

      if (weekday.description) {
        converted.description = weekday.description;
      }

      return converted;
    });
  }

  private convertLeapYear(scData: SimpleCalendarData): any {
    if (!scData.leapYear || !scData.leapYear.rule) {
      return { rule: 'none' };
    }

    const leapYear: any = {
      rule: scData.leapYear.rule,
    };

    if (scData.leapYear.customMod) {
      leapYear.interval = scData.leapYear.customMod;
    }

    if (scData.leapYear.months && scData.leapYear.months.length > 0) {
      const monthIndex = scData.leapYear.months[0];
      if (scData.months && scData.months[monthIndex]) {
        leapYear.month = scData.months[monthIndex].name;
      }

      if (scData.leapYear.months.length > 1) {
        this.addWarning('root.leapYear.months', 'months', scData.leapYear.months,
          'Multiple leap year months not supported - only first month will be used');
      }
    }

    leapYear.extraDays = 1;

    return leapYear;
  }

  private convertIntercalary(scData: SimpleCalendarData): any[] {
    if (!scData.months) {
      return [];
    }

    const intercalaryMonths = scData.months.filter(month => month.intercalary);

    return intercalaryMonths.map((month, index) => {
      const intercalary: any = {
        name: month.name,
        days: month.numberOfDays || 1,
        countsForWeekdays: month.intercalaryInclude !== false,
      };

      if (month.description) {
        intercalary.description = month.description;
      }

      const monthIndex = scData.months!.indexOf(month);
      if (monthIndex > 0) {
        intercalary.after = scData.months![monthIndex - 1].name;
      }

      if (month.numberOfLeapYearDays && month.numberOfLeapYearDays !== month.numberOfDays) {
        intercalary.leapYearOnly = false;
        this.addWarning(`root.intercalary[${index}]`, 'numberOfLeapYearDays',
          month.numberOfLeapYearDays,
          'Intercalary days with different leap year counts not fully supported');
      }

      return intercalary;
    });
  }

  private convertTime(scData: SimpleCalendarData): any {
    const time: any = {
      hoursInDay: scData.time?.hoursInDay || 24,
      minutesInHour: scData.time?.minutesInHour || 60,
      secondsInMinute: scData.time?.secondsInMinute || 60,
    };

    if (scData.time?.gameTimeRatio) {
      this.addWarning('root.time.gameTimeRatio', 'gameTimeRatio', scData.time.gameTimeRatio,
        'Game time ratio is handled by Foundry core, not calendar definitions');
    }

    if (scData.time?.unifyGameAndClockPause !== undefined) {
      this.addWarning('root.time.unifyGameAndClockPause', 'unifyGameAndClockPause',
        scData.time.unifyGameAndClockPause,
        'Clock pause settings are handled by Foundry core, not calendar definitions');
    }

    if (scData.time?.updateFrequency) {
      this.addWarning('root.time.updateFrequency', 'updateFrequency', scData.time.updateFrequency,
        'Update frequency is handled by Foundry core, not calendar definitions');
    }

    return time;
  }

  private convertSeasons(scData: SimpleCalendarData): any[] {
    if (!scData.seasons) {
      return [];
    }

    return scData.seasons.map((season, index) => {
      const converted: any = {
        name: season.name,
        startMonth: (season.startingMonth || 0) + 1,
      };

      if (season.description) {
        converted.description = season.description;
      }

      if (season.icon) {
        converted.icon = season.icon;
      }

      if (season.color) {
        converted.color = season.color;
      }

      if (season.sunriseTimes || season.sunsetTimes) {
        this.addWarning(`root.seasons[${index}]`, 'sunriseTimes/sunsetTimes',
          { sunrise: season.sunriseTimes, sunset: season.sunsetTimes },
          'Sunrise/sunset times are not supported in S&S format');
      }

      return converted;
    });
  }

  private convertMoons(scData: SimpleCalendarData): any[] {
    if (!scData.moons) {
      return [];
    }

    return scData.moons.map((moon, index) => {
      const converted: any = {
        name: moon.name,
        cycleLength: moon.cycleLength || 29.53,
      };

      if (moon.firstNewMoon) {
        converted.firstNewMoon = {
          year: moon.firstNewMoon.year || 1,
          month: (moon.firstNewMoon.month || 0) + 1,
          day: moon.firstNewMoon.day || 1,
        };
      }

      if (moon.phases && moon.phases.length > 0) {
        converted.phases = moon.phases.map(phase => ({
          name: phase.name,
          length: phase.length,
          singleDay: phase.singleDay !== false && phase.length <= 1,
          icon: phase.icon || 'new',
        }));
      }

      if (moon.color) {
        converted.color = moon.color;
      }

      if (moon.description) {
        converted.translations = {
          en: {
            description: moon.description
          }
        };
      }

      if (moon.cycleDayAdjust) {
        this.addWarning(`root.moons[${index}].cycleDayAdjust`, 'cycleDayAdjust',
          moon.cycleDayAdjust,
          'Cycle day adjustment not supported - adjust firstNewMoon date instead');
      }

      if (moon.referenceTime) {
        this.addWarning(`root.moons[${index}].referenceTime`, 'referenceTime',
          moon.referenceTime,
          'Reference time not supported - use firstNewMoon instead');
      }

      return converted;
    });
  }

  private addWarning(path: string, property: string, value: unknown, reason: string): void {
    this.warnings.push({ path, property, value, reason });
  }
}
