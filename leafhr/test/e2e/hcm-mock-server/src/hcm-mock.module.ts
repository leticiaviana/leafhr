import { Module } from '@nestjs/common';
import { HcmMockController } from './hcm-mock.controller';
import { HcmMockState } from './hcm-mock.state';

@Module({
  controllers: [HcmMockController],
  providers: [HcmMockState],
  exports: [HcmMockState],
})
export class HcmMockModule {}
