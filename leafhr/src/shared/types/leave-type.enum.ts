import { registerEnumType } from '@nestjs/graphql';

export enum LeaveType {
  PTO = 'pto',
  VACATION = 'vacation',
  SICK = 'sick',
  PERSONAL = 'personal',
  BEREAVEMENT = 'bereavement',
  MATERNITY = 'maternity',
  PATERNITY = 'paternity',
}

registerEnumType(LeaveType, { name: 'LeaveType' });
