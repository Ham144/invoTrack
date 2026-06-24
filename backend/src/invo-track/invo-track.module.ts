import { Module } from '@nestjs/common';
import { CctvConfigController } from './cctv-config.controller';
import { CctvConfigService } from './cctv-config.service';
import { InvoiceScanController } from './invoice-scan.controller';
import { InvoiceScanService } from './invoice-scan.service';
import { FfmpegService } from './ffmpeg.service';
import { CctvSnapshotService } from './cctv-snapshot.service';
import { BuktiScanGateway } from './invo-track.gateway';
import { DeviceHealthService } from './device-health.service';
import { SubscriptionLimitsService } from './subscription-limits.service';
import { BuktiScanStatusController } from './invo-track-status.controller';
import { RecordingTimerService } from './recording-timer.service';
import { WorkstationController } from './workstation.controller';
import { WorkstationService } from './workstation.service';
import { ScannerConfigController } from './scanner-config.controller';
import { ScannerConfigService } from './scanner-config.service';
import { AgentController } from './agent/agent.controller';
import { AgentService } from './agent/agent.service';
import { AgentAuthGuard } from './agent/agent-auth.guard';

@Module({
  controllers: [
    CctvConfigController,
    InvoiceScanController,
    BuktiScanStatusController,
    WorkstationController,
    ScannerConfigController,
    AgentController,
  ],
  providers: [
    CctvConfigService,
    InvoiceScanService,
    FfmpegService,
    CctvSnapshotService,
    BuktiScanGateway,
    DeviceHealthService,
    SubscriptionLimitsService,
    RecordingTimerService,
    WorkstationService,
    ScannerConfigService,
    AgentService,
    AgentAuthGuard,
  ],
  exports: [BuktiScanGateway, InvoiceScanService],
})
export class BuktiScanModule {}
