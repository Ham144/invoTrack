import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from 'src/common/prisma.service';
import { TokenPayload } from 'src/user/dto/token-payload.dto';
import { InvoiceScanService } from '../invoice-scan.service';
import type { AgentContext } from './agent.decorator';
import {
  AgentCompleteDto,
  AgentHeartbeatDto,
  AgentIngestDto,
  AgentPairDto,
} from './dto/agent.dto';

const PAIRING_TTL_MS = 15 * 60 * 1000;

@Injectable()
export class AgentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceScan: InvoiceScanService,
  ) {}

  async generatePairingCode(workstationId: string, userInfo: TokenPayload) {
    const ws = await this.prisma.workstation.findFirst({
      where: {
        id: workstationId,
        organizationName: userInfo.organizationName,
      },
    });
    if (!ws) throw new NotFoundException('Workstation tidak ditemukan');

    const code = randomBytes(3).toString('hex').toUpperCase();
    const expiresAt = new Date(Date.now() + PAIRING_TTL_MS);

    const device = await this.prisma.agentDevice.upsert({
      where: { workstationId },
      create: {
        workstationId,
        organizationName: userInfo.organizationName,
        deviceTokenHash: '',
        pairingCode: code,
        pairingExpiresAt: expiresAt,
      },
      update: {
        pairingCode: code,
        pairingExpiresAt: expiresAt,
      },
    });

    return {
      workstationId,
      pairingCode: code,
      expiresAt,
      paired: Boolean(device.pairedAt),
      agentLastSeenAt: device.lastSeenAt,
      agentVersion: device.agentVersion,
    };
  }

  async getAgentStatus(workstationId: string, userInfo: TokenPayload) {
    const ws = await this.prisma.workstation.findFirst({
      where: {
        id: workstationId,
        organizationName: userInfo.organizationName,
      },
      include: { agentDevice: true },
    });
    if (!ws) throw new NotFoundException('Workstation tidak ditemukan');

    const device = ws.agentDevice;
    return {
      workstationId: ws.id,
      label: ws.label,
      paired: Boolean(device?.pairedAt),
      agentLastSeenAt: device?.lastSeenAt ?? null,
      agentVersion: device?.agentVersion ?? null,
      clipsDir: device?.clipsDir ?? null,
      pairingExpiresAt: device?.pairingExpiresAt ?? null,
    };
  }

  async pair(dto: AgentPairDto) {
    const device = await this.prisma.agentDevice.findUnique({
      where: { workstationId: dto.workstationId },
      include: { workstation: true },
    });

    if (!device?.pairingCode || !device.pairingExpiresAt) {
      throw new BadRequestException('Kode pairing belum dibuat di dashboard');
    }
    if (device.pairingCode !== dto.pairingCode.trim().toUpperCase()) {
      throw new BadRequestException('Kode pairing tidak valid');
    }
    if (device.pairingExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Kode pairing sudah kedaluwarsa');
    }
    if (!device.workstation.isActive) {
      throw new ForbiddenException('Workstation tidak aktif');
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');

    await this.prisma.agentDevice.update({
      where: { id: device.id },
      data: {
        deviceTokenHash: tokenHash,
        pairingCode: null,
        pairingExpiresAt: null,
        pairedAt: new Date(),
        lastSeenAt: new Date(),
      },
    });

    await this.prisma.workstation.update({
      where: { id: dto.workstationId },
      data: { lastSeenAt: new Date() },
    });

    return {
      deviceToken: token,
      workstationId: dto.workstationId,
      organizationName: device.organizationName,
      workstationLabel: device.workstation.label,
    };
  }

  async getConfig(agent: AgentContext) {
    const org = await this.prisma.organization.findUnique({
      where: { name: agent.organizationName },
      select: { recordingMaxDurationSec: true },
    });

    const scanners = await this.prisma.scannerConfig.findMany({
      where: {
        workstationId: agent.workstationId,
        organizationName: agent.organizationName,
        isActive: true,
      },
      include: {
        cctvConfig: {
          select: {
            id: true,
            label: true,
            rtspUrl: true,
            username: true,
            password: true,
            isActive: true,
          },
        },
      },
      orderBy: { label: 'asc' },
    });

    const device = await this.prisma.agentDevice.findUnique({
      where: { workstationId: agent.workstationId },
      select: { clipsDir: true },
    });

    return {
      organizationName: agent.organizationName,
      workstationId: agent.workstationId,
      recordingMaxDurationSec: org?.recordingMaxDurationSec ?? 300,
      clipsDir: device?.clipsDir ?? null,
      scanners: scanners.map((s) => ({
        id: s.id,
        label: s.label,
        baudRate: s.baudRate,
        usbVendorId: s.usbVendorId,
        usbProductId: s.usbProductId,
        assignedUsername: s.assignedUsername,
        cctv: s.cctvConfig,
      })),
    };
  }

  async ingest(agent: AgentContext, dto: AgentIngestDto) {
    const scanner = await this.prisma.scannerConfig.findFirst({
      where: {
        id: dto.scannerConfigId,
        workstationId: agent.workstationId,
        organizationName: agent.organizationName,
        isActive: true,
      },
      include: { cctvConfig: true },
    });

    if (!scanner) {
      throw new BadRequestException('Scanner tidak ditemukan di workstation ini');
    }
    if (!scanner.cctvConfig?.isActive) {
      throw new BadRequestException('CCTV scanner tidak aktif');
    }

    return this.invoiceScan.ingestEdge(
      agent.organizationName,
      dto.invoiceNumber,
      scanner.cctvConfigId,
      agent.workstationId,
      scanner.assignedUsername ?? undefined,
      scanner.id,
    );
  }

  async complete(
    agent: AgentContext,
    scanId: string,
    dto: AgentCompleteDto,
  ) {
    return this.invoiceScan.completeFromAgent(
      scanId,
      agent.workstationId,
      dto.localClipPath,
    );
  }

  async failRecording(agent: AgentContext, scanId: string) {
    return this.invoiceScan.failFromAgent(scanId, agent.workstationId);
  }

  async reconcileClips(
    agent: AgentContext,
    clips: { invoiceNumber: string; localClipPath: string; sizeBytes: number }[],
  ) {
    return this.invoiceScan.reconcileClipsFromAgent(
      agent.organizationName,
      agent.workstationId,
      clips,
    );
  }

  async heartbeat(agent: AgentContext, dto: AgentHeartbeatDto) {
    const now = new Date();
    await Promise.all([
      this.prisma.agentDevice.update({
        where: { workstationId: agent.workstationId },
        data: {
          lastSeenAt: now,
          agentVersion: dto.agentVersion,
          clipsDir: dto.clipsDir,
        },
      }),
      this.prisma.workstation.update({
        where: { id: agent.workstationId },
        data: { lastSeenAt: now },
      }),
    ]);

    return { ok: true, serverTime: now.toISOString() };
  }

  async listActiveRecordings(agent: AgentContext) {
    return this.invoiceScan.listAgentActiveRecordings(
      agent.organizationName,
      agent.workstationId,
    );
  }

  async pairUsb(
    agent: AgentContext,
    scannerId: string,
    usbVendorId: number,
    usbProductId: number,
  ) {
    const scanner = await this.prisma.scannerConfig.findFirst({
      where: {
        id: scannerId,
        workstationId: agent.workstationId,
        organizationName: agent.organizationName,
        isActive: true,
      },
    });

    if (!scanner) {
      throw new BadRequestException('Scanner tidak ditemukan di workstation ini');
    }

    await this.prisma.scannerConfig.update({
      where: { id: scannerId },
      data: { usbVendorId, usbProductId },
    });

    return { ok: true, scannerId, usbVendorId, usbProductId };
  }
}
