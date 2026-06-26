import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Camera, Wifi, WifiOff } from "lucide-react";
import { BuktiScanApi } from "@/api/invo-track";
import { formatLastSeen } from "@/lib/format";
import type { DeviceStatus } from "@/types/invo-track";

export default function DeviceStatusPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["device-status"],
    queryFn: async () => {
      const res = await BuktiScanApi.deviceStatus();
      return res.data as DeviceStatus;
    },
    refetchInterval: 30_000,
  });

  useEffect(() => {
    const handler = () => qc.invalidateQueries({ queryKey: ["device-status"] });
    window.addEventListener("device-status-update", handler);
    return () => window.removeEventListener("device-status-update", handler);
  }, [qc]);

  if (isLoading) {
    return (
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="skeleton h-20 rounded-xl" />
        <div className="skeleton h-20 rounded-xl" />
      </div>
    );
  }

  const cameras = data?.cctv ?? [];
  const online = cameras.filter((c) => c.isOnline).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <span className="badge badge-success badge-outline gap-1">
          <Wifi className="w-3 h-3" />
          {online} online
        </span>
        <span className="badge badge-error badge-outline gap-1">
          <WifiOff className="w-3 h-3" />
          {cameras.length - online} offline
        </span>
      </div>

      <ul className="grid sm:grid-cols-2 gap-3">
        {cameras.map((c) => (
          <li
            key={c.id}
            className={`flex items-start gap-3 p-3 rounded-xl border ${
              c.isOnline
                ? "border-success/30 bg-success/5"
                : "border-base-300 bg-base-200/50"
            }`}
          >
            <div
              className={`p-2 rounded-lg shrink-0 ${
                c.isOnline ? "bg-success/15 text-success" : "bg-base-300 text-base-content/40"
              }`}
            >
              <Camera className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{c.label}</p>
              <p className="text-xs text-base-content/50 mt-0.5">
                {c.isOnline ? "Online" : "Offline"}
                {c.lastSeenAt && ` · ${formatLastSeen(c.lastSeenAt)}`}
              </p>
            </div>
          </li>
        ))}
        {!cameras.length && (
          <li className="col-span-full text-sm text-base-content/60 py-4 text-center">
            Belum ada CCTV — tambah di tab CCTV.
          </li>
        )}
      </ul>
    </div>
  );
}
