import { BaseError } from './base.error';

export class DateRangeError extends BaseError {
  constructor(startDate: string, endDate: string) {
    super(
      `Invalid date range: start '${startDate}' must be before end '${endDate}' and yield at least 1 business day`,
      'DATE_RANGE_ERROR',
      400,
      { startDate, endDate },
    );
  }
}
