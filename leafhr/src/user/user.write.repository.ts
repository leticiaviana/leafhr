import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseWriteRepository } from '../shared/base';
import { UserEntity } from './entities';
import { UserRoleEntity } from './entities';

@Injectable()
export class UserWriteRepository extends BaseWriteRepository<UserEntity> {
  constructor(
    @InjectRepository(UserEntity)
    writeRepo: Repository<UserEntity>,
    @InjectRepository(UserRoleEntity)
    private readonly roleRepo: Repository<UserRoleEntity>,
  ) {
    super(writeRepo);
  }

  async createUser(userData: Partial<UserEntity>): Promise<UserEntity> {
    const user = this.createEntity(userData);
    return this.saveEntity(user);
  }

  async updateUser(id: string, userData: Partial<UserEntity>): Promise<void> {
    await this.updateById(id, userData);
  }

  async assignRole(userId: string, role: UserRoleEntity): Promise<UserRoleEntity> {
    return this.roleRepo.save(role);
  }

  async removeRole(userId: string, roleId: string, locationId: string): Promise<void> {
    await this.roleRepo.delete({ userId, roleId, locationId } as never);
  }

  async archiveUser(id: string): Promise<void> {
    await this.updateById(id, { archivedAt: new Date() } as never);
  }
}
