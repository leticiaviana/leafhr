import { Injectable, Logger } from '@nestjs/common';
import {
  IHcmClient,
  HcmBalanceResponse,
  HcmBatchBalancesResponse,
  HcmTimeOffPayload,
  HcmTimeOffResponse,
} from './interfaces/hcm-client.interface';
import { LeaveType } from '../shared/types';
import { HcmUnavailableError } from '../shared/exceptions';

/**
 * HTTP client for the external HCM system.
 *
 * - Uses native `fetch` (Node 18+).
 * - Sends `Idempotency-Key` header on write operations.
 * - Throws `HcmUnavailableError` on network or 5xx errors.
 * - Reads `HCM_BASE_URL`, `HCM_API_KEY`, `HCM_TIMEOUT_MS` from env.
 */
@Injectable()
export class HcmClient implements IHcmClient {
  private readonly logger = new Logger(HcmClient.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor() {
    this.baseUrl = process.env.HCM_BASE_URL ?? 'http://localhost:4001';
    this.apiKey = process.env.HCM_API_KEY ?? '';
    this.timeoutMs = parseInt(process.env.HCM_TIMEOUT_MS ?? '5000', 10);
  }

  /* ───────── public API ───────── */

  async getBalance(
    employeeId: string,
    locationId: string,
    leaveType: LeaveType,
  ): Promise<HcmBalanceResponse> {
    const url = `${this.baseUrl}/hcm/balances/${employeeId}/${locationId}/${leaveType}`;
    return this.get<HcmBalanceResponse>(url);
  }

  async getBatchBalances(): Promise<HcmBatchBalancesResponse> {
    const url = `${this.baseUrl}/hcm/batch-balances`;
    return this.get<HcmBatchBalancesResponse>(url);
  }

  async fileTimeOff(payload: HcmTimeOffPayload): Promise<HcmTimeOffResponse> {
    const url = `${this.baseUrl}/hcm/time-off`;
    return this.post<HcmTimeOffResponse>(url, payload, {
      'Idempotency-Key': payload.idempotencyKey,
    });
  }

  async healthCheck(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/hcm/health`;
      const res = await this.fetchWithTimeout(url, { method: 'GET' });
      return res.ok;
    } catch {
      return false;
    }
  }

  /* ───────── internal helpers ───────── */

  private async get<T>(url: string): Promise<T> {
    const res = await this.fetchWithTimeout(url, { method: 'GET' });
    return this.handleResponse<T>(res, url);
  }

  private async post<T>(
    url: string,
    body: unknown,
    extraHeaders: Record<string, string> = {},
  ): Promise<T> {
    const res = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...extraHeaders,
      },
      body: JSON.stringify(body),
    });
    return this.handleResponse<T>(res, url);
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const headers: Record<string, string> = {
        ...(init.headers as Record<string, string>),
      };
      if (this.apiKey) {
        headers['X-API-Key'] = this.apiKey;
      }
      return await fetch(url, {
        ...init,
        headers,
        signal: controller.signal,
      });
    } catch (err) {
      this.logger.error(`HCM request failed: ${url}`, (err as Error).message);
      throw new HcmUnavailableError(
        `HCM unreachable at ${url}: ${(err as Error).message}`,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private async handleResponse<T>(res: Response, url: string): Promise<T> {
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      if (res.status >= 500) {
        throw new HcmUnavailableError(
          `HCM returned ${res.status} at ${url}: ${body}`,
        );
      }
      // 4xx — return parsed body (HCM rejection info)
      try {
        return JSON.parse(body) as T;
      } catch {
        throw new HcmUnavailableError(
          `HCM returned ${res.status} with unparseable body at ${url}`,
        );
      }
    }
    return res.json() as Promise<T>;
  }
}
