import { BaseError } from './base.error';

export class OptimisticLockError extends BaseError {
  constructor(entity: string, id: string) {
    super(
      `Optimistic lock conflict on ${entity} ${id}: entity was modified by another process`,
      'OPTIMISTIC_LOCK',
      409,
      { entity, id },
    );
  }
}
