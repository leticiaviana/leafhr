import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  ResolveField,
  Parent,
  Context,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { RequestReadService } from './request.read.service';
import { RequestWriteService } from './request.write.service';
import {
  TimeOffRequestType,
  SubmitRequestInput,
  TransitionInput,
  AuditType,
} from './graphql';
import { GqlAuthGuard, Roles, CurrentUser } from '../auth';
import { Role } from '../shared/types';
import type { IActor } from '../shared/interfaces/actor.interface';
import { TimeOffRequestEntity } from './entities';
import { createRequestLoaders, IRequestLoaders } from './request.loaders';

interface IRequestContext {
  requestLoaders?: IRequestLoaders;
}

@Resolver(() => TimeOffRequestType)
@UseGuards(GqlAuthGuard)
export class RequestResolver {
  constructor(
    private readonly readService: RequestReadService,
    private readonly writeService: RequestWriteService,
  ) {}

  @Mutation(() => TimeOffRequestType)
  async submitRequest(
    @CurrentUser() actor: IActor,
    @Args('input') input: SubmitRequestInput,
  ): Promise<TimeOffRequestType> {
    return this.writeService.submit(actor, input) as any;
  }

  @Mutation(() => TimeOffRequestType)
  async transitionRequest(
    @CurrentUser() actor: IActor,
    @Args('input') input: TransitionInput,
  ): Promise<TimeOffRequestType> {
    return this.writeService.transition(
      actor,
      input.requestId,
      input.toStatus,
      input.comment,
    ) as any;
  }

  @Query(() => [TimeOffRequestType], { name: 'myRequests' })
  async myRequests(
    @CurrentUser() actor: IActor,
    @Args('year', { type: () => Int, nullable: true }) year?: number,
  ): Promise<TimeOffRequestType[]> {
    return this.readService.getMyRequests(actor.sub, year) as any;
  }

  @Query(() => TimeOffRequestType, { name: 'request' })
  async getRequest(
    @Args('id') id: string,
    @CurrentUser() actor: IActor,
  ): Promise<TimeOffRequestType> {
    return this.readService.getRequestWithAccess(id, actor) as any;
  }

  @Query(() => [TimeOffRequestType], { name: 'pendingManagerApprovals' })
  @Roles(Role.MANAGER)
  async pendingManagerApprovals(
    @CurrentUser() actor: IActor,
  ): Promise<TimeOffRequestType[]> {
    return this.readService.getPendingForManager(actor.sub) as any;
  }

  @ResolveField(() => [AuditType], { name: 'audits' })
  async audits(
    @Parent() request: TimeOffRequestEntity,
    @Context() context: IRequestContext,
  ): Promise<AuditType[]> {
    if (!context.requestLoaders) {
      context.requestLoaders = createRequestLoaders((requestIds) =>
        this.readService.getAuditsByRequestIds(requestIds),
      );
    }

    return context.requestLoaders.requestAudits.load(request.id) as any;
  }
}
