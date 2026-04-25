import { registerEnumType } from '@nestjs/graphql';

export enum BalanceSource {
  HCM_REALTIME = 'hcm_realtime',
  HCM_SYNC = 'hcm_sync',
  LOCAL_CACHE = 'local_cache',
  MANUAL = 'manual',
  MANUAL_ADJUSTMENT = 'manual_adjustment',
}

registerEnumType(BalanceSource, { name: 'BalanceSource' });
