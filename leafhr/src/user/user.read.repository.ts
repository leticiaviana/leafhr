import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '../shared/base';
import { UserEntity } from './entities';
import { UserRoleEntity } from './entities';
import { Role } from '../shared/types';
import { NotFoundError } from '../shared/exceptions';

@Injectable()
export class UserReadRepository extends BaseRepository<UserEntity> {
  constructor(
    @InjectRepository(UserEntity)
    repo: Repository<UserEntity>,
    @InjectRepository(UserRoleEntity)
    private readonly roleRepo: Repository<UserRoleEntity>,
  ) {
    super(repo);
  }

  async findByIdOrFail(id: string): Promise<UserEntity> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundError('User', id);
    }
    return user;
  }

  async findRolesForUser(userId: string, locationId?: string): Promise<UserRoleEntity[]> {
    const where: Record<string, string> = { userId };
    if (locationId) {
      where.locationId = locationId;
    }
    return this.roleRepo.find({ where });
  }

  async hasRole(userId: string, role: Role, locationId?: string): Promise<boolean> {
    const where: Record<string, string> = { userId, role };
    if (locationId) {
      where.locationId = locationId;
    }
    const count = await this.roleRepo.count({ where });
    return count > 0;
  }

  async hasAnyRole(userId: string, roles: Role[], locationId?: string): Promise<boolean> {
    for (const role of roles) {
      if (await this.hasRole(userId, role, locationId)) {
        return true;
      }
    }
    return false;
  }
}
