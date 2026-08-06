import { safeInvoiceFileName } from './clip-storage';

export const DEFAULT_AGENT_MEDIA_PORT = 19500;

export function sanitizeLanIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  let clean = ip.trim();
  if (clean.startsWith('::ffff:')) clean = clean.slice(7);
  if (clean === '::1') return null;
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(clean)) return null;
  if (clean === '127.0.0.1' || clean.startsWith('0.')) return null;
  return clean;
}

export function buildAgentClipUrl(
  lanIp: string | null | undefined,
  invoiceNumber: string,
  mediaPort: number = DEFAULT_AGENT_MEDIA_PORT,
): string | null {
  const host = sanitizeLanIp(lanIp);
  if (!host) return null;
  const port =
    Number.isFinite(mediaPort) && mediaPort > 0 && mediaPort < 65536
      ? Math.round(mediaPort)
      : DEFAULT_AGENT_MEDIA_PORT;
  const safeName = safeInvoiceFileName(invoiceNumber);
  return `http://${host}:${port}/clips/${safeName}.mp4`;
}

/** Rewrite EDGE clip URL host to the agent's current LAN IP. */
export function rewriteAgentClipUrl(
  videoPath: string | null | undefined,
  lanIp: string | null | undefined,
  mediaPort: number = DEFAULT_AGENT_MEDIA_PORT,
): string | null | undefined {
  if (!videoPath) return videoPath;
  const host = sanitizeLanIp(lanIp);
  if (!host) return videoPath;
  try {
    const u = new URL(videoPath);
    const isLocalHost =
      u.hostname === '127.0.0.1' ||
      u.hostname === 'localhost' ||
      u.hostname === '0.0.0.0';
    const looksLikeAgentMedia =
      u.port === String(mediaPort) ||
      u.port === String(DEFAULT_AGENT_MEDIA_PORT) ||
      u.pathname.includes('/clips/');
    if (isLocalHost || looksLikeAgentMedia) {
      u.protocol = 'http:';
      u.hostname = host;
      u.port = String(
        Number.isFinite(mediaPort) && mediaPort > 0
          ? Math.round(mediaPort)
          : DEFAULT_AGENT_MEDIA_PORT,
      );
      return u.toString();
    }
  } catch {
    /* keep original */
  }
  return videoPath;
}
