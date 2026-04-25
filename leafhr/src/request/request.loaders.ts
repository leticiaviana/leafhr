import { AuditEntity } from './entities';

export interface IRequestLoaders {
  requestAudits: RequestAuditsLoader;
}

export class RequestAuditsLoader {
  private queuedIds = new Set<string>();
  private pendingResolves = new Map<
    string,
    Array<(rows: AuditEntity[]) => void>
  >();
  private pendingRejects = new Map<string, Array<(error: unknown) => void>>();
  private flushScheduled = false;

  constructor(
    private readonly fetchAuditsByRequestIds: (
      requestIds: string[],
    ) => Promise<AuditEntity[]>,
  ) {}

  load(requestId: string): Promise<AuditEntity[]> {
    return new Promise<AuditEntity[]>((resolve, reject) => {
      const resolves = this.pendingResolves.get(requestId) ?? [];
      resolves.push(resolve);
      this.pendingResolves.set(requestId, resolves);

      const rejects = this.pendingRejects.get(requestId) ?? [];
      rejects.push(reject);
      this.pendingRejects.set(requestId, rejects);

      this.queuedIds.add(requestId);

      if (!this.flushScheduled) {
        this.flushScheduled = true;
        queueMicrotask(() => {
          void this.flush();
        });
      }
    });
  }

  private async flush(): Promise<void> {
    this.flushScheduled = false;
    const requestIds = [...this.queuedIds];
    this.queuedIds.clear();

    if (requestIds.length === 0) {
      return;
    }

    try {
      const rows = await this.fetchAuditsByRequestIds(requestIds);
      const grouped = new Map<string, AuditEntity[]>();

      for (const row of rows) {
        const bucket = grouped.get(row.requestId) ?? [];
        bucket.push(row);
        grouped.set(row.requestId, bucket);
      }

      for (const requestId of requestIds) {
        const resolves = this.pendingResolves.get(requestId) ?? [];
        const payload = grouped.get(requestId) ?? [];
        resolves.forEach((resolve) => resolve(payload));
        this.pendingResolves.delete(requestId);
        this.pendingRejects.delete(requestId);
      }
    } catch (error) {
      for (const requestId of requestIds) {
        const rejects = this.pendingRejects.get(requestId) ?? [];
        rejects.forEach((reject) => reject(error));
        this.pendingResolves.delete(requestId);
        this.pendingRejects.delete(requestId);
      }
    }
  }
}

export function createRequestLoaders(
  fetchAuditsByRequestIds: (requestIds: string[]) => Promise<AuditEntity[]>,
): IRequestLoaders {
  return {
    requestAudits: new RequestAuditsLoader(fetchAuditsByRequestIds),
  };
}
