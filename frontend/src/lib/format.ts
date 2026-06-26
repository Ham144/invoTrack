export function formatDiskGb(bytes: number | null | undefined): string {
  if (bytes == null) return "—";
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

export function isDiskLow(bytes: number | null | undefined): boolean {
  if (bytes == null) return false;
  return bytes < 5 * 1024 ** 3;
}

export function isAgentOnline(lastSeen: string | null | undefined): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 120_000;
}

export function formatLastSeen(iso: string | null | undefined): string {
  if (!iso) return "Belum pernah";
  return new Date(iso).toLocaleString("id-ID");
}
