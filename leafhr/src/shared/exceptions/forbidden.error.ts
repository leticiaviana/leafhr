import { BaseError } from './base.error';

export class ForbiddenError extends BaseError {
  constructor(action: string, reason?: string) {
    super(
      `Forbidden: cannot ${action}${reason ? ` — ${reason}` : ''}`,
      'FORBIDDEN',
      403,
      { action, reason },
    );
  }
}
