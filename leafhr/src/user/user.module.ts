import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity, UserRoleEntity } from './entities';
import { UserReadRepository } from './user.read.repository';
import { UserWriteRepository } from './user.write.repository';
import { UserReadService } from './user.read.service';
import { UserWriteService } from './user.write.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, UserRoleEntity])],
  providers: [UserReadRepository, UserWriteRepository, UserReadService, UserWriteService],
  exports: [UserReadService, UserWriteService, UserReadRepository, UserWriteRepository],
})
export class UserModule {}
