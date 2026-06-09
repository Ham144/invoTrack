import { Injectable } from '@nestjs/common';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { ffmpegRtspInputArgs, resolveFfmpegBin } from './resolve-ffmpeg-bin';

/** Tunggu segmen pertama menulis data sebelum anggap rekam berhasil */
const RECORD_VERIFY_MS = 2000;
/** Ukuran minimal segmen (byte) */
const RECORD_MIN_BYTES = 65536;
/** Stream Hikvision RTSP sering putus ~3 detik — sambung ulang otomatis */
const SEGMENT_MAX_RETRIES = 6;
const SEGMENT_RETRY_DELAY_MS = 500;
const STOP_WAIT_MS = 3000;

interface RecordingSession {
  key: string;
  organizationName: string;
  cctvConfigId: string;
  invoiceNumber: string;
  rtspUrl: string;
  partsDir: string;
  outputPath: string;
  publicPath: string;
  segmentIndex: number;
  segmentRetries: number;
  stopping: boolean;
  proc: ChildProcessWithoutNullStreams | null;
}

@Injectable()
export class FfmpegService {
  private sessions = new Map<string, RecordingSession>();

  private processKey(
    organizationName: string,
    cctvConfigId: string,
    invoiceNumber: string,
  ): string {
    return `${organizationName}:${cctvConfigId}:${invoiceNumber}`;
  }

  private safeInvoiceName(invoiceNumber: string): string {
    return invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  getClipPath(organizationName: string, invoiceNumber: string): string {
    const dir = path.join(
      process.cwd(),
      process.env.CLIPS_UPLOAD_DIR || 'uploads/clips',
      organizationName,
    );
    fs.mkdirSync(dir, { recursive: true });
    return path.join(dir, `${this.safeInvoiceName(invoiceNumber)}.mp4`);
  }

  getPublicVideoPath(organizationName: string, invoiceNumber: string): string {
    return `/uploads/clips/${organizationName}/${this.safeInvoiceName(invoiceNumber)}.mp4`;
  }

  private getPartsDir(organizationName: string, invoiceNumber: string): string {
    const dir = path.join(
      process.cwd(),
      process.env.CLIPS_UPLOAD_DIR || 'uploads/clips',
      organizationName,
      '_parts',
      this.safeInvoiceName(invoiceNumber),
    );
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  private getSegmentPath(partsDir: string, index: number): string {
    return path.join(partsDir, `seg_${String(index).padStart(3, '0')}.ts`);
  }

  private clipByteSize(filePath: string): number {
    try {
      if (fs.existsSync(filePath)) {
        return fs.statSync(filePath).size;
      }
    } catch {
      /* ignore */
    }
    return 0;
  }

  private listSegmentFiles(partsDir: string): string[] {
    if (!fs.existsSync(partsDir)) return [];
    return fs
      .readdirSync(partsDir)
      .filter((name) => /^seg_\d+\.ts$/.test(name))
      .sort()
      .map((name) => path.join(partsDir, name))
      .filter((filePath) => this.clipByteSize(filePath) >= RECORD_MIN_BYTES);
  }

  private buildSegmentArgs(rtspUrl: string, segmentPath: string): string[] {
    return [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      ...ffmpegRtspInputArgs('tcp'),
      '-i',
      rtspUrl.trim(),
      '-c',
      'copy',
      '-f',
      'mpegts',
      segmentPath,
    ];
  }

  private async waitForProcessExit(
    proc: ChildProcessWithoutNullStreams,
    timeoutMs: number,
  ): Promise<void> {
    if (proc.exitCode !== null) return;

    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        if (proc.exitCode === null) proc.kill('SIGKILL');
        resolve();
      }, timeoutMs);

      proc.once('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }

  private async concatSegments(
    partsDir: string,
    outputPath: string,
  ): Promise<void> {
    const segments = this.listSegmentFiles(partsDir);
    if (segments.length === 0) {
      throw new Error('Tidak ada segmen video untuk digabung');
    }

    if (segments.length === 1) {
      fs.copyFileSync(segments[0], outputPath);
      return;
    }

    const ffmpegBin = resolveFfmpegBin();
    if (!ffmpegBin) {
      throw new Error('FFmpeg tidak tersedia');
    }

    const listPath = path.join(partsDir, 'concat.txt');
    const listBody = segments
      .map((filePath) => `file '${filePath.replace(/'/g, "'\\''")}'`)
      .join('\n');
    fs.writeFileSync(listPath, listBody);

    await new Promise<void>((resolve, reject) => {
      const proc = spawn(
        ffmpegBin,
        [
          '-hide_banner',
          '-loglevel',
          'error',
          '-y',
          '-f',
          'concat',
          '-safe',
          '0',
          '-i',
          listPath,
          '-c',
          'copy',
          outputPath,
        ],
        { stdio: ['ignore', 'ignore', 'ignore'] },
      );

      proc.on('error', reject);
      proc.on('exit', (code) => {
        if (code === 0) resolve();
        else reject(new Error('Gagal menggabungkan segmen video'));
      });
    });
  }

  private cleanupParts(partsDir: string): void {
    try {
      fs.rmSync(partsDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }

  private spawnSegment(session: RecordingSession): void {
    const ffmpegBin = resolveFfmpegBin();
    if (!ffmpegBin || session.stopping) return;

    const segmentPath = this.getSegmentPath(
      session.partsDir,
      session.segmentIndex,
    );
    const args = this.buildSegmentArgs(session.rtspUrl, segmentPath);
    const proc = spawn(ffmpegBin, args, {
      detached: false,
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    session.proc = proc;

    proc.on('exit', () => {
      session.proc = null;
      if (session.stopping) return;

      const segmentSize = this.clipByteSize(segmentPath);
      if (segmentSize >= RECORD_MIN_BYTES) {
        session.segmentIndex += 1;
        session.segmentRetries = 0;
        setTimeout(() => this.spawnSegment(session), SEGMENT_RETRY_DELAY_MS);
        return;
      }

      try {
        if (fs.existsSync(segmentPath)) fs.unlinkSync(segmentPath);
      } catch {
        /* ignore */
      }

      session.segmentRetries += 1;
      if (session.segmentRetries >= SEGMENT_MAX_RETRIES) return;

      setTimeout(() => this.spawnSegment(session), SEGMENT_RETRY_DELAY_MS);
    });

    proc.on('error', () => {
      session.proc = null;
    });
  }

  private async waitForFirstSegment(
    session: RecordingSession,
  ): Promise<boolean> {
    const firstSegment = this.getSegmentPath(session.partsDir, 0);
    const deadline = Date.now() + RECORD_VERIFY_MS;

    while (Date.now() < deadline) {
      if (this.clipByteSize(firstSegment) >= RECORD_MIN_BYTES) {
        return true;
      }
      if (session.segmentIndex > 0) {
        return true;
      }
      if (session.segmentRetries >= SEGMENT_MAX_RETRIES && !session.proc) {
        return false;
      }
      await new Promise((r) => setTimeout(r, 150));
    }

    return this.clipByteSize(firstSegment) >= RECORD_MIN_BYTES;
  }

  private async finalizeSession(session: RecordingSession): Promise<void> {
    session.stopping = true;

    if (session.proc && session.proc.exitCode === null) {
      session.proc.kill('SIGINT');
      await this.waitForProcessExit(session.proc, STOP_WAIT_MS);
    }

    const segments = this.listSegmentFiles(session.partsDir);
    if (segments.length > 0) {
      await this.concatSegments(session.partsDir, session.outputPath);
    }

    this.cleanupParts(session.partsDir);
    this.sessions.delete(session.key);
  }

  async stopRecording(
    organizationName: string,
    cctvConfigId: string,
    invoiceNumber: string,
  ): Promise<void> {
    const key = this.processKey(organizationName, cctvConfigId, invoiceNumber);
    const session = this.sessions.get(key);
    if (!session) return;

    await this.finalizeSession(session);
  }

  async stopAllForCctv(
    organizationName: string,
    cctvConfigId: string,
  ): Promise<void> {
    const prefix = `${organizationName}:${cctvConfigId}:`;
    const keys = [...this.sessions.keys()].filter((k) => k.startsWith(prefix));
    await Promise.all(
      keys.map((key) => {
        const session = this.sessions.get(key);
        if (!session) return Promise.resolve();
        return this.finalizeSession(session);
      }),
    );
  }

  async startRecording(
    organizationName: string,
    cctvConfigId: string,
    invoiceNumber: string,
    rtspUrl: string,
  ): Promise<string> {
    const outputPath = this.getClipPath(organizationName, invoiceNumber);
    const publicPath = this.getPublicVideoPath(organizationName, invoiceNumber);
    const ffmpegBin = resolveFfmpegBin();

    await this.stopAllForCctv(organizationName, cctvConfigId);
    await this.stopRecording(organizationName, cctvConfigId, invoiceNumber);
    await new Promise((r) => setTimeout(r, 400));

    if (!ffmpegBin) {
      throw new Error('FFmpeg tidak tersedia');
    }

    const key = this.processKey(
      organizationName,
      cctvConfigId,
      invoiceNumber,
    );
    const partsDir = this.getPartsDir(organizationName, invoiceNumber);
    this.cleanupParts(partsDir);
    fs.mkdirSync(partsDir, { recursive: true });

    const session: RecordingSession = {
      key,
      organizationName,
      cctvConfigId,
      invoiceNumber,
      rtspUrl,
      partsDir,
      outputPath,
      publicPath,
      segmentIndex: 0,
      segmentRetries: 0,
      stopping: false,
      proc: null,
    };

    this.sessions.set(key, session);
    this.spawnSegment(session);

    const ready = await this.waitForFirstSegment(session);
    if (!ready) {
      await this.finalizeSession(session);
      throw new Error(
        'CCTV tidak dapat diakses — pastikan kamera menyala dan stream RTSP tersedia',
      );
    }

    return publicPath;
  }

  async captureSnapshot(rtspUrl: string, timeoutMs = 20000): Promise<Buffer> {
    const ffmpegBin = resolveFfmpegBin();

    if (!ffmpegBin) {
      throw new Error('FFmpeg tidak tersedia');
    }

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const proc = spawn(ffmpegBin, [
        '-hide_banner',
        '-loglevel',
        'error',
        ...ffmpegRtspInputArgs('tcp'),
        '-i',
        rtspUrl.trim(),
        '-frames:v',
        '1',
        '-f',
        'image2pipe',
        '-vcodec',
        'mjpeg',
        'pipe:1',
      ]);

      const timer = setTimeout(() => {
        proc.kill('SIGKILL');
        reject(new Error('Snapshot timeout'));
      }, timeoutMs);

      proc.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
      proc.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
      proc.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0 && chunks.length > 0) {
          resolve(Buffer.concat(chunks));
          return;
        }
        reject(new Error('Gagal mengambil frame CCTV'));
      });
    });
  }
}
