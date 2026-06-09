import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InvoiceScanService } from './invoice-scan.service';

const SWEEP_INTERVAL_MS = 30_000;

@Injectable()
export class RecordingTimerService implements OnModuleInit, OnModuleDestroy {
  private timers = new Map<string, NodeJS.Timeout>();
  private sweepHandle: NodeJS.Timeout | null = null;

  constructor(
    @Inject(forwardRef(() => InvoiceScanService))
    private readonly invoiceScan: InvoiceScanService,
  ) {}

  onModuleInit() {
    void this.restoreTimers();
    this.sweepHandle = setInterval(() => {
      void this.invoiceScan.sweepExpiredRecordings();
    }, SWEEP_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.sweepHandle) clearInterval(this.sweepHandle);
    for (const t of this.timers.values()) clearTimeout(t);
    this.timers.clear();
  }

  schedule(scanId: string, durationSec: number) {
    this.cancel(scanId);
    if (!durationSec || durationSec <= 0) return;

    const handle = setTimeout(() => {
      this.timers.delete(scanId);
      void this.invoiceScan
        .completeRecording(scanId, 'TIME_LIMIT')
        .catch(() => {});
    }, durationSec * 1000);

    this.timers.set(scanId, handle);
  }

  cancel(scanId: string) {
    const t = this.timers.get(scanId);
    if (t) {
      clearTimeout(t);
      this.timers.delete(scanId);
    }
  }

  private async restoreTimers() {
    const rows = await this.invoiceScan.listActiveRecordingMeta();
    for (const row of rows) {
      const elapsedMs = Date.now() - row.scannedAt.getTime();
      const remainingMs = row.maxDurationSec * 1000 - elapsedMs;
      if (remainingMs <= 0) {
        void this.invoiceScan
          .completeRecording(row.scanId, 'TIME_LIMIT')
          .catch(() => {});
      } else {
        const handle = setTimeout(() => {
          this.timers.delete(row.scanId);
          void this.invoiceScan
            .completeRecording(row.scanId, 'TIME_LIMIT')
            .catch(() => {});
        }, remainingMs);
        this.timers.set(row.scanId, handle);
      }
    }
  }
}
