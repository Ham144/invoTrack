import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ScannerConfigService } from './scanner-config.service';
import { Auth } from 'src/common/auth.decorator';
import { TokenPayload } from 'src/user/dto/token-payload.dto';
import { Authorization } from 'src/common/authorization.decorator';
import {
  CreateScannerConfigDto,
  UpdateScannerConfigDto,
} from './dto/scanner-config.dto';

@Controller('scanner-config')
export class ScannerConfigController {
  constructor(private readonly service: ScannerConfigService) {}

  @Authorization('ADMIN_ORGANIZATION', 'ADMIN_GUDANG', 'OPERATOR')
  @Get()
  list(
    @Auth() userInfo: TokenPayload,
    @Query('workstationId') workstationId?: string,
  ) {
    return this.service.list(userInfo, workstationId?.trim() || undefined);
  }

  @Authorization('ADMIN_ORGANIZATION', 'ADMIN_GUDANG', 'OPERATOR')
  @Get('quota')
  quota(@Auth() userInfo: TokenPayload) {
    return this.service.getQuota(userInfo);
  }

  @Authorization('ADMIN_ORGANIZATION')
  @Post()
  create(
    @Auth() userInfo: TokenPayload,
    @Body() dto: CreateScannerConfigDto,
  ) {
    return this.service.create(userInfo, dto);
  }

  @Authorization('ADMIN_ORGANIZATION')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Auth() userInfo: TokenPayload,
    @Body() dto: UpdateScannerConfigDto,
  ) {
    return this.service.update(id, userInfo, dto);
  }

  @Authorization('ADMIN_ORGANIZATION')
  @Delete(':id')
  remove(@Param('id') id: string, @Auth() userInfo: TokenPayload) {
    return this.service.remove(id, userInfo);
  }
}
