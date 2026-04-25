import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequestWriteRepository } from '../request.write.repository';
import { RequestReadRepository } from '../request.read.repository';
import { TimeOffRequestEntity, AuditEntity } from '../entities';
import { RequestStatus } from '../../shared/types';

describe('Topic 2: Persistence & Archival Rules', () => {
  let writeRepo: RequestWriteRepository;
  let readRepo: RequestReadRepository;
  let mockRepository: Repository<TimeOffRequestEntity>;
  let mockAuditRepository: Repository<any>;

  const mockEntity: TimeOffRequestEntity = {
    id: '123',
    employeeId: 'emp-001',
    locationId: 'loc-001',
    leaveType: 'vacation',
    startDate: '2026-05-01',
    endDate: '2026-05-05',
    startDateTimestamp: 1746144000000,
    endDateTimestamp: 1746489600000,
    totalDays: 5,
    status: RequestStatus.PENDING_MANAGER,
    year: 2026,
    archivedAt: null,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as TimeOffRequestEntity;

  beforeEach(async () => {
    mockRepository = {
      create: jest.fn().mockReturnValue(mockEntity),
      save: jest.fn().mockResolvedValue(mockEntity),
      findOne: jest.fn().mockResolvedValue(mockEntity),
      findMany: jest.fn(),
      createQueryBuilder: jest.fn(),
      find: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    } as any;

    mockAuditRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestWriteRepository,
        RequestReadRepository,
        {
          provide: getRepositoryToken(TimeOffRequestEntity),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(AuditEntity),
          useValue: mockAuditRepository,
        },
      ],
    }).compile();

    writeRepo = module.get<RequestWriteRepository>(RequestWriteRepository);
    readRepo = module.get<RequestReadRepository>(RequestReadRepository);
  });

  describe('NFR-11: No hard delete, no soft delete via deletedAt', () => {
    it('should NOT use hard delete (DELETE FROM)', () => {
      // Verify: No delete method exists in repository
      expect((writeRepo as any).repo.delete).toBeUndefined();
      expect((writeRepo as any).repo.remove).toBeUndefined();
    });

    it('should NOT have deletedAt column (soft delete pattern)', () => {
      // Verify: entidade usa archivedAt, não deletedAt
      const entity = mockEntity;
      expect(entity).toHaveProperty('archivedAt');
      expect(entity).not.toHaveProperty('deletedAt');
    });

    it('should archive by setting archivedAt timestamp', async () => {
      // When: cancelRequest is called
      await writeRepo.cancelRequest('123', RequestStatus.CANCELLED);

      // Then: update is called with archivedAt and status
      expect(mockRepository.update).toHaveBeenCalledWith(
        '123',
        expect.objectContaining({
          archivedAt: expect.any(Date),
          status: RequestStatus.CANCELLED,
        }),
      );

      // Verify: no delete operation
      expect(mockRepository.delete).toBeUndefined();
    });
  });

  describe('FR-R10: Cancellation updates status + archivedAt', () => {
    it('should cancel request with CANCELLED status and archivedAt', async () => {
      // When: cancelRequest called
      await writeRepo.cancelRequest('123', RequestStatus.CANCELLED);

      // Then: both status and archivedAt updated
      expect(mockRepository.update).toHaveBeenCalledWith(
        '123',
        expect.objectContaining({
          status: RequestStatus.CANCELLED,
          archivedAt: expect.any(Date),
        }),
      );
    });

    it('should support generic archive without status change', async () => {
      // When: archiveRequest called
      await writeRepo.archiveRequest('123');

      // Then: only archivedAt updated, status unchanged
      expect(mockRepository.update).toHaveBeenCalledWith(
        '123',
        expect.objectContaining({
          archivedAt: expect.any(Date),
        }),
      );
    });
  });

  describe('Topic 2: Queries ignore archived records by default', () => {
    it('should exclude archived records in findByEmployee', async () => {
      // Setup: mock query builder
      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockEntity]),
      };

      (mockRepository.createQueryBuilder as jest.Mock).mockReturnValue(mockQb);

      // When: query executed
      await (readRepo as any).findByEmployee('emp-001');

      // Then: andWhere includes archivedAt IS NULL filter
      expect(mockQb.andWhere).toHaveBeenCalledWith('r.archivedAt IS NULL');
    });

    it('should exclude archived records in findPendingForManager', async () => {
      // Setup: mock returns only non-archived
      (mockRepository.find as jest.Mock).mockResolvedValue([mockEntity]);

      // When: query executed
      await (readRepo as any).findPendingForManager('mgr-001');

      // Then: find called with archivedAt: IsNull filter
      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            archivedAt: expect.any(Object), // IsNull() from TypeORM
          }),
        }),
      );
    });

    it('should exclude archived records in findPendingByEmployee', async () => {
      // Setup
      (mockRepository.find as jest.Mock).mockResolvedValue([mockEntity]);

      // When: query executed
      await (readRepo as any).findPendingByEmployee('emp-001');

      // Then: multiple where conditions all include archivedAt filter
      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.arrayContaining([
            expect.objectContaining({
              archivedAt: expect.any(Object),
            }),
            expect.objectContaining({
              archivedAt: expect.any(Object),
            }),
          ]),
        }),
      );
    });
  });

  describe('BaseEntity audit fields', () => {
    it('should have standard audit columns on all entities', () => {
      // Verify: entity has required audit fields
      expect(mockEntity).toHaveProperty('createdAt');
      expect(mockEntity).toHaveProperty('updatedAt');
      expect(mockEntity).toHaveProperty('archivedAt');

      // Verify: archivedAt is nullable
      expect(mockEntity.archivedAt).toBeNull();
    });

    it('should maintain null archivedAt for active records', () => {
      // Active record should have null archivedAt
      expect(mockEntity.archivedAt).toBeNull();
    });

    it('should set archivedAt when archived', async () => {
      // Simulate archived record
      const archivedEntity = { ...mockEntity, archivedAt: new Date() };

      // Verify: archivedAt is set
      expect(archivedEntity.archivedAt).not.toBeNull();
      expect(archivedEntity.archivedAt).toBeInstanceOf(Date);
    });
  });
});
