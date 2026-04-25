import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseWriteRepository } from '../shared/base';
import { TimeOffRequestEntity, AuditEntity } from './entities';
import { RequestStatus } from '../shared/types';

@Injectable()
export class RequestWriteRepository extends BaseWriteRepository<TimeOffRequestEntity> {
  constructor(
    @InjectRepository(TimeOffRequestEntity)
    repo: Repository<TimeOffRequestEntity>,
    @InjectRepository(AuditEntity)
    private readonly auditRepo: Repository<AuditEntity>,
  ) {
    super(repo);
  }

  async createRequest(data: Partial<TimeOffRequestEntity>): Promise<TimeOffRequestEntity> {
    const entity = this.createEntity(data);
    return this.saveEntity(entity);
  }

  async saveRequest(entity: TimeOffRequestEntity): Promise<TimeOffRequestEntity> {
    const { audits, ...requestOnly } = entity as TimeOffRequestEntity & {
      audits?: AuditEntity[];
    };
    return this.saveEntity(requestOnly as TimeOffRequestEntity);
  }

  async addAudit(audit: Partial<AuditEntity>): Promise<AuditEntity> {
    const entity = this.auditRepo.create(audit);
    return this.auditRepo.save(entity);
  }

  /**
   * Cancel a request by archiving it and updating status.
   * Implements FR-R10: archive by setting archivedAt + status update.
   * Complies with NFR-11: no physical deletes, no soft delete via deletedAt.
   *
   * @param id Request ID to cancel
   * @param newStatus Target status (e.g., RequestStatus.CANCELLED)
   */
  async cancelRequest(id: string, newStatus: RequestStatus): Promise<void> {
    await this.archiveById(id, {
      status: newStatus,
    } as Partial<TimeOffRequestEntity>);
  }

  /**
   * Archive a request without status change.
   * Useful for administrative archival operations.
   *
   * @param id Request ID to archive
   */
  async archiveRequest(id: string): Promise<void> {
    await this.archiveById(id);
  }
}
