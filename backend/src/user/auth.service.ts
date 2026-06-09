import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/prisma.service';
import * as jwt from 'jsonwebtoken';
import { RedisService } from 'src/redis/redis.service';
import { randomUUID } from 'crypto';
import { LoginRequestDto, LoginResponseDto } from './dto/login.dto';
import { TokenPayload } from './dto/token-payload.dto';
import { plainToInstance } from 'class-transformer';
import * as bcrypt from 'bcrypt';
import { ROLE } from 'src/common/shared-enum';
import { Prisma } from '@prisma/client';

function normalizeUsername(input: string): string {
  const raw = input.trim();
  if (raw.includes('\\')) {
    return raw.split('\\').pop()!.toLowerCase();
  }
  if (raw.includes('@')) {
    return raw.split('@')[0].toLowerCase();
  }
  return raw.toLowerCase();
}

@Injectable()
export class AuthService {
  constructor(
    private prismaService: PrismaService,
    private redis: RedisService,
  ) {}

  async login(body: LoginRequestDto, req: any) {
    // #region agent log
    const userModelFields = Prisma.dmmf.datamodel.models
      .find((m) => m.name === 'User')
      ?.fields.map((f) => f.name);
    fetch('http://localhost:7525/ingest/56fe92df-f231-454d-96a6-16be82610eed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': '92cfd8',
      },
      body: JSON.stringify({
        sessionId: '92cfd8',
        runId: 'pre-fix',
        hypothesisId: 'A',
        location: 'auth.service.ts:login:entry',
        message: 'login attempt - prisma User model fields',
        data: {
          userModelFields,
          hasStaleField: userModelFields?.includes('currentCctvConfigId'),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    let user;
    try {
      user = await this.prismaService.user.findFirst({
        where: {
          username: {
            equals: normalizeUsername(body.username),
            mode: 'insensitive',
          },
        },
        include: { organization: true },
      });
      // #region agent log
      fetch(
        'http://localhost:7525/ingest/56fe92df-f231-454d-96a6-16be82610eed',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Debug-Session-Id': '92cfd8',
          },
          body: JSON.stringify({
            sessionId: '92cfd8',
            runId: 'pre-fix',
            hypothesisId: 'B',
            location: 'auth.service.ts:login:success',
            message: 'findFirst succeeded',
            data: { found: Boolean(user), username: user?.username },
            timestamp: Date.now(),
          }),
        },
      ).catch(() => {});
      // #endregion
    } catch (err: unknown) {
      // #region agent log
      fetch(
        'http://localhost:7525/ingest/56fe92df-f231-454d-96a6-16be82610eed',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Debug-Session-Id': '92cfd8',
          },
          body: JSON.stringify({
            sessionId: '92cfd8',
            runId: 'pre-fix',
            hypothesisId: 'C',
            location: 'auth.service.ts:login:error',
            message: 'findFirst failed',
            data: {
              errorName: err instanceof Error ? err.name : 'unknown',
              errorMessage:
                err instanceof Error ? err.message : String(err),
            },
            timestamp: Date.now(),
          }),
        },
      ).catch(() => {});
      // #endregion
      throw err;
    }

    if (!user) {
      throw new BadRequestException({
        message: 'credential yang anda masukkan salah',
      });
    }

    if (!user.passwordHash) {
      throw new BadRequestException(
        'Akun ini belum memiliki password. Hubungi admin organisasi.',
      );
    }

    const organization = user.organization;
    if (!organization) {
      throw new BadRequestException(
        'Anda tidak terdaftar di organisasi manapun.',
      );
    }

    const isPasswordCorrect = await bcrypt.compare(
      body.password,
      user.passwordHash,
    );

    if (!isPasswordCorrect) {
      throw new BadRequestException({
        message: 'credential yang anda masukkan salah',
      });
    }

    return this.issueTokens(user, organization.name, req);
  }

  private async issueTokens(user: any, organizationName: string, req: any) {
    const payload: TokenPayload = {
      username: user.username,
      role: user.role as ROLE,
      organizationName,
      jti: randomUUID(),
    };

    const access_token = this.generateToken(payload, 'access');
    const refresh_token = this.generateToken(payload, 'refresh');

    if (!access_token || !refresh_token) {
      throw new BadRequestException(
        'JWT belum dikonfigurasi (JWT_SECRET / JWT_SECRET_REFRESH).',
      );
    }

    try {
      await this.redis.set(
        payload.jti,
        JSON.stringify({
          username: payload.username,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        }),
        604800,
      );
    } catch {
      throw new InternalServerErrorException(
        'Layanan sesi tidak tersedia. Pastikan Redis berjalan.',
      );
    }

    const userInfo = {
      ...user,
      access_token,
      refresh_token,
      organizationName,
      role: user.role,
    };

    return plainToInstance(LoginResponseDto, userInfo, {
      excludeExtraneousValues: true,
      groups: ['login'],
    });
  }

  async refreshToken(refresh_token: string) {
    if (!refresh_token) throw new UnauthorizedException('No refresh token');

    try {
      const oldPayload: TokenPayload = await jwt.verify(
        refresh_token,
        process.env.JWT_SECRET_REFRESH,
      );

      let isJtiFound: string | null;
      try {
        isJtiFound = await this.redis.get(oldPayload.jti);
      } catch {
        throw new InternalServerErrorException(
          'Layanan sesi tidak tersedia. Pastikan Redis berjalan.',
        );
      }

      if (isJtiFound === null) {
        throw new UnauthorizedException('Session anda telah dicabut');
      }

      const userDB = await this.prismaService.user.findFirst({
        where: { username: oldPayload.username },
      });

      if (!userDB) throw new UnauthorizedException('Akun anda telah dihapus');

      const newJti = randomUUID();
      const newPayload: TokenPayload = {
        username: userDB.username,
        role: userDB.role as ROLE,
        organizationName: oldPayload.organizationName,
        jti: newJti,
      };

      const accessToken = await this.generateToken(newPayload, 'access');
      const refreshToken = await this.generateToken(newPayload, 'refresh');

      try {
        await this.redis.del(oldPayload.jti);
        await this.redis.set(
          newJti,
          JSON.stringify({
            username: userDB.username,
            refreshedAt: new Date().toISOString(),
          }),
          604800,
        );
      } catch {
        throw new InternalServerErrorException(
          'Layanan sesi tidak tersedia. Pastikan Redis berjalan.',
        );
      }

      return {
        access_token: accessToken,
        refresh_token: refreshToken,
      };
    } catch (err) {
      if (
        err instanceof UnauthorizedException ||
        err instanceof InternalServerErrorException
      ) {
        throw err;
      }
      throw new UnauthorizedException('Session Anda telah habis, login ulang');
    }
  }

  async getUserInfo(userInfo: TokenPayload) {
    const user = await this.prismaService.user.findUnique({
      where: { username: userInfo.username },
      include: {
        assignedScanner: {
          select: { id: true, label: true },
        },
      },
    });
    if (!user) {
      throw new UnauthorizedException('User tidak ditemukan');
    }
    return plainToInstance(
      LoginResponseDto,
      {
        ...user,
        organizationName: userInfo.organizationName,
      },
      { excludeExtraneousValues: true },
    );
  }

  async logout(access_token: string) {
    if (!access_token) {
      return { message: 'Access token missing' };
    }

    try {
      const oldPayload = jwt.verify(
        access_token,
        process.env.JWT_SECRET,
      ) as TokenPayload;
      await this.redis.del(oldPayload.jti);
      return { message: 'Redis jti deleted' };
    } catch {
      return { message: 'Token invalid or expired' };
    }
  }

  generateToken(
    payload: TokenPayload,
    type: 'access' | 'refresh' = 'access',
  ): string | null {
    try {
      const secret =
        type === 'access'
          ? process.env.JWT_SECRET
          : process.env.JWT_SECRET_REFRESH;
      const expiresIn = type === 'access' ? '10m' : '7d';
      if (!secret) return null;
      return jwt.sign(payload, secret, { expiresIn });
    } catch {
      return null;
    }
  }
}
