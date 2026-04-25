import { BaseError } from './base.error';

export class RequestStateConflictError extends BaseError {
  constructor(requestId: string, currentStatus: string, action: string) {
    super(
      `Cannot ${action} request ${requestId}: current status is ${currentStatus}`,
      'REQUEST_STATE_CONFLICT',
      409,
      { requestId, currentStatus, action },
    );
  }
}
