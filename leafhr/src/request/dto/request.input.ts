import { InputType, Field } from '@nestjs/graphql';
import { LeaveType, RequestStatus } from '../../shared/types';
import type { ISubmitRequestInput, ITransitionInput } from '../interfaces';

@InputType()
export class SubmitRequestInput implements ISubmitRequestInput {
  @Field({ nullable: true })
  locationId?: string;

  @Field(() => LeaveType)
  leaveType!: LeaveType;

  @Field()
  startDate!: string;

  @Field()
  endDate!: string;

  @Field({ nullable: true })
  reason?: string;
}

@InputType()
export class TransitionInput implements ITransitionInput {
  @Field()
  requestId!: string;

  @Field(() => RequestStatus)
  toStatus!: RequestStatus;

  @Field({ nullable: true })
  comment?: string;
}
