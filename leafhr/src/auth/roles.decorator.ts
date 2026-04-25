import { SetMetadata } from '@nestjs/common';
import { Role } from '../shared/types';
import { ROLES_KEY } from './roles.guard';

/**
 * Decorator to restrict access to specific roles.
 * Usage: @Roles(Role.MANAGER)
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
