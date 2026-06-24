import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { InvoiceScanService } from './invoice-scan.service';
import { Auth } from 'src/common/auth.decorator';
import { TokenPayload } from 'src/user/dto/token-payload.dto';
import { Authorization } from 'src/common/authorization.decorator';

@Controller('invoice-scan')
export class InvoiceScanController {
  constructor(private readonly service: InvoiceScanService) {}

  @Authorization('ADMIN_ORGANIZATION', 'ADMIN_GUDANG', 'OPERATOR')
  @Get('list')
  list(
    @Auth() userInfo: TokenPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list(userInfo, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      status,
      search,
    });
  }

  @Authorization('ADMIN_ORGANIZATION', 'ADMIN_GUDANG', 'OPERATOR')
  @Get(':invoiceNumber')
  findOne(
    @Auth() userInfo: TokenPayload,
    @Param('invoiceNumber') invoiceNumber: string,
  ) {
    return this.service.findByInvoice(userInfo, invoiceNumber);
  }
}
