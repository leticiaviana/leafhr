import { BalanceSource, LeaveType } from '../../shared/types';

export interface IBalanceType {
  id: string;
  employeeId: string;
  locationId: string;
  leaveType: LeaveType;
  year: number;
  totalEntitled: number;
  used: number;
  pending: number;
  available: number;
  source: BalanceSource;
  externalId?: string;
  createdAt: Date;
  updatedAt: Date;
}
