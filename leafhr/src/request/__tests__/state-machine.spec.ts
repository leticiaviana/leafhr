import { validateTransition, getNextApprovalStatus } from '../state-machine';
import { RequestStatus, Role } from '../../shared/types';
import { InvalidTransitionError, NotAuthorizedTransitionError } from '../../shared/exceptions';

describe('State Machine', () => {
  describe('validateTransition', () => {
    it('allows manager to approve PENDING_MANAGER → PENDING_HR', () => {
      expect(() =>
        validateTransition(RequestStatus.PENDING_MANAGER, RequestStatus.PENDING_HCM_CONFIRMATION, Role.MANAGER),
      ).not.toThrow();
    });

    it('allows manager to reject PENDING_MANAGER → REJECTED', () => {
      expect(() =>
        validateTransition(RequestStatus.PENDING_MANAGER, RequestStatus.REJECTED, Role.MANAGER),
      ).not.toThrow();
    });

    it('allows SYSTEM to confirm PENDING_HCM_CONFIRMATION → APPROVED', () => {
      expect(() =>
        validateTransition(RequestStatus.PENDING_HCM_CONFIRMATION, RequestStatus.APPROVED, Role.SYSTEM),
      ).not.toThrow();
    });

    it('allows system to mark PENDING_HCM_CONFIRMATION → BALANCE_ERROR (HCM rejects)', () => {
      expect(() =>
        validateTransition(RequestStatus.PENDING_HCM_CONFIRMATION, RequestStatus.BALANCE_ERROR, Role.SYSTEM),
      ).not.toThrow();
    });

    it('allows employee to cancel PENDING_MANAGER → CANCELLED', () => {
      expect(() =>
        validateTransition(RequestStatus.PENDING_MANAGER, RequestStatus.CANCELLED, Role.EMPLOYEE),
      ).not.toThrow();
    });

    it('allows employee to cancel APPROVED → CANCELLED', () => {
      expect(() =>
        validateTransition(RequestStatus.APPROVED, RequestStatus.CANCELLED, Role.EMPLOYEE),
      ).not.toThrow();
    });

    it('throws InvalidTransitionError for REJECTED → APPROVED', () => {
      expect(() =>
        validateTransition(RequestStatus.REJECTED, RequestStatus.APPROVED, Role.SYSTEM),
      ).toThrow(InvalidTransitionError);
    });

    it('throws InvalidTransitionError for CANCELLED → PENDING_MANAGER', () => {
      expect(() =>
        validateTransition(RequestStatus.CANCELLED, RequestStatus.PENDING_MANAGER, Role.EMPLOYEE),
      ).toThrow(InvalidTransitionError);
    });

    it('throws NotAuthorizedTransitionError when employee tries to approve', () => {
      expect(() =>
        validateTransition(RequestStatus.PENDING_MANAGER, RequestStatus.PENDING_HCM_CONFIRMATION, Role.EMPLOYEE),
      ).toThrow(NotAuthorizedTransitionError);
    });

    it('throws NotAuthorizedTransitionError when manager tries HR approval', () => {
      expect(() =>
        validateTransition(RequestStatus.PENDING_HCM_CONFIRMATION, RequestStatus.APPROVED, Role.MANAGER),
      ).toThrow(NotAuthorizedTransitionError);
    });
  });

  describe('getNextApprovalStatus', () => {
    it('returns PENDING_HR for PENDING_MANAGER', () => {
      expect(getNextApprovalStatus(RequestStatus.PENDING_MANAGER)).toBe(RequestStatus.PENDING_HCM_CONFIRMATION);
    });

    it('returns APPROVED for PENDING_HR', () => {
      expect(getNextApprovalStatus(RequestStatus.PENDING_HCM_CONFIRMATION)).toBe(RequestStatus.APPROVED);
    });

    it('returns null for APPROVED', () => {
      expect(getNextApprovalStatus(RequestStatus.APPROVED)).toBeNull();
    });

    it('returns null for REJECTED', () => {
      expect(getNextApprovalStatus(RequestStatus.REJECTED)).toBeNull();
    });
  });
});
