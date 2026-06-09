import { execSync } from 'child_process';
import * as fs from 'fs';

let cached: string | null | undefined;
let rtspDemuxerOpts: Set<string> | undefined;

function getRtspDemuxerOptions(): Set<string> {
  if (rtspDemuxerOpts) return rtspDemuxerOpts;

  const bin = resolveFfmpegBin();
  if (!bin) {
    rtspDemuxerOpts = new Set();
    return rtspDemuxerOpts;
  }

  try {
    const help = execSync(`"${bin}" -h demuxer=rtsp`, {
      encoding: 'utf8',
      timeout: 5000,
    });
    const names = new Set<string>();
    for (const line of help.split('\n')) {
      const match = line.match(/^\s+-([a-z_]+)\s/);
      if (match) names.add(match[1]);
    }
    rtspDemuxerOpts = names;
  } catch {
    rtspDemuxerOpts = new Set(['rtsp_transport', 'timeout']);
  }

  return rtspDemuxerOpts;
}

/** Argumen input RTSP yang kompatibel dengan ffmpeg-static / build sistem */
export function ffmpegRtspInputArgs(
  transport: 'tcp' | 'udp' = 'tcp',
): string[] {
  const opts = getRtspDemuxerOptions();
  const args: string[] = [];

  if (opts.has('rtsp_transport')) {
    args.push('-rtsp_transport', transport);
  }
  if (opts.has('timeout')) {
    args.push('-timeout', '5000000');
  } else if (opts.has('rw_timeout')) {
    args.push('-rw_timeout', '5000000');
  }

  return args;
}

/** Resolve ffmpeg binary — require() avoids broken ESM default interop in dist. */
export function resolveFfmpegBin(): string | null {
  if (cached !== undefined) return cached;

  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    cached = process.env.FFMPEG_PATH;
    return cached;
  }

  try {
    const mod = require('ffmpeg-static') as string | { default?: string };
    const candidate = typeof mod === 'string' ? mod : mod?.default;
    if (candidate && fs.existsSync(candidate)) {
      cached = candidate;
      return cached;
    }
  } catch {
    /* ffmpeg-static not installed */
  }

  cached = null;
  return null;
}
