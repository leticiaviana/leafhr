import { TimeOffRequestStatus, UserRole, BalanceSource, Unit } from '../enums';

/**
 * JWT claims payload
 * Reference: TRD §5.2
 */
export interface JwtPayload {
  /** Employee ID (unique identifier from auth system) */
  sub: string;

  /** Employee's role */
  role: UserRole;

  /** Primary location ID for employee */
  locationId: string;

  /** Manager ID (if employee reports to someone) */
  managerId?: string;

  /** List of direct report IDs (if employee is manager) */
  reportIds?: string[];

  /** Token issued at */
  iat: number;

  /** Token expiration */
  exp: number;
}

/**
 * Actor context extracted from JWT
 * Used in RBAC checks and audit trail
 */
export interface ActorContext {
  id: string;
  role: UserRole;
  locationId: string;
  managerId?: string;
  reportIds?: string[];
}

/**
 * Balance aggregate (entity)
 * Reference: TRD §10.1
 */
export interface IBalance {
  id: string;
  employeeId: string;
  locationId: string;
  hcmBalance: number;
  pendingDays: number;
  lastSyncedAt: Date;
  version: number; // Optimistic locking
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Time-off request aggregate
 * Reference: TRD §10.2
 */
export interface ITimeOffRequest {
  id: string;
  employeeId: string;
  locationId: string;
  startDate: string; // ISO format YYYY-MM-DD
  endDate: string; // ISO format YYYY-MM-DD
  computedDays: number;
  notes?: string;
  status: TimeOffRequestStatus;
  idempotencyKey: string;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Audit trail entry for request state transitions
 * Reference: FR-R11, TRD §10.3
 */
export interface IRequestAudit {
  id: string;
  requestId: string;
  fromStatus: TimeOffRequestStatus;
  toStatus: TimeOffRequestStatus;
  actorId: string;
  actorRole: UserRole;
  reason?: string;
  createdAt: Date;
}

/**
 * User entity
 * Reference: TRD §5.2 (RBAC foundation)
 */
export interface IUser {
  id: string;
  externalId: string; // ID from auth system
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User-Role assignment per location
 * Reference: TRD §5.2 (RBAC with location scoping)
 */
export interface IUserRole {
  id: string;
  userId: string;
  locationId: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Response payload for balance queries
 * Includes source indication for staleness awareness
 */
export interface BalancePayload {
  hcmBalance: number;
  pendingDays: number;
  effective: number; // hcmBalance - pendingDays
  unit: Unit;
  lastSyncedAt: Date;
  source: BalanceSource;
}

/**
 * Response payload for time-off request
 */
export interface TimeOffRequestPayload {
  id: string;
  employeeId: string;
  locationId: string;
  startDate: string;
  endDate: string;
  computedDays: number;
  notes?: string;
  status: TimeOffRequestStatus;
  idempotencyKey: string;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * HCM balance from external system
 * Used in sync and real-time queries
 */
export interface HCMBalance {
  employeeId: string;
  locationId: string;
  available: number; // VACATION, SICK_LEAVE, etc — for this exercise, normalized to "available"
  unit: string;
  lastUpdatedAt: Date;
}
