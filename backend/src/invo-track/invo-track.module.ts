import { Module } from '@nestjs/common';
import { CctvConfigController } from './cctv-config.controller';
import { CctvConfigService } from './cctv-config.service';
import { InvoiceScanController } from './invoice-scan.controller';
import { InvoiceScanService } from './invoice-scan.service';
import { FfmpegService } from './ffmpeg.service';
import { CctvSnapshotService } from './cctv-snapshot.service';
import { InvoTrackGateway } from './invo-track.gateway';
import { DeviceHealthService } from './device-health.service';
import { SubscriptionLimitsService } from './subscription-limits.service';
import { InvoTrackStatusController } from './invo-track-status.controller';
import { RecordingTimerService } from './recording-timer.service';
import { WorkstationController } from './workstation.controller';
import { WorkstationService } from './workstation.service';
import { ScannerConfigController } from './scanner-config.controller';
import { ScannerConfigService } from './scanner-config.service';

@Module({
  controllers: [
    CctvConfigController,
    InvoiceScanController,
    InvoTrackStatusController,
    WorkstationController,
    ScannerConfigController,
  ],
  providers: [
    CctvConfigService,
    InvoiceScanService,
    FfmpegService,
    CctvSnapshotService,
    InvoTrackGateway,
    DeviceHealthService,
    SubscriptionLimitsService,
    RecordingTimerService,
    WorkstationService,
    ScannerConfigService,
  ],
  exports: [InvoTrackGateway, InvoiceScanService],
})
export class InvoTrackModule {}
