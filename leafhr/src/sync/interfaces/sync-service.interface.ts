/**
 * ISyncService – Orchestrates HCM-to-LeafHR balance synchronisation.
 *
 * TRD §8.6: triggerSync mutation calls the HCM batch endpoint,
 * upserts balances, and revalidates all pending requests.
 */
export interface ISyncService {
  /**
   * Trigger a full sync from HCM.
   * @returns jobId for tracking and number of records synced.
   */
  triggerSync(): Promise<SyncResult>;
}

export interface SyncResult {
  jobId: string;
  status: 'completed' | 'partial' | 'failed';
  recordsSynced: number;
  staleRequests: number;
}
