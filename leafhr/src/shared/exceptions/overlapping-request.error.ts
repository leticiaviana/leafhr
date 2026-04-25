import { BaseError } from './base.error';

export class OverlappingRequestError extends BaseError {
  constructor(startDate: string, endDate: string) {
    super(
      `An existing request overlaps with the period ${startDate} to ${endDate}`,
      'OVERLAPPING_REQUEST',
      409,
      { startDate, endDate },
    );
  }
}
