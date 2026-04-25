import { BaseError } from './base.error';

export class UnauthenticatedError extends BaseError {
  constructor(message?: string) {
    super(
      message ?? 'Authentication required',
      'UNAUTHENTICATED',
      401,
      {},
    );
  }
}
