import { Injectable } from '@nestjs/common';
import { IActor } from '../interfaces';
import { Role } from '../types';
import { ForbiddenError, NotFoundError } from '../exceptions';
import { DEFAULT_LOCATION_ID } from '../../location';

/**
 * ScopeValidationService
 *
 * Centralizes RBAC and scope validation logic for:
 * - Location scoping (non-HR limited to their location)
 * - Manager scope validation (manager can only access their subordinates)
 * - IDOR protection across all endpoints
 *
 * Reference: HC-02 (Identity via JWT), SC-06 (IDOR protection), Tópico 3
 */
@Injectable()
export class ScopeValidationService {
  /**
   * Resolve and validate locationId based on actor permissions.
   * All roles are limited to their own locationId.
   *
   * Throws ForbiddenError if actor tries to access outside their scope.
   */
  resolveLocationOrThrow(actor: IActor, requestedLocationId?: string): string {
    const actorLocation = actor.locationId ?? DEFAULT_LOCATION_ID;
    if (requestedLocationId && requestedLocationId !== actorLocation) {
      throw new ForbiddenError(
        'access resource',
        `location ${requestedLocationId} is outside actor scope ${actorLocation}`,
      );
    }

    return actorLocation;
  }

  /**
   * Validate that actor has access to a specific resource in a specific location
   * Used for IDOR protection when accessing existing resources
   *
   * - EMPLOYEE: can only access their own resources OR resources in their location
   * - MANAGER: depends on canManageByResourceOwnerId or reportIds + location
   *
   * @param actor The authenticated user
   * @param resourceLocationId The location of the resource being accessed
   * @param resourceOwnerId The employee ID who owns the resource (for EMPLOYEE role)
   * @param resourceManagerId The manager ID associated with the resource (for MANAGER validation)
   * @param reportIds The employee IDs this manager is responsible for (auto from actor.reportIds)
   * @throws ForbiddenError if actor doesn't have permission
   * @throws NotFoundError as 403 -> 404 obscuring (for employees accessing cross-user resources)
   */
  validateResourceAccess(
    actor: IActor,
    resourceLocationId: string,
    resourceOwnerId?: string,
    resourceManagerId?: string,
    reportIds?: string[],
  ): void {
    const actorLocationId = actor.locationId ?? DEFAULT_LOCATION_ID;

    // All roles must be in the same location
    if (resourceLocationId !== actorLocationId) {
      throw new ForbiddenError(
        'access resource',
        `resource location ${resourceLocationId} is outside actor scope ${actorLocationId}`,
      );
    }

    // EMPLOYEE: can only access their own resources
    if (actor.role === Role.EMPLOYEE) {
      if (resourceOwnerId !== actor.sub) {
        // Return NotFoundError instead of ForbiddenError to avoid leaking information
        // Reference: SC-06 - errors must not detail resources
        throw new NotFoundError('Resource', 'unknown');
      }
      return;
    }

    // MANAGER: can access if they directly manage or if employee is in reportIds
    if (actor.role === Role.MANAGER) {
      const canManageByManagerId = resourceManagerId === actor.sub;
      const canManageByReportIds = (reportIds ?? []).includes(resourceOwnerId ?? '');

      if (!canManageByManagerId && !canManageByReportIds) {
        throw new ForbiddenError(
          'access resource',
          `resource is not in manager scope`,
        );
      }
      return;
    }
  }

  /**
   * Check if actor can perform cancellation on a resource in a specific state
   *
   * - EMPLOYEE: can cancel their own requests in allowed states
   * - MANAGER: can cancel subordinate requests in allowed states
   *
   * Reference: HC-02 (Identity via JWT), Tópico 3
   */
  validateCancellationAccess(
    actor: IActor,
    resourceLocationId: string,
    resourceOwnerId: string,
    resourceManagerId?: string,
  ): void {
    const actorLocationId = actor.locationId ?? DEFAULT_LOCATION_ID;

    // All roles must be in the same location
    if (resourceLocationId !== actorLocationId) {
      throw new ForbiddenError(
        'cancel resource',
        `resource location ${resourceLocationId} is outside actor scope ${actorLocationId}`,
      );
    }

    // EMPLOYEE: can only cancel their own
    if (actor.role === Role.EMPLOYEE) {
      if (resourceOwnerId !== actor.sub) {
        throw new NotFoundError('Resource', 'unknown');
      }
      return;
    }

    // MANAGER: can only cancel subordinates
    if (actor.role === Role.MANAGER) {
      const canManageByManagerId = resourceManagerId === actor.sub;
      const canManageByReportIds = (actor.reportIds ?? []).includes(resourceOwnerId);

      if (!canManageByManagerId && !canManageByReportIds) {
        throw new ForbiddenError(
          'cancel resource',
          `resource is not in manager scope`,
        );
      }
      return;
    }
  }

  /**
   * Extract locationId from GraphQL args with validation
   * Useful for resolvers that receive locationId as argument
   *
   * @param actor The authenticated user
   * @param args GraphQL args object
   * @param fieldName Name of the field containing locationId (default: 'locationId')
   * @returns The validated locationId
   */
  extractLocationFromArgs(
    actor: IActor,
    args: Record<string, any>,
    fieldName: string = 'locationId',
  ): string {
    const requestedLocationId = args?.[fieldName];
    return this.resolveLocationOrThrow(actor, requestedLocationId);
  }
}
