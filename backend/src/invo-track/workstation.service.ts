import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/prisma.service';
import { TokenPayload } from 'src/user/dto/token-payload.dto';
import {
  CreateWorkstationDto,
  UpdateWorkstationDto,
} from './dto/workstation.dto';

@Injectable()
export class WorkstationService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userInfo: TokenPayload) {
    return this.prisma.workstation.findMany({
      where: { organizationName: userInfo.organizationName },
      include: {
        _count: { select: { scanners: true } },
        agentDevice: {
          select: {
            pairedAt: true,
            lastSeenAt: true,
            agentVersion: true,
            clipsDir: true,
          },
        },
      },
      orderBy: { label: 'asc' },
    });
  }

  async create(userInfo: TokenPayload, dto: CreateWorkstationDto) {
    return this.prisma.workstation.create({
      data: {
        organizationName: userInfo.organizationName,
        label: dto.label.trim(),
        isActive: dto.isActive ?? true,
      },
      include: { _count: { select: { scanners: true } } },
    });
  }

  async update(
    id: string,
    userInfo: TokenPayload,
    dto: UpdateWorkstationDto,
  ) {
    const existing = await this.prisma.workstation.findFirst({
      where: { id, organizationName: userInfo.organizationName },
    });
    if (!existing) throw new NotFoundException('Workstation tidak ditemukan');

    return this.prisma.workstation.update({
      where: { id },
      data: {
        label: dto.label?.trim(),
        isActive: dto.isActive,
      },
      include: { _count: { select: { scanners: true } } },
    });
  }

  async remove(id: string, userInfo: TokenPayload) {
    const existing = await this.prisma.workstation.findFirst({
      where: { id, organizationName: userInfo.organizationName },
      include: { _count: { select: { scanners: true } } },
    });
    if (!existing) throw new NotFoundException('Workstation tidak ditemukan');
    if (existing._count.scanners > 0) {
      throw new BadRequestException(
        'Hapus atau pindahkan scanner dulu sebelum menghapus workstation',
      );
    }

    await this.prisma.workstation.delete({ where: { id } });
    return { message: 'Workstation dihapus' };
  }

  async heartbeat(id: string, userInfo: TokenPayload) {
    const existing = await this.prisma.workstation.findFirst({
      where: { id, organizationName: userInfo.organizationName, isActive: true },
    });
    if (!existing) throw new NotFoundException('Workstation tidak ditemukan');

    return this.prisma.workstation.update({
      where: { id },
      data: { lastSeenAt: new Date() },
    });
  }
}
