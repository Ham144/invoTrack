import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { InvoTrackApi } from "@/api/invo-track";
import type { DeviceStatus } from "@/types/invo-track";

function StatusDot({ online }: { online: boolean }) {
  return (
    <span
      className={`inline-block w-3 h-3 rounded-full ${
        online ? "bg-success" : "bg-error"
      }`}
      title={online ? "Online" : "Offline"}
    />
  );
}

export default function DeviceStatusPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["device-status"],
    queryFn: async () => {
      const res = await InvoTrackApi.deviceStatus();
      return res.data as DeviceStatus;
    },
  });

  useEffect(() => {
    const handler = () => qc.invalidateQueries({ queryKey: ["device-status"] });
    window.addEventListener("device-status-update", handler);
    return () => window.removeEventListener("device-status-update", handler);
  }, [qc]);

  if (isLoading) return <div className="skeleton h-32 w-full" />;

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body">
        <h3 className="card-title text-base">CCTV</h3>
        <ul className="space-y-2">
          {data?.cctv.map((c) => (
            <li key={c.id} className="flex items-center gap-2">
              <StatusDot online={c.isOnline} />
              <span>{c.label}</span>
            </li>
          ))}
          {!data?.cctv.length && (
            <li className="opacity-60 text-sm">Belum dikonfigurasi</li>
          )}
        </ul>
      </div>
    </div>
  );
}
