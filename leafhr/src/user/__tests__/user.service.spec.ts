import { UserReadService } from '../user.read.service';
import { UserWriteService } from '../user.write.service';
import { UserReadRepository } from '../user.read.repository';
import { UserWriteRepository } from '../user.write.repository';
import { UserEntity } from '../entities/user.entity';
import { UserRoleEntity } from '../entities/user-role.entity';
import { Role } from '../../shared/types';
import { NotFoundError } from '../../shared/exceptions';

describe('UserReadService', () => {
  let service: UserReadService;
  let readRepo: jest.Mocked<UserReadRepository>;

  beforeEach(() => {
    readRepo = {
      findByIdOrFail: jest.fn(),
      findRolesForUser: jest.fn(),
      hasRole: jest.fn(),
      hasAnyRole: jest.fn(),
    } as any;

    service = new UserReadService(readRepo);
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

describe('UserWriteService', () => {
  let service: UserWriteService;
  let writeRepo: jest.Mocked<UserWriteRepository>;

  beforeEach(() => {
    writeRepo = {
      createUser: jest.fn(),
      updateUser: jest.fn(),
      assignRole: jest.fn(),
      removeRole: jest.fn(),
      archiveUser: jest.fn(),
    } as any;

    service = new UserWriteService(writeRepo);
  });

  it('delegates createUser to the repository', async () => {
    const user = { id: 'u-1', email: 'alice@example.com' } as UserEntity;
    writeRepo.createUser.mockResolvedValue(user);

    const result = await service.createUser({ email: 'alice@example.com' });
    expect(result).toEqual(user);
    expect(writeRepo.createUser).toHaveBeenCalledWith({ email: 'alice@example.com' });
  });

  it('delegates updateUser to the repository', async () => {
    writeRepo.updateUser.mockResolvedValue(undefined);

    await service.updateUser('u-1', { name: 'Alice Updated' });
    expect(writeRepo.updateUser).toHaveBeenCalledWith('u-1', { name: 'Alice Updated' });
  });

  it('delegates assignRole to the repository', async () => {
    const role = { id: 'r-1', userId: 'u-1', role: Role.MANAGER } as UserRoleEntity;
    writeRepo.assignRole.mockResolvedValue(role);

    const result = await service.assignRole('u-1', role);
    expect(result).toEqual(role);
    expect(writeRepo.assignRole).toHaveBeenCalledWith('u-1', role);
  });

  it('delegates removeRole to the repository', async () => {
    writeRepo.removeRole.mockResolvedValue(undefined);

    await service.removeRole('u-1', 'r-1', 'loc-1');
    expect(writeRepo.removeRole).toHaveBeenCalledWith('u-1', 'r-1', 'loc-1');
  });

  it('delegates archiveUser to the repository', async () => {
    writeRepo.archiveUser.mockResolvedValue(undefined);

    await service.archiveUser('u-1');
    expect(writeRepo.archiveUser).toHaveBeenCalledWith('u-1');
  });
});
