import { Injectable } from '@nestjs/common';
import { UserEntity } from './entities/user.entity';
import { UserRoleEntity } from './entities/user-role.entity';
import { UserWriteRepository } from './user.write.repository';
import type { IUserWriteService } from './interfaces';

@Injectable()
export class UserWriteService implements IUserWriteService {
  constructor(private readonly writeRepo: UserWriteRepository) {}

  async createUser(userData: Partial<UserEntity>): Promise<UserEntity> {
    return this.writeRepo.createUser(userData);
  }

  async updateUser(id: string, userData: Partial<UserEntity>): Promise<void> {
    return this.writeRepo.updateUser(id, userData);
  }

  async assignRole(userId: string, role: UserRoleEntity): Promise<UserRoleEntity> {
    return this.writeRepo.assignRole(userId, role);
  }

  async removeRole(userId: string, roleId: string, locationId: string): Promise<void> {
    return this.writeRepo.removeRole(userId, roleId, locationId);
  }

  async archiveUser(id: string): Promise<void> {
    return this.writeRepo.archiveUser(id);
  }
}
