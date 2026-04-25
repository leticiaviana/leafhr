import {
  computeBusinessDays,
  toTimestamp,
  fromTimestamp,
  isValidDateRange,
  isFutureOrToday,
  nowUTC,
  nowTimestamp,
} from '../date.util';

describe('date.util', () => {
  describe('computeBusinessDays', () => {
    it('should return 5 for a Mon-Fri week', () => {
      // 2025-01-06 (Mon) to 2025-01-10 (Fri)
      expect(computeBusinessDays('2025-01-06', '2025-01-10')).toBe(5);
    });

    it('should return 1 for a single weekday', () => {
      expect(computeBusinessDays('2025-01-06', '2025-01-06')).toBe(1);
    });

    it('should return 0 for a weekend-only range', () => {
      // 2025-01-04 (Sat) to 2025-01-05 (Sun)
      expect(computeBusinessDays('2025-01-04', '2025-01-05')).toBe(0);
    });

    it('should return 0 if endDate is before startDate', () => {
      expect(computeBusinessDays('2025-01-10', '2025-01-06')).toBe(0);
    });

    it('should exclude weekends in a multi-week range', () => {
      // 2025-01-06 (Mon) to 2025-01-17 (Fri) = 10 business days
      expect(computeBusinessDays('2025-01-06', '2025-01-17')).toBe(10);
    });

    it('should handle range starting on Saturday', () => {
      // 2025-01-04 (Sat) to 2025-01-10 (Fri) = 5 biz days (Mon-Fri)
      expect(computeBusinessDays('2025-01-04', '2025-01-10')).toBe(5);
    });
  });

  describe('toTimestamp / fromTimestamp', () => {
    it('should round-trip an ISO date', () => {
      const iso = '2025-06-15T00:00:00.000Z';
      const ts = toTimestamp(iso);
      expect(typeof ts).toBe('number');
      expect(fromTimestamp(ts)).toBe(iso);
    });

    it('should handle date-only strings', () => {
      const ts = toTimestamp('2025-06-15');
      expect(ts).toBeGreaterThan(0);
    });
  });

  describe('isValidDateRange', () => {
    it('should return true when start < end', () => {
      expect(isValidDateRange('2025-01-01', '2025-01-02')).toBe(true);
    });

    it('should return false when start === end', () => {
      expect(isValidDateRange('2025-01-01', '2025-01-01')).toBe(false);
    });

    it('should return false when start > end', () => {
      expect(isValidDateRange('2025-01-02', '2025-01-01')).toBe(false);
    });

    it('should return false for invalid dates', () => {
      expect(isValidDateRange('invalid', '2025-01-01')).toBe(false);
    });
  });

  describe('isFutureOrToday', () => {
    it('should return true for a far future date', () => {
      expect(isFutureOrToday('2099-12-31')).toBe(true);
    });

    it('should return false for a past date', () => {
      expect(isFutureOrToday('2020-01-01')).toBe(false);
    });
  });

  describe('nowUTC / nowTimestamp', () => {
    it('should return a valid ISO string', () => {
      const now = nowUTC();
      expect(now).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should return a positive number', () => {
      expect(nowTimestamp()).toBeGreaterThan(0);
    });
  });
});
