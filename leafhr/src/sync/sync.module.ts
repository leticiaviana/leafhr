import { Module } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncScheduler } from './sync.scheduler';
import { AuthModule } from '../auth';
import { HcmModule } from '../hcm';
import { BalanceModule } from '../balance';
import { RequestModule } from '../request';

@Module({
  imports: [AuthModule, HcmModule, BalanceModule, RequestModule],
  providers: [SyncService, SyncScheduler],
  exports: [SyncService],
})
export class SyncModule {}
