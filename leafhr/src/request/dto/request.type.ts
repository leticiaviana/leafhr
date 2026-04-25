import { ObjectType, Field, ID, Float, Int, registerEnumType } from '@nestjs/graphql';
import { LeaveType, RequestStatus } from '../../shared/types';
import type { IAuditType, ITimeOffRequestType } from '../interfaces';

registerEnumType(RequestStatus, { name: 'RequestStatus' });

@ObjectType()
export class AuditType implements IAuditType {
  @Field(() => ID)
  id!: string;

  @Field()
  requestId!: string;

  @Field(() => RequestStatus)
  fromStatus!: RequestStatus;

  @Field(() => RequestStatus)
  toStatus!: RequestStatus;

  @Field()
  actorId!: string;

  @Field()
  actorRole!: string;

  @Field({ nullable: true })
  comment?: string;

  @Field()
  timestamp!: Date;
}

@ObjectType()
export class TimeOffRequestType implements ITimeOffRequestType {
  @Field(() => ID)
  id!: string;

  @Field()
  employeeId!: string;

  @Field()
  locationId!: string;

  @Field(() => LeaveType)
  leaveType!: LeaveType;

  @Field()
  startDate!: string;

  @Field(() => Float)
  startDateTimestamp!: number;

  @Field()
  endDate!: string;

  @Field(() => Float)
  endDateTimestamp!: number;

  @Field(() => Float)
  totalDays!: number;

  @Field(() => RequestStatus)
  status!: RequestStatus;

  @Field({ nullable: true })
  reason?: string;

  @Field({ nullable: true })
  managerId?: string;

  @Field(() => Int)
  year!: number;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;

  @Field({ nullable: true })
  archivedAt?: Date;

  @Field(() => [AuditType], { nullable: true })
  audits?: AuditType[];
}
