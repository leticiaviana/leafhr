import {
  BaseError,
  InsufficientBalanceError,
  OverlapConflictError,
  RequestStateConflictError,
  NotFoundError,
  ForbiddenError,
  HcmUnavailableError,
  InvalidDateRangeError,
  InvalidLeaveTypeError,
  UnauthenticatedError,
  OptimisticLockError,
  PendingDaysNegativeError,
} from '../../exceptions';

describe('Exception Hierarchy', () => {
  describe('BaseError', () => {
    it('should carry code, httpStatus, and details', () => {
      const err = new BaseError('test', 'TEST_CODE', 418, { key: 'val' });
      expect(err.message).toBe('test');
      expect(err.code).toBe('TEST_CODE');
      expect(err.httpStatus).toBe(418);
      expect(err.details).toEqual({ key: 'val' });
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(BaseError);
    });

    it('should default to 400 and empty details', () => {
      const err = new BaseError('test', 'CODE');
      expect(err.httpStatus).toBe(400);
      expect(err.details).toEqual({});
    });
  });

  describe('InsufficientBalanceError', () => {
    it('should set correct code and include balance details', () => {
      const err = new InsufficientBalanceError(5, 10, 'vacation');
      expect(err.code).toBe('INSUFFICIENT_BALANCE');
      expect(err.httpStatus).toBe(422);
      expect(err.details).toEqual({ available: 5, requested: 10, leaveType: 'vacation' });
      expect(err).toBeInstanceOf(BaseError);
    });
  });

  describe('OverlapConflictError', () => {
    it('should set correct code', () => {
      const err = new OverlapConflictError('req-1', '2025-01-01', '2025-01-05');
      expect(err.code).toBe('OVERLAP_CONFLICT');
      expect(err.httpStatus).toBe(409);
    });
  });

  describe('RequestStateConflictError', () => {
    it('should include request context', () => {
      const err = new RequestStateConflictError('req-1', 'cancelled', 'approve');
      expect(err.code).toBe('REQUEST_STATE_CONFLICT');
      expect(err.details).toEqual({ requestId: 'req-1', currentStatus: 'cancelled', action: 'approve' });
    });
  });

  describe('NotFoundError', () => {
    it('should format entity name and id', () => {
      const err = new NotFoundError('Balance', 'bal-1');
      expect(err.code).toBe('NOT_FOUND');
      expect(err.httpStatus).toBe(404);
      expect(err.message).toContain('Balance');
    });
  });

  describe('ForbiddenError', () => {
    it('should include action and reason', () => {
      const err = new ForbiddenError('approve', 'not a manager');
      expect(err.code).toBe('FORBIDDEN');
      expect(err.httpStatus).toBe(403);
    });
  });

  describe('HcmUnavailableError', () => {
    it('should default to 503', () => {
      const err = new HcmUnavailableError();
      expect(err.code).toBe('HCM_UNAVAILABLE');
      expect(err.httpStatus).toBe(503);
    });
  });

  describe('InvalidDateRangeError', () => {
    it('should include dates in details', () => {
      const err = new InvalidDateRangeError('2025-01-10', '2025-01-05');
      expect(err.code).toBe('INVALID_DATE_RANGE');
      expect(err.details).toEqual({ startDate: '2025-01-10', endDate: '2025-01-05' });
    });
  });

  describe('InvalidLeaveTypeError', () => {
    it('should include the invalid leave type', () => {
      const err = new InvalidLeaveTypeError('sabbatical');
      expect(err.code).toBe('INVALID_LEAVE_TYPE');
    });
  });

  describe('UnauthenticatedError', () => {
    it('should default to 401', () => {
      const err = new UnauthenticatedError();
      expect(err.code).toBe('UNAUTHENTICATED');
      expect(err.httpStatus).toBe(401);
    });
  });

  describe('OptimisticLockError', () => {
    it('should be 409', () => {
      const err = new OptimisticLockError('Balance', 'bal-1');
      expect(err.code).toBe('OPTIMISTIC_LOCK');
      expect(err.httpStatus).toBe(409);
    });
  });

  describe('PendingDaysNegativeError', () => {
    it('should be 422', () => {
      const err = new PendingDaysNegativeError('emp-1', 'vacation', -3);
      expect(err.code).toBe('PENDING_DAYS_NEGATIVE');
      expect(err.httpStatus).toBe(422);
    });
  });
});
