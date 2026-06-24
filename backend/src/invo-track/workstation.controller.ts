import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { WorkstationService } from './workstation.service';
import { AgentService } from './agent/agent.service';
import { Auth } from 'src/common/auth.decorator';
import { TokenPayload } from 'src/user/dto/token-payload.dto';
import { Authorization } from 'src/common/authorization.decorator';
import {
  CreateWorkstationDto,
  UpdateWorkstationDto,
} from './dto/workstation.dto';

@Controller('workstation')
export class WorkstationController {
  constructor(
    private readonly service: WorkstationService,
    private readonly agentService: AgentService,
  ) {}

  @Authorization('ADMIN_ORGANIZATION', 'ADMIN_GUDANG', 'OPERATOR')
  @Get()
  list(@Auth() userInfo: TokenPayload) {
    return this.service.list(userInfo);
  }

  @Authorization('ADMIN_ORGANIZATION')
  @Post()
  create(@Auth() userInfo: TokenPayload, @Body() dto: CreateWorkstationDto) {
    return this.service.create(userInfo, dto);
  }

  @Authorization('ADMIN_ORGANIZATION')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Auth() userInfo: TokenPayload,
    @Body() dto: UpdateWorkstationDto,
  ) {
    return this.service.update(id, userInfo, dto);
  }

  @Authorization('ADMIN_ORGANIZATION')
  @Delete(':id')
  remove(@Param('id') id: string, @Auth() userInfo: TokenPayload) {
    return this.service.remove(id, userInfo);
  }

  @Authorization('ADMIN_ORGANIZATION', 'ADMIN_GUDANG', 'OPERATOR')
  @Post(':id/heartbeat')
  heartbeat(@Param('id') id: string, @Auth() userInfo: TokenPayload) {
    return this.service.heartbeat(id, userInfo);
  }

  @Authorization('ADMIN_ORGANIZATION', 'ADMIN_GUDANG')
  @Post(':id/agent/pairing-code')
  generatePairingCode(@Param('id') id: string, @Auth() userInfo: TokenPayload) {
    return this.agentService.generatePairingCode(id, userInfo);
  }

  @Authorization('ADMIN_ORGANIZATION', 'ADMIN_GUDANG', 'OPERATOR')
  @Get(':id/agent/status')
  agentStatus(@Param('id') id: string, @Auth() userInfo: TokenPayload) {
    return this.agentService.getAgentStatus(id, userInfo);
  }
}
