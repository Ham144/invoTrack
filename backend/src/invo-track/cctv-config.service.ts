import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/prisma.service';
import { TokenPayload } from 'src/user/dto/token-payload.dto';
import { CreateCctvConfigDto } from './dto/create-cctv-config.dto';
import { UpdateCctvConfigDto } from './dto/update-cctv-config.dto';
import { CctvSnapshotService } from './cctv-snapshot.service';
import { SubscriptionLimitsService } from './subscription-limits.service';

@Injectable()
export class CctvConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snapshot: CctvSnapshotService,
    private readonly limits: SubscriptionLimitsService,
  ) {}

  async findAll(userInfo: TokenPayload) {
    const rows = await this.prisma.cctvConfig.findMany({
      where: { organizationName: userInfo.organizationName },
      orderBy: { createdAt: 'desc' },
    });
    return rows.filter((r) => r.rtspUrl?.trim());
  }

  async create(userInfo: TokenPayload, dto: CreateCctvConfigDto) {
    const rtspUrl = dto.rtspUrl?.trim();
    const label = dto.label?.trim();
    if (!label || !rtspUrl) {
      throw new BadRequestException('Label dan URL RTSP wajib diisi');
    }

    await this.limits.assertCanAddCctv(userInfo.organizationName);

    return this.prisma.cctvConfig.create({
      data: {
        label,
        rtspUrl,
        username: dto.username?.trim() || null,
        password: dto.password?.trim() || null,
        isActive: dto.isActive ?? true,
        organizationName: userInfo.organizationName,
      },
    });
  }

  async update(
    id: string,
    userInfo: TokenPayload,
    dto: UpdateCctvConfigDto,
  ) {
    const existing = await this.prisma.cctvConfig.findFirst({
      where: { id, organizationName: userInfo.organizationName },
    });
    if (!existing) throw new NotFoundException('CCTV config tidak ditemukan');

    const data: UpdateCctvConfigDto = { ...dto };
    if (data.label !== undefined) data.label = data.label.trim();
    if (data.rtspUrl !== undefined) data.rtspUrl = data.rtspUrl.trim();

    return this.prisma.cctvConfig.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, userInfo: TokenPayload) {
    const existing = await this.prisma.cctvConfig.findFirst({
      where: { id, organizationName: userInfo.organizationName },
    });
    if (!existing) throw new NotFoundException('CCTV config tidak ditemukan');
    return this.prisma.cctvConfig.delete({ where: { id } });
  }

  async getSnapshotBuffer(id: string, userInfo: TokenPayload) {
    const cctv = await this.prisma.cctvConfig.findFirst({
      where: { id, organizationName: userInfo.organizationName, isActive: true },
    });
    if (!cctv) throw new NotFoundException('CCTV tidak ditemukan');

    if (!cctv.rtspUrl?.trim()) {
      throw new BadRequestException('URL RTSP kamera kosong');
    }

    try {
      return await this.snapshot.capture({
        rtspUrl: cctv.rtspUrl,
        username: cctv.username,
        password: cctv.password,
      });
    } catch (err) {
      const detail =
        err instanceof Error ? err.message : 'Preview CCTV gagal';
      throw new ServiceUnavailableException(detail);
    }
  }

  getQuota(userInfo: TokenPayload) {
    return this.limits.getLimits(userInfo.organizationName);
  }
}
