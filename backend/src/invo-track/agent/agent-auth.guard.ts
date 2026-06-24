import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from 'src/common/prisma.service';
import { SubscriptionLimitsService } from '../subscription-limits.service';
import { SubscriptionPlan } from 'src/common/shared-enum';
import type { AgentContext } from './agent.decorator';

@Injectable()
export class AgentAuthGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionLimits: SubscriptionLimitsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header = request.headers.authorization as string | undefined;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token agent wajib');
    }

    const token = header.slice(7).trim();
    if (!token) {
      throw new UnauthorizedException('Token agent kosong');
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const device = await this.prisma.agentDevice.findFirst({
      where: { deviceTokenHash: tokenHash },
      include: {
        workstation: { select: { id: true, isActive: true } },
      },
    });

    if (!device?.pairedAt) {
      throw new UnauthorizedException('Perangkat agent tidak terdaftar');
    }
    if (!device.workstation.isActive) {
      throw new ForbiddenException('Workstation tidak aktif');
    }

    await this.assertSubscriptionActive(device.organizationName);

    request.agent = {
      deviceId: device.id,
      workstationId: device.workstationId,
      organizationName: device.organizationName,
    } satisfies AgentContext;

    return true;
  }

  private async assertSubscriptionActive(organizationName: string): Promise<void> {
    const org = await this.prisma.organization.findUnique({
      where: { name: organizationName },
      include: { subscription: true },
    });
    if (!org?.subscription) {
      throw new ForbiddenException('Langganan tidak ditemukan');
    }

    const plan = this.subscriptionLimits.resolvePlanKey(org.subscription.plan);
    const durationDays = SubscriptionPlan[plan].durationDays;
    const expiresAt = new Date(org.subscription.start);
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    if (Date.now() > expiresAt.getTime()) {
      throw new ForbiddenException('Langganan telah berakhir');
    }
  }
}
