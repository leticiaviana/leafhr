import { RequestWriteService } from '../request.write.service';
import { RequestReadRepository } from '../request.read.repository';
import { RequestWriteRepository } from '../request.write.repository';
import { BalanceWriteService, BalanceReadRepository } from '../../balance';
import { LocationService } from '../../location';
import { HcmClient } from '../../hcm';
import { TimeOffRequestEntity } from '../entities';
import { LeaveType, RequestStatus, Role } from '../../shared/types';
import { IActor } from '../../shared/interfaces';
import {
  DateRangeError,
  InvalidTransitionError,
  NotAuthorizedTransitionError,
} from '../../shared/exceptions';

const employee: IActor = {
  sub: 'emp-1',
  email: 'emp@example.com',
  role: Role.EMPLOYEE,
  locationId: 'loc-1',
  managerId: 'mgr-1',
  tenantId: 'ten-1',
};

const manager: IActor = {
  sub: 'mgr-1',
  email: 'mgr@example.com',
  role: Role.MANAGER,
  locationId: 'loc-1',
  reportIds: ['emp-1'],
  tenantId: 'ten-1',
};


function makeRequest(overrides: Partial<TimeOffRequestEntity> = {}): TimeOffRequestEntity {
  const r = new TimeOffRequestEntity();
  r.id = 'req-1';
  r.employeeId = 'emp-1';
  r.locationId = 'loc-1';
  r.leaveType = LeaveType.PTO;
  r.startDate = '2025-08-04';
  r.endDate = '2025-08-08';
  r.startDateTimestamp = new Date('2025-08-04').getTime();
  r.endDateTimestamp = new Date('2025-08-08').getTime();
  r.totalDays = 5;
  r.status = RequestStatus.PENDING_MANAGER;
  r.managerId = 'mgr-1';
  r.year = 2025;
  r.version = 1;
  r.createdAt = new Date();
  r.updatedAt = new Date();
  Object.assign(r, overrides);
  return r;
}

describe('RequestWriteService', () => {
  let service: RequestWriteService;
  let readRepo: jest.Mocked<RequestReadRepository>;
  let writeRepo: jest.Mocked<RequestWriteRepository>;
  let balanceWriteService: jest.Mocked<BalanceWriteService>;
  let locationService: jest.Mocked<LocationService>;
  let hcmClient: jest.Mocked<HcmClient>;
  let balanceReadRepo: jest.Mocked<BalanceReadRepository>;

  beforeEach(() => {
    readRepo = {
      findByIdOrFail: jest.fn(),
      findByEmployee: jest.fn().mockResolvedValue([]),
    } as any;

    balanceReadRepo = {
      findOneByScope: jest.fn().mockResolvedValue({ id: 'b-1' } as any),
    } as any;

    writeRepo = {
      createRequest: jest.fn(),
      saveRequest: jest.fn(),
      addAudit: jest.fn(),
    } as any;

    balanceWriteService = {
      reserveDays: jest.fn(),
      confirmDays: jest.fn(),
      releaseDays: jest.fn(),
    } as any;

    locationService = {
      getGracefulTimeMinutes: jest.fn().mockResolvedValue(0),
      ensureDefaultLocation: jest.fn(),
    } as any;

    hcmClient = {
      getBalance: jest.fn().mockResolvedValue({
        employeeId: 'emp-1',
        locationId: 'loc-1',
        leaveType: LeaveType.PTO,
        totalEntitled: 20,
        available: 20,
        year: 2025,
        unit: 'days',
        etag: 'e1',
      }),
      fileTimeOff: jest.fn().mockResolvedValue({
        accepted: true,
        hcmReferenceId: 'hcm-ref-1',
      }),
      getBatchBalances: jest.fn(),
      healthCheck: jest.fn(),
    } as any;

    service = new RequestWriteService(
      readRepo,
      writeRepo,
      balanceWriteService,
      balanceReadRepo,
      locationService,
      hcmClient,
    );
  });

  describe('submit', () => {
    it('creates request with correct fields and reserves days', async () => {
      const created = makeRequest();
      writeRepo.createRequest.mockResolvedValue(created);
      writeRepo.addAudit.mockResolvedValue({} as any);
      balanceWriteService.reserveDays.mockResolvedValue({} as any);

      const result = await service.submit(employee, {
        leaveType: LeaveType.PTO,
        startDate: '2025-08-04',
        endDate: '2025-08-08',
        reason: 'Vacation',
      });

      expect(balanceWriteService.reserveDays).toHaveBeenCalledWith(
        'emp-1', LeaveType.PTO, 2025, 5, 'loc-1',
      );
      expect(writeRepo.createRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: 'emp-1',
          locationId: 'loc-1',
          leaveType: LeaveType.PTO,
          totalDays: 5,
          status: RequestStatus.PENDING_MANAGER,
          managerId: 'mgr-1',
        }),
      );
      expect(result.id).toBe('req-1');
    });

    it('throws DateRangeError for invalid date range', async () => {
      await expect(
        service.submit(employee, {
          leaveType: LeaveType.PTO,
          startDate: '2025-08-08',
          endDate: '2025-08-04',
        }),
      ).rejects.toThrow(DateRangeError);
    });
  });

  describe('transition', () => {
    it('manager approval drives PENDING_HCM_CONFIRMATION → APPROVED automatically (system files with HCM)', async () => {
      const request = makeRequest({ status: RequestStatus.PENDING_MANAGER });
      readRepo.findByIdOrFail.mockResolvedValue(request);
      writeRepo.saveRequest.mockImplementation(async (r) => r);
      writeRepo.addAudit.mockResolvedValue({} as any);
      balanceWriteService.confirmDays.mockResolvedValue({} as any);

      const result = await service.transition(
        manager, 'req-1', RequestStatus.PENDING_HCM_CONFIRMATION, 'Looks good',
      );

      expect(hcmClient.fileTimeOff).toHaveBeenCalled();
      expect(result.status).toBe(RequestStatus.APPROVED);
      expect(balanceWriteService.confirmDays).toHaveBeenCalledWith(
        'emp-1', LeaveType.PTO, 2025, 5, 'loc-1',
      );
      const auditStatuses = writeRepo.addAudit.mock.calls.map(
        (call) => (call[0] as any).toStatus,
      );
      expect(auditStatuses).toContain(RequestStatus.PENDING_HCM_CONFIRMATION);
      expect(auditStatuses).toContain(RequestStatus.APPROVED);
    });

    it('manager approval falls into BALANCE_ERROR when HCM rejects filing', async () => {
      const request = makeRequest({ status: RequestStatus.PENDING_MANAGER });
      readRepo.findByIdOrFail.mockResolvedValue(request);
      writeRepo.saveRequest.mockImplementation(async (r) => r);
      writeRepo.addAudit.mockResolvedValue({} as any);
      balanceWriteService.releaseDays.mockResolvedValue({} as any);
      hcmClient.fileTimeOff.mockResolvedValue({
        accepted: false,
        reason: 'INSUFFICIENT_BALANCE',
      });

      const result = await service.transition(
        manager, 'req-1', RequestStatus.PENDING_HCM_CONFIRMATION,
      );

      expect(result.status).toBe(RequestStatus.BALANCE_ERROR);
      expect(balanceWriteService.releaseDays).toHaveBeenCalled();
    });

    it('manager rejects → REJECTED and releases days', async () => {
      const request = makeRequest({ status: RequestStatus.PENDING_MANAGER });
      readRepo.findByIdOrFail.mockResolvedValue(request);
      writeRepo.saveRequest.mockImplementation(async (r) => r);
      writeRepo.addAudit.mockResolvedValue({} as any);
      balanceWriteService.releaseDays.mockResolvedValue({} as any);

      const result = await service.transition(
        manager, 'req-1', RequestStatus.REJECTED, 'Denied',
      );

      expect(result.status).toBe(RequestStatus.REJECTED);
      expect(balanceWriteService.releaseDays).toHaveBeenCalledWith(
        'emp-1', LeaveType.PTO, 2025, 5, 'loc-1',
      );
    });

    it('employee cancels own pending request → archivedAt is set', async () => {
      const request = makeRequest({ status: RequestStatus.PENDING_MANAGER });
      readRepo.findByIdOrFail.mockResolvedValue(request);
      writeRepo.saveRequest.mockImplementation(async (r) => r);
      writeRepo.addAudit.mockResolvedValue({} as any);
      balanceWriteService.releaseDays.mockResolvedValue({} as any);

      const result = await service.transition(
        employee, 'req-1', RequestStatus.CANCELLED,
      );

      expect(result.status).toBe(RequestStatus.CANCELLED);
      expect(result.archivedAt).toBeInstanceOf(Date);
    });

    it('throws InvalidTransitionError for invalid transition', async () => {
      const request = makeRequest({ status: RequestStatus.REJECTED });
      readRepo.findByIdOrFail.mockResolvedValue(request);

      await expect(
        service.transition(manager, 'req-1', RequestStatus.PENDING_HCM_CONFIRMATION),
      ).rejects.toThrow(InvalidTransitionError);
    });

    it('throws NotAuthorizedTransitionError when employee tries to approve', async () => {
      const request = makeRequest({ status: RequestStatus.PENDING_MANAGER });
      readRepo.findByIdOrFail.mockResolvedValue(request);

      await expect(
        service.transition(employee, 'req-1', RequestStatus.PENDING_HCM_CONFIRMATION),
      ).rejects.toThrow(NotAuthorizedTransitionError);
    });
  });
});
