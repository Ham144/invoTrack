import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { DeviceHealthService } from './device-health.service';
import { InvoiceScanService } from './invoice-scan.service';
import { Auth } from 'src/common/auth.decorator';
import { TokenPayload } from 'src/user/dto/token-payload.dto';
import { Authorization } from 'src/common/authorization.decorator';

@Controller('invo-track')
export class BuktiScanStatusController {
  constructor(
    private readonly deviceHealth: DeviceHealthService,
    private readonly invoiceScan: InvoiceScanService,
  ) {}

  @Authorization('ADMIN_ORGANIZATION', 'ADMIN_GUDANG', 'OPERATOR')
  @Get('devices/status')
  getStatus(@Auth() userInfo: TokenPayload) {
    return this.deviceHealth.getStatus(userInfo);
  }

  @Authorization('ADMIN_ORGANIZATION', 'ADMIN_GUDANG', 'OPERATOR')
  @Get('recording/active')
  getActiveRecordings(
    @Auth() userInfo: TokenPayload,
    @Query('cctvConfigId') cctvConfigId?: string,
    @Query('scannerConfigId') scannerConfigId?: string,
  ) {
    return this.invoiceScan.listActiveRecordings(userInfo.organizationName, {
      cctvConfigId: cctvConfigId?.trim() || undefined,
      scannerConfigId: scannerConfigId?.trim() || undefined,
    });
  }

  @Authorization('ADMIN_ORGANIZATION', 'ADMIN_GUDANG', 'OPERATOR')
  @Post('recording/:scanId/stop')
  stopRecording(
    @Auth() userInfo: TokenPayload,
    @Param('scanId') scanId: string,
  ) {
    return this.invoiceScan.stopRecordingManually(userInfo, scanId);
  }
}
