import { ObjectType, Field, ID, Float, Int, registerEnumType } from '@nestjs/graphql';
import { LeaveType, BalanceSource } from '../../shared/types';
import type { IBalanceType } from '../interfaces';

registerEnumType(LeaveType, { name: 'LeaveType' });
registerEnumType(BalanceSource, { name: 'BalanceSource' });

@ObjectType()
export class BalanceType implements IBalanceType {
  @Field(() => ID)
  id!: string;

  @Field()
  employeeId!: string;

  @Field()
  locationId!: string;

  @Field(() => LeaveType)
  leaveType!: LeaveType;

  @Field(() => Int)
  year!: number;

  @Field(() => Float)
  totalEntitled!: number;

  @Field(() => Float)
  used!: number;

  @Field(() => Float)
  pending!: number;

  @Field(() => Float)
  available!: number;

  @Field(() => BalanceSource)
  source!: BalanceSource;

  @Field({ nullable: true })
  externalId?: string;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}
