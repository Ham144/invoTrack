import { Injectable } from '@nestjs/common';
import { spawn, spawnSync } from 'child_process';
import { ffmpegRtspInputArgs, resolveFfmpegBin } from './resolve-ffmpeg-bin';
import { getCameraSourceIp, assertCameraReachableFromServer } from './resolve-camera-bind';

export interface CctvSnapshotInput {
  rtspUrl: string;
  username?: string | null;
  password?: string | null;
}

/** Batas total waktu snapshot — jangan biarkan request hang di network */
const CAPTURE_DEADLINE_MS = 18_000;
const CURL_MAX_SEC = 5;
const FFMPEG_SNAPSHOT_MS = 6_000;

@Injectable()
export class CctvSnapshotService {
  async capture(input: CctvSnapshotInput): Promise<Buffer> {
    return Promise.race([
      this.captureInner(input),
      new Promise<Buffer>((_, reject) =>
        setTimeout(
          () => reject(new Error('Snapshot timeout — kamera tidak merespons')),
          CAPTURE_DEADLINE_MS,
        ),
      ),
    ]);
  }

  private async captureInner(input: CctvSnapshotInput): Promise<Buffer> {
    const rtspUrl = this.buildRtspUrl(input);
    const cameraHost = new URL(rtspUrl).hostname;
    assertCameraReachableFromServer(cameraHost);

    const errors: string[] = [];
    const hikvision = this.isHikvisionStyle(rtspUrl);

    if (hikvision) {
      try {
        return this.captureHikvisionHttp(rtspUrl);
      } catch (e) {
        errors.push(
          `ISAPI HTTP${e instanceof Error ? `: ${e.message}` : ''}`,
        );
      }
      // Hikvision: coba FFmpeg sekali saja (RTSP sering bentrok/lambat)
      try {
        return await this.captureFfmpeg(rtspUrl, 'tcp');
      } catch (e) {
        errors.push(
          `FFmpeg/tcp${e instanceof Error ? `: ${e.message}` : ''}`,
        );
      }
    } else {
      for (const transport of ['tcp', 'udp'] as const) {
        try {
          return await this.captureFfmpeg(rtspUrl, transport);
        } catch (e) {
          errors.push(
            `FFmpeg/${transport}${e instanceof Error ? `: ${e.message}` : ''}`,
          );
        }
      }
      try {
        return this.captureHikvisionHttp(rtspUrl);
      } catch (e) {
        errors.push(
          `ISAPI HTTP${e instanceof Error ? `: ${e.message}` : ''}`,
        );
      }
    }

    throw new Error(
      `Snapshot gagal — ${errors.join(' | ')}. Pastikan server (${this.serverIpHint()}) diizinkan mengakses kamera.`,
    );
  }

  private serverIpHint(): string {
    return process.env.SERVER_LAN_IP || 'IP server backend';
  }

  buildRtspUrl(input: CctvSnapshotInput): string {
    const raw = (input.rtspUrl || '').trim();
    if (!raw) {
      throw new Error('URL RTSP kosong');
    }

    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      throw new Error('Format URL RTSP tidak valid');
    }

    if (!url.username) {
      const fallback = this.resolveCredentials(input);
      if (fallback.username) {
        url.username = encodeURIComponent(fallback.username);
      }
      if (fallback.password) {
        url.password = encodeURIComponent(fallback.password);
      }
    }

    if (url.protocol !== 'rtsp:' && url.protocol !== 'rtsps:') {
      throw new Error('URL harus diawali rtsp:// atau rtsps://');
    }

    return url.toString();
  }

  private resolveCredentials(input: CctvSnapshotInput) {
    if (input.username) {
      return {
        username: input.username,
        password: input.password || '',
      };
    }

    const fromEnv = this.defaultCredsFromEnv();
    if (fromEnv.username) return fromEnv;

    return { username: '', password: '' };
  }

  private defaultCredsFromEnv() {
    try {
      const u = new URL((process.env.CCTV_RTSP_URL || '').trim());
      return {
        username: decodeURIComponent(u.username),
        password: decodeURIComponent(u.password),
      };
    } catch {
      return { username: '', password: '' };
    }
  }

  private isHikvisionStyle(rtspUrl: string): boolean {
    return /Streaming\/Channels\/\d+/i.test(rtspUrl);
  }

  private parseRtsp(rtspUrl: string) {
    const u = new URL(rtspUrl);
    return {
      host: u.hostname,
      username: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      path: u.pathname,
    };
  }

  private extractChannel(path: string): string {
    const match = path.match(/Channels\/(\d+)/i);
    return match?.[1] ?? '101';
  }

  private isJpeg(buf: Buffer): boolean {
    return buf.length > 100 && buf[0] === 0xff && buf[1] === 0xd8;
  }

  /** Fast path: channel dari URL, port 80, digest — seperti saat preview awalnya jalan */
  private captureHikvisionHttp(rtspUrl: string): Buffer {
    const parsed = this.parseRtsp(rtspUrl);
    const cred = `${parsed.username}:${parsed.password}`;
    const channel = this.extractChannel(parsed.path);

    // Port 80 dulu — banyak Hikvision menolak/reset port 8000
    const primaryUrls = [
      `http://${parsed.host}/ISAPI/Streaming/channels/${channel}/picture`,
      `http://${parsed.host}:80/ISAPI/Streaming/channels/${channel}/picture`,
      `http://${parsed.host}:8000/ISAPI/Streaming/channels/${channel}/picture`,
    ];

    for (const url of primaryUrls) {
      const buf = this.curlSnapshot(url, cred, 'digest');
      if (buf) return buf;
    }

    // Fallback terbatas (bukan 48 kombinasi)
    const fallbackChannels = Array.from(
      new Set([channel, channel.length >= 3 ? channel.slice(0, -2) : channel, '101']),
    );
    for (const ch of fallbackChannels) {
      for (const mode of ['digest', 'basic'] as const) {
        const url = `http://${parsed.host}/ISAPI/Streaming/channels/${ch}/picture`;
        const buf = this.curlSnapshot(url, cred, mode);
        if (buf) return buf;
      }
    }

    throw new Error('tidak ada respons JPEG dari kamera');
  }

  private curlSnapshot(
    url: string,
    userColonPass: string,
    auth: 'digest' | 'basic',
  ): Buffer | null {
    const bindIp = getCameraSourceIp();
    const args = [
      '-sS',
      '--max-time',
      String(CURL_MAX_SEC),
      '--connect-timeout',
      '3',
      '--http1.1',
      '-u',
      userColonPass,
      url,
    ];
    if (bindIp) args.splice(3, 0, '--interface', bindIp);
    if (auth === 'digest') args.splice(3, 0, '--digest');

    const result = spawnSync('curl', args, {
      encoding: 'buffer',
      maxBuffer: 15 * 1024 * 1024,
    });

    const stdout = result.stdout as Buffer;
    if (stdout?.length && this.isJpeg(stdout)) return stdout;
    return null;
  }

  private captureFfmpeg(
    rtspUrl: string,
    transport: 'tcp' | 'udp',
  ): Promise<Buffer> {
    const ffmpegBin = resolveFfmpegBin();
    if (!ffmpegBin) {
      return Promise.reject(new Error('binary FFmpeg tidak ditemukan'));
    }

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const proc = spawn(ffmpegBin, [
        '-hide_banner',
        '-loglevel',
        'error',
        ...ffmpegRtspInputArgs(transport),
        '-i',
        rtspUrl,
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
        reject(new Error('timeout'));
      }, FFMPEG_SNAPSHOT_MS);

      proc.stdout.on('data', (c: Buffer) => chunks.push(c));
      proc.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
      proc.on('close', (code) => {
        clearTimeout(timer);
        const buf = Buffer.concat(chunks);
        if (this.isJpeg(buf)) {
          resolve(buf);
          return;
        }
        reject(new Error(`exit ${code ?? 'unknown'}`));
      });
    });
  }
}
