import { BaseError } from './base.error';

export class NotAuthorizedTransitionError extends BaseError {
  constructor(role: string, from: string, to: string) {
    super(
      `Role '${role}' is not authorized for transition '${from}' → '${to}'`,
      'NOT_AUTHORIZED_TRANSITION',
      403,
      { role, from, to },
    );
  }
}
