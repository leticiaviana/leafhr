import { BalanceEntity } from '../entities';
import { LeaveType, BalanceSource } from '../../shared/types';

export interface IBalanceReadService {
  getBalances(employeeId: string, year: number, locationId?: string): Promise<BalanceEntity[]>;
  getBalance(
    employeeId: string,
    leaveType: LeaveType,
    year: number,
    locationId?: string,
  ): Promise<BalanceEntity | null>;
}

export interface IBalanceWriteService {
  setEntitlement(
    employeeId: string,
    leaveType: LeaveType,
    year: number,
    totalEntitled: number,
    source?: BalanceSource,
    externalId?: string,
    locationId?: string,
  ): Promise<BalanceEntity>;
  reserveDays(
    employeeId: string,
    leaveType: LeaveType,
    year: number,
    days: number,
    locationId?: string,
  ): Promise<BalanceEntity>;
  confirmDays(
    employeeId: string,
    leaveType: LeaveType,
    year: number,
    days: number,
    locationId?: string,
  ): Promise<BalanceEntity>;
  releaseDays(
    employeeId: string,
    leaveType: LeaveType,
    year: number,
    days: number,
    locationId?: string,
  ): Promise<BalanceEntity>;
}
