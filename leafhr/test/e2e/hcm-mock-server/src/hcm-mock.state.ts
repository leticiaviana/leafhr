import { LeaveType } from '../../../../src/shared/types';

export type MockScenario =
  | 'success'
  | 'timeout'
  | 'insufficient_balance'
  | 'down';

export interface StoredBalance {
  employeeId: string;
  locationId: string;
  leaveType: LeaveType;
  totalEntitled: number;
  available: number;
  year: number;
  unit: string;
  etag: string;
}

export interface CallLogEntry {
  method: string;
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
  timestamp: number;
}

export interface CachedTimeOffResponse {
  accepted: boolean;
  hcmReferenceId?: string;
  reason?: string;
}

/**
 * In-memory state for the Mock HCM Server.
 * Resettable between tests via POST /mock/reset.
 */
export class HcmMockState {
  private scenario: MockScenario = 'success';
  private balances = new Map<string, StoredBalance>();
  private idempotencyCache = new Map<string, CachedTimeOffResponse>();
  private calls: CallLogEntry[] = [];
  private down = false;

  setScenario(scenario: MockScenario): void {
    this.scenario = scenario;
    this.down = scenario === 'down';
  }

  getScenario(): MockScenario {
    return this.scenario;
  }

  isDown(): boolean {
    return this.down;
  }

  reset(): void {
    this.scenario = 'success';
    this.balances.clear();
    this.idempotencyCache.clear();
    this.calls = [];
    this.down = false;
  }

  seedBalance(balance: StoredBalance): void {
    this.balances.set(this.keyFor(balance.employeeId, balance.locationId, balance.leaveType), balance);
  }

  seedBalances(balances: StoredBalance[]): void {
    for (const b of balances) {
      this.seedBalance(b);
    }
  }

  getBalance(employeeId: string, locationId: string, leaveType: LeaveType): StoredBalance | undefined {
    return this.balances.get(this.keyFor(employeeId, locationId, leaveType));
  }

  getAllBalances(): StoredBalance[] {
    return [...this.balances.values()];
  }

  decrementBalance(employeeId: string, locationId: string, leaveType: LeaveType, days: number): boolean {
    const key = this.keyFor(employeeId, locationId, leaveType);
    const balance = this.balances.get(key);
    if (!balance) return false;
    if (balance.available < days) return false;
    balance.available -= days;
    balance.etag = `etag-${Date.now()}`;
    return true;
  }

  getCached(idempotencyKey: string): CachedTimeOffResponse | undefined {
    return this.idempotencyCache.get(idempotencyKey);
  }

  cache(idempotencyKey: string, response: CachedTimeOffResponse): void {
    this.idempotencyCache.set(idempotencyKey, response);
  }

  logCall(entry: CallLogEntry): void {
    this.calls.push(entry);
  }

  getCalls(): CallLogEntry[] {
    return [...this.calls];
  }

  private keyFor(employeeId: string, locationId: string, leaveType: LeaveType): string {
    return `${employeeId}|${locationId}|${leaveType}`;
  }
}
