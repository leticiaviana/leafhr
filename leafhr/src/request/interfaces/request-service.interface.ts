import { TimeOffRequestEntity, AuditEntity } from '../entities';
import { RequestStatus } from '../../shared/types';
import { IActor } from '../../shared/interfaces';
import { ISubmitRequestInput } from './request-dto.interface';

export interface IRequestSubmitInput extends ISubmitRequestInput {}

export interface IRequestReadService {
  getRequest(id: string): Promise<TimeOffRequestEntity>;
  getMyRequests(employeeId: string, year?: number): Promise<TimeOffRequestEntity[]>;
  getPendingForManager(managerId: string): Promise<TimeOffRequestEntity[]>;
  getAuditsByRequestIds(requestIds: string[]): Promise<AuditEntity[]>;
}

export interface IRequestWriteService {
  submit(actor: IActor, input: IRequestSubmitInput): Promise<TimeOffRequestEntity>;
  transition(
    actor: IActor,
    requestId: string,
    toStatus: RequestStatus,
    comment?: string,
  ): Promise<TimeOffRequestEntity>;
}
