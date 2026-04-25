import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseWriteRepository } from '../shared/base';
import { BalanceEntity } from './entities';
import { LeaveType } from '../shared/types';
import { NotFoundError, OptimisticLockError } from '../shared/exceptions';
import { DEFAULT_LOCATION_ID } from '../location';

@Injectable()
export class BalanceWriteRepository extends BaseWriteRepository<BalanceEntity> {
  constructor(
    @InjectRepository(BalanceEntity)
    repo: Repository<BalanceEntity>,
  ) {
    super(repo);
  }

  async findOneOrFail(
    employeeId: string,
    leaveType: LeaveType,
    year: number,
    locationId: string = DEFAULT_LOCATION_ID,
  ): Promise<BalanceEntity> {
    const balance = await this.repo.findOne({
      where: { employeeId, locationId, leaveType, year },
    });

    if (!balance) {
      throw new NotFoundError(
        'Balance',
        `${employeeId}/${locationId}/${leaveType}/${year}`,
      );
    }

    return balance;
  }

  async upsert(data: Partial<BalanceEntity> & {
    employeeId: string;
    locationId?: string;
    leaveType: LeaveType;
    year: number;
  }): Promise<BalanceEntity> {
    const scopedLocationId = data.locationId ?? DEFAULT_LOCATION_ID;
    const existing = await this.repo.findOne({
      where: {
        employeeId: data.employeeId,
        locationId: scopedLocationId,
        leaveType: data.leaveType,
        year: data.year,
      },
    });

    if (existing) {
      Object.assign(existing, data);
      return this.save(existing);
    }

    const entity = this.createEntity({
      ...data,
      locationId: scopedLocationId,
    });

    return this.save(entity);
  }

  async save(entity: BalanceEntity): Promise<BalanceEntity> {
    try {
      return await this.saveEntity(entity);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('optimistic lock')) {
        throw new OptimisticLockError('Balance', entity.id);
      }
      throw err;
    }
  }
}
