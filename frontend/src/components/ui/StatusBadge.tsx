export default function StatusBadge({
  status,
}: {
  status: "online" | "offline" | "RECORDING" | "COMPLETED" | "FAILED" | string;
}) {
  const map: Record<string, string> = {
    online: "badge-success",
    offline: "badge-error",
    RECORDING: "badge-warning",
    COMPLETED: "badge-success",
    FAILED: "badge-error",
  };
  const labels: Record<string, string> = {
    online: "Online",
    offline: "Offline",
    RECORDING: "Merekam",
    COMPLETED: "Selesai",
    FAILED: "Gagal",
  };
  return (
    <span className={`badge badge-sm ${map[status] ?? "badge-ghost"}`}>
      {labels[status] ?? status}
    </span>
  );
}
