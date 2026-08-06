import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/prisma.service';
import { SubscriptionPlan } from 'src/common/shared-enum';

export type PlanKey = keyof typeof SubscriptionPlan;

export interface SubscriptionLimits {
  plan: PlanKey;
  maxCctv: number;
  maxScanner: number;
  durationDays: number;
  currentCctv: number;
  currentScanner: number;
}

@Injectable()
export class SubscriptionLimitsService {
  constructor(private readonly prisma: PrismaService) {}

  resolvePlanKey(plan?: string | null): PlanKey {
    if (plan && plan in SubscriptionPlan) {
      return plan as PlanKey;
    }
    return 'TRIAL';
  }

  async getLimits(organizationName: string): Promise<SubscriptionLimits> {
    const org = await this.prisma.organization.findUnique({
      where: { name: organizationName },
      include: { subscription: true },
    });
    if (!org) throw new NotFoundException('Organisasi tidak ditemukan');

    const plan = this.resolvePlanKey(org.subscription?.plan);
    const limits = SubscriptionPlan[plan];

    const [currentCctv, currentScanner, workstationCount] = await Promise.all([
      this.prisma.cctvConfig.count({ where: { organizationName } }),
      this.prisma.scannerConfig.count({ where: { organizationName } }),
      this.prisma.workstation.count({ where: { organizationName } }),
    ]);

    const multiplier = Math.max(1, workstationCount);

    return {
      plan,
      maxCctv: limits.maxCctv * multiplier,
      maxScanner: limits.maxScanner * multiplier,
      durationDays: limits.durationDays,
      currentCctv,
      currentScanner,
    };
  }

  async getScannerLimits(organizationName: string) {
    const limits = await this.getLimits(organizationName);
    return {
      plan: limits.plan,
      maxScanner: limits.maxScanner,
      currentScanner: limits.currentScanner,
    };
  }

  async assertCanAddScanner(organizationName: string): Promise<void> {
    const { plan, maxScanner, currentScanner } =
      await this.getLimits(organizationName);
    if (currentScanner >= maxScanner) {
      throw new ForbiddenException(
        `Kuota scanner plan ${plan} sudah penuh (${maxScanner})`,
      );
    }
  }

  async assertCanAddCctv(organizationName: string): Promise<void> {
    const { plan, maxCctv, currentCctv } =
      await this.getLimits(organizationName);
    if (currentCctv >= maxCctv) {
      throw new ForbiddenException(
        `Kuota CCTV plan ${plan} sudah penuh (${maxCctv})`,
      );
    }
  }
}
