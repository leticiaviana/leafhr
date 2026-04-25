import { Injectable } from '@nestjs/common';
import { AuditEntity, TimeOffRequestEntity } from './entities';
import { RequestReadRepository } from './request.read.repository';
import { ScopeValidationService } from '../shared/services';
import { IActor } from '../shared/interfaces';
import type { IRequestReadService } from './interfaces';

@Injectable()
export class RequestReadService implements IRequestReadService {
  constructor(
    private readonly readRepo: RequestReadRepository,
    private readonly scopeValidation: ScopeValidationService,
  ) {}

  async getRequest(id: string): Promise<TimeOffRequestEntity> {
    return this.readRepo.findByIdOrFail(id);
  }

  /**
   * Get request with IDOR protection
   * Validates that the actor has permission to access this specific request
   * 
   * Reference: SC-06 (IDOR protection), HC-02 (Identity via JWT)
   */
  async getRequestWithAccess(
    id: string,
    actor: IActor,
  ): Promise<TimeOffRequestEntity> {
    const request = await this.readRepo.findByIdOrFail(id);
    
    // Validate access using scope validation rules
    this.scopeValidation.validateResourceAccess(
      actor,
      request.locationId,
      request.employeeId,
      request.managerId,
      undefined, // no reportIds needed here, ScopeValidationService uses actor.reportIds
    );
    
    return request;
  }

  async getMyRequests(
    employeeId: string,
    year?: number,
  ): Promise<TimeOffRequestEntity[]> {
    return this.readRepo.findByEmployee(employeeId, year);
  }

  async getPendingForManager(managerId: string): Promise<TimeOffRequestEntity[]> {
    return this.readRepo.findPendingForManager(managerId);
  }

  async getAuditsByRequestIds(requestIds: string[]): Promise<AuditEntity[]> {
    return this.readRepo.getAuditsByRequestIds(requestIds);
  }
}
