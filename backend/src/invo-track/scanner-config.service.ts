import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/prisma.service';
import { TokenPayload } from 'src/user/dto/token-payload.dto';
import { SubscriptionLimitsService } from './subscription-limits.service';
import {
  CreateScannerConfigDto,
  UpdateScannerConfigDto,
} from './dto/scanner-config.dto';

const scannerInclude = {
  workstation: { select: { id: true, label: true } },
  assignedUser: { select: { username: true, displayName: true } },
  cctvConfig: { select: { id: true, label: true, isOnline: true } },
} as const;

@Injectable()
export class ScannerConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly limits: SubscriptionLimitsService,
  ) {}

  async assertUniqueAssignments(
    organizationName: string,
    cctvConfigId: string,
    assignedUsername: string | null | undefined,
    excludeId?: string,
  ) {
    const cctvTaken = await this.prisma.scannerConfig.findFirst({
      where: {
        organizationName,
        cctvConfigId,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { label: true },
    });
    if (cctvTaken) {
      throw new BadRequestException(
        `CCTV sudah dipakai scanner "${cctvTaken.label}"`,
      );
    }

    if (!assignedUsername) return;

    const userTaken = await this.prisma.scannerConfig.findFirst({
      where: {
        organizationName,
        assignedUsername,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { label: true },
    });
    if (userTaken) {
      throw new BadRequestException(
        `Operator sudah dipakai scanner "${userTaken.label}"`,
      );
    }
  }

  async list(userInfo: TokenPayload, workstationId?: string) {
    return this.prisma.scannerConfig.findMany({
      where: {
        organizationName: userInfo.organizationName,
        ...(workstationId ? { workstationId } : {}),
      },
      include: scannerInclude,
      orderBy: { label: 'asc' },
    });
  }

  async create(userInfo: TokenPayload, dto: CreateScannerConfigDto) {
    await this.limits.assertCanAddScanner(userInfo.organizationName);

    const workstation = await this.prisma.workstation.findFirst({
      where: {
        id: dto.workstationId,
        organizationName: userInfo.organizationName,
      },
    });
    if (!workstation) {
      throw new BadRequestException('Workstation tidak ditemukan');
    }

    const workstationScanners = await this.prisma.scannerConfig.count({
      where: {
        organizationName: userInfo.organizationName,
        workstationId: dto.workstationId,
      },
    });
    if (workstationScanners >= 6) {
      throw new BadRequestException('Maksimal 6 scanner/CCTV per workstation');
    }

    const cctv = await this.prisma.cctvConfig.findFirst({
      where: {
        id: dto.cctvConfigId,
        organizationName: userInfo.organizationName,
        isActive: true,
      },
    });
    if (!cctv) {
      throw new BadRequestException('CCTV tidak ditemukan atau tidak aktif');
    }

    if (dto.assignedUsername) {
      const user = await this.prisma.user.findFirst({
        where: {
          username: dto.assignedUsername,
          organizationName: userInfo.organizationName,
        },
      });
      if (!user) {
        throw new BadRequestException('Operator tidak ditemukan di organisasi');
      }
    }

    await this.assertUniqueAssignments(
      userInfo.organizationName,
      dto.cctvConfigId,
      dto.assignedUsername,
    );

    return this.prisma.scannerConfig.create({
      data: {
        organizationName: userInfo.organizationName,
        workstationId: dto.workstationId,
        label: dto.label.trim(),
        cctvConfigId: dto.cctvConfigId,
        assignedUsername: dto.assignedUsername ?? null,
        baudRate: dto.baudRate ?? 9600,
        usbVendorId: dto.usbVendorId ?? null,
        usbProductId: dto.usbProductId ?? null,
        isActive: dto.isActive ?? true,
      },
      include: scannerInclude,
    });
  }

  async update(
    id: string,
    userInfo: TokenPayload,
    dto: UpdateScannerConfigDto,
  ) {
    const existing = await this.prisma.scannerConfig.findFirst({
      where: { id, organizationName: userInfo.organizationName },
    });
    if (!existing) throw new NotFoundException('Scanner tidak ditemukan');

    if (dto.workstationId) {
      const ws = await this.prisma.workstation.findFirst({
        where: {
          id: dto.workstationId,
          organizationName: userInfo.organizationName,
        },
      });
      if (!ws) throw new BadRequestException('Workstation tidak ditemukan');

      if (dto.workstationId !== existing.workstationId) {
        const workstationScanners = await this.prisma.scannerConfig.count({
          where: {
            organizationName: userInfo.organizationName,
            workstationId: dto.workstationId,
          },
        });
        if (workstationScanners >= 6) {
          throw new BadRequestException('Maksimal 6 scanner/CCTV per workstation');
        }
      }
    }

    if (dto.cctvConfigId) {
      const cctv = await this.prisma.cctvConfig.findFirst({
        where: {
          id: dto.cctvConfigId,
          organizationName: userInfo.organizationName,
        },
      });
      if (!cctv) throw new BadRequestException('CCTV tidak ditemukan');
    }

    if (dto.assignedUsername) {
      const user = await this.prisma.user.findFirst({
        where: {
          username: dto.assignedUsername,
          organizationName: userInfo.organizationName,
        },
      });
      if (!user) {
        throw new BadRequestException('Operator tidak ditemukan di organisasi');
      }
    }

    const nextCctv = dto.cctvConfigId ?? existing.cctvConfigId;
    const nextUser =
      dto.assignedUsername !== undefined
        ? dto.assignedUsername
        : existing.assignedUsername;

    await this.assertUniqueAssignments(
      userInfo.organizationName,
      nextCctv,
      nextUser,
      id,
    );

    return this.prisma.scannerConfig.update({
      where: { id },
      data: {
        label: dto.label?.trim(),
        workstationId: dto.workstationId,
        cctvConfigId: dto.cctvConfigId,
        assignedUsername: dto.assignedUsername,
        baudRate: dto.baudRate,
        usbVendorId: dto.usbVendorId,
        usbProductId: dto.usbProductId,
        isActive: dto.isActive,
      },
      include: scannerInclude,
    });
  }

  async remove(id: string, userInfo: TokenPayload) {
    const existing = await this.prisma.scannerConfig.findFirst({
      where: { id, organizationName: userInfo.organizationName },
    });
    if (!existing) throw new NotFoundException('Scanner tidak ditemukan');

    await this.prisma.scannerConfig.delete({ where: { id } });
    return { message: 'Scanner dihapus' };
  }

  async getQuota(userInfo: TokenPayload) {
    return this.limits.getScannerLimits(userInfo.organizationName);
  }
}
