import { BaseError } from './base.error';

export class InvalidDateRangeError extends BaseError {
  constructor(startDate: string, endDate: string) {
    super(
      `Invalid date range: startDate (${startDate}) must be before endDate (${endDate})`,
      'INVALID_DATE_RANGE',
      400,
      { startDate, endDate },
    );
  }
}
