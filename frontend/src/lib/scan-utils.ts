import { BASE_URL } from "@/lib/constants";
import type { InvoiceScan } from "@/types/invo-track";

export function formatDurationMs(ms: number): string {
  if (ms < 0 || !Number.isFinite(ms)) return "—";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function scanDuration(scan: InvoiceScan, now = Date.now()): string {
  const start = new Date(scan.scannedAt).getTime();
  if (scan.status === "RECORDING") {
    return formatDurationMs(now - start);
  }
  if (scan.completedAt) {
    return formatDurationMs(new Date(scan.completedAt).getTime() - start);
  }
  if (scan.status === "COMPLETED" && scan.updatedAt) {
    return formatDurationMs(new Date(scan.updatedAt).getTime() - start);
  }
  return "—";
}

function encodeMediaPath(videoPath: string): string {
  if (videoPath.startsWith("http")) {
    try {
      const u = new URL(videoPath);
      u.pathname = u.pathname
        .split("/")
        .map((seg) => encodeURIComponent(decodeURIComponent(seg)))
        .join("/");
      return u.toString();
    } catch {
      return videoPath;
    }
  }

  const pathOnly = videoPath
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  return `${BASE_URL}${pathOnly}`;
}

export function scanVideoSrc(scan: InvoiceScan): string | null {
  if (
    !scan.videoPath ||
    scan.status === "FAILED" ||
    scan.status === "RECORDING"
  ) {
    return null;
  }
  return encodeMediaPath(scan.videoPath);
}
