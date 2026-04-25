import { HcmClient } from '../hcm.client';
import { LeaveType } from '../../shared/types';
import { HcmUnavailableError } from '../../shared/exceptions';

/* ------------------------------------------------------------------ */
/*  We mock global `fetch` so tests don't make real HTTP calls.       */
/* ------------------------------------------------------------------ */

const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe('HcmClient', () => {
  let client: HcmClient;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.HCM_BASE_URL = 'http://mock-hcm:4001';
    process.env.HCM_API_KEY = 'test-api-key';
    process.env.HCM_TIMEOUT_MS = '3000';
    client = new HcmClient();
  });

  afterEach(() => {
    delete process.env.HCM_BASE_URL;
    delete process.env.HCM_API_KEY;
    delete process.env.HCM_TIMEOUT_MS;
  });

  /* ───── getBalance ───── */

  describe('getBalance', () => {
    const balanceResponse = {
      employeeId: 'emp-1',
      locationId: 'loc-NYC',
      leaveType: LeaveType.VACATION,
      available: 15,
      unit: 'days',
      etag: 'etag-abc',
    };

    it('should return balance on 200', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(balanceResponse));

      const result = await client.getBalance('emp-1', 'loc-NYC', LeaveType.VACATION);

      expect(result).toEqual(balanceResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://mock-hcm:4001/hcm/balances/emp-1/loc-NYC/vacation',
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('should include X-API-Key header when API key is set', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(balanceResponse));

      await client.getBalance('emp-1', 'loc-NYC', LeaveType.VACATION);

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers['X-API-Key']).toBe('test-api-key');
    });

    it('should throw HcmUnavailableError on 5xx', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ error: 'down' }, 503));

      await expect(
        client.getBalance('emp-1', 'loc-NYC', LeaveType.VACATION),
      ).rejects.toThrow(HcmUnavailableError);
    });

    it('should throw HcmUnavailableError on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      await expect(
        client.getBalance('emp-1', 'loc-NYC', LeaveType.SICK),
      ).rejects.toThrow(HcmUnavailableError);
    });
  });

  /* ───── getBatchBalances ───── */

  describe('getBatchBalances', () => {
    const batchResponse = [
      {
        employeeId: 'emp-1',
        locationId: 'loc-NYC',
        leaveType: LeaveType.VACATION,
        available: 15,
        unit: 'days',
        etag: 'etag-1',
      },
      {
        employeeId: 'emp-2',
        locationId: 'loc-LA',
        leaveType: LeaveType.SICK,
        available: 10,
        unit: 'days',
        etag: 'etag-2',
      },
    ];

    it('should return all balances', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(batchResponse));

      const result = await client.getBatchBalances();

      expect(result).toEqual(batchResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://mock-hcm:4001/hcm/batch-balances',
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('should throw HcmUnavailableError on 500', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({}, 500));

      await expect(client.getBatchBalances()).rejects.toThrow(HcmUnavailableError);
    });
  });

  /* ───── fileTimeOff ───── */

  describe('fileTimeOff', () => {
    const payload = {
      employeeId: 'emp-1',
      locationId: 'loc-NYC',
      leaveType: LeaveType.VACATION,
      startDate: '2025-03-10',
      endDate: '2025-03-14',
      days: 5,
      idempotencyKey: 'idem-key-123',
    };

    it('should POST with Idempotency-Key header and return response', async () => {
      const hcmResponse = { accepted: true, hcmReferenceId: 'hcm-ref-99' };
      mockFetch.mockResolvedValueOnce(jsonResponse(hcmResponse));

      const result = await client.fileTimeOff(payload);

      expect(result).toEqual(hcmResponse);
      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe('http://mock-hcm:4001/hcm/time-off');
      expect(opts.method).toBe('POST');
      expect(opts.headers['Idempotency-Key']).toBe('idem-key-123');
      expect(opts.headers['Content-Type']).toBe('application/json');
      expect(JSON.parse(opts.body)).toEqual(payload);
    });

    it('should return HCM rejection body on 422', async () => {
      const rejection = { accepted: false, reason: 'insufficient balance' };
      mockFetch.mockResolvedValueOnce(jsonResponse(rejection, 422));

      const result = await client.fileTimeOff(payload);

      expect(result).toEqual(rejection);
    });

    it('should throw HcmUnavailableError on 503', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({}, 503));

      await expect(client.fileTimeOff(payload)).rejects.toThrow(HcmUnavailableError);
    });

    it('should throw HcmUnavailableError on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('timeout'));

      await expect(client.fileTimeOff(payload)).rejects.toThrow(HcmUnavailableError);
    });
  });

  /* ───── healthCheck ───── */

  describe('healthCheck', () => {
    it('should return true when HCM is healthy (200)', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ status: 'ok' }, 200));

      const result = await client.healthCheck();
      expect(result).toBe(true);
    });

    it('should return false when HCM returns 503', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({}, 503));

      const result = await client.healthCheck();
      expect(result).toBe(false);
    });

    it('should return false on network error (no throw)', async () => {
      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const result = await client.healthCheck();
      expect(result).toBe(false);
    });
  });

  /* ───── defaults ───── */

  describe('defaults', () => {
    it('should use default base URL when env var is absent', async () => {
      delete process.env.HCM_BASE_URL;
      const defaultClient = new HcmClient();
      mockFetch.mockResolvedValueOnce(jsonResponse({ status: 'ok' }));

      await defaultClient.healthCheck();

      expect(mockFetch.mock.calls[0][0]).toContain('http://localhost:4001');
    });

    it('should not send X-API-Key when env var is absent', async () => {
      delete process.env.HCM_API_KEY;
      const noKeyClient = new HcmClient();
      mockFetch.mockResolvedValueOnce(jsonResponse({}));

      await noKeyClient.healthCheck();

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers['X-API-Key']).toBeUndefined();
    });
  });
});
