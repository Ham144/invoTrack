import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/prisma.service';
import { CreateAppUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { LoginResponseDto } from './dto/login.dto';
import { plainToInstance } from 'class-transformer';
import { UpdateAppUserDto } from './dto/update-user.dto';
import { TokenPayload } from './dto/token-payload.dto';
import { Prisma } from '@prisma/client';

const userInclude = {
  assignedScanner: {
    select: { id: true, label: true },
  },
} as const;

@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService) {}

  async createAppUser(body: CreateAppUserDto, userInfo: TokenPayload) {
    const passwordHash = await bcrypt.hash(body.password, 10);

    await this.prismaService.user.create({
      data: {
        username: body.username.toLowerCase(),
        displayName: body.displayName || body.username,
        description: body.description,
        role: body.role,
        mail: body.mail,
        isActive: body.isActive ?? true,
        passwordHash,
        organization: {
          connect: { name: userInfo.organizationName },
        },
      },
    });
    return { message: 'berhasil membuat user app' };
  }

  private escapeForContains(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_');
  }

  async getAllAccountForMemberManagement(
    page: number,
    searchKey: string | string[] | undefined,
    userInfo: TokenPayload,
    role?: string,
  ) {
    const where: Prisma.UserWhereInput = {
      organizationName: userInfo.organizationName,
    };

    if (role && role !== 'all') {
      where.role = role;
    }

    const key =
      typeof searchKey === 'string'
        ? searchKey
        : Array.isArray(searchKey)
          ? searchKey[0]
          : '';
    const trimmed = key?.trim();
    if (trimmed) {
      where.username = {
        contains: this.escapeForContains(trimmed),
        mode: 'insensitive',
      };
    }

    const [accounts, total] = await Promise.all([
      this.prismaService.user.findMany({
        where,
        include: userInclude,
        skip: (page - 1) * 50,
        take: 50,
        orderBy: { createdAt: 'desc' },
      }),
      this.prismaService.user.count({ where }),
    ]);

    return {
      items: accounts.map((account) =>
        plainToInstance(LoginResponseDto, account, {
          excludeExtraneousValues: true,
        }),
      ),
      total,
      page,
    };
  }

  async updateAccount(body: UpdateAppUserDto, userInfo?: TokenPayload) {
    const { username, password, ...rest } = body;

    const existing = await this.prismaService.user.findUnique({
      where: { username },
    });
    if (!existing) throw new NotFoundException('User tidak ditemukan');

    const data: Prisma.UserUpdateInput = { ...rest };
    if (password) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }

    const updated = await this.prismaService.user.update({
      where: { username },
      data,
      include: userInclude,
    });

    return plainToInstance(LoginResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  async deleteAppUser(username: string) {
    return this.prismaService.user.delete({ where: { username } });
  }
}
