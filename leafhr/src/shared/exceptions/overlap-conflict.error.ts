import { BaseError } from './base.error';

export class OverlapConflictError extends BaseError {
  constructor(existingRequestId: string, startDate: string, endDate: string) {
    super(
      `Time-off request overlaps with existing request ${existingRequestId}`,
      'OVERLAP_CONFLICT',
      409,
      { existingRequestId, startDate, endDate },
    );
  }
}
