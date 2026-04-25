import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Compute the number of business days (Mon-Fri) between two dates (inclusive).
 * Both dates are interpreted as UTC.
 */
export function computeBusinessDays(startDate: string, endDate: string): number {
  const start = dayjs.utc(startDate).startOf('day');
  const end = dayjs.utc(endDate).startOf('day');

  if (end.isBefore(start)) {
    return 0;
  }

  let count = 0;
  let current = start;

  while (current.isBefore(end) || current.isSame(end, 'day')) {
    const dayOfWeek = current.day(); // 0=Sun, 6=Sat
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current = current.add(1, 'day');
  }

  return count;
}

/**
 * Convert an ISO date string to a Unix timestamp in milliseconds (UTC).
 */
export function toTimestamp(dateStr: string): number {
  return dayjs.utc(dateStr).valueOf();
}

/**
 * Convert a Unix timestamp (ms) back to an ISO date string (UTC).
 */
export function fromTimestamp(ts: number): string {
  return dayjs.utc(ts).toISOString();
}

/**
 * Get the current UTC ISO string.
 */
export function nowUTC(): string {
  return dayjs.utc().toISOString();
}

/**
 * Get the current UTC timestamp in milliseconds.
 */
export function nowTimestamp(): number {
  return dayjs.utc().valueOf();
}

/**
 * Validate that startDate < endDate and both are valid dates.
 */
export function isValidDateRange(startDate: string, endDate: string): boolean {
  const s = dayjs.utc(startDate);
  const e = dayjs.utc(endDate);
  return s.isValid() && e.isValid() && s.isBefore(e);
}

/**
 * Check if a date is in the future (or today).
 */
export function isFutureOrToday(dateStr: string): boolean {
  const d = dayjs.utc(dateStr).startOf('day');
  const today = dayjs.utc().startOf('day');
  return d.isSame(today, 'day') || d.isAfter(today, 'day');
}
