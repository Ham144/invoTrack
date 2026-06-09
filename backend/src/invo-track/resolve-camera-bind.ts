import { networkInterfaces } from 'os';

const CAMERA_LAN_PREFIX = '192.168.168.';

function listLocalIpv4(): string[] {
  const ips: string[] = [];
  for (const ifaces of Object.values(networkInterfaces())) {
    for (const cfg of ifaces ?? []) {
      if (cfg.family === 'IPv4' && !cfg.internal) {
        ips.push(cfg.address);
      }
    }
  }
  return ips;
}

function isLocalIpv4(ip: string): boolean {
  return listLocalIpv4().includes(ip);
}

/** IP sumber outbound ke kamera (env atau auto-detect 192.168.168.x) */
export function getCameraSourceIp(): string | null {
  const explicit = process.env.CAMERA_SOURCE_IP?.trim();
  if (explicit) {
    return isLocalIpv4(explicit) ? explicit : null;
  }

  for (const ip of listLocalIpv4()) {
    if (ip.startsWith(CAMERA_LAN_PREFIX)) return ip;
  }
  return null;
}

export function ffmpegBindArgs(): string[] {
  const ip = getCameraSourceIp();
  return ip ? ['-localaddr', ip] : [];
}

/**
 * Kamera 192.168.168.x sering menolak source IP 192.168.169.x.
 * Wajib alias IP di subnet kamera sebelum snapshot/rekam.
 */
export function assertCameraReachableFromServer(cameraHost: string): void {
  if (!cameraHost.startsWith(CAMERA_LAN_PREFIX)) return;

  const locals = listLocalIpv4();
  const hasCameraSubnet = locals.some((ip) => ip.startsWith(CAMERA_LAN_PREFIX));
  if (hasCameraSubnet) return;

  const serverIp =
    process.env.SERVER_LAN_IP?.trim() ||
    locals.find((ip) => ip.startsWith('192.168.169.')) ||
    locals[0] ||
    'server';

  const iface = process.env.CAMERA_BIND_INTERFACE?.trim() || 'ens160';
  const suggested = process.env.CAMERA_SOURCE_IP?.trim() || '192.168.168.12';

  throw new Error(
    `Kamera ${cameraHost} menolak koneksi dari ${serverIp}. ` +
      `Jalankan sekali di server: sudo ip addr add ${suggested}/24 dev ${iface} ` +
      `(lalu restart backend). Opsional .env: CAMERA_SOURCE_IP="${suggested}"`,
  );
}

export function getBindDiagnostics(): {
  localIps: string[];
  cameraSourceIp: string | null;
  configuredSourceIp: string | null;
} {
  const configured = process.env.CAMERA_SOURCE_IP?.trim() || null;
  return {
    localIps: listLocalIpv4(),
    cameraSourceIp: getCameraSourceIp(),
    configuredSourceIp: configured,
  };
}
