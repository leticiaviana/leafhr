import { Injectable } from '@nestjs/common';
import { BalanceEntity } from './entities';
import { LeaveType } from '../shared/types';
import { DEFAULT_LOCATION_ID } from '../location';
import { BalanceReadRepository } from './balance.read.repository';
import type { IBalanceReadService } from './interfaces';

@Injectable()
export class BalanceReadService implements IBalanceReadService {
  constructor(private readonly readRepo: BalanceReadRepository) {}

  async getBalances(
    employeeId: string,
    year: number,
    locationId: string = DEFAULT_LOCATION_ID,
  ): Promise<BalanceEntity[]> {
    return this.readRepo.findByEmployeeAndYear(employeeId, year, locationId);
  }

  async getBalance(
    employeeId: string,
    leaveType: LeaveType,
    year: number,
    locationId: string = DEFAULT_LOCATION_ID,
  ): Promise<BalanceEntity | null> {
    return this.readRepo.findOneByScope(employeeId, leaveType, year, locationId);
  }
}
