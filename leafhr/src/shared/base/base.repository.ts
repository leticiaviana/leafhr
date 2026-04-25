import { Repository, FindOptionsWhere, ObjectLiteral } from 'typeorm';
import { IBaseRepository } from './base.repository.interface';

export abstract class BaseRepository<T extends ObjectLiteral>
  implements IBaseRepository<T>
{
  constructor(protected readonly repo: Repository<T>) {}

  async findById(id: string): Promise<T | null> {
    return this.repo.findOne({
      where: { id } as unknown as FindOptionsWhere<T>,
    });
  }

  async findOne(where: Partial<T>): Promise<T | null> {
    return this.repo.findOne({
      where: where as FindOptionsWhere<T>,
    });
  }

  async findMany(options?: {
    where?: Partial<T>;
    page?: number;
    pageSize?: number;
    orderBy?: { field: keyof T; direction: 'ASC' | 'DESC' };
  }): Promise<{ items: T[]; total: number }> {
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const queryBuilder = this.repo.createQueryBuilder('entity');

    if (options?.where) {
      for (const [key, value] of Object.entries(options.where)) {
        if (value !== undefined) {
          queryBuilder.andWhere(`entity.${key} = :${key}`, { [key]: value });
        }
      }
    }

    if (options?.orderBy) {
      queryBuilder.orderBy(
        `entity.${String(options.orderBy.field)}`,
        options.orderBy.direction,
      );
    }

    queryBuilder.skip(skip).take(pageSize);

    const [items, total] = await queryBuilder.getManyAndCount();
    return { items, total };
  }
}
