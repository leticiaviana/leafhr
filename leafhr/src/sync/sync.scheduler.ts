import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SyncService } from './sync.service';

/**
 * Periodic HCM → LeafHR sync.
 *
 * HCM is the source of truth for balances; sync runs automatically on a
 * schedule. There is no user-triggered sync mutation by design.
 *
 * Schedule is read from `SYNC_CRON_EXPRESSION` (default: every 6 hours).
 */
@Injectable()
export class SyncScheduler {
  private readonly logger = new Logger(SyncScheduler.name);

  constructor(private readonly syncService: SyncService) {}

  @Cron(process.env.SYNC_CRON_EXPRESSION ?? '0 */6 * * *', {
    name: 'hcm-sync',
  })
  async runSync(): Promise<void> {
    this.logger.log('Scheduled HCM sync started');
    const result = await this.syncService.triggerSync();
    this.logger.log(
      `Scheduled HCM sync finished: status=${result.status} synced=${result.recordsSynced} stale=${result.staleRequests}`,
    );
  }
}
