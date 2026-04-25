import { Injectable } from '@nestjs/common';
import { UserEntity } from './entities/user.entity';
import { UserRoleEntity } from './entities/user-role.entity';
import { Role } from '../shared/types';
import { UserReadRepository } from './user.read.repository';
import { UserWriteRepository } from './user.write.repository';

@Injectable()
export class UserService {
  constructor(
    private readonly readRepository: UserReadRepository,
    private readonly writeRepository: UserWriteRepository,
  ) {}

  async findByIdOrFail(id: string): Promise<UserEntity> {
    return this.readRepository.findByIdOrFail(id);
  }

  async findRolesForUser(userId: string, locationId?: string): Promise<UserRoleEntity[]> {
    return this.readRepository.findRolesForUser(userId, locationId);
  }

  async hasRole(userId: string, role: Role, locationId?: string): Promise<boolean> {
    return this.readRepository.hasRole(userId, role, locationId);
  }

  async hasAnyRole(userId: string, roles: Role[], locationId?: string): Promise<boolean> {
    return this.readRepository.hasAnyRole(userId, roles, locationId);
  }
}
