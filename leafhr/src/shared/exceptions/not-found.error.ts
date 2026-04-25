import { BaseError } from './base.error';

export class NotFoundError extends BaseError {
  constructor(entity: string, id: string) {
    super(
      `${entity} with id ${id} not found`,
      'NOT_FOUND',
      404,
      { entity, id },
    );
  }
}
