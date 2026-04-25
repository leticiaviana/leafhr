import { Injectable, Logger, Inject } from '@nestjs/common';
import { BalanceWriteService, BalanceReadRepository } from '../balance';
import { TimeOffRequestEntity } from './entities';
import { validateTransition } from './state-machine';
import { IActor } from '../shared/interfaces';
import { LeaveType, RequestStatus, Role, BalanceSource } from '../shared/types';
import {
  DateRangeError,
  NotFoundError,
  ForbiddenError,
  OverlapConflictError,
  HcmUnavailableError,
} from '../shared/exceptions';
import {
  computeBusinessDays,
  toTimestamp,
  nowTimestamp,
} from '../shared/utils/date.util';
import { generateUUID } from '../shared/utils/uuid.util';
import { DEFAULT_LOCATION_ID, LocationService } from '../location';
import { HcmClient, HCM_CLIENT_TOKEN } from '../hcm';
import { RequestReadRepository } from './request.read.repository';
import { RequestWriteRepository } from './request.write.repository';
import type { IRequestSubmitInput, IRequestWriteService } from './interfaces';

@Injectable()
export class RequestWriteService implements IRequestWriteService {
  private readonly logger = new Logger(RequestWriteService.name);

  constructor(
    private readonly readRepo: RequestReadRepository,
    private readonly writeRepo: RequestWriteRepository,
    private readonly balanceWriteService: BalanceWriteService,
    private readonly balanceReadRepo: BalanceReadRepository,
    private readonly locationService: LocationService,
    @Inject(HCM_CLIENT_TOKEN)
    private readonly hcmClient: HcmClient,
  ) {}

  async submit(actor: IActor, input: IRequestSubmitInput): Promise<TimeOffRequestEntity> {
    const { leaveType, startDate, endDate, reason } = input;
    const locationId = this.resolveLocation(actor, input.locationId);

    const days = computeBusinessDays(startDate, endDate);
    if (days <= 0) {
      throw new DateRangeError(startDate, endDate);
    }

    await this.assertNoDateOverlap(actor.sub, locationId, startDate, endDate);

    const year = new Date(startDate).getFullYear();

    // Lazy-fetch from HCM if no local balance exists yet (HCM is source of truth).
    await this.ensureBalanceFromHcm(actor.sub, locationId, leaveType, year);

    await this.balanceWriteService.reserveDays(actor.sub, leaveType, year, days, locationId);

    const request = await this.writeRepo.createRequest({
      employeeId: actor.sub,
      locationId,
      leaveType,
      startDate,
      startDateTimestamp: toTimestamp(startDate),
      endDate,
      endDateTimestamp: toTimestamp(endDate),
      totalDays: days,
      status: RequestStatus.PENDING_MANAGER,
      reason,
      managerId: actor.managerId,
      year,
      archivedAt: null,
    });

    await this.writeRepo.addAudit({
      requestId: request.id,
      fromStatus: RequestStatus.PENDING_MANAGER,
      toStatus: RequestStatus.PENDING_MANAGER,
      actorId: actor.sub,
      actorRole: actor.role,
      comment: 'Request submitted',
    });

    return request;
  }

  async transition(
    actor: IActor,
    requestId: string,
    toStatus: RequestStatus,
    comment?: string,
  ): Promise<TimeOffRequestEntity> {
    const request = await this.readRepo.findByIdOrFail(requestId);

    this.assertCanActOnRequest(actor, request);
    validateTransition(request.status, toStatus, actor.role);

    await this.applyTransition(actor, request, toStatus, comment);

    // After manager approval, the system immediately drives the HCM
    // confirmation step. There is no human (HR) in the loop by design.
    if (toStatus === RequestStatus.PENDING_HCM_CONFIRMATION) {
      await this.confirmWithHcmAsSystem(request);
    }

    return request;
  }

  private async applyTransition(
    actor: IActor,
    request: TimeOffRequestEntity,
    toStatus: RequestStatus,
    comment?: string,
  ): Promise<void> {
    const fromStatus = request.status;

    if (toStatus === RequestStatus.APPROVED) {
      await this.fileTimeOffWithHcm(request);
    }

    request.status = toStatus;

    if (toStatus === RequestStatus.CANCELLED) {
      request.archivedAt = new Date(nowTimestamp());
    }

    await this.writeRepo.saveRequest(request);

    await this.writeRepo.addAudit({
      requestId: request.id,
      fromStatus,
      toStatus,
      actorId: actor.sub,
      actorRole: actor.role,
      comment,
    });

    if (toStatus === RequestStatus.APPROVED) {
      await this.balanceWriteService.confirmDays(
        request.employeeId,
        request.leaveType,
        request.year,
        request.totalDays,
        request.locationId,
      );
    } else if (
      toStatus === RequestStatus.REJECTED ||
      toStatus === RequestStatus.CANCELLED ||
      toStatus === RequestStatus.BALANCE_ERROR
    ) {
      if (
        toStatus === RequestStatus.CANCELLED &&
        fromStatus === RequestStatus.APPROVED &&
        actor.role === Role.EMPLOYEE
      ) {
        await this.assertWithinGracefulWindow(request);
      }

      await this.balanceWriteService.releaseDays(
        request.employeeId,
        request.leaveType,
        request.year,
        request.totalDays,
        request.locationId,
      );
    }
  }

  private async confirmWithHcmAsSystem(request: TimeOffRequestEntity): Promise<void> {
    const systemActor: IActor = {
      sub: 'system',
      role: Role.SYSTEM,
      locationId: request.locationId,
    };

    try {
      await this.applyTransition(
        systemActor,
        request,
        RequestStatus.APPROVED,
        'HCM filing accepted',
      );
    } catch (err) {
      this.logger.warn(
        `HCM filing failed for request ${request.id}: ${(err as Error).message} — moving to BALANCE_ERROR`,
      );
      // Reload from DB to escape any in-memory mutation done before the failure.
      const fresh = await this.readRepo.findByIdOrFail(request.id);
      if (fresh.status === RequestStatus.PENDING_HCM_CONFIRMATION) {
        await this.applyTransition(
          systemActor,
          fresh,
          RequestStatus.BALANCE_ERROR,
          (err as Error).message,
        );
        Object.assign(request, fresh);
      }
    }
  }

  private async ensureBalanceFromHcm(
    employeeId: string,
    locationId: string,
    leaveType: LeaveType,
    year: number,
  ): Promise<void> {
    const local = await this.balanceReadRepo.findOneByScope(
      employeeId,
      leaveType,
      year,
      locationId,
    );
    if (local) {
      return;
    }

    const hcm = await this.hcmClient.getBalance(employeeId, locationId, leaveType);

    await this.balanceWriteService.setEntitlement(
      employeeId,
      leaveType,
      hcm.year ?? year,
      hcm.totalEntitled,
      BalanceSource.HCM_REALTIME,
      undefined,
      locationId,
    );

    this.logger.log(
      `Lazy-fetched HCM balance for ${employeeId}/${locationId}/${leaveType}/${year}: totalEntitled=${hcm.totalEntitled}`,
    );
  }

  private resolveLocation(actor: IActor, requestedLocationId?: string): string {
    const actorLocation = actor.locationId ?? DEFAULT_LOCATION_ID;
    if (requestedLocationId && requestedLocationId !== actorLocation) {
      throw new ForbiddenError(
        'submit request',
        `location ${requestedLocationId} is outside actor scope ${actorLocation}`,
      );
    }

    return actorLocation;
  }

  private async assertNoDateOverlap(
    employeeId: string,
    locationId: string,
    startDate: string,
    endDate: string,
  ): Promise<void> {
    const activeRequests = await this.readRepo.findByEmployee(
      employeeId,
      new Date(startDate).getFullYear(),
    );

    const nextStart = toTimestamp(startDate);
    const nextEnd = toTimestamp(endDate);

    const overlap = activeRequests.find((request) => {
      if (request.locationId !== locationId) {
        return false;
      }
      if (request.archivedAt) {
        return false;
      }
      if (request.status === RequestStatus.REJECTED || request.status === RequestStatus.CANCELLED) {
        return false;
      }
      return request.startDateTimestamp <= nextEnd && request.endDateTimestamp >= nextStart;
    });

    if (overlap) {
      throw new OverlapConflictError(overlap.id, startDate, endDate);
    }
  }

  private assertCanActOnRequest(actor: IActor, request: TimeOffRequestEntity): void {
    if (actor.role === Role.SYSTEM) {
      return;
    }

    if (actor.role === Role.EMPLOYEE) {
      if (request.employeeId !== actor.sub) {
        throw new NotFoundError('TimeOffRequest', request.id);
      }
      if (request.locationId !== (actor.locationId ?? DEFAULT_LOCATION_ID)) {
        throw new ForbiddenError('access request', 'employee outside location scope');
      }
      return;
    }

    if (actor.role === Role.MANAGER) {
      if (request.locationId !== (actor.locationId ?? DEFAULT_LOCATION_ID)) {
        throw new ForbiddenError('access request', 'manager outside location scope');
      }
      const canManageByManagerId = request.managerId === actor.sub;
      const canManageByReportIds = (actor.reportIds ?? []).includes(request.employeeId);
      if (!canManageByManagerId && !canManageByReportIds) {
        throw new ForbiddenError('access request', 'request is not in manager scope');
      }
    }
  }

  private async assertWithinGracefulWindow(
    request: TimeOffRequestEntity,
  ): Promise<void> {
    const gracefulMinutes = await this.locationService.getGracefulTimeMinutes(
      request.locationId,
    );
    if (gracefulMinutes <= 0) {
      return;
    }

    const threshold = request.startDateTimestamp - gracefulMinutes * 60_000;

    if (Date.now() > threshold) {
      throw new ForbiddenError(
        'cancel approved request',
        `graceful time (${gracefulMinutes}m) expired for location ${request.locationId}`,
      );
    }
  }

  private async fileTimeOffWithHcm(request: TimeOffRequestEntity): Promise<void> {
    const idempotencyKey = generateUUID();

    try {
      const response = await this.hcmClient.fileTimeOff({
        employeeId: request.employeeId,
        locationId: request.locationId,
        leaveType: request.leaveType,
        startDate: request.startDate,
        endDate: request.endDate,
        days: request.totalDays,
        idempotencyKey,
      });

      if (!response.accepted) {
        this.logger.warn(
          `HCM rejected filing for request ${request.id}: ${response.reason}`,
        );
        throw new HcmUnavailableError(
          `HCM rejected filing: ${response.reason || 'unknown reason'}`,
        );
      }

      this.logger.log(
        `Request ${request.id} filed with HCM, reference: ${response.hcmReferenceId}`,
      );
    } catch (error) {
      this.logger.error(`HCM filing failed for request ${request.id}`, error);
      throw error;
    }
  }
}
