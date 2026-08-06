import { networkInterfaces } from "os";
import { LOCAL_MEDIA_PORT } from "./local-media-server";

function listLocalIpv4(): string[] {
  const ips: string[] = [];
  for (const ifaces of Object.values(networkInterfaces())) {
    for (const cfg of ifaces ?? []) {
      const family = String(cfg.family);
      if ((family === "IPv4" || family === "4") && !cfg.internal) {
        ips.push(cfg.address);
      }
    }
  }
  return ips;
}

/**
 * Pick the LAN IP that other PCs on the network can reach for clip streaming.
 * Prefer an interface on the same subnet as the API host when possible.
 */
export function detectLanIp(apiBaseUrl?: string): string | null {
  const ips = listLocalIpv4();
  if (ips.length === 0) return null;

  try {
    if (apiBaseUrl) {
      const host = new URL(apiBaseUrl).hostname;
      if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) && host !== "127.0.0.1") {
        const prefix = host.split(".").slice(0, 3).join(".");
        const sameSubnet = ips.find((ip) => ip.startsWith(`${prefix}.`));
        if (sameSubnet) return sameSubnet;
      }
    }
  } catch {
    /* ignore */
  }

  // Prefer private LAN ranges over others
  const preferred =
    ips.find((ip) => ip.startsWith("192.168.")) ||
    ips.find((ip) => ip.startsWith("10.")) ||
    ips.find((ip) => /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip));
  return preferred ?? ips[0] ?? null;
}

export function agentMediaPort(): number {
  return LOCAL_MEDIA_PORT;
}
