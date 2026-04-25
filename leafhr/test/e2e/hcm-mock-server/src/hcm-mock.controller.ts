import {
  Body,
  Controller,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { HcmMockState, MockScenario, StoredBalance } from './hcm-mock.state';
import { LeaveType } from '../../../../src/shared/types';

interface TimeOffBody {
  employeeId: string;
  locationId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  idempotencyKey: string;
}

interface ScenarioBody {
  scenario: MockScenario;
}

interface SeedBody {
  balances: StoredBalance[];
}

/**
 * Mock HCM Server — simulates the external HCM HTTP API for integration tests.
 *
 * Endpoints (TRD §8.5):
 *  - GET  /hcm/balances/:employeeId/:locationId/:leaveType → single balance
 *  - GET  /hcm/batch-balances                              → all balances
 *  - POST /hcm/time-off                                    → file request (idempotent)
 *  - GET  /hcm/health                                      → 200 / 503
 *
 * Mock control plane:
 *  - POST /mock/scenario   → switch scenario (success/timeout/insufficient_balance/down)
 *  - POST /mock/seed       → seed balances
 *  - POST /mock/reset      → wipe state
 *  - GET  /mock/calls      → inspect call log
 *
 * Side-channel headers:
 *  - X-Mock-Delay-Ms       → simulate network latency on that request
 */
@Controller()
export class HcmMockController {
  constructor(private readonly state: HcmMockState) {}

  /* ───────────────── HCM API ───────────────── */

  @Get('hcm/health')
  async health(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this.applyDelay(req);
    this.logCall(req);
    if (this.state.isDown()) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({ status: 'down' });
      return;
    }
    res.status(HttpStatus.OK).json({ status: 'ok' });
  }

  @Get('hcm/balances/:employeeId/:locationId/:leaveType')
  async getBalance(
    @Param('employeeId') employeeId: string,
    @Param('locationId') locationId: string,
    @Param('leaveType') leaveType: LeaveType,
    @Req() req: Request,
  ): Promise<unknown> {
    await this.applyDelay(req);
    this.logCall(req);
    this.assertUp();
    const balance = this.state.getBalance(employeeId, locationId, leaveType);
    if (!balance) {
      throw new HttpException('Balance not found', HttpStatus.NOT_FOUND);
    }
    return balance;
  }

  @Get('hcm/batch-balances')
  async getBatchBalances(@Req() req: Request): Promise<unknown[]> {
    await this.applyDelay(req);
    this.logCall(req);
    this.assertUp();
    return this.state.getAllBalances();
  }

  @Post('hcm/time-off')
  async fileTimeOff(
    @Body() body: TimeOffBody,
    @Headers('idempotency-key') headerKey: string | undefined,
    @Req() req: Request,
  ): Promise<unknown> {
    await this.applyDelay(req);
    this.logCall(req, body);
    this.assertUp();

    const idempotencyKey = headerKey ?? body.idempotencyKey;
    if (!idempotencyKey) {
      throw new HttpException(
        'Idempotency-Key required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const cached = this.state.getCached(idempotencyKey);
    if (cached) {
      return cached;
    }

    if (this.state.getScenario() === 'insufficient_balance') {
      const response = {
        accepted: false,
        reason: 'INSUFFICIENT_BALANCE',
      };
      this.state.cache(idempotencyKey, response);
      return response;
    }

    const decremented = this.state.decrementBalance(
      body.employeeId,
      body.locationId,
      body.leaveType,
      body.days,
    );

    if (!decremented) {
      const response = {
        accepted: false,
        reason: 'INSUFFICIENT_BALANCE',
      };
      this.state.cache(idempotencyKey, response);
      return response;
    }

    const response = {
      accepted: true,
      hcmReferenceId: `hcm-ref-${idempotencyKey}`,
    };
    this.state.cache(idempotencyKey, response);
    return response;
  }

  /* ───────────────── Control plane ───────────────── */

  @Post('mock/scenario')
  setScenario(@Body() body: ScenarioBody): { scenario: MockScenario } {
    this.state.setScenario(body.scenario);
    return { scenario: body.scenario };
  }

  @Post('mock/seed')
  seed(@Body() body: SeedBody): { seeded: number } {
    this.state.seedBalances(body.balances);
    return { seeded: body.balances.length };
  }

  @Post('mock/reset')
  reset(): { reset: true } {
    this.state.reset();
    return { reset: true };
  }

  @Get('mock/calls')
  calls(): unknown[] {
    return this.state.getCalls();
  }

  /* ───────────────── internals ───────────────── */

  private logCall(req: Request, body?: unknown): void {
    this.state.logCall({
      method: req.method,
      path: req.path,
      body,
      headers: req.headers as Record<string, string>,
      timestamp: Date.now(),
    });
  }

  private assertUp(): void {
    if (this.state.isDown()) {
      throw new HttpException('HCM down', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  private async applyDelay(req: Request): Promise<void> {
    const raw = req.headers['x-mock-delay-ms'];
    if (!raw) return;
    const ms = Array.isArray(raw) ? parseInt(raw[0], 10) : parseInt(raw, 10);
    if (!Number.isFinite(ms) || ms <= 0) return;
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
