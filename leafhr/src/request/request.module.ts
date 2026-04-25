import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimeOffRequestEntity, AuditEntity } from './entities';
import { RequestReadRepository } from './request.read.repository';
import { RequestWriteRepository } from './request.write.repository';
import { RequestReadService } from './request.read.service';
import { RequestWriteService } from './request.write.service';
import { RequestResolver } from './request.resolver';
import { BalanceModule } from '../balance';
import { AuthModule } from '../auth';
import { LocationModule } from '../location';
import { HcmModule } from '../hcm';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TimeOffRequestEntity, AuditEntity]),
    BalanceModule,
    AuthModule,
    LocationModule,
    HcmModule,
    SharedModule,
  ],
  providers: [
    RequestReadRepository,
    RequestWriteRepository,
    RequestReadService,
    RequestWriteService,
    RequestResolver,
  ],
  exports: [
    RequestReadRepository,
    RequestWriteRepository,
    RequestReadService,
    RequestWriteService,
  ],
})
export class RequestModule {}
