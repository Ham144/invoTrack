import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Circle, Plug, Square, Unplug } from "lucide-react";
import { InvoTrackApi } from "@/api/invo-track";
import { extractApiErrorMessage } from "@/lib/api-error";
import { getSerialSupportStatus } from "@/lib/serial-support";
import { useSerialScanners } from "@/lib/use-serial-scanners";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type {
  ActiveRecording,
  InvoiceScan,
  ScannerConfig,
  Workstation,
} from "@/types/invo-track";

const WS_STORAGE_KEY = "invotrack-active-workstation";

function formatCountdown(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function OperatorScanPanel() {
  const [workstationId, setWorkstationId] = useState("");
  const [manualScannerId, setManualScannerId] = useState("");
  const [manualInvoice, setManualInvoice] = useState("");
  const [stopTarget, setStopTarget] = useState<ActiveRecording | null>(null);
  const [, tick] = useState(0);
  const qc = useQueryClient();

  const workstations = useQuery({
    queryKey: ["workstations"],
    queryFn: async () => {
      const res = await InvoTrackApi.workstationList();
      return res.data as Workstation[];
    },
  });

  const wsList = workstations.data ?? [];

  useEffect(() => {
    if (!workstationId && wsList.length) {
      const saved = localStorage.getItem(WS_STORAGE_KEY);
      const found = wsList.find((w) => w.id === saved);
      setWorkstationId(found?.id ?? wsList[0].id);
    }
  }, [wsList, workstationId]);

  useEffect(() => {
    if (workstationId) localStorage.setItem(WS_STORAGE_KEY, workstationId);
  }, [workstationId]);

  const scanners = useQuery({
    queryKey: ["scanner-config", workstationId],
    queryFn: async () => {
      const res = await InvoTrackApi.scannerList(workstationId);
      return res.data as ScannerConfig[];
    },
    enabled: Boolean(workstationId),
  });

  const scannerList = scanners.data ?? [];

  useEffect(() => {
    if (!manualScannerId && scannerList.length === 1) {
      setManualScannerId(scannerList[0].id);
    }
  }, [scannerList, manualScannerId]);

  const activeRecordings = useQuery({
    queryKey: ["active-recordings", workstationId],
    queryFn: async () => {
      const res = await InvoTrackApi.activeRecordings();
      return res.data as ActiveRecording[];
    },
    refetchInterval: 5000,
  });

  const ingest = useMutation({
    mutationFn: async ({
      scannerConfigId,
      invoiceNumber,
    }: {
      scannerConfigId: string;
      invoiceNumber: string;
    }) => {
      const res = await InvoTrackApi.ingestScanner(
        scannerConfigId,
        invoiceNumber,
      );
      return res.data as InvoiceScan;
    },
    onSuccess: (scan) => {
      qc.invalidateQueries({ queryKey: ["scan-log"] });
      qc.invalidateQueries({ queryKey: ["device-status"] });
      qc.invalidateQueries({ queryKey: ["active-recordings"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });

      const closed = scan.previousInvoice;
      const current = scan.invoiceNumber;
      if (closed) {
        toast.success(`${closed} selesai → rekam ${current}`);
      } else {
        toast.success(`Mulai rekam ${current}`);
      }
    },
    onError: async (err: unknown) => {
      toast.error(await extractApiErrorMessage(err, "Scan gagal"));
    },
  });

  const handleIngest = useCallback(
    (scannerConfigId: string, invoiceNumber: string) => {
      // #region agent log
      fetch(
        "http://localhost:7525/ingest/56fe92df-f231-454d-96a6-16be82610eed",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Debug-Session-Id": "92cfd8",
          },
          body: JSON.stringify({
            sessionId: "92cfd8",
            runId: "serial-read",
            hypothesisId: "E",
            location: "OperatorScanPanel.tsx:handleIngest",
            message: "handleIngest called",
            data: {
              scannerConfigId,
              invoiceLen: invoiceNumber.trim().length,
              isPending: ingest.isPending,
              willMutate: Boolean(
                invoiceNumber.trim() && !ingest.isPending,
              ),
            },
            timestamp: Date.now(),
          }),
        },
      ).catch(() => {});
      // #endregion
      if (!invoiceNumber.trim() || ingest.isPending) return;
      ingest.mutate({
        scannerConfigId,
        invoiceNumber: invoiceNumber.trim().toUpperCase(),
      });
    },
    [ingest],
  );

  const serialStatus = getSerialSupportStatus();
  const { sessions, connect, disconnect, serialSupported } = useSerialScanners(
    scannerList,
    handleIngest,
  );

  const stopRecording = useMutation({
    mutationFn: async (scanId: string) => {
      await InvoTrackApi.stopRecording(scanId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["active-recordings"] });
      qc.invalidateQueries({ queryKey: ["scan-log"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setStopTarget(null);
      toast.success("Rekam dihentikan");
    },
    onError: async (err: unknown) => {
      toast.error(await extractApiErrorMessage(err, "Gagal stop rekam"));
    },
  });

  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!workstationId) return;
    const sendHeartbeat = () => {
      InvoTrackApi.workstationHeartbeat(workstationId).catch(() => {});
    };
    sendHeartbeat();
    const id = window.setInterval(sendHeartbeat, 60_000);
    return () => window.clearInterval(id);
  }, [workstationId]);

  useEffect(() => {
    const handler = () => {
      qc.invalidateQueries({ queryKey: ["active-recordings"] });
    };
    window.addEventListener("scan-log-update", handler);
    return () => window.removeEventListener("scan-log-update", handler);
  }, [qc]);

  const activeByScanner = new Map<string, ActiveRecording>();
  for (const row of activeRecordings.data ?? []) {
    if (row.scannerConfigId) activeByScanner.set(row.scannerConfigId, row);
  }

  if (workstations.isLoading) {
    return <div className="skeleton h-48 w-full rounded-xl" />;
  }

  if (!wsList.length) {
    return (
      <div className="alert alert-warning max-w-2xl">
        <div>
          <p className="font-semibold">Belum ada workstation</p>
          <p className="text-sm mt-1">
            Minta admin buat workstation dan scanner di halaman Perangkat.
          </p>
          <a
            href="/dashboard/devices"
            className="link text-sm mt-2 inline-block"
          >
            Ke Perangkat →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <label className="text-sm font-medium shrink-0">
          Workstation aktif
        </label>
        <select
          className="select select-bordered select-sm max-w-md"
          value={workstationId}
          onChange={(e) => setWorkstationId(e.target.value)}
        >
          {wsList.map((ws) => (
            <option key={ws.id} value={ws.id}>
              {ws.label}
            </option>
          ))}
        </select>
        {!serialSupported && (
          <span
            className="badge badge-warning badge-sm max-w-md whitespace-normal h-auto py-2"
            title={serialStatus.message}
          >
            {serialStatus.message}
          </span>
        )}
      </div>

      {scannerList.length === 0 ? (
        <div className="alert alert-info max-w-2xl">
          <p className="text-sm">
            Workstation ini belum punya scanner. Admin perlu menambahkan di tab
            Workstation & Scanner.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {scannerList.map((scanner) => {
            const session = sessions[scanner.id];
            const active = activeByScanner.get(scanner.id);
            const remaining =
              active && active.maxDurationSec > 0
                ? Math.max(
                    0,
                    active.maxDurationSec -
                      Math.floor(
                        (Date.now() - new Date(active.scannedAt).getTime()) /
                          1000,
                      ),
                  )
                : null;

            return (
              <div
                key={scanner.id}
                className="card bg-base-100 border border-base-300"
              >
                <div className="card-body gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{scanner.label}</p>
                      <p className="text-xs text-base-content/60">
                        {scanner.assignedUser?.displayName ?? "—"} ·{" "}
                        {scanner.cctvConfig?.label ?? "—"}
                      </p>
                    </div>
                    <span
                      className={`badge badge-sm ${
                        session?.state === "connected"
                          ? "badge-success"
                          : session?.state === "error"
                            ? "badge-error"
                            : "badge-ghost"
                      }`}
                    >
                      {session?.state === "connected"
                        ? "Serial OK"
                        : session?.state === "connecting"
                          ? "Menghubungkan..."
                          : session?.state === "error"
                            ? "Error"
                            : "Offline"}
                    </span>
                  </div>

                  {active && (
                    <div className="alert alert-warning py-2 min-h-0">
                      <div className="flex-1 text-sm">
                        <p className="font-medium flex items-center gap-2">
                          <Circle className="w-2 h-2 fill-error text-error animate-pulse" />
                          {active.invoiceNumber}
                        </p>
                        {remaining !== null && (
                          <p className="font-mono text-xs mt-1">
                            Sisa {formatCountdown(remaining)}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        className="btn btn-xs btn-error btn-outline"
                        onClick={() => setStopTarget(active)}
                      >
                        <Square className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {session?.lastBarcode && (
                    <p className="text-xs font-mono text-base-content/50">
                      Terakhir: {session.lastBarcode}
                    </p>
                  )}

                  {session?.error && (
                    <p className="text-xs text-error">{session.error}</p>
                  )}

                  <div className="flex gap-2">
                    {session?.state === "connected" ? (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline gap-1"
                        onClick={() => disconnect(scanner.id)}
                      >
                        <Unplug className="w-4 h-4" />
                        Putus
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-sm btn-primary gap-1"
                        disabled={!serialSupported}
                        onClick={() => connect(scanner)}
                      >
                        <Plug className="w-4 h-4" />
                        Hubungkan USB
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="card bg-base-100 border border-base-300 border-dashed">
        <div className="card-body gap-3 p-4">
          <p className="text-xs text-base-content/60">
            Mode Virtual COM tidak mengetik ke keyboard. Hubungkan USB di kartu
            scanner di atas, lalu scan barcode — data masuk otomatis lewat
            serial. Input manual di bawah hanya untuk uji tanpa hardware.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              className="select select-bordered select-sm"
              value={manualScannerId}
              onChange={(e) => setManualScannerId(e.target.value)}
            >
              <option value="">Pilih scanner</option>
              {scannerList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <input
              className="input input-bordered input-sm font-mono flex-1"
              placeholder="Nomor invoice"
              value={manualInvoice}
              onChange={(e) => setManualInvoice(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  manualScannerId &&
                  manualInvoice.trim()
                ) {
                  handleIngest(manualScannerId, manualInvoice);
                  setManualInvoice("");
                }
              }}
            />
            <button
              type="button"
              className="btn btn-sm btn-outline"
              disabled={
                !manualScannerId || !manualInvoice.trim() || ingest.isPending
              }
              onClick={() => {
                handleIngest(manualScannerId, manualInvoice);
                setManualInvoice("");
              }}
            >
              Scan
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(stopTarget)}
        title="Hentikan rekam?"
        message={
          stopTarget ? (
            <>
              Rekam <strong>{stopTarget.invoiceNumber}</strong> akan diakhiri.
            </>
          ) : null
        }
        confirmLabel="Stop rekam"
        danger
        onCancel={() => setStopTarget(null)}
        onConfirm={() => stopTarget && stopRecording.mutate(stopTarget.scanId)}
      />
    </div>
  );
}
