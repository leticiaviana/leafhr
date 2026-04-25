import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '../shared/base';
import { BalanceEntity } from './entities';
import { LeaveType } from '../shared/types';
import { DEFAULT_LOCATION_ID } from '../location';

@Injectable()
export class BalanceReadRepository extends BaseRepository<BalanceEntity> {
  constructor(
    @InjectRepository(BalanceEntity)
    repo: Repository<BalanceEntity>,
  ) {
    super(repo);
  }

  async findByEmployeeAndYear(
    employeeId: string,
    year: number,
    locationId: string = DEFAULT_LOCATION_ID,
  ): Promise<BalanceEntity[]> {
    return this.repo.find({
      where: { employeeId, year, locationId },
      order: { leaveType: 'ASC' },
    });
  }

  async findOneByScope(
    employeeId: string,
    leaveType: LeaveType,
    year: number,
    locationId: string = DEFAULT_LOCATION_ID,
  ): Promise<BalanceEntity | null> {
    return this.repo.findOne({
      where: { employeeId, locationId, leaveType, year },
    });
  }
}
