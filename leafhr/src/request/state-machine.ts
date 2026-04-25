import { RequestStatus, Role } from '../shared/types';
import { InvalidTransitionError, NotAuthorizedTransitionError } from '../shared/exceptions';

interface Transition {
  from: RequestStatus;
  to: RequestStatus;
  allowedRoles: Role[];
}

/**
 * State machine for time-off request workflow:
 *
 * PENDING_MANAGER → PENDING_HCM_CONFIRMATION (manager approves, system validates with HCM)
 * PENDING_MANAGER → REJECTED                  (manager rejects)
 * PENDING_HCM_CONFIRMATION → APPROVED        (HCM filing succeeded)
 * PENDING_HCM_CONFIRMATION → BALANCE_ERROR   (HCM filing failed - insufficient balance)
 * PENDING_MANAGER → CANCELLED                (employee cancels)
 * PENDING_HCM_CONFIRMATION → CANCELLED       (employee cancels)
 * APPROVED → CANCELLED                       (employee cancels before start)
 * PENDING_MANAGER → BALANCE_STALE            (sync detects insufficient balance)
 * PENDING_HCM_CONFIRMATION → BALANCE_STALE   (sync detects insufficient balance)
 * BALANCE_STALE → CANCELLED                  (employee cancels stale request)
 * BALANCE_STALE → PENDING_MANAGER            (employee resubmits with new balance)
 * BALANCE_ERROR → CANCELLED                  (employee cancels errored request)
 * BALANCE_ERROR → PENDING_MANAGER            (employee resubmits after comp)
 */
const transitions: Transition[] = [
  { from: RequestStatus.PENDING_MANAGER, to: RequestStatus.PENDING_HCM_CONFIRMATION, allowedRoles: [Role.MANAGER] },
  { from: RequestStatus.PENDING_MANAGER, to: RequestStatus.REJECTED, allowedRoles: [Role.MANAGER] },
  { from: RequestStatus.PENDING_HCM_CONFIRMATION, to: RequestStatus.APPROVED, allowedRoles: [Role.SYSTEM] },
  { from: RequestStatus.PENDING_HCM_CONFIRMATION, to: RequestStatus.BALANCE_ERROR, allowedRoles: [Role.SYSTEM] },
  { from: RequestStatus.PENDING_MANAGER, to: RequestStatus.CANCELLED, allowedRoles: [Role.EMPLOYEE] },
  { from: RequestStatus.PENDING_HCM_CONFIRMATION, to: RequestStatus.CANCELLED, allowedRoles: [Role.EMPLOYEE] },
  { from: RequestStatus.APPROVED, to: RequestStatus.CANCELLED, allowedRoles: [Role.EMPLOYEE, Role.MANAGER] },
  { from: RequestStatus.PENDING_MANAGER, to: RequestStatus.BALANCE_STALE, allowedRoles: [Role.SYSTEM] },
  { from: RequestStatus.PENDING_HCM_CONFIRMATION, to: RequestStatus.BALANCE_STALE, allowedRoles: [Role.SYSTEM] },
  { from: RequestStatus.APPROVED, to: RequestStatus.BALANCE_ERROR, allowedRoles: [Role.SYSTEM] },
  { from: RequestStatus.BALANCE_STALE, to: RequestStatus.CANCELLED, allowedRoles: [Role.EMPLOYEE] },
  { from: RequestStatus.BALANCE_STALE, to: RequestStatus.PENDING_MANAGER, allowedRoles: [Role.EMPLOYEE] },
  { from: RequestStatus.BALANCE_ERROR, to: RequestStatus.CANCELLED, allowedRoles: [Role.EMPLOYEE] },
  { from: RequestStatus.BALANCE_ERROR, to: RequestStatus.PENDING_MANAGER, allowedRoles: [Role.EMPLOYEE] },
];

export function validateTransition(
  from: RequestStatus,
  to: RequestStatus,
  actorRole: Role,
): void {
  const transition = transitions.find((t) => t.from === from && t.to === to);

  if (!transition) {
    throw new InvalidTransitionError(from, to);
  }

  if (!transition.allowedRoles.includes(actorRole)) {
    throw new NotAuthorizedTransitionError(actorRole, from, to);
  }
}

export function getNextApprovalStatus(current: RequestStatus): RequestStatus | null {
  if (current === RequestStatus.PENDING_MANAGER) return RequestStatus.PENDING_HCM_CONFIRMATION;
  if (current === RequestStatus.PENDING_HCM_CONFIRMATION) return RequestStatus.APPROVED;
  return null;
}
