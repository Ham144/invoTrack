import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Radio, Square } from "lucide-react";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { BuktiScanApi } from "@/api/invo-track";
import type { ActiveRecording } from "@/types/invo-track";

export default function ActiveRecordingsPanel() {
  const qc = useQueryClient();
  const [, tick] = useState(0);
  const [stoppingId, setStoppingId] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["active-recordings"],
    queryFn: async () => {
      const res = await BuktiScanApi.activeRecordings();
      return res.data as ActiveRecording[];
    },
    refetchInterval: 3000,
  });

  const stop = useMutation({
    mutationFn: (scanId: string) => BuktiScanApi.stopRecording(scanId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["active-recordings"] });
      qc.invalidateQueries({ queryKey: ["scan-log"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast.success("Rekam dihentikan");
    },
    onError: (err) => toastApiError(err, "Gagal menghentikan rekam"),
    onSettled: () => setStoppingId(null),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <span className="loading loading-spinner loading-md text-primary" />
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="text-center py-8 text-base-content/60">
        <Radio className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">Tidak ada rekam aktif</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-base-300">
      {rows.map((row) => (
        <li
          key={row.scanId}
          className="flex flex-col sm:flex-row sm:items-center gap-3 py-4 first:pt-0 last:pb-0"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="badge badge-warning badge-sm gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-warning-content animate-pulse" />
                REKAM
              </span>
              <span className="font-mono font-semibold truncate">
                {row.invoiceNumber}
              </span>
            </div>
            <p className="text-xs text-base-content/60 mt-1">
              {row.scannerLabel ?? "Scanner"} · {row.cctvLabel ?? "CCTV"}
              {row.remainingSec > 0 && (
                <span className="ml-2 font-mono text-warning">
                  sisa {row.remainingSec}s
                </span>
              )}
            </p>
          </div>
          {row.stopRequested ? (
            <button
              type="button"
              className="btn btn-sm btn-error gap-1 shrink-0"
              disabled={stoppingId === row.scanId || stop.isPending}
              onClick={() => {
                setStoppingId(row.scanId);
                stop.mutate(row.scanId);
              }}
            >
              <Square className="w-3.5 h-3.5" />
              {stoppingId === row.scanId ? "Memaksa Berhenti…" : "Force Stop"}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-sm btn-error btn-outline gap-1 shrink-0"
              disabled={stoppingId === row.scanId || stop.isPending}
              onClick={() => {
                setStoppingId(row.scanId);
                stop.mutate(row.scanId);
              }}
            >
              <Square className="w-3.5 h-3.5" />
              {stoppingId === row.scanId ? "Menghentikan…" : "Stop"}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
