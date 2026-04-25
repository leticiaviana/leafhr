import { BaseError } from './base.error';

export class InvalidLeaveTypeError extends BaseError {
  constructor(leaveType: string) {
    super(
      `Invalid leave type: ${leaveType}`,
      'INVALID_LEAVE_TYPE',
      400,
      { leaveType },
    );
  }
}
