import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { BaseRepository } from '../shared/base';
import { TimeOffRequestEntity, AuditEntity } from './entities';
import { RequestStatus } from '../shared/types';
import { NotFoundError } from '../shared/exceptions';

@Injectable()
export class RequestReadRepository extends BaseRepository<TimeOffRequestEntity> {
  constructor(
    @InjectRepository(TimeOffRequestEntity)
    repo: Repository<TimeOffRequestEntity>,
    @InjectRepository(AuditEntity)
    private readonly auditRepo: Repository<AuditEntity>,
  ) {
    super(repo);
  }

  async findByIdWithAudits(id: string): Promise<TimeOffRequestEntity | null> {
    return this.repo.findOne({ where: { id }, relations: ['audits'] });
  }

  async findByIdOrFail(id: string): Promise<TimeOffRequestEntity> {
    const entity = await this.findByIdWithAudits(id);
    if (!entity) {
      throw new NotFoundError('TimeOffRequest', id);
    }
    return entity;
  }

  async findByEmployee(
    employeeId: string,
    year?: number,
  ): Promise<TimeOffRequestEntity[]> {
    const qb = this.repo
      .createQueryBuilder('r')
      .where('r.employeeId = :employeeId', { employeeId })
      .andWhere('r.archivedAt IS NULL')
      .orderBy('r.createdAt', 'DESC');

    if (year) {
      qb.andWhere('r.year = :year', { year });
    }

    return qb.getMany();
  }

  async findPendingForManager(managerId: string): Promise<TimeOffRequestEntity[]> {
    return this.repo.find({
      where: { managerId, status: RequestStatus.PENDING_MANAGER, archivedAt: IsNull() },
      order: { createdAt: 'ASC' },
    });
  }

  async findPendingByEmployee(employeeId: string): Promise<TimeOffRequestEntity[]> {
    return this.repo.find({
      where: [
        { employeeId, status: RequestStatus.PENDING_MANAGER, archivedAt: IsNull() },
        { employeeId, status: RequestStatus.PENDING_HCM_CONFIRMATION, archivedAt: IsNull() },
      ],
      order: { createdAt: 'ASC' },
    });
  }

  async findEmployeeIdsWithPending(): Promise<string[]> {
    const rows = await this.repo
      .createQueryBuilder('r')
      .select('DISTINCT r.employeeId', 'employeeId')
      .where('r.status IN (:...statuses)', {
        statuses: [
          RequestStatus.PENDING_MANAGER,
          RequestStatus.PENDING_HCM_CONFIRMATION,
        ],
      })
      .andWhere('r.archivedAt IS NULL')
      .getRawMany<{ employeeId: string }>();

    return rows.map((r) => r.employeeId);
  }

  async getAuditsByRequestIds(requestIds: string[]): Promise<AuditEntity[]> {
    if (requestIds.length === 0) {
      return [];
    }

    return this.auditRepo.find({
      where: { requestId: In(requestIds) },
      order: { timestamp: 'ASC' },
    });
  }
}
