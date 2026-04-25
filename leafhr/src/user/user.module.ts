import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity, UserRoleEntity } from './entities';
import { UserService } from './user.service';
import { UserReadRepository } from './user.read.repository';
import { UserWriteRepository } from './user.write.repository';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, UserRoleEntity])],
  providers: [UserService, UserReadRepository, UserWriteRepository],
  exports: [UserService, UserReadRepository, UserWriteRepository],
})
export class UserModule {}
