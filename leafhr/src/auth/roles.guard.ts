import { Injectable, CanActivate, ExecutionContext, Optional } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Role } from '../shared/types';
import { IActor } from '../shared/interfaces';
import { ForbiddenError } from '../shared/exceptions';
import { UserReadService } from '../user';

export const ROLES_KEY = 'roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Optional()
    private userService?: UserReadService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const ctx = GqlExecutionContext.create(context);
    const user = ctx.getContext().req.user as IActor;

    if (!user) {
      throw new ForbiddenError('access resource', 'no authenticated user');
    }

    // Try DB-based role check first, fall back to JWT role
    if (this.userService) {
      const hasRole = await this.userService.hasAnyRole(
        user.sub,
        requiredRoles,
        user.locationId,
      );
      if (hasRole) {
        return true;
      }
    }

    // Fallback: check the role from JWT
    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenError(
        'access resource',
        `role ${user.role} is not in [${requiredRoles.join(', ')}]`,
      );
    }

    return true;
  }
}
