import { NestFactory } from '@nestjs/core';
import { HcmMockModule } from './hcm-mock.module';
import { HcmMockState } from './hcm-mock.state';
import { LeaveType } from '../../../../src/shared/types';

function shouldAutoSeed(): boolean {
  const raw = (process.env.MOCK_HCM_AUTO_SEED ?? 'true').trim().toLowerCase();
  return !['false', '0', 'no', 'off'].includes(raw);
}

function seedDefaultBalances(state: HcmMockState): number {
  const year = parseInt(process.env.MOCK_HCM_SEED_YEAR ?? '2026', 10);

  const balances = [
    {
      employeeId: 'emp-001',
      locationId: 'loc-HQ',
      leaveType: LeaveType.PTO,
      totalEntitled: 20,
      available: 20,
      year,
      unit: 'days',
      etag: `seed-${Date.now()}-emp001-pto`,
    },
    {
      employeeId: 'emp-001',
      locationId: 'loc-HQ',
      leaveType: LeaveType.VACATION,
      totalEntitled: 15,
      available: 15,
      year,
      unit: 'days',
      etag: `seed-${Date.now()}-emp001-vacation`,
    },
    {
      employeeId: 'emp-001',
      locationId: 'loc-HQ',
      leaveType: LeaveType.SICK,
      totalEntitled: 10,
      available: 10,
      year,
      unit: 'days',
      etag: `seed-${Date.now()}-emp001-sick`,
    },
    {
      employeeId: 'emp-002',
      locationId: 'loc-HQ',
      leaveType: LeaveType.PTO,
      totalEntitled: 20,
      available: 20,
      year,
      unit: 'days',
      etag: `seed-${Date.now()}-emp002-pto`,
    },
    {
      employeeId: 'emp-999',
      locationId: 'loc-BR',
      leaveType: LeaveType.PTO,
      totalEntitled: 18,
      available: 18,
      year,
      unit: 'days',
      etag: `seed-${Date.now()}-emp999-pto`,
    },
  ];

  state.seedBalances(balances);
  return balances.length;
}

/**
 * Standalone entrypoint for the Mock HCM Server.
 * Run with: `ts-node test/e2e/hcm-mock-server/src/main.ts`
 * Configurable port via MOCK_HCM_PORT (default 4001).
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(HcmMockModule);
  const port = parseInt(process.env.MOCK_HCM_PORT ?? '4001', 10);

  if (shouldAutoSeed()) {
    const state = app.get(HcmMockState);
    const seeded = seedDefaultBalances(state);
    // eslint-disable-next-line no-console
    console.log(`[Mock HCM] auto-seeded ${seeded} balances`);
  }

  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[Mock HCM] listening on http://localhost:${port}`);
}

void bootstrap();
