import { LeaveType, RequestStatus } from '../../shared/types';

export interface ISubmitRequestInput {
  locationId?: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface ITransitionInput {
  requestId: string;
  toStatus: RequestStatus;
  comment?: string;
}

export interface IAuditType {
  id: string;
  requestId: string;
  fromStatus: RequestStatus;
  toStatus: RequestStatus;
  actorId: string;
  actorRole: string;
  comment?: string;
  timestamp: Date;
}

export interface ITimeOffRequestType {
  id: string;
  employeeId: string;
  locationId: string;
  leaveType: LeaveType;
  startDate: string;
  startDateTimestamp: number;
  endDate: string;
  endDateTimestamp: number;
  totalDays: number;
  status: RequestStatus;
  reason?: string;
  managerId?: string;
  year: number;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
