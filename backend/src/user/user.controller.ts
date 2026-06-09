import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Req,
  Res,
  Query,
  ParseIntPipe,
  Param,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { refreshTokenOption, accessTokenOption } from './tokenCookieOptions';
import { LoginResponseDto, LoginRequestDto } from './dto/login.dto';
import { CreateAppUserDto } from './dto/create-user.dto';
import { UserService } from './user.service';
import { AuthService } from './auth.service';
import { UpdateAppUserDto } from './dto/update-user.dto';
import { Auth } from 'src/common/auth.decorator';
import { TokenPayload } from './dto/token-payload.dto';
import { Authorization } from 'src/common/authorization.decorator';

@Controller('/user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {}

  @Post('/login')
  async login(
    @Body() body: LoginRequestDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    const response: LoginResponseDto = await this.authService.login(body, req);
    if (response.refresh_token && response.access_token) {
      res.cookie('refresh_token', response.refresh_token, refreshTokenOption);
      res.cookie('access_token', response.access_token, accessTokenOption);
    }
    const { refresh_token, access_token, ...rest } = response;
    return rest;
  }

  @Post('/refresh-token')
  async refreshToken(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req?.cookies['refresh_token'];
    if (!refreshToken) {
      res.status(401);
      return { message: 'No refresh token' };
    }
    try {
      const { access_token, refresh_token: new_refresh_token } =
        await this.authService.refreshToken(refreshToken);

      res.cookie('refresh_token', new_refresh_token, refreshTokenOption);
      res.cookie('access_token', access_token, accessTokenOption);
      return { message: 'Refresh token updated' };
    } catch (err) {
      throw err;
    }
  }

  @Authorization()
  @Get('/get-user-info')
  async getUserInfo(@Auth() userInfo: TokenPayload) {
    return this.authService.getUserInfo(userInfo);
  }

  @Authorization('ADMIN_ORGANIZATION')
  @Get('/list-member-management')
  async getAllAccountForMemberManagement(
    @Query('page', ParseIntPipe) page: number,
    @Query('searchKey') searchKey: string,
    @Query('role') role: string,
    @Auth() userInfo: TokenPayload,
  ) {
    return this.userService.getAllAccountForMemberManagement(
      page,
      searchKey,
      userInfo,
      role,
    );
  }

  @Authorization('ADMIN_ORGANIZATION')
  @Post('/create')
  async createAppUser(
    @Body() body: CreateAppUserDto,
    @Auth() userInfo: TokenPayload,
  ) {
    return this.userService.createAppUser(body, userInfo);
  }

  @Authorization('ADMIN_ORGANIZATION')
  @Patch('/update')
  async updateAccount(
    @Body() body: UpdateAppUserDto,
    @Auth() userInfo: TokenPayload,
  ) {
    return this.userService.updateAccount(body, userInfo);
  }

  @Authorization()
  @Delete('/logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const access_token = req?.cookies['access_token'];
    await this.authService.logout(access_token);
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
    return { message: 'Logout success' };
  }

  @Authorization('ADMIN_ORGANIZATION')
  @Delete('/delete/:username')
  async deleteAppUser(@Param('username') username: string) {
    return this.userService.deleteAppUser(username);
  }
}
