import { LeaveType } from '../../shared/types';

/**
 * DTO returned by HCM when querying a single employee's balance.
 */
export interface HcmBalanceResponse {
  employeeId: string;
  locationId: string;
  leaveType: LeaveType;
  /** Yearly entitlement (HCM is source of truth). Used by sync. */
  totalEntitled: number;
  /** Remaining balance in HCM (totalEntitled minus what HCM has decremented). */
  available: number;
  /** Plan year the balance applies to. */
  year: number;
  unit: string;
  etag: string;
}

/**
 * DTO returned by HCM batch-balances endpoint.
 * Array of individual balance records.
 */
export type HcmBatchBalancesResponse = HcmBalanceResponse[];

/**
 * DTO sent TO the HCM when filing a time-off request.
 */
export interface HcmTimeOffPayload {
  employeeId: string;
  locationId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  idempotencyKey: string;
}

/**
 * DTO returned by HCM after filing a time-off request.
 */
export interface HcmTimeOffResponse {
  accepted: boolean;
  hcmReferenceId?: string;
  reason?: string;
}

/**
 * Abstraction for all HCM external calls.
 * Production: HTTP client.  Tests: mock implementation.
 */
export interface IHcmClient {
  /**
   * Fetch real-time balance for a specific employee/location/leaveType.
   * @throws HcmUnavailableError if HCM is unreachable.
   */
  getBalance(
    employeeId: string,
    locationId: string,
    leaveType: LeaveType,
  ): Promise<HcmBalanceResponse>;

  /**
   * Fetch all balances from HCM batch endpoint (for full sync).
   * @throws HcmUnavailableError if HCM is unreachable.
   */
  getBatchBalances(): Promise<HcmBatchBalancesResponse>;

  /**
   * Forward an approved time-off request to HCM for final confirmation.
   * Must include Idempotency-Key header.
   * @throws HcmUnavailableError if HCM is unreachable.
   */
  fileTimeOff(payload: HcmTimeOffPayload): Promise<HcmTimeOffResponse>;

  /**
   * Check if the HCM service is healthy.
   * Returns true if healthy, false if down.
   */
  healthCheck(): Promise<boolean>;
}

export const HCM_CLIENT_TOKEN = 'IHcmClient';
