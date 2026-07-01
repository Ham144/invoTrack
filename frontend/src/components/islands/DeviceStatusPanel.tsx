import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Camera } from "lucide-react";
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
        <div className="skeleton h-16 rounded-lg" />
        <div className="skeleton h-16 rounded-lg" />
      </div>
    );
  }

  const cameras = data?.cctv ?? [];
  const online = cameras.filter((c) => c.isOnline).length;

  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-sm">
        <span className="text-success font-medium">{online} online</span>
        <span className="text-base-content/40">·</span>
        <span className="text-base-content/55">
          {cameras.length - online} offline
        </span>
      </div>

      <ul className="grid sm:grid-cols-2 gap-2">
        {cameras.map((c) => (
          <li
            key={c.id}
            className="flex items-center gap-3 p-3 rounded-lg border border-base-300/80 bg-base-100"
          >
            <div
              className={`w-2 h-2 rounded-full shrink-0 ${
                c.isOnline ? "bg-success" : "bg-base-300"
              }`}
            />
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                c.isOnline ? "bg-success/10 text-success" : "bg-base-200 text-base-content/40"
              }`}
            >
              <Camera className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{c.label}</p>
              <p className="text-xs text-base-content/45 mt-0.5">
                {c.isOnline ? "Online" : "Offline"}
                {c.lastSeenAt && ` · ${formatLastSeen(c.lastSeenAt)}`}
              </p>
            </div>
          </li>
        ))}
        {!cameras.length && (
          <li className="col-span-full text-sm text-base-content/50 py-6 text-center">
            Belum ada CCTV
          </li>
        )}
      </ul>
    </div>
  );
}
