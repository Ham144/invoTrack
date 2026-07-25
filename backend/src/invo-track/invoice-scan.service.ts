import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from 'src/common/prisma.service';
import { TokenPayload } from 'src/user/dto/token-payload.dto';
import { InvoiceScanStatus, RecordingSource } from 'src/common/shared-enum';
import { FfmpegService } from './ffmpeg.service';
import { BuktiScanGateway } from './invo-track.gateway';
import { RecordingTimerService } from './recording-timer.service';
import { Prisma } from '@prisma/client';

const scanInclude = {
  cctvConfig: { select: { id: true, label: true } },
  scannerConfig: {
    select: {
      id: true,
      label: true,
      assignedUsername: true,
      workstationId: true,
    },
  },
  workstation: { select: { id: true, label: true } },
} as const;

export type CompleteRecordingReason = 'NEXT_SCAN' | 'TIME_LIMIT' | 'MANUAL';

export interface ScanListQuery {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  operator?: string;
  workstationId?: string;
  scannerConfigId?: string;
  startDate?: string;
  endDate?: string;
}

export interface ActiveRecordingRow {
  scanId: string;
  invoiceNumber: string;
  scannedAt: Date;
  maxDurationSec: number;
  remainingSec: number;
  scannerConfigId: string | null;
  scannerLabel: string | null;
  cctvConfigId: string | null;
  cctvLabel: string | null;
  recordingSource: string;
  stopRequested: boolean;
}

export interface AgentActiveRecordingRow {
  scanId: string;
  invoiceNumber: string;
  scannedAt: Date;
  maxDurationSec: number;
  remainingSec: number;
  stopRequested: boolean;
  scannerConfigId: string | null;
  cctvConfigId: string | null;
  rtspUrl: string | null;
  cctvUsername: string | null;
  cctvPassword: string | null;
}

@Injectable()
export class InvoiceScanService {
  private completing = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly ffmpeg: FfmpegService,
    private readonly gateway: BuktiScanGateway,
    @Inject(forwardRef(() => RecordingTimerService))
    private readonly recordingTimer: RecordingTimerService,
  ) {}

  async list(userInfo: TokenPayload, query: ScanListQuery = {}) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceScanWhereInput = {
      organizationName: userInfo.organizationName,
    };

    if (query.status && query.status !== 'ALL') {
      where.status = query.status;
    }

    const search = query.search?.trim().toUpperCase();
    if (search) {
      where.invoiceNumber = { contains: search, mode: 'insensitive' };
    }

    if (query.operator && query.operator.trim()) {
      where.scannedByUsername = {
        contains: query.operator.trim(),
        mode: 'insensitive',
      };
    }

    if (query.workstationId && query.workstationId !== 'ALL') {
      where.workstationId = query.workstationId;
    }

    if (query.scannerConfigId && query.scannerConfigId !== 'ALL') {
      where.scannerConfigId = query.scannerConfigId;
    }

    if (query.startDate || query.endDate) {
      where.scannedAt = {};
      if (query.startDate) {
        const start = new Date(query.startDate);
        if (!isNaN(start.getTime())) {
          where.scannedAt.gte = start;
        }
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        if (!isNaN(end.getTime())) {
          if (query.endDate.length <= 10) {
            end.setHours(23, 59, 59, 999);
          }
          where.scannedAt.lte = end;
        }
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.invoiceScan.findMany({
        where,
        orderBy: { scannedAt: 'desc' },
        skip,
        take: limit,
        include: scanInclude,
      }),
      this.prisma.invoiceScan.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async listOperators(userInfo: TokenPayload) {
    const scans = await this.prisma.invoiceScan.findMany({
      where: {
        organizationName: userInfo.organizationName,
        scannedByUsername: { not: null },
      },
      select: { scannedByUsername: true },
      distinct: ['scannedByUsername'],
    });
    return scans
      .map((s) => s.scannedByUsername)
      .filter((u): u is string => !!u)
      .sort();
  }

  async findByInvoice(userInfo: TokenPayload, invoiceNumber: string) {
    const scan = await this.prisma.invoiceScan.findFirst({
      where: {
        organizationName: userInfo.organizationName,
        invoiceNumber: invoiceNumber.trim().toUpperCase(),
      },
      include: scanInclude,
    });
    if (!scan) throw new NotFoundException('Invoice tidak ditemukan');
    return scan;
  }

  async listActiveRecordings(
    organizationName: string,
    filters?: { cctvConfigId?: string; scannerConfigId?: string },
  ): Promise<ActiveRecordingRow[]> {
    const cctvConfigId = filters?.cctvConfigId;
    const scannerConfigId = filters?.scannerConfigId;
    const org = await this.prisma.organization.findUnique({
      where: { name: organizationName },
      select: { recordingMaxDurationSec: true },
    });
    const maxDurationSec = org?.recordingMaxDurationSec ?? 300;

    const rows = await this.prisma.invoiceScan.findMany({
      where: {
        organizationName,
        status: InvoiceScanStatus.RECORDING,
        ...(cctvConfigId ? { cctvConfigId } : {}),
        ...(scannerConfigId ? { scannerConfigId } : {}),
      },
      orderBy: { scannedAt: 'desc' },
      include: {
        cctvConfig: { select: { id: true, label: true } },
        scannerConfig: { select: { id: true, label: true } },
      },
    });

    const now = Date.now();
    return rows.map((row) => {
      const elapsedSec = Math.floor((now - row.scannedAt.getTime()) / 1000);
      const remainingSec =
        maxDurationSec > 0 ? Math.max(0, maxDurationSec - elapsedSec) : 0;
      return {
        scanId: row.id,
        invoiceNumber: row.invoiceNumber,
        scannedAt: row.scannedAt,
        maxDurationSec,
        remainingSec,
        scannerConfigId: row.scannerConfigId,
        scannerLabel: row.scannerConfig?.label ?? null,
        cctvConfigId: row.cctvConfigId,
        cctvLabel: row.cctvConfig?.label ?? null,
        recordingSource: row.recordingSource,
        stopRequested: Boolean(row.stopRequestedAt),
      };
    });
  }

  async listAgentActiveRecordings(
    organizationName: string,
    workstationId: string,
  ): Promise<AgentActiveRecordingRow[]> {
    const org = await this.prisma.organization.findUnique({
      where: { name: organizationName },
      select: { recordingMaxDurationSec: true },
    });
    const maxDurationSec = org?.recordingMaxDurationSec ?? 300;

    const rows = await this.prisma.invoiceScan.findMany({
      where: {
        organizationName,
        workstationId,
        status: InvoiceScanStatus.RECORDING,
        recordingSource: RecordingSource.EDGE,
      },
      orderBy: { scannedAt: 'desc' },
      include: {
        cctvConfig: {
          select: {
            id: true,
            rtspUrl: true,
            username: true,
            password: true,
          },
        },
      },
    });

    const now = Date.now();
    return rows.map((row) => {
      const elapsedSec = Math.floor((now - row.scannedAt.getTime()) / 1000);
      const remainingSec =
        maxDurationSec > 0 ? Math.max(0, maxDurationSec - elapsedSec) : 0;
      return {
        scanId: row.id,
        invoiceNumber: row.invoiceNumber,
        scannedAt: row.scannedAt,
        maxDurationSec,
        remainingSec,
        stopRequested: Boolean(row.stopRequestedAt) || remainingSec <= 0,
        scannerConfigId: row.scannerConfigId,
        cctvConfigId: row.cctvConfigId,
        rtspUrl: row.cctvConfig?.rtspUrl ?? null,
        cctvUsername: row.cctvConfig?.username ?? null,
        cctvPassword: row.cctvConfig?.password ?? null,
      };
    });
  }

  async listRecentScansForAgent(
    organizationName: string,
    workstationId: string,
    limit = 25,
  ) {
    const rows = await this.prisma.invoiceScan.findMany({
      where: { organizationName, workstationId },
      orderBy: { scannedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        scannedAt: true,
        completedAt: true,
        scannedByUsername: true,
      },
    });

    return rows.map((row) => ({
      scanId: row.id,
      invoiceNumber: row.invoiceNumber,
      status: row.status,
      scannedAt: row.scannedAt.toISOString(),
      completedAt: row.completedAt?.toISOString() ?? null,
      operatorUsername: row.scannedByUsername,
    }));
  }

  async listActiveRecordingMeta(): Promise<
    { scanId: string; scannedAt: Date; maxDurationSec: number }[]
  > {
    const rows = await this.prisma.invoiceScan.findMany({
      where: { status: InvoiceScanStatus.RECORDING },
      select: {
        id: true,
        scannedAt: true,
        organizationName: true,
      },
    });

    const orgNames = [...new Set(rows.map((r) => r.organizationName))];
    const orgs = await this.prisma.organization.findMany({
      where: { name: { in: orgNames } },
      select: { name: true, recordingMaxDurationSec: true },
    });
    const durationByOrg = new Map(
      orgs.map((o) => [o.name, o.recordingMaxDurationSec ?? 300]),
    );

    return rows
      .map((row) => ({
        scanId: row.id,
        scannedAt: row.scannedAt,
        maxDurationSec: durationByOrg.get(row.organizationName) ?? 300,
      }))
      .filter((r) => r.maxDurationSec > 0);
  }

  async sweepExpiredRecordings() {
    const meta = await this.listActiveRecordingMeta();
    const now = Date.now();
    for (const row of meta) {
      const elapsedMs = now - row.scannedAt.getTime();
      if (elapsedMs >= row.maxDurationSec * 1000) {
        await this.completeRecording(row.scanId, 'TIME_LIMIT').catch(() => {});
      }
    }
  }

  async completeRecording(
    scanId: string,
    _reason: CompleteRecordingReason,
  ): Promise<void> {
    if (this.completing.has(scanId)) return;
    this.completing.add(scanId);

    try {
      const scan = await this.prisma.invoiceScan.findUnique({
        where: { id: scanId },
      });
      if (!scan || scan.status !== InvoiceScanStatus.RECORDING) return;

      this.recordingTimer.cancel(scanId);

      if (scan.recordingSource === RecordingSource.EDGE && !scan.stopRequestedAt) {
        await this.prisma.invoiceScan.update({
          where: { id: scanId },
          data: { stopRequestedAt: new Date() },
        });
        this.gateway.emitScanLogUpdate(scan.organizationName);
        this.gateway.emitDeviceStatusUpdate(scan.organizationName);
        return;
      }

      if (scan.cctvConfigId) {
        await this.ffmpeg.stopRecording(
          scan.organizationName,
          scan.cctvConfigId,
          scan.invoiceNumber,
        );
      }

      await this.prisma.invoiceScan.update({
        where: { id: scanId },
        data: {
          status: InvoiceScanStatus.COMPLETED,
          completedAt: new Date(),
          stopRequestedAt: null,
          videoPath:
            scan.videoPath ||
            this.ffmpeg.getPublicVideoPath(
              scan.organizationName,
              scan.invoiceNumber,
            ),
        },
      });

      this.gateway.emitScanLogUpdate(scan.organizationName);
      this.gateway.emitDeviceStatusUpdate(scan.organizationName);
    } finally {
      this.completing.delete(scanId);
    }
  }

  async stopRecordingManually(userInfo: TokenPayload, scanId: string) {
    const scan = await this.prisma.invoiceScan.findFirst({
      where: {
        id: scanId,
        organizationName: userInfo.organizationName,
        status: InvoiceScanStatus.RECORDING,
      },
    });
    if (!scan) {
      throw new NotFoundException('Rekam aktif tidak ditemukan');
    }

    if (
      userInfo.role !== 'ADMIN_ORGANIZATION' &&
      userInfo.role !== 'ADMIN_GUDANG' &&
      scan.scannerConfigId
    ) {
      const scanner = await this.prisma.scannerConfig.findUnique({
        where: { id: scan.scannerConfigId },
        select: { assignedUsername: true },
      });
      if (scanner?.assignedUsername !== userInfo.username) {
        throw new ForbiddenException(
          'Hanya bisa menghentikan rekam di scanner yang di-assign ke akun Anda',
        );
      }
    }

    await this.completeRecording(scanId, 'MANUAL');

    return this.prisma.invoiceScan.findUnique({
      where: { id: scanId },
      include: scanInclude,
    });
  }

  async completeFromAgent(
    scanId: string,
    workstationId: string,
    localClipPath: string,
  ) {
    const scan = await this.prisma.invoiceScan.findFirst({
      where: {
        id: scanId,
        workstationId,
        recordingSource: RecordingSource.EDGE,
        status: InvoiceScanStatus.RECORDING,
      },
    });
    if (!scan) {
      throw new NotFoundException(
        'Rekam aktif tidak ditemukan untuk agent ini',
      );
    }

    this.recordingTimer.cancel(scanId);

    const safeName = scan.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
    const agentClipUrl = `http://127.0.0.1:19500/clips/${safeName}.mp4`;

    const updated = await this.prisma.invoiceScan.update({
      where: { id: scanId },
      data: {
        status: InvoiceScanStatus.COMPLETED,
        completedAt: new Date(),
        localClipPath,
        videoPath: agentClipUrl,
        stopRequestedAt: null,
      },
      include: scanInclude,
    });

    this.gateway.emitScanLogUpdate(scan.organizationName);
    this.gateway.emitDeviceStatusUpdate(scan.organizationName);
    return updated;
  }

  async failFromAgent(scanId: string, workstationId: string) {
    const scan = await this.prisma.invoiceScan.findFirst({
      where: {
        id: scanId,
        workstationId,
        recordingSource: RecordingSource.EDGE,
        status: InvoiceScanStatus.RECORDING,
      },
    });
    if (!scan) {
      throw new NotFoundException(
        'Rekam aktif tidak ditemukan untuk agent ini',
      );
    }

    this.recordingTimer.cancel(scanId);

    const updated = await this.prisma.invoiceScan.update({
      where: { id: scanId },
      data: {
        status: InvoiceScanStatus.FAILED,
        completedAt: new Date(),
        stopRequestedAt: null,
      },
      include: scanInclude,
    });

    this.gateway.emitScanLogUpdate(scan.organizationName);
    this.gateway.emitDeviceStatusUpdate(scan.organizationName);
    return updated;
  }

  async reconcileClipsFromAgent(
    organizationName: string,
    workstationId: string,
    clips: {
      invoiceNumber: string;
      localClipPath: string;
      sizeBytes: number;
    }[],
  ) {
    const MIN_BYTES = 65536;
    let completed = 0;
    let imported = 0;
    let skipped = 0;

    const defaultScanner = await this.prisma.scannerConfig.findFirst({
      where: {
        organizationName,
        workstationId,
        isActive: true,
      },
      orderBy: { label: 'asc' },
    });

    for (const clip of clips) {
      if (clip.sizeBytes < MIN_BYTES) {
        skipped++;
        continue;
      }

      const normalized = clip.invoiceNumber.trim().toUpperCase();
      if (!normalized) {
        skipped++;
        continue;
      }

      const existing = await this.prisma.invoiceScan.findUnique({
        where: {
          organizationName_invoiceNumber: {
            organizationName,
            invoiceNumber: normalized,
          },
        },
      });

      if (existing?.status === InvoiceScanStatus.COMPLETED) {
        skipped++;
        continue;
      }

      if (existing?.status === InvoiceScanStatus.RECORDING) {
        await this.completeFromAgent(
          existing.id,
          workstationId,
          clip.localClipPath,
        );
        completed++;
        continue;
      }

      if (!defaultScanner) {
        skipped++;
        continue;
      }

      const safeName = normalized.replace(/[^a-zA-Z0-9_-]/g, '_');
      await this.prisma.invoiceScan.create({
        data: {
          organizationName,
          invoiceNumber: normalized,
          status: InvoiceScanStatus.COMPLETED,
          recordingSource: RecordingSource.EDGE,
          workstationId,
          cctvConfigId: defaultScanner.cctvConfigId,
          scannerConfigId: defaultScanner.id,
          scannedByUsername: defaultScanner.assignedUsername,
          localClipPath: clip.localClipPath,
          videoPath: `http://127.0.0.1:19500/clips/${safeName}.mp4`,
          scannedAt: new Date(),
          completedAt: new Date(),
        },
      });
      imported++;
    }

    if (completed > 0 || imported > 0) {
      this.gateway.emitScanLogUpdate(organizationName);
      this.gateway.emitDeviceStatusUpdate(organizationName);
    }

    return { completed, imported, skipped };
  }

  async ingestEdge(
    organizationName: string,
    invoiceNumber: string,
    cctvConfigId: string,
    workstationId: string,
    scannedByUsername?: string,
    scannerConfigId?: string,
  ) {
    const normalized = invoiceNumber.trim().toUpperCase();
    if (!normalized) {
      throw new BadRequestException('Nomor invoice wajib diisi');
    }

    const cctv = await this.prisma.cctvConfig.findFirst({
      where: { id: cctvConfigId, organizationName },
      include: {
        organization: { select: { recordingMaxDurationSec: true } },
      },
    });
    if (!cctv) {
      throw new BadRequestException('CCTV tidak ditemukan');
    }
    if (!cctv.isActive) {
      throw new BadRequestException('CCTV tidak aktif');
    }

    const previous = await this.prisma.invoiceScan.findFirst({
      where: {
        organizationName,
        cctvConfigId,
        status: InvoiceScanStatus.RECORDING,
      },
      orderBy: { scannedAt: 'desc' },
    });

    let closedInvoice: string | null = null;
    if (previous) {
      closedInvoice = previous.invoiceNumber;
      await this.completeRecording(previous.id, 'NEXT_SCAN');
    }

    const scan = await this.prisma.invoiceScan.upsert({
      where: {
        organizationName_invoiceNumber: {
          organizationName,
          invoiceNumber: normalized,
        },
      },
      create: {
        organizationName,
        invoiceNumber: normalized,
        status: InvoiceScanStatus.RECORDING,
        recordingSource: RecordingSource.EDGE,
        workstationId,
        cctvConfigId,
        scannerConfigId: scannerConfigId ?? null,
        scannedByUsername: scannedByUsername ?? null,
        previousInvoice: closedInvoice,
        completedAt: null,
        videoPath: null,
        localClipPath: null,
        stopRequestedAt: null,
      },
      update: {
        scannedAt: new Date(),
        status: InvoiceScanStatus.RECORDING,
        recordingSource: RecordingSource.EDGE,
        workstationId,
        cctvConfigId,
        scannerConfigId: scannerConfigId ?? null,
        scannedByUsername: scannedByUsername ?? null,
        previousInvoice: closedInvoice,
        completedAt: null,
        videoPath: null,
        localClipPath: null,
        stopRequestedAt: null,
      },
      include: scanInclude,
    });

    const maxDuration = cctv.organization?.recordingMaxDurationSec ?? 300;
    this.recordingTimer.schedule(scan.id, maxDuration);

    this.gateway.emitScanLogUpdate(organizationName);
    this.gateway.emitDeviceStatusUpdate(organizationName);

    return scan;
  }

  async ingest(
    organizationName: string,
    invoiceNumber: string,
    cctvConfigId: string,
    scannedByUsername?: string,
    scannerConfigId?: string,
  ) {
    const normalized = invoiceNumber.trim().toUpperCase();
    if (!normalized) {
      throw new BadRequestException('Nomor invoice wajib diisi');
    }
    if (!cctvConfigId) {
      throw new BadRequestException('CCTV wajib dipilih');
    }

    const cctv = await this.prisma.cctvConfig.findFirst({
      where: { id: cctvConfigId, organizationName },
      include: {
        organization: { select: { recordingMaxDurationSec: true } },
      },
    });
    if (!cctv) {
      throw new BadRequestException('CCTV tidak ditemukan');
    }
    if (!cctv.isActive) {
      throw new BadRequestException('CCTV tidak aktif');
    }

    const rtspUrl = cctv.rtspUrl?.trim() || process.env.CCTV_RTSP_URL || '';

    if (!rtspUrl) {
      throw new BadRequestException('URL RTSP CCTV kosong');
    }

    const previous = await this.prisma.invoiceScan.findFirst({
      where: {
        organizationName,
        cctvConfigId,
        status: InvoiceScanStatus.RECORDING,
      },
      orderBy: { scannedAt: 'desc' },
    });

    let closedInvoice: string | null = null;
    if (previous) {
      closedInvoice = previous.invoiceNumber;
      await this.completeRecording(previous.id, 'NEXT_SCAN');
    }

    let videoPath: string | null = null;
    const status = InvoiceScanStatus.RECORDING;

    try {
      videoPath = await this.ffmpeg.startRecording(
        organizationName,
        cctvConfigId,
        normalized,
        rtspUrl,
      );
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Gagal memulai rekam video dari CCTV';
      throw new BadRequestException(msg);
    }

    const scan = await this.prisma.invoiceScan.upsert({
      where: {
        organizationName_invoiceNumber: {
          organizationName,
          invoiceNumber: normalized,
        },
      },
      create: {
        organizationName,
        invoiceNumber: normalized,
        status,
        videoPath,
        cctvConfigId,
        scannerConfigId: scannerConfigId ?? null,
        scannedByUsername: scannedByUsername ?? null,
        previousInvoice: closedInvoice,
        completedAt: null,
      },
      update: {
        scannedAt: new Date(),
        status,
        videoPath,
        cctvConfigId,
        scannerConfigId: scannerConfigId ?? null,
        scannedByUsername: scannedByUsername ?? null,
        previousInvoice: closedInvoice,
        completedAt: null,
      },
      include: scanInclude,
    });

    const maxDuration = cctv.organization?.recordingMaxDurationSec ?? 300;
    this.recordingTimer.schedule(scan.id, maxDuration);

    this.gateway.emitScanLogUpdate(organizationName);
    this.gateway.emitDeviceStatusUpdate(organizationName);

    return scan;
  }

  async ingestFromScanner(
    userInfo: TokenPayload,
    scannerConfigId: string,
    invoiceNumber: string,
  ) {
    const scanner = await this.prisma.scannerConfig.findFirst({
      where: {
        id: scannerConfigId,
        organizationName: userInfo.organizationName,
      },
      include: {
        cctvConfig: true,
      },
    });

    if (!scanner) {
      throw new BadRequestException('Scanner tidak ditemukan');
    }
    if (!scanner.isActive) {
      throw new BadRequestException('Scanner tidak aktif');
    }
    if (!scanner.cctvConfig?.isActive) {
      throw new BadRequestException('CCTV scanner tidak aktif');
    }

    throw new BadRequestException(
      'Scan dari browser tidak didukung. Gunakan BuktiScan Agent di PC kasir.',
    );
  }
}
