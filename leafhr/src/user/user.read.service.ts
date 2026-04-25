import { Injectable } from '@nestjs/common';
import { UserEntity } from './entities/user.entity';
import { UserRoleEntity } from './entities/user-role.entity';
import { Role } from '../shared/types';
import { UserReadRepository } from './user.read.repository';
import type { IUserReadService } from './interfaces';

@Injectable()
export class UserReadService implements IUserReadService {
  constructor(private readonly readRepo: UserReadRepository) {}

  async findByIdOrFail(id: string): Promise<UserEntity> {
    return this.readRepo.findByIdOrFail(id);
  }

  async findRolesForUser(userId: string, locationId?: string): Promise<UserRoleEntity[]> {
    return this.readRepo.findRolesForUser(userId, locationId);
  }

  async hasRole(userId: string, role: Role, locationId?: string): Promise<boolean> {
    return this.readRepo.hasRole(userId, role, locationId);
  }

  async hasAnyRole(userId: string, roles: Role[], locationId?: string): Promise<boolean> {
    return this.readRepo.hasAnyRole(userId, roles, locationId);
  }
}
