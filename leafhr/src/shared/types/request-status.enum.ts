import { registerEnumType } from '@nestjs/graphql';

export enum RequestStatus {
  PENDING_MANAGER = 'pending_manager',
  PENDING_HCM_CONFIRMATION = 'pending_hcm_confirmation',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  BALANCE_STALE = 'balance_stale',
  BALANCE_ERROR = 'balance_error',
}

registerEnumType(RequestStatus, { name: 'RequestStatus' });
