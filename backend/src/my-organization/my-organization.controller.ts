import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
  Res,
  Put,
} from '@nestjs/common';
import { MyOrganizationService } from './my-organization.service';
import { CreateMyOrganizationDto } from './dto/create-my-organization.dto';
import { UpdateMyOrganizationDto } from './dto/update-my-organization.dto';
import { Auth } from 'src/common/auth.decorator';
import { TokenPayload } from 'src/user/dto/token-payload.dto';
import { LoginResponseDto } from 'src/user/dto/login.dto';
import {
  accessTokenOption,
  refreshTokenOption,
} from 'src/user/tokenCookieOptions';
import { Authorization } from 'src/common/authorization.decorator';

@Controller('organization')
export class MyOrganizationController {
  constructor(private readonly myOrganizationService: MyOrganizationService) {}

  @Authorization('ADMIN_ORGANIZATION')
  @Post()
  create(@Body() createMyOrganizationDto: CreateMyOrganizationDto) {
    return this.myOrganizationService.create(createMyOrganizationDto);
  }

  @Authorization('ADMIN_ORGANIZATION', 'ADMIN_GUDANG', 'OPERATOR')
  @Post('switch')
  async switchOrganization(
    @Body('name') name: string,
    @Auth() userInfo: TokenPayload,
    @Res({ passthrough: true }) res: any,
    @Req() req: any,
  ) {
    const response: LoginResponseDto =
      await this.myOrganizationService.switchOrganization(name, userInfo, req);

    const { access_token, refresh_token, ...responseWithoutTokens } = response;

    if (response.refresh_token && response.access_token) {
      res.cookie('refresh_token', response.refresh_token, refreshTokenOption);
      res.cookie('access_token', response.access_token, accessTokenOption);
    }
    return responseWithoutTokens;
  }

  @Authorization('ADMIN_ORGANIZATION')
  @Get()
  getAllOrganizations(@Query() filter) {
    return this.myOrganizationService.getAllOrganizations(filter);
  }

  @Authorization()
  @Get('my-organizations')
  getMyOrganization(@Auth() userInfo: TokenPayload) {
    return this.myOrganizationService.getMyOrganizations(userInfo);
  }

  @Authorization()
  @Get('my-organization-settings')
  getMyOrganizationSettings(@Auth() userInfo: TokenPayload) {
    return this.myOrganizationService.getMyOrganizationSettings(userInfo);
  }

  @Authorization('ADMIN_ORGANIZATION')
  @Put('my-organization-settings')
  updateMyOrganizationSettings(
    @Auth() userInfo: TokenPayload,
    @Body() updateMyOrganizationDto: UpdateMyOrganizationDto,
  ) {
    return this.myOrganizationService.updateMyOrganizationSettings(
      userInfo,
      updateMyOrganizationDto,
    );
  }

  @Authorization('ADMIN_ORGANIZATION')
  @Get('/detail/:name')
  findOne(@Param('name') name: string) {
    return this.myOrganizationService.findOne(name);
  }

  @Authorization('ADMIN_ORGANIZATION')
  @Patch(':name')
  update(
    @Param('name') name: string,
    @Body() updateMyOrganizationDto: UpdateMyOrganizationDto,
  ) {
    return this.myOrganizationService.update(name, updateMyOrganizationDto);
  }

  @Authorization('ADMIN_ORGANIZATION')
  @Delete(':name')
  remove(@Param('name') name: string, @Auth() userInfo: TokenPayload) {
    return this.myOrganizationService.remove(name, userInfo);
  }

  //global tidak perlu login
  @Get('/landing-page')
  getLandingPage() {
    return this.myOrganizationService.getLandingPage();
  }
}
