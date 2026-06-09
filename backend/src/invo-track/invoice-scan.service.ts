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
import { InvoiceScanStatus } from 'src/common/shared-enum';
import { FfmpegService } from './ffmpeg.service';
import { InvoTrackGateway } from './invo-track.gateway';
import { RecordingTimerService } from './recording-timer.service';
import { Prisma } from '@prisma/client';

const scanInclude = {
  cctvConfig: { select: { id: true, label: true } },
  scannerConfig: {
    select: {
      id: true,
      label: true,
      assignedUsername: true,
    },
  },
} as const;

export type CompleteRecordingReason = 'NEXT_SCAN' | 'TIME_LIMIT' | 'MANUAL';

export interface ScanListQuery {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
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
}

@Injectable()
export class InvoiceScanService {
  private completing = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly ffmpeg: FfmpegService,
    private readonly gateway: InvoTrackGateway,
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
        maxDurationSec > 0
          ? Math.max(0, maxDurationSec - elapsedSec)
          : 0;
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
      };
    });
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

  async stopRecordingManually(
    userInfo: TokenPayload,
    scanId: string,
  ) {
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

    const rtspUrl =
      cctv.rtspUrl?.trim() || process.env.CCTV_RTSP_URL || '';

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

    return this.ingest(
      userInfo.organizationName,
      invoiceNumber,
      scanner.cctvConfigId,
      scanner.assignedUsername ?? undefined,
      scanner.id,
    );
  }
}
