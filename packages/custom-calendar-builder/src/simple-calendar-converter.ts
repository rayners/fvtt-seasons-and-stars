import type { SimpleCalendarExport, SimpleCalendarData } from './simple-calendar-types';
import type { SeasonsStarsCalendar } from '@seasons-stars/core/types/calendar';

export interface ConversionWarning {
  path: string;
  property: string;
  value: unknown;
  reason: string;
}

export interface ConversionResult {
  calendar: Partial<SeasonsStarsCalendar>;
  warnings: ConversionWarning[];
}

export class SimpleCalendarConverter {
  private warnings: ConversionWarning[] = [];

  static isSimpleCalendarFormat(data: unknown): data is SimpleCalendarExport {
    if (typeof data !== 'object' || data === null) {
      return false;
    }

    const obj = data as Record<string, unknown>;

    // Full export format with exportVersion
    if ('exportVersion' in obj && typeof obj.exportVersion === 'number') {
      return true;
    }

    // Full export format with calendars array
    if ('calendars' in obj && Array.isArray(obj.calendars)) {
      return true;
    }

    // Single calendar export wrapped in {"calendar": {...}}
    if ('calendar' in obj && typeof obj.calendar === 'object' && obj.calendar !== null) {
      const cal = obj.calendar;
      // Check if it has Simple Calendar structure
      if ('months' in cal || 'weekdays' in cal || 'currentDate' in cal || 'general' in cal) {
        return true;
      }
    }

    return false;
  }

  convert(scData: SimpleCalendarData, filename?: string): ConversionResult {
    this.warnings = [];

    // Use filename (without extension) as fallback for ID
    let fallbackId: string | undefined;
    if (filename) {
      fallbackId = filename.replace(/\.json$/i, '');
    }

    const calendar: Partial<SeasonsStarsCalendar> = {
      id: this.convertId(scData.id || scData.name || fallbackId),
      translations: this.convertTranslations(scData, fallbackId),
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

  private convertId(id: string | undefined): string {
    if (!id) {
      return 'imported-calendar';
    }
    return id.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/--+/g, '-');
  }

  private convertTranslations(scData: SimpleCalendarData, fallbackName?: string): SeasonsStarsCalendar['translations'] {
    // Use fallback name if available, capitalized nicely
    let label = scData.name;
    if (!label && fallbackName) {
      // Convert "harptos" to "Harptos", "dark-sun" to "Dark Sun", etc.
      label = fallbackName
        .split(/[-_]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }

    return {
      en: {
        label: label || 'Imported Calendar',
        description: scData.description || 'Calendar imported from Simple Calendar',
        setting: 'Imported'
      }
    };
  }

  private convertYear(scData: SimpleCalendarData): SeasonsStarsCalendar['year'] {
    const yearConfig: SeasonsStarsCalendar['year'] = {
      epoch: scData.years?.yearZero || 0,
      currentYear: scData.currentDate?.year || 1,
      prefix: scData.years?.prefix || '',
      suffix: scData.years?.postfix || '',
      startDay: 0,
    };

    if (scData.years?.yearNames && scData.years.yearNames.length > 0) {
      this.addWarning('root.years.yearNames', 'yearNames', scData.years.yearNames,
        'Named year cycles are not supported in current S&S format');
    }

    if (scData.years?.yearNamingRule) {
      this.addWarning('root.years.yearNamingRule', 'yearNamingRule', scData.years.yearNamingRule,
        'Year naming rules are not supported in current S&S format');
    }

    return yearConfig;
  }

  private convertMonths(scData: SimpleCalendarData): SeasonsStarsCalendar['months'] {
    if (!scData.months || scData.months.length === 0) {
      return [];
    }

    return scData.months
      .filter(month => !month.intercalary)
      .map((month, index) => {
        const converted: SeasonsStarsCalendar['months'][number] = {
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

  private convertWeekdays(scData: SimpleCalendarData): SeasonsStarsCalendar['weekdays'] {
    if (!scData.weekdays || scData.weekdays.length === 0) {
      return [];
    }

    return scData.weekdays.map(weekday => {
      const converted: SeasonsStarsCalendar['weekdays'][number] = {
        name: weekday.name,
        abbreviation: weekday.abbreviation || weekday.name.substring(0, 3),
      };

      if (weekday.description) {
        converted.description = weekday.description;
      }

      return converted;
    });
  }

  private convertLeapYear(scData: SimpleCalendarData): SeasonsStarsCalendar['leapYear'] {
    if (!scData.leapYear || !scData.leapYear.rule) {
      return { rule: 'none' };
    }

    const leapYear: Partial<SeasonsStarsCalendar['leapYear']> & { rule: 'gregorian' | 'custom' | 'none' } = {
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

  private convertIntercalary(scData: SimpleCalendarData): SeasonsStarsCalendar['intercalary'] {
    if (!scData.months) {
      return [];
    }

    const intercalaryMonths = scData.months.filter(month => month.intercalary);

    return intercalaryMonths.map((month, index) => {
      const intercalary: Partial<SeasonsStarsCalendar['intercalary'][number]> & { name: string } = {
        name: month.name,
        days: month.numberOfDays || 1,
        countsForWeekdays: month.intercalaryInclude !== false,
      };

      if (month.description) {
        intercalary.description = month.description;
      }

      // Find the nearest non-intercalary month for positioning
      const monthIndex = scData.months!.indexOf(month);
      let foundPosition = false;

      // Try searching backwards for a previous non-intercalary month
      if (monthIndex > 0) {
        for (let i = monthIndex - 1; i >= 0; i--) {
          if (!scData.months![i].intercalary) {
            intercalary.after = scData.months![i].name;
            foundPosition = true;
            break;
          }
        }
      }

      // If no previous regular month found, search forward for 'before'
      if (!foundPosition) {
        for (let i = monthIndex + 1; i < scData.months!.length; i++) {
          if (!scData.months![i].intercalary) {
            intercalary.before = scData.months![i].name;
            foundPosition = true;
            break;
          }
        }
      }

      if (!foundPosition) {
        this.addWarning(`root.intercalary[${index}]`, 'positioning',
          month.name,
          'Cannot determine position - no adjacent regular months found');
      }

      if (month.numberOfLeapYearDays && month.numberOfLeapYearDays !== month.numberOfDays) {
        // Handle leap-year-only intercalary days (like Shieldmeet)
        if (month.numberOfDays === 0 && month.numberOfLeapYearDays > 0) {
          intercalary.leapYearOnly = true;
          intercalary.days = month.numberOfLeapYearDays;
        } else {
          intercalary.leapYearOnly = false;
          this.addWarning(`root.intercalary[${index}]`, 'numberOfLeapYearDays',
            month.numberOfLeapYearDays,
            'Intercalary days with different leap year counts not fully supported');
        }
      }

      return intercalary as SeasonsStarsCalendar['intercalary'][number];
    });
  }

  private convertTime(scData: SimpleCalendarData): SeasonsStarsCalendar['time'] {
    const time: SeasonsStarsCalendar['time'] = {
      hoursInDay: scData.time?.hoursInDay || 24,
      minutesInHour: scData.time?.minutesInHour || 60,
      secondsInMinute: scData.time?.secondsInMinute || 60,
    };

    if (scData.time?.gameTimeRatio) {
      this.addWarning('root.time.gameTimeRatio', 'gameTimeRatio', scData.time.gameTimeRatio,
        'Use Seasons & Stars setting: "Time Advancement Ratio"');
    }

    if (scData.time?.unifyGameAndClockPause !== undefined) {
      this.addWarning('root.time.unifyGameAndClockPause', 'unifyGameAndClockPause',
        scData.time.unifyGameAndClockPause,
        'Use Seasons & Stars setting: "Pause Time Advancement When Game Paused"');
    }

    if (scData.time?.updateFrequency) {
      this.addWarning('root.time.updateFrequency', 'updateFrequency', scData.time.updateFrequency,
        'Use Seasons & Stars setting: "Time Advancement Interval"');
    }

    return time;
  }

  private convertSeasons(scData: SimpleCalendarData): NonNullable<SeasonsStarsCalendar['seasons']> {
    if (!scData.seasons || !scData.months) {
      return [];
    }

    // Build a mapping from Simple Calendar month array index to S&S month number
    // S&S only counts non-intercalary months
    const monthIndexToNumber = new Map<number, number>();
    let regularMonthNumber = 1;
    scData.months.forEach((month, idx) => {
      if (!month.intercalary) {
        monthIndexToNumber.set(idx, regularMonthNumber);
        regularMonthNumber++;
      }
    });

    return scData.seasons.map((season, index) => {
      const scMonthIndex = season.startingMonth || 0;
      const ssMonthNumber = monthIndexToNumber.get(scMonthIndex);

      if (ssMonthNumber === undefined) {
        // Season starts on an intercalary month - need to find nearest regular month
        let foundMonth: number | undefined;

        // Try searching forward first
        for (let i = scMonthIndex + 1; i < (scData.months?.length || 0); i++) {
          const nextMonth = monthIndexToNumber.get(i);
          if (nextMonth !== undefined) {
            foundMonth = nextMonth;
            break;
          }
        }

        // If forward search failed, search backwards
        if (foundMonth === undefined) {
          for (let i = scMonthIndex - 1; i >= 0; i--) {
            const prevMonth = monthIndexToNumber.get(i);
            if (prevMonth !== undefined) {
              foundMonth = prevMonth;
              break;
            }
          }
        }

        // Last resort: use first regular month
        if (foundMonth === undefined) {
          foundMonth = 1;
        }

        this.addWarning(`root.seasons[${index}].startingMonth`, 'startingMonth',
          scMonthIndex,
          `Season starts on intercalary month index ${scMonthIndex} - mapped to regular month ${foundMonth}`);

        return this.buildSeasonObject(season, foundMonth, index);
      }

      return this.buildSeasonObject(season, ssMonthNumber, index);
    });
  }

  private buildSeasonObject(season: { name: string; description?: string; icon?: string; color?: string; sunriseTimes?: unknown; sunsetTimes?: unknown }, startMonth: number, index: number): NonNullable<SeasonsStarsCalendar['seasons']>[number] {
    const converted: Partial<NonNullable<SeasonsStarsCalendar['seasons']>[number]> & { name: string; startMonth: number; endMonth: number } = {
      name: season.name,
      startMonth: startMonth,
      endMonth: startMonth, // S&S requires endMonth, defaulting to same as start
    };

    if (season.description) {
      converted.description = season.description;
    }

    if (season.icon) {
      converted.icon = season.icon;
    }

    if (season.color) {
      this.addWarning(`root.seasons[${index}].color`, 'color', season.color,
        'Season colors are not supported in current S&S format');
    }

    if (season.sunriseTimes || season.sunsetTimes) {
      this.addWarning(`root.seasons[${index}]`, 'sunriseTimes/sunsetTimes',
        { sunrise: season.sunriseTimes, sunset: season.sunsetTimes },
        'Sunrise/sunset times are not supported in current S&S format');
    }

    return converted;
  }

  private convertMoons(scData: SimpleCalendarData): NonNullable<SeasonsStarsCalendar['moons']> {
    if (!scData.moons) {
      return [];
    }

    return scData.moons.map((moon, index) => {
      const converted: Partial<NonNullable<SeasonsStarsCalendar['moons']>[number]> & { name: string; cycleLength: number } = {
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
          singleDay: phase.singleDay !== undefined ? phase.singleDay : phase.length <= 1,
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
