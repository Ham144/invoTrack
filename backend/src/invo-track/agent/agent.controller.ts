import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentAuthGuard } from './agent-auth.guard';
import { AgentAuth } from './agent.decorator';
import type { AgentContext } from './agent.decorator';
import {
  AgentCompleteDto,
  AgentHeartbeatDto,
  AgentIngestDto,
  AgentPairDto,
  AgentPairUsbDto,
  AgentReconcileClipsDto,
  UpdateAgentSettingsDto,
} from './dto/agent.dto';

@Controller('agent')
export class AgentController {
  constructor(private readonly service: AgentService) {}

  @Post('pair')
  pair(@Body() dto: AgentPairDto) {
    return this.service.pair(dto);
  }

  @UseGuards(AgentAuthGuard)
  @Get('config')
  getConfig(@AgentAuth() agent: AgentContext) {
    return this.service.getConfig(agent);
  }

  @UseGuards(AgentAuthGuard)
  @Post('ingest')
  ingest(@AgentAuth() agent: AgentContext, @Body() dto: AgentIngestDto) {
    return this.service.ingest(agent, dto);
  }

  @UseGuards(AgentAuthGuard)
  @Post('recording/:scanId/complete')
  complete(
    @AgentAuth() agent: AgentContext,
    @Param('scanId') scanId: string,
    @Body() dto: AgentCompleteDto,
  ) {
    return this.service.complete(agent, scanId, dto);
  }

  @UseGuards(AgentAuthGuard)
  @Post('heartbeat')
  heartbeat(
    @AgentAuth() agent: AgentContext,
    @Body() dto: AgentHeartbeatDto,
  ) {
    return this.service.heartbeat(agent, dto);
  }

  @UseGuards(AgentAuthGuard)
  @Get('active-recordings')
  activeRecordings(@AgentAuth() agent: AgentContext) {
    return this.service.listActiveRecordings(agent);
  }

  @UseGuards(AgentAuthGuard)
  @Get('recent-scans')
  recentScans(@AgentAuth() agent: AgentContext) {
    return this.service.listRecentScans(agent);
  }

  @UseGuards(AgentAuthGuard)
  @Post('recording/:scanId/fail')
  failRecording(
    @AgentAuth() agent: AgentContext,
    @Param('scanId') scanId: string,
  ) {
    return this.service.failRecording(agent, scanId);
  }

  @UseGuards(AgentAuthGuard)
  @Post('clips/reconcile')
  reconcileClips(
    @AgentAuth() agent: AgentContext,
    @Body() dto: AgentReconcileClipsDto,
  ) {
    return this.service.reconcileClips(agent, dto.clips);
  }

  @UseGuards(AgentAuthGuard)
  @Post('scanner/:scannerId/pair-usb')
  pairUsb(
    @AgentAuth() agent: AgentContext,
    @Param('scannerId') scannerId: string,
    @Body() dto: AgentPairUsbDto,
  ) {
    return this.service.pairUsb(
      agent,
      scannerId,
      dto.usbVendorId,
      dto.usbProductId,
      dto.serialPortPath,
    );
  }
}
