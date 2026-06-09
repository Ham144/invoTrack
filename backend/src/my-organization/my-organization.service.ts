import {
  ForbiddenException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateMyOrganizationDto } from './dto/create-my-organization.dto';
import { UpdateMyOrganizationDto } from './dto/update-my-organization.dto';
import { TokenPayload } from 'src/user/dto/token-payload.dto';
import { PrismaService } from 'src/common/prisma.service';
import { plainToInstance } from 'class-transformer';
import { ResponseMyOrganizationDto } from './dto/response-my-organization.dto';
import { AuthService } from 'src/user/auth.service';
import { RedisService } from 'src/redis/redis.service';
import { randomUUID } from 'crypto';
import { LoginResponseDto } from 'src/user/dto/login.dto';
import {
  GetLandingPageStats,
  ROLE,
  SubscriptionPlan,
} from 'src/common/shared-enum';
import { BaseProps } from 'src/common/shared-interface';
import { ResponseMyOrganizationSettingsDto } from './dto/response-my-organization-settings.dto';

@Injectable()
export class MyOrganizationService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly authService: AuthService,
    private readonly redis: RedisService,
  ) {}

  async create(createMyOrganizationDto: CreateMyOrganizationDto) {
    const supertenant = await this.prismaService.user.findUnique({
      where: { username: 'test' },
    });

    const accounts = [supertenant, ...createMyOrganizationDto.accounts].filter(
      Boolean,
    );

    return this.prismaService.organization.create({
      data: {
        name: createMyOrganizationDto.name,
        subscription: {
          create: {
            start: new Date(),
            plan: 'TRIAL',
          },
        },
        accounts: {
          connect: accounts.map((user) => ({
            username: user.username,
          })),
        },
      },
      include: { subscription: true },
    });
  }

  async getMyOrganizations(userInfo: TokenPayload) {
    const organizations = await this.prismaService.organization.findMany({
      where: {
        accounts: {
          some: { username: userInfo.username },
        },
      },
    });
    return organizations.map((org) =>
      plainToInstance(ResponseMyOrganizationDto, org, {
        excludeExtraneousValues: true,
      }),
    );
  }

  async getAllOrganizations(filter: BaseProps) {
    const { page, searchKey } = filter;
    let where = {};
    if (searchKey) {
      where = {
        OR: [{ name: { contains: searchKey, mode: 'insensitive' } }],
      };
    }
    const organizations = await this.prismaService.organization.findMany({
      where,
      skip: ((page || 1) - 1) * 50,
      take: 50,
    });
    return organizations.map((org) =>
      plainToInstance(ResponseMyOrganizationDto, org, {
        excludeExtraneousValues: true,
      }),
    );
  }

  async findOne(name: string) {
    const org = await this.prismaService.organization.findUnique({
      where: { name },
      include: {
        accounts: true,
        cctvConfigs: true,
      },
    });
    if (!org) throw new NotFoundException('Organisasi tidak ditemukan');
    return plainToInstance(ResponseMyOrganizationDto, org, {
      excludeExtraneousValues: true,
      groups: ['detail'],
    });
  }

  async update(name: string, updateMyOrganizationDto: UpdateMyOrganizationDto) {
    const { accounts, subscription, ...rest } = updateMyOrganizationDto;
    return this.prismaService.organization.update({
      where: { name },
      data: {
        ...rest,
        accounts: accounts
          ? {
              set: accounts.map((u) => ({ username: u.username })),
            }
          : undefined,
      },
    });
  }

  async switchOrganization(
    targetOrgName: string,
    userInfo: TokenPayload,
    req: any,
  ) {
    const membership = await this.prismaService.organization.findFirst({
      where: {
        name: targetOrgName,
        accounts: { some: { username: userInfo.username } },
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        'Anda tidak memiliki akses ke organisasi yang dipilih',
      );
    }

    const user = await this.prismaService.user.findUnique({
      where: { username: userInfo.username },
    });

    if (!user) throw new NotFoundException('User tidak ditemukan');

    await this.prismaService.user.update({
      where: { username: user.username },
      data: {
        organization: { connect: { name: targetOrgName } },
      },
    });

    const payload: TokenPayload = {
      username: user.username,
      role: user.role as ROLE,
      organizationName: targetOrgName,
      jti: randomUUID(),
    };

    const access_token = this.authService.generateToken(payload, 'access');
    const refresh_token = this.authService.generateToken(payload, 'refresh');

    if (!access_token || !refresh_token) {
      throw new InternalServerErrorException('Gagal membuat token autentikasi');
    }

    await this.redis.set(
      payload.jti,
      JSON.stringify({
        username: payload.username,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        switchedTo: targetOrgName,
      }),
      604800,
    );

    return plainToInstance(
      LoginResponseDto,
      { ...user, ...payload },
      { excludeExtraneousValues: true, groups: ['login'] },
    );
  }

  async remove(name: string, userInfo: TokenPayload) {
    if (userInfo.role != ROLE.ADMIN_ORGANIZATION) {
      return HttpStatus.FORBIDDEN;
    }
    const org = await this.prismaService.organization.findUnique({
      where: { name },
    });
    if (!org) return HttpStatus.FORBIDDEN;
    await this.prismaService.organization.delete({ where: { name } });
    return HttpStatus.ACCEPTED;
  }

  async getLandingPage() {
    const now = new Date();
    const todayGte = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
    );

    const [totalOrganizations, totalScansToday, activeCctv, onlineCctv] =
      await Promise.all([
        this.prismaService.organization.count(),
        this.prismaService.invoiceScan.count({
          where: { scannedAt: { gte: todayGte } },
        }),
        this.prismaService.cctvConfig.count({ where: { isActive: true } }),
        this.prismaService.cctvConfig.count({ where: { isOnline: true } }),
      ]);

    const response: GetLandingPageStats = {
      totalOrganizations,
      totalScansToday,
      activeCctv,
      onlineCctv,
    };
    return response;
  }

  async getMyOrganizationSettings(userInfo: TokenPayload) {
    const org = await this.prismaService.organization.findUnique({
      where: { name: userInfo.organizationName },
    });
    if (!org) throw new NotFoundException('Organisasi tidak ditemukan');
    return plainToInstance(ResponseMyOrganizationSettingsDto, org, {
      excludeExtraneousValues: true,
    });
  }

  async updateMyOrganizationSettings(
    userinfo: TokenPayload,
    body: UpdateMyOrganizationDto,
  ) {
    const { name, subscription, accounts, ...rest } = body;
    await this.prismaService.organization.update({
      where: {
        accounts: { some: { username: userinfo.username } },
        name,
      },
      data: { ...rest },
    });
    return { message: 'Berhasil memperbarui setting organisasi' };
  }
}
