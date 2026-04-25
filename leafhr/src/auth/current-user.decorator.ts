import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { IActor } from '../shared/interfaces';

/**
 * Parameter decorator to extract the authenticated user from GraphQL context.
 * Usage: @CurrentUser() actor: IActor
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): IActor => {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req.user;
  },
);
