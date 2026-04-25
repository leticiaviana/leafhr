import { BaseError } from './base.error';

export class PendingDaysNegativeError extends BaseError {
  constructor(employeeId: string, leaveType: string, pendingDays: number) {
    super(
      `Pending days cannot be negative for employee ${employeeId}, leaveType ${leaveType}`,
      'PENDING_DAYS_NEGATIVE',
      422,
      { employeeId, leaveType, pendingDays },
    );
  }
}
