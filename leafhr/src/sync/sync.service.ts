import { Inject, Injectable, Logger } from '@nestjs/common';
import { BalanceReadService, BalanceWriteService } from '../balance';
import { RequestReadRepository } from '../request/request.read.repository';
import { RequestWriteRepository } from '../request/request.write.repository';
import { HcmClient, HCM_CLIENT_TOKEN } from '../hcm';
import { ISyncService, SyncResult } from './interfaces';
import { RequestStatus, BalanceSource, Role } from '../shared/types';
import { generateUUID } from '../shared/utils/uuid.util';

@Injectable()
export class SyncService implements ISyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    @Inject(HCM_CLIENT_TOKEN)
    private readonly hcmClient: HcmClient,
    private readonly balanceReadService: BalanceReadService,
    private readonly balanceWriteService: BalanceWriteService,
    private readonly requestReadRepo: RequestReadRepository,
    private readonly requestWriteRepo: RequestWriteRepository,
  ) {}

  /**
   * TRD §8.6: Full HCM → LeafHR sync.
   * 1. Fetch batch balances from HCM
   * 2. Upsert each balance into local store
   * 3. Revalidate all pending requests against new balances
   */
  async triggerSync(): Promise<SyncResult> {
    const jobId = generateUUID();
    this.logger.log(`Starting sync job ${jobId}`);

    let recordsSynced = 0;
    let staleRequests = 0;

    try {
      // 1. Fetch all balances from HCM
      const hcmBalances = await this.hcmClient.getBatchBalances();

      // 2. Upsert each balance.
      //    HCM is source of truth for `totalEntitled`. Local `used`/`pending`
      //    stay untouched — they are LeafHR's lifecycle tracking.
      for (const hcmBalance of hcmBalances) {
        await this.balanceWriteService.setEntitlement(
          hcmBalance.employeeId,
          hcmBalance.leaveType,
          hcmBalance.year,
          hcmBalance.totalEntitled,
          BalanceSource.HCM_SYNC,
          undefined,
          hcmBalance.locationId,
        );
        recordsSynced++;
      }

      this.logger.log(`Synced ${recordsSynced} balance records`);

      // 3. Revalidate pending requests for the union of employees seen in the
      //    HCM batch AND employees that still have pending local requests but
      //    were dropped from the batch (e.g. HCM removed the row entirely).
      const fromBatch = hcmBalances.map((b) => b.employeeId);
      const fromLocalPending =
        await this.requestReadRepo.findEmployeeIdsWithPending();
      const employeeIds = [...new Set([...fromBatch, ...fromLocalPending])];

      for (const employeeId of employeeIds) {
        const pendingRequests =
          await this.requestReadRepo.findPendingByEmployee(employeeId);

        for (const request of pendingRequests) {
          const balance = await this.balanceReadService.getBalance(
            request.employeeId,
            request.leaveType,
            request.year,
            request.locationId,
          );

          if (!balance || balance.available < request.totalDays) {
            const fromStatus = request.status;

            // Not enough balance → mark BALANCE_STALE
            request.status = RequestStatus.BALANCE_STALE;
            await this.requestWriteRepo.saveRequest(request);

            // Release the pending days back
            if (balance) {
              try {
                await this.balanceWriteService.releaseDays(
                  request.employeeId,
                  request.leaveType,
                  request.year,
                  request.totalDays,
                  request.locationId,
                );
              } catch {
                this.logger.warn(
                  `Could not release ${request.totalDays} days for request ${request.id}`,
                );
              }
            }

            // Record audit trail
            await this.requestWriteRepo.addAudit({
              requestId: request.id,
              fromStatus,
              toStatus: RequestStatus.BALANCE_STALE,
              actorId: 'system',
              actorRole: Role.SYSTEM,
              comment: 'Balance stale after HCM sync',
            });

            staleRequests++;
            this.logger.log(
              `Request ${request.id} marked BALANCE_STALE (available: ${balance?.available ?? 0}, needed: ${request.totalDays})`,
            );
          }
        }
      }

      this.logger.log(
        `Sync job ${jobId} completed: ${recordsSynced} synced, ${staleRequests} stale`,
      );

      return { jobId, status: 'completed', recordsSynced, staleRequests };
    } catch (error) {
      this.logger.error(`Sync job ${jobId} failed`, error);
      return {
        jobId,
        status: recordsSynced > 0 ? 'partial' : 'failed',
        recordsSynced,
        staleRequests,
      };
    }
  }
}
