import { Logger } from './logger';

export interface ParsedEventTime {
  hour: number;
  minute: number;
  second: number;
}

export interface ParsedEventDuration {
  seconds: number;
}

export function parseEventStartTime(
  startTime: string | undefined,
  calendarHoursPerDay = 24,
  calendarMinutesPerHour = 60,
  calendarSecondsPerMinute = 60
): ParsedEventTime {
  if (!startTime || typeof startTime !== 'string') {
    return { hour: 0, minute: 0, second: 0 };
  }

  const trimmed = startTime.trim();

  const match = trimmed.match(/^(\d+)(?::(\d+)(?::(\d+))?)?$/);
  if (!match) {
    Logger.warn(`Invalid event start time format: "${startTime}", using 00:00:00`);
    return { hour: 0, minute: 0, second: 0 };
  }

  const hour = parseInt(match[1], 10);
  const minute = match[2] ? parseInt(match[2], 10) : 0;
  const second = match[3] ? parseInt(match[3], 10) : 0;

  if (!Number.isFinite(hour) || hour < 0 || hour >= calendarHoursPerDay) {
    Logger.warn(
      `Invalid hour in event start time: "${startTime}" (must be 0-${calendarHoursPerDay - 1}), using 00:00:00`
    );
    return { hour: 0, minute: 0, second: 0 };
  }

  if (!Number.isFinite(minute) || minute < 0 || minute >= calendarMinutesPerHour) {
    Logger.warn(
      `Invalid minute in event start time: "${startTime}" (must be 0-${calendarMinutesPerHour - 1}), using 00:00:00`
    );
    return { hour: 0, minute: 0, second: 0 };
  }

  if (!Number.isFinite(second) || second < 0 || second >= calendarSecondsPerMinute) {
    Logger.warn(
      `Invalid second in event start time: "${startTime}" (must be 0-${calendarSecondsPerMinute - 1}), using 00:00:00`
    );
    return { hour: 0, minute: 0, second: 0 };
  }

  return { hour, minute, second };
}

export function parseEventDuration(
  duration: string | undefined,
  calendarHoursPerDay = 24,
  calendarMinutesPerHour = 60,
  calendarSecondsPerMinute = 60,
  calendarDaysPerWeek = 7
): ParsedEventDuration {
  if (!duration || typeof duration !== 'string') {
    return { seconds: calendarHoursPerDay * calendarMinutesPerHour * calendarSecondsPerMinute };
  }

  const trimmed = duration.trim();

  const match = trimmed.match(/^(\d+)([smhdw])$/);
  if (!match) {
    Logger.warn(`Invalid event duration format: "${duration}", using 1d`);
    return { seconds: calendarHoursPerDay * calendarMinutesPerHour * calendarSecondsPerMinute };
  }

  const amount = parseInt(match[1], 10);
  const unit = match[2];

  if (!Number.isFinite(amount) || amount < 0) {
    Logger.warn(`Invalid amount in event duration: "${duration}", using 1d`);
    return { seconds: calendarHoursPerDay * calendarMinutesPerHour * calendarSecondsPerMinute };
  }

  const secondsPerMinute = calendarSecondsPerMinute;
  const secondsPerHour = calendarMinutesPerHour * secondsPerMinute;
  const secondsPerDay = calendarHoursPerDay * secondsPerHour;
  const secondsPerWeek = calendarDaysPerWeek * secondsPerDay;

  switch (unit) {
    case 's':
      return { seconds: amount };
    case 'm':
      return { seconds: amount * secondsPerMinute };
    case 'h':
      return { seconds: amount * secondsPerHour };
    case 'd':
      return { seconds: amount * secondsPerDay };
    case 'w':
      return { seconds: amount * secondsPerWeek };
    default:
      Logger.warn(`Unknown unit in event duration: "${duration}", using 1d`);
      return { seconds: secondsPerDay };
  }
}
