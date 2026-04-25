import { Test, TestingModule } from '@nestjs/testing';
import { SyncService } from '../sync.service';
import { BalanceReadService, BalanceWriteService } from '../../balance';
import {
  RequestReadRepository,
  RequestWriteRepository,
} from '../../request';
import { HcmClient, HCM_CLIENT_TOKEN } from '../../hcm';
import { RequestStatus, LeaveType, BalanceSource, Role } from '../../shared/types';
import { BalanceEntity } from '../../balance/entities/balance.entity';
import { TimeOffRequestEntity } from '../../request/entities';

function makeHcmBalance(overrides: Partial<any> = {}) {
  return {
    employeeId: 'emp-1',
    locationId: 'loc-1',
    leaveType: LeaveType.PTO,
    totalEntitled: 20,
    available: 20,
    year: new Date().getFullYear(),
    unit: 'days',
    etag: 'etag-1',
    ...overrides,
  };
}

function makeRequest(overrides: Partial<TimeOffRequestEntity> = {}): TimeOffRequestEntity {
  const req = new TimeOffRequestEntity();
  Object.assign(req, {
    id: 'req-1',
    employeeId: 'emp-1',
    locationId: 'loc-1',
    leaveType: LeaveType.PTO,
    year: new Date().getFullYear(),
    totalDays: 5,
    status: RequestStatus.PENDING_MANAGER,
    startDate: '2025-08-01',
    endDate: '2025-08-05',
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
    ...overrides,
  });
  return req;
}

function makeBalance(overrides: Partial<BalanceEntity> = {}): BalanceEntity {
  const b = new BalanceEntity();
  Object.assign(b, {
    id: 'bal-1',
    employeeId: 'emp-1',
    locationId: 'loc-1',
    leaveType: LeaveType.PTO,
    year: new Date().getFullYear(),
    totalEntitled: 20,
    pending: 5,
    used: 0,
    source: BalanceSource.HCM_SYNC,
    version: 1,
    ...overrides,
  });
  return b;
}

describe('SyncService', () => {
  let service: SyncService;
  let hcmClient: jest.Mocked<HcmClient>;
  let balanceReadService: jest.Mocked<BalanceReadService>;
  let balanceWriteService: jest.Mocked<BalanceWriteService>;
  let requestReadRepo: jest.Mocked<RequestReadRepository>;
  let requestWriteRepo: jest.Mocked<RequestWriteRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        {
          provide: HCM_CLIENT_TOKEN,
          useValue: { getBatchBalances: jest.fn() },
        },
        {
          provide: BalanceReadService,
          useValue: { getBalance: jest.fn() },
        },
        {
          provide: BalanceWriteService,
          useValue: {
            setEntitlement: jest.fn(),
            releaseDays: jest.fn(),
          },
        },
        {
          provide: RequestReadRepository,
          useValue: {
            findPendingByEmployee: jest.fn().mockResolvedValue([]),
            findEmployeeIdsWithPending: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: RequestWriteRepository,
          useValue: {
            saveRequest: jest.fn(),
            addAudit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(SyncService);
    hcmClient = module.get(HCM_CLIENT_TOKEN);
    balanceReadService = module.get(BalanceReadService);
    balanceWriteService = module.get(BalanceWriteService);
    requestReadRepo = module.get(RequestReadRepository);
    requestWriteRepo = module.get(RequestWriteRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('triggerSync', () => {
    it('should sync balances from HCM and report completed', async () => {
      const hcmBalances = [
        makeHcmBalance({ employeeId: 'emp-1', available: 20 }),
        makeHcmBalance({ employeeId: 'emp-2', available: 15 }),
      ];
      hcmClient.getBatchBalances.mockResolvedValue(hcmBalances);
      balanceWriteService.setEntitlement.mockResolvedValue(makeBalance());
      requestReadRepo.findPendingByEmployee.mockResolvedValue([]);

      const result = await service.triggerSync();

      expect(result.status).toBe('completed');
      expect(result.recordsSynced).toBe(2);
      expect(result.staleRequests).toBe(0);
      expect(balanceWriteService.setEntitlement).toHaveBeenCalledTimes(2);
    });

    it('should mark a pending request as BALANCE_STALE when balance is insufficient', async () => {
      const hcmBalances = [makeHcmBalance({ employeeId: 'emp-1', totalEntitled: 3, available: 3 })];
      hcmClient.getBatchBalances.mockResolvedValue(hcmBalances);
      balanceWriteService.setEntitlement.mockResolvedValue(makeBalance());

      const pendingReq = makeRequest({ totalDays: 5 });
      requestReadRepo.findPendingByEmployee.mockResolvedValue([pendingReq]);

      const balanceEntity = makeBalance({ totalEntitled: 5, pending: 2, used: 2 });
      balanceReadService.getBalance.mockResolvedValue(balanceEntity);
      balanceWriteService.releaseDays.mockResolvedValue(balanceEntity);
      requestWriteRepo.saveRequest.mockResolvedValue(pendingReq);
      requestWriteRepo.addAudit.mockResolvedValue({} as any);

      const result = await service.triggerSync();

      expect(result.staleRequests).toBe(1);
      expect(pendingReq.status).toBe(RequestStatus.BALANCE_STALE);
      expect(requestWriteRepo.saveRequest).toHaveBeenCalled();
      expect(requestWriteRepo.addAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          toStatus: RequestStatus.BALANCE_STALE,
          actorId: 'system',
          actorRole: Role.SYSTEM,
        }),
      );
    });

    it('should NOT mark a request stale if balance is sufficient', async () => {
      const hcmBalances = [makeHcmBalance({ employeeId: 'emp-1', available: 20 })];
      hcmClient.getBatchBalances.mockResolvedValue(hcmBalances);
      balanceWriteService.setEntitlement.mockResolvedValue(makeBalance());

      const pendingReq = makeRequest({ totalDays: 5 });
      requestReadRepo.findPendingByEmployee.mockResolvedValue([pendingReq]);

      balanceReadService.getBalance.mockResolvedValue(
        makeBalance({ totalEntitled: 20, pending: 5, used: 0 }),
      );

      const result = await service.triggerSync();

      expect(result.staleRequests).toBe(0);
      expect(pendingReq.status).toBe(RequestStatus.PENDING_MANAGER);
    });

    it('should return failed if HCM errors before any records synced', async () => {
      hcmClient.getBatchBalances.mockRejectedValue(new Error('HCM down'));

      const result = await service.triggerSync();

      expect(result.status).toBe('failed');
      expect(result.recordsSynced).toBe(0);
    });

    it('should handle releaseDays failure gracefully and continue', async () => {
      const hcmBalances = [makeHcmBalance({ employeeId: 'emp-1', totalEntitled: 2, available: 2 })];
      hcmClient.getBatchBalances.mockResolvedValue(hcmBalances);
      balanceWriteService.setEntitlement.mockResolvedValue(makeBalance());

      const pendingReq = makeRequest({ totalDays: 5 });
      requestReadRepo.findPendingByEmployee.mockResolvedValue([pendingReq]);

      balanceReadService.getBalance.mockResolvedValue(
        makeBalance({ totalEntitled: 2, pending: 0, used: 0 }),
      );
      balanceWriteService.releaseDays.mockRejectedValue(new Error('PendingDaysNegative'));
      requestWriteRepo.saveRequest.mockResolvedValue(pendingReq);
      requestWriteRepo.addAudit.mockResolvedValue({} as any);

      const result = await service.triggerSync();

      expect(result.status).toBe('completed');
      expect(result.staleRequests).toBe(1);
    });

    it('should deduplicate employee IDs for revalidation', async () => {
      const hcmBalances = [
        makeHcmBalance({ employeeId: 'emp-1', leaveType: LeaveType.PTO }),
        makeHcmBalance({ employeeId: 'emp-1', leaveType: LeaveType.SICK }),
      ];
      hcmClient.getBatchBalances.mockResolvedValue(hcmBalances);
      balanceWriteService.setEntitlement.mockResolvedValue(makeBalance());
      requestReadRepo.findPendingByEmployee.mockResolvedValue([]);

      await service.triggerSync();

      expect(requestReadRepo.findPendingByEmployee).toHaveBeenCalledTimes(1);
      expect(requestReadRepo.findPendingByEmployee).toHaveBeenCalledWith('emp-1');
    });
  });
});
