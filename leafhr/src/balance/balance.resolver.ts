import { Resolver, Query, Args, Int } from '@nestjs/graphql';
import { UseGuards, ForbiddenException, Inject, Logger } from '@nestjs/common';
import { BalanceReadService } from './balance.read.service';
import { BalanceWriteService } from './balance.write.service';
import { BalanceType } from './graphql';
import { BalanceEntity } from './entities';
import { GqlAuthGuard, Roles, CurrentUser } from '../auth';
import { Role, BalanceSource } from '../shared/types';
import type { IActor } from '../shared/interfaces/actor.interface';
import { DEFAULT_LOCATION_ID } from '../location';
import { HcmClient, HCM_CLIENT_TOKEN } from '../hcm';

function toGql(entity: BalanceEntity): BalanceType {
  return {
    id: entity.id,
    employeeId: entity.employeeId,
    locationId: entity.locationId,
    leaveType: entity.leaveType,
    year: entity.year,
    totalEntitled: entity.totalEntitled,
    used: entity.used,
    pending: entity.pending,
    available: entity.available,
    source: entity.source,
    externalId: entity.externalId,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

@Resolver(() => BalanceType)
@UseGuards(GqlAuthGuard)
export class BalanceResolver {
  private readonly logger = new Logger(BalanceResolver.name);

  constructor(
    private readonly readService: BalanceReadService,
    private readonly writeService: BalanceWriteService,
    @Inject(HCM_CLIENT_TOKEN)
    private readonly hcmClient: HcmClient,
  ) {}

  @Query(() => [BalanceType], { name: 'myBalances' })
  async myBalances(
    @CurrentUser() actor: IActor,
    @Args('year', { type: () => Int }) year: number,
  ): Promise<BalanceType[]> {
    const locationId = actor.locationId ?? DEFAULT_LOCATION_ID;

    await this.refreshActorBalancesFromHcm(actor.sub, locationId, year);

    const entities = await this.readService.getBalances(actor.sub, year, locationId);
    return entities.map(toGql);
  }

  private async refreshActorBalancesFromHcm(
    employeeId: string,
    locationId: string,
    year: number,
  ): Promise<void> {
    try {
      const hcmBalances = await this.hcmClient.getBatchBalances();
      const scoped = hcmBalances.filter(
        (balance) =>
          balance.employeeId === employeeId &&
          balance.locationId === locationId &&
          balance.year === year,
      );

      for (const balance of scoped) {
        await this.writeService.setEntitlement(
          balance.employeeId,
          balance.leaveType,
          balance.year,
          balance.totalEntitled,
          BalanceSource.HCM_SYNC,
          undefined,
          balance.locationId,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Could not refresh balances from HCM for ${employeeId}/${locationId}/${year}: ${(error as Error).message}`,
      );
    }
  }

  @Query(() => [BalanceType], { name: 'employeeBalances' })
  @Roles(Role.MANAGER)
  async employeeBalances(
    @CurrentUser() actor: IActor,
    @Args('employeeId') employeeId: string,
    @Args('year', { type: () => Int }) year: number,
    @Args('locationId', { type: () => String, nullable: true }) locationId?: string,
  ): Promise<BalanceType[]> {
    const isOwnReport = (actor.reportIds ?? []).includes(employeeId);
    if (!isOwnReport) {
      throw new ForbiddenException(
        `Manager can only view balances of direct reports (employeeId=${employeeId})`,
      );
    }

    const entities = await this.readService.getBalances(
      employeeId,
      year,
      locationId ?? actor.locationId ?? DEFAULT_LOCATION_ID,
    );
    return entities.map(toGql);
  }
}
