import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BalanceEntity } from './entities';
import { BalanceReadRepository } from './balance.read.repository';
import { BalanceWriteRepository } from './balance.write.repository';
import { BalanceReadService } from './balance.read.service';
import { BalanceWriteService } from './balance.write.service';
import { BalanceResolver } from './balance.resolver';
import { AuthModule } from '../auth';
import { HcmModule } from '../hcm';

@Module({
  imports: [TypeOrmModule.forFeature([BalanceEntity]), AuthModule, HcmModule],
  providers: [
    BalanceReadRepository,
    BalanceWriteRepository,
    BalanceReadService,
    BalanceWriteService,
    BalanceResolver,
  ],
  exports: [BalanceReadService, BalanceWriteService, BalanceReadRepository],
})
export class BalanceModule {}
