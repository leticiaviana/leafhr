import { BaseError } from './base.error';

export class InvalidTransitionError extends BaseError {
  constructor(from: string, to: string) {
    super(
      `Invalid state transition from '${from}' to '${to}'`,
      'INVALID_TRANSITION',
      409,
      { from, to },
    );
  }
}
