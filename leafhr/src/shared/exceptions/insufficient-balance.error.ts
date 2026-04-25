import { BaseError } from './base.error';

export class InsufficientBalanceError extends BaseError {
  constructor(
    available: number,
    requested: number,
    leaveType: string,
  ) {
    super(
      `Insufficient balance: ${available} days available, ${requested} requested for ${leaveType}`,
      'INSUFFICIENT_BALANCE',
      422,
      { available, requested, leaveType },
    );
  }
}
