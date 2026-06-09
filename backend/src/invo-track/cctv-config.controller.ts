import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { CctvConfigService } from './cctv-config.service';
import { Auth } from 'src/common/auth.decorator';
import { TokenPayload } from 'src/user/dto/token-payload.dto';
import { Authorization } from 'src/common/authorization.decorator';
import { CreateCctvConfigDto } from './dto/create-cctv-config.dto';
import { UpdateCctvConfigDto } from './dto/update-cctv-config.dto';

@Controller('cctv-config')
export class CctvConfigController {
  constructor(private readonly service: CctvConfigService) {}

  @Authorization('ADMIN_ORGANIZATION', 'ADMIN_GUDANG')
  @Get()
  findAll(@Auth() userInfo: TokenPayload) {
    return this.service.findAll(userInfo);
  }

  @Authorization('ADMIN_ORGANIZATION', 'ADMIN_GUDANG', 'OPERATOR')
  @Get('quota')
  quota(@Auth() userInfo: TokenPayload) {
    return this.service.getQuota(userInfo);
  }

  @Authorization('ADMIN_ORGANIZATION', 'ADMIN_GUDANG', 'OPERATOR')
  @Get(':id/snapshot')
  async snapshot(
    @Param('id') id: string,
    @Auth() userInfo: TokenPayload,
    @Res() res: Response,
  ) {
    const buffer = await this.service.getSnapshotBuffer(id, userInfo);
    res.set({
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'no-store',
    });
    res.send(buffer);
  }

  @Authorization('ADMIN_ORGANIZATION')
  @Post()
  create(@Auth() userInfo: TokenPayload, @Body() dto: CreateCctvConfigDto) {
    return this.service.create(userInfo, dto);
  }

  @Authorization('ADMIN_ORGANIZATION')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Auth() userInfo: TokenPayload,
    @Body() dto: UpdateCctvConfigDto,
  ) {
    return this.service.update(id, userInfo, dto);
  }

  @Authorization('ADMIN_ORGANIZATION')
  @Delete(':id')
  remove(@Param('id') id: string, @Auth() userInfo: TokenPayload) {
    return this.service.remove(id, userInfo);
  }
}
