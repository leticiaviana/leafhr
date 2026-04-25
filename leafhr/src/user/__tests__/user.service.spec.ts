import { UserService } from '../user.service';
import { UserReadRepository } from '../user.read.repository';
import { UserWriteRepository } from '../user.write.repository';
import { UserEntity } from '../entities/user.entity';
import { UserRoleEntity } from '../entities/user-role.entity';
import { Role } from '../../shared/types';
import { NotFoundError } from '../../shared/exceptions';

describe('UserService', () => {
  let service: UserService;
  let readRepo: jest.Mocked<UserReadRepository>;
  let writeRepo: jest.Mocked<UserWriteRepository>;

  beforeEach(() => {
    readRepo = {
      findByIdOrFail: jest.fn(),
      findRolesForUser: jest.fn(),
      hasRole: jest.fn(),
      hasAnyRole: jest.fn(),
    } as any;

    writeRepo = {} as any;

    service = new UserService(readRepo, writeRepo);
  });

  describe('findByIdOrFail', () => {
    it('returns a user when found', async () => {
      const user: Partial<UserEntity> = {
        id: 'u-1',
        email: 'alice@example.com',
        name: 'Alice',
      };
      readRepo.findByIdOrFail.mockResolvedValue(user as UserEntity);

      const result = await service.findByIdOrFail('u-1');
      expect(result).toEqual(user);
      expect(readRepo.findByIdOrFail).toHaveBeenCalledWith('u-1');
    });

    it('throws NotFoundError when the underlying repository throws', async () => {
      readRepo.findByIdOrFail.mockRejectedValue(new NotFoundError('User', 'u-999'));

      await expect(service.findByIdOrFail('u-999')).rejects.toThrow(NotFoundError);
    });
  });

  describe('findRolesForUser', () => {
    it('returns all roles for a user', async () => {
      const roles: Partial<UserRoleEntity>[] = [
        { id: 'r-1', userId: 'u-1', locationId: 'loc-1', role: Role.EMPLOYEE },
        { id: 'r-2', userId: 'u-1', locationId: 'loc-2', role: Role.MANAGER },
      ];
      readRepo.findRolesForUser.mockResolvedValue(roles as UserRoleEntity[]);

      const result = await service.findRolesForUser('u-1');
      expect(result).toHaveLength(2);
      expect(readRepo.findRolesForUser).toHaveBeenCalledWith('u-1', undefined);
    });

    it('passes locationId to the repository when provided', async () => {
      readRepo.findRolesForUser.mockResolvedValue([]);

      await service.findRolesForUser('u-1', 'loc-1');
      expect(readRepo.findRolesForUser).toHaveBeenCalledWith('u-1', 'loc-1');
    });
  });

  describe('hasRole', () => {
    it('returns true when user has the role', async () => {
      readRepo.hasRole.mockResolvedValue(true);

      const result = await service.hasRole('u-1', Role.MANAGER);
      expect(result).toBe(true);
    });

    it('returns false when user does not have the role', async () => {
      readRepo.hasRole.mockResolvedValue(false);

      const result = await service.hasRole('u-1', Role.MANAGER);
      expect(result).toBe(false);
    });

    it('passes locationId to the repository when provided', async () => {
      readRepo.hasRole.mockResolvedValue(true);

      await service.hasRole('u-1', Role.MANAGER, 'loc-1');
      expect(readRepo.hasRole).toHaveBeenCalledWith('u-1', Role.MANAGER, 'loc-1');
    });
  });

  describe('hasAnyRole', () => {
    it('returns true if the repository says so', async () => {
      readRepo.hasAnyRole.mockResolvedValue(true);

      const result = await service.hasAnyRole('u-1', [Role.EMPLOYEE, Role.MANAGER]);
      expect(result).toBe(true);
    });

    it('returns false if the repository returns false', async () => {
      readRepo.hasAnyRole.mockResolvedValue(false);

      const result = await service.hasAnyRole('u-1', [Role.EMPLOYEE, Role.MANAGER]);
      expect(result).toBe(false);
    });
  });
});
