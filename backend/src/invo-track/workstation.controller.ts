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
import { Auth } from 'src/common/auth.decorator';
import { TokenPayload } from 'src/user/dto/token-payload.dto';
import { Authorization } from 'src/common/authorization.decorator';
import {
  CreateWorkstationDto,
  UpdateWorkstationDto,
} from './dto/workstation.dto';

@Controller('workstation')
export class WorkstationController {
  constructor(private readonly service: WorkstationService) {}

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
}
