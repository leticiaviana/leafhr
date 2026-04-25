import { BaseError } from './base.error';

export class HcmUnavailableError extends BaseError {
  constructor(message?: string) {
    super(
      message ?? 'HCM service is unavailable',
      'HCM_UNAVAILABLE',
      503,
      {},
    );
  }
}
