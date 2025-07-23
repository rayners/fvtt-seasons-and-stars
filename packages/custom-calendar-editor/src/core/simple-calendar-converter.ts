/**
 * Converter between Simple Calendar and Seasons & Stars formats
 */

import { Logger } from './logger';
import type { SeasonsStarsCalendar } from '../types/calendar';

// Simple Calendar interfaces (subset needed for conversion)
interface SimpleCalendarData {
  id: string;
  name: string;
  currentDate?: {
    year: number;
    month: number;
    day: number;
    seconds: number;
  };
  general?: {
    gameWorldTimeIntegration: string;
    showClock: boolean;
    pf2eSync: boolean;
  };
  leapYear?: {
    rule: string;
    customMod: number;
  };
  months?: SimpleCalendarMonth[];
  moons?: SimpleCalendarMoon[];
  seasons?: SimpleCalendarSeason[];
  time?: {
    hoursInDay: number;
    minutesInHour: number;
    secondsInMinute: number;
    gameTimeRatio: number;
    unifyGameAndClockPause: boolean;
    updateFrequency: number;
  };
  weekdays?: SimpleCalendarWeekday[];
  year?: {
    numericRepresentation: number;
    prefix: string;
    postfix: string;
    showWeekdayHeadings: boolean;
    firstWeekday: number;
  };
}

interface SimpleCalendarMonth {
  name: string;
  numberOfDays: number;
  numberOfLeapYearDays: number;
  intercalary: boolean;
  intercalaryInclude: boolean;
  startingWeekday: number | null;
}

interface SimpleCalendarWeekday {
  name: string;
  numericRepresentation: number;
  restday: boolean;
}

interface SimpleCalendarMoon {
  name: string;
  cycleLength: number;
  firstNewMoon: {
    yearReset: string;
    yearX: number;
    month: number;
    day: number;
  };
  phases: {
    name: string;
    length: number;
    icon: string;
    singleDay: boolean;
  }[];
  color: string;
}

interface SimpleCalendarSeason {
  name: string;
  month: number;
  day: number;
  color: string;
  icon: string;
  sunriseTime: number;
  sunsetTime: number;
}

export class SimpleCalendarConverter {
  /**
   * Convert from Simple Calendar format to Seasons & Stars format
   */
  convertFromSimpleCalendar(scData: SimpleCalendarData): SeasonsStarsCalendar {
    Logger.info(`Converting Simple Calendar: ${scData.name}`);
    
    const calendar: SeasonsStarsCalendar = {
      id: this.sanitizeId(scData.id || scData.name),
      name: scData.name,
      label: scData.name,
      translations: {
        en: {
          label: scData.name,
          description: `Imported from Simple Calendar`
        }
      },
      
      // Year configuration
      year: {
        epoch: 0,
        currentYear: scData.currentDate?.year || scData.year?.numericRepresentation || 1,
        prefix: scData.year?.prefix || '',
        suffix: scData.year?.postfix || '',
        startDay: 1
      },
      
      // Leap year rules
      leapYear: this.convertLeapYear(scData.leapYear),
      
      // Months
      months: this.convertMonths(scData.months || []),
      
      // Weekdays
      weekdays: this.convertWeekdays(scData.weekdays || []),
      
      // Intercalary days (extracted from months)
      intercalary: this.extractIntercalaryDays(scData.months || []),
      
      // Time configuration
      time: {
        hoursInDay: scData.time?.hoursInDay || 24,
        minutesInHour: scData.time?.minutesInHour || 60,
        secondsInMinute: scData.time?.secondsInMinute || 60
      }
    };
    
    // Optional features
    if (scData.seasons && scData.seasons.length > 0) {
      calendar.seasons = this.convertSeasons(scData.seasons);
    }
    
    if (scData.moons && scData.moons.length > 0) {
      calendar.moons = this.convertMoons(scData.moons);
    }
    
    Logger.debug('Conversion completed:', calendar);
    return calendar;
  }
  
  /**
   * Convert leap year rules
   */
  private convertLeapYear(scLeapYear?: any): any {
    if (!scLeapYear || scLeapYear.rule === 'none') {
      return { rule: 'none' };
    }
    
    switch (scLeapYear.rule) {
      case 'gregorian':
        return { rule: 'gregorian' };
      case 'custom':
        return {
          rule: 'custom',
          interval: scLeapYear.customMod || 4
        };
      default:
        return { rule: 'none' };
    }
  }
  
  /**
   * Convert months from Simple Calendar format
   */
  private convertMonths(scMonths: SimpleCalendarMonth[]): any[] {
    return scMonths
      .filter(month => !month.intercalary) // Filter out intercalary months
      .map(month => ({
        name: month.name,
        days: month.numberOfDays,
        intercalary: false
      }));
  }
  
  /**
   * Convert weekdays from Simple Calendar format
   */
  private convertWeekdays(scWeekdays: SimpleCalendarWeekday[]): any[] {
    return scWeekdays
      .sort((a, b) => a.numericRepresentation - b.numericRepresentation)
      .map(weekday => ({
        name: weekday.name,
        abbreviation: this.generateAbbreviation(weekday.name)
      }));
  }
  
  /**
   * Extract intercalary days from Simple Calendar months
   */
  private extractIntercalaryDays(scMonths: SimpleCalendarMonth[]): any[] {
    const intercalary: any[] = [];
    
    scMonths.forEach((month, index) => {
      if (month.intercalary) {
        // Simple Calendar treats entire months as intercalary
        // Convert to individual intercalary days
        for (let day = 1; day <= month.numberOfDays; day++) {
          intercalary.push({
            name: month.numberOfDays === 1 ? month.name : `${month.name} ${day}`,
            day: day,
            month: index > 0 ? scMonths[index - 1].name : 'Month 1'
          });
        }
      }
    });
    
    return intercalary;
  }
  
  /**
   * Convert seasons from Simple Calendar format
   */
  private convertSeasons(scSeasons: SimpleCalendarSeason[]): any[] {
    return scSeasons.map(season => ({
      name: season.name,
      month: season.month,
      day: season.day,
      color: season.color || '#ffffff'
    }));
  }
  
  /**
   * Convert moons from Simple Calendar format
   */
  private convertMoons(scMoons: SimpleCalendarMoon[]): any[] {
    return scMoons.map(moon => ({
      name: moon.name,
      cycleLength: moon.cycleLength,
      color: moon.color || '#ffffff',
      phases: moon.phases?.map(phase => ({
        name: phase.name,
        length: phase.length
      })) || []
    }));
  }
  
  /**
   * Generate abbreviation for weekday names
   */
  private generateAbbreviation(name: string): string {
    if (name.length <= 3) return name;
    
    // Take first 3 characters, or first letter + first 2 consonants
    const consonants = name.match(/[bcdfghjklmnpqrstvwxyz]/gi);
    if (consonants && consonants.length >= 2) {
      return (name[0] + consonants.slice(0, 2).join('')).substring(0, 3);
    }
    
    return name.substring(0, 3);
  }
  
  /**
   * Sanitize ID for S&S compatibility
   */
  private sanitizeId(id: string): string {
    return id
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  
  /**
   * Convert from Seasons & Stars format to Simple Calendar format
   * (Basic implementation for potential future use)
   */
  convertToSimpleCalendar(ssCalendar: SeasonsStarsCalendar): SimpleCalendarData {
    Logger.info(`Converting to Simple Calendar: ${ssCalendar.name}`);
    
    const scData: SimpleCalendarData = {
      id: ssCalendar.id,
      name: ssCalendar.name || ssCalendar.label || ssCalendar.id,
      
      currentDate: {
        year: ssCalendar.year.currentYear,
        month: 0,
        day: 1,
        seconds: 0
      },
      
      year: {
        numericRepresentation: ssCalendar.year.currentYear,
        prefix: ssCalendar.year.prefix,
        postfix: ssCalendar.year.suffix,
        showWeekdayHeadings: true,
        firstWeekday: 0
      },
      
      leapYear: this.convertLeapYearToSC(ssCalendar.leapYear),
      
      months: this.convertMonthsToSC(ssCalendar.months, ssCalendar.intercalary),
      
      weekdays: this.convertWeekdaysToSC(ssCalendar.weekdays),
      
      time: {
        hoursInDay: ssCalendar.time.hoursInDay,
        minutesInHour: ssCalendar.time.minutesInHour,
        secondsInMinute: ssCalendar.time.secondsInMinute,
        gameTimeRatio: 1,
        unifyGameAndClockPause: false,
        updateFrequency: 1
      }
    };
    
    // Optional features
    if (ssCalendar.seasons) {
      scData.seasons = this.convertSeasonsToSC(ssCalendar.seasons);
    }
    
    if (ssCalendar.moons) {
      scData.moons = this.convertMoonsToSC(ssCalendar.moons);
    }
    
    return scData;
  }
  
  private convertLeapYearToSC(ssLeapYear: any): any {
    switch (ssLeapYear.rule) {
      case 'gregorian':
        return { rule: 'gregorian', customMod: 4 };
      case 'custom':
        return { rule: 'custom', customMod: ssLeapYear.interval || 4 };
      default:
        return { rule: 'none', customMod: 0 };
    }
  }
  
  private convertMonthsToSC(ssMonths: any[], ssIntercalary: any[]): SimpleCalendarMonth[] {
    const months: SimpleCalendarMonth[] = [];
    
    // Add regular months
    ssMonths.forEach(month => {
      months.push({
        name: month.name,
        numberOfDays: month.days,
        numberOfLeapYearDays: month.days,
        intercalary: false,
        intercalaryInclude: false,
        startingWeekday: null
      });
    });
    
    // Add intercalary days as separate months
    ssIntercalary.forEach(intercalary => {
      months.push({
        name: intercalary.name,
        numberOfDays: 1,
        numberOfLeapYearDays: 1,
        intercalary: true,
        intercalaryInclude: true,
        startingWeekday: null
      });
    });
    
    return months;
  }
  
  private convertWeekdaysToSC(ssWeekdays: any[]): SimpleCalendarWeekday[] {
    return ssWeekdays.map((weekday, index) => ({
      name: weekday.name,
      numericRepresentation: index,
      restday: false
    }));
  }
  
  private convertSeasonsToSC(ssSeasons: any[]): SimpleCalendarSeason[] {
    return ssSeasons.map(season => ({
      name: season.name,
      month: season.month || 0,
      day: season.day || 1,
      color: season.color || '#ffffff',
      icon: 'fas fa-sun',
      sunriseTime: 6,
      sunsetTime: 18
    }));
  }
  
  private convertMoonsToSC(ssMoons: any[]): SimpleCalendarMoon[] {
    return ssMoons.map(moon => ({
      name: moon.name,
      cycleLength: moon.cycleLength || 29,
      firstNewMoon: {
        yearReset: 'none',
        yearX: 1,
        month: 0,
        day: 1
      },
      phases: moon.phases?.map((phase: any, index: number) => ({
        name: phase.name,
        length: phase.length || 7,
        icon: 'fas fa-circle',
        singleDay: false
      })) || [],
      color: moon.color || '#ffffff'
    }));
  }
}