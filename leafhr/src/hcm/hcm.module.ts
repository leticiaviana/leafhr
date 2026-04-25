import { Module } from '@nestjs/common';
import { HcmClient } from './hcm.client';
import { HCM_CLIENT_TOKEN } from './interfaces';

@Module({
  providers: [
    {
      provide: HCM_CLIENT_TOKEN,
      useClass: HcmClient,
    },
  ],
  exports: [HCM_CLIENT_TOKEN],
})
export class HcmModule {}
