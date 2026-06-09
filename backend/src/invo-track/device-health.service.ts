import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma.service';
import { TokenPayload } from 'src/user/dto/token-payload.dto';

@Injectable()
export class DeviceHealthService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus(userInfo: TokenPayload) {
    const org = userInfo.organizationName;
    const cctv = await this.prisma.cctvConfig.findMany({
      where: { organizationName: org },
    });

    return {
      cctv: cctv.map((c) => ({
        id: c.id,
        label: c.label,
        isOnline: c.isOnline,
        lastSeenAt: c.lastSeenAt,
      })),
    };
  }
}
