import { Injectable } from '@nestjs/common';
import { BalanceEntity } from './entities';
import { LeaveType, BalanceSource } from '../shared/types';
import {
  InsufficientBalanceError,
  PendingDaysNegativeError,
} from '../shared/exceptions';
import { DEFAULT_LOCATION_ID } from '../location';
import { BalanceReadRepository } from './balance.read.repository';
import { BalanceWriteRepository } from './balance.write.repository';
import type { IBalanceWriteService } from './interfaces';

@Injectable()
export class BalanceWriteService implements IBalanceWriteService {
  constructor(
    private readonly readRepo: BalanceReadRepository,
    private readonly writeRepo: BalanceWriteRepository,
  ) {}

  async setEntitlement(
    employeeId: string,
    leaveType: LeaveType,
    year: number,
    totalEntitled: number,
    source: BalanceSource = BalanceSource.HCM_SYNC,
    externalId?: string,
    locationId: string = DEFAULT_LOCATION_ID,
  ): Promise<BalanceEntity> {
    return this.writeRepo.upsert({
      employeeId,
      locationId,
      leaveType,
      year,
      totalEntitled,
      source,
      externalId,
    });
  }

  async reserveDays(
    employeeId: string,
    leaveType: LeaveType,
    year: number,
    days: number,
    locationId: string = DEFAULT_LOCATION_ID,
  ): Promise<BalanceEntity> {
    const balance = await this.writeRepo.findOneOrFail(
      employeeId,
      leaveType,
      year,
      locationId,
    );

    if (balance.available < days) {
      throw new InsufficientBalanceError(balance.available, days, leaveType);
    }

    balance.pending += days;
    return this.writeRepo.save(balance);
  }

  async confirmDays(
    employeeId: string,
    leaveType: LeaveType,
    year: number,
    days: number,
    locationId: string = DEFAULT_LOCATION_ID,
  ): Promise<BalanceEntity> {
    const balance = await this.writeRepo.findOneOrFail(
      employeeId,
      leaveType,
      year,
      locationId,
    );

    if (balance.pending < days) {
      throw new PendingDaysNegativeError(employeeId, leaveType, balance.pending - days);
    }

    balance.pending -= days;
    balance.used += days;
    return this.writeRepo.save(balance);
  }

  async releaseDays(
    employeeId: string,
    leaveType: LeaveType,
    year: number,
    days: number,
    locationId: string = DEFAULT_LOCATION_ID,
  ): Promise<BalanceEntity> {
    const balance = await this.writeRepo.findOneOrFail(
      employeeId,
      leaveType,
      year,
      locationId,
    );

    if (balance.pending < days) {
      throw new PendingDaysNegativeError(employeeId, leaveType, balance.pending - days);
    }

    balance.pending -= days;
    return this.writeRepo.save(balance);
  }
}
