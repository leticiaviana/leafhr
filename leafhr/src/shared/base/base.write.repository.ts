import { Repository, ObjectLiteral } from 'typeorm';
import { BaseRepository } from './base.repository';

export abstract class BaseWriteRepository<T extends ObjectLiteral> extends BaseRepository<T> {
  constructor(protected readonly writeRepo: Repository<T>) {
    super(writeRepo);
  }

  protected createEntity(entity: Partial<T>): T {
    return this.writeRepo.create(entity as T);
  }

  protected async saveEntity(entity: T): Promise<T> {
    return this.writeRepo.save(entity);
  }

  protected async updateById(id: string, entity: Partial<T>): Promise<void> {
    await this.writeRepo.update(id, entity as never);
  }

  /**
   * Archive a record by setting archivedAt to current timestamp.
   * Generic method for archival (not soft delete, not hard delete).
   * Complies with NFR-11: zero physical deletes, archive-based persistence.
   *
   * @param id Entity ID to archive
   * @param additionalUpdates Optional additional fields to update alongside archival
   */
  protected async archiveById(id: string, additionalUpdates?: Partial<T>): Promise<void> {
    const updates = {
      ...additionalUpdates,
      archivedAt: new Date(),
    } as unknown as Partial<T>;

    await this.writeRepo.update(id, updates as never);
  }
}
