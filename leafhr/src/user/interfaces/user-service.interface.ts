import { UserEntity } from '../entities/user.entity';
import { UserRoleEntity } from '../entities/user-role.entity';
import { Role } from '../../shared/types';

export interface IUserReadService {
  findByIdOrFail(id: string): Promise<UserEntity>;
  findRolesForUser(userId: string, locationId?: string): Promise<UserRoleEntity[]>;
  hasRole(userId: string, role: Role, locationId?: string): Promise<boolean>;
  hasAnyRole(userId: string, roles: Role[], locationId?: string): Promise<boolean>;
}

export interface IUserWriteService {
  createUser(userData: Partial<UserEntity>): Promise<UserEntity>;
  updateUser(id: string, userData: Partial<UserEntity>): Promise<void>;
  assignRole(userId: string, role: UserRoleEntity): Promise<UserRoleEntity>;
  removeRole(userId: string, roleId: string, locationId: string): Promise<void>;
  archiveUser(id: string): Promise<void>;
}
