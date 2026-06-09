import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthApi } from "@/api/auth";
import { InvoTrackApi } from "@/api/invo-track";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { PaginatedMembers } from "@/types/auth";
import { ROLE } from "@/types/auth";
import { getSerialSupportStatus } from "@/lib/serial-support";
import type {
  CctvConfig,
  ScannerConfig,
  ScannerQuota,
  Workstation,
} from "@/types/invo-track";

export default function WorkstationScannerSettings() {
  const qc = useQueryClient();
  const [wsLabel, setWsLabel] = useState("");
  const [selectedWs, setSelectedWs] = useState<string>("");
  const [scannerForm, setScannerForm] = useState({
    label: "",
    assignedUsername: "",
    cctvConfigId: "",
    baudRate: 9600,
  });
  const [deleteScanner, setDeleteScanner] = useState<ScannerConfig | null>(
    null,
  );

  const workstations = useQuery({
    queryKey: ["workstations"],
    queryFn: async () => {
      const res = await InvoTrackApi.workstationList();
      return res.data as Workstation[];
    },
  });

  const wsList = workstations.data ?? [];
  const activeWs = selectedWs || wsList[0]?.id || "";

  useEffect(() => {
    if (!selectedWs && wsList[0]?.id) {
      setSelectedWs(wsList[0].id);
    }
  }, [selectedWs, wsList[0]?.id]);

  const scanners = useQuery({
    queryKey: ["scanner-config", activeWs],
    queryFn: async () => {
      const res = await InvoTrackApi.scannerList(activeWs || undefined);
      return res.data as ScannerConfig[];
    },
    enabled: Boolean(activeWs),
  });

  const quota = useQuery({
    queryKey: ["scanner-quota"],
    queryFn: async () => {
      const res = await InvoTrackApi.scannerQuota();
      return res.data as ScannerQuota;
    },
  });

  const cctvList = useQuery({
    queryKey: ["cctv-config"],
    queryFn: async () => {
      const res = await InvoTrackApi.cctvList();
      return res.data as CctvConfig[];
    },
  });

  const members = useQuery({
    queryKey: ["members", 1, "", "OPERATOR"],
    queryFn: async () => {
      const res = await AuthApi.listMembers(1, "", "OPERATOR");
      return res.data as PaginatedMembers;
    },
  });

  const createWs = useMutation({
    mutationFn: () => InvoTrackApi.workstationCreate({ label: wsLabel }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workstations"] });
      setWsLabel("");
      toast.success("Workstation ditambahkan");
    },
    onError: () => toast.error("Gagal menambah workstation"),
  });

  const createScanner = useMutation({
    mutationFn: () =>
      InvoTrackApi.scannerCreate({
        ...scannerForm,
        workstationId: activeWs,
        assignedUsername: scannerForm.assignedUsername || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scanner-config"] });
      qc.invalidateQueries({ queryKey: ["scanner-quota"] });
      setScannerForm({
        label: "",
        assignedUsername: "",
        cctvConfigId: "",
        baudRate: 9600,
      });
      toast.success("Scanner ditambahkan");
    },
    onError: () => toast.error("Gagal menambah scanner"),
  });

  const updateScanner = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Record<string, unknown>;
    }) => InvoTrackApi.scannerUpdate(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scanner-config"] });
      toast.success("Scanner diperbarui");
    },
    onError: () => toast.error("Gagal memperbarui scanner"),
  });

  const removeScanner = useMutation({
    mutationFn: (id: string) => InvoTrackApi.scannerDelete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scanner-config"] });
      qc.invalidateQueries({ queryKey: ["scanner-quota"] });
      setDeleteScanner(null);
      toast.success("Scanner dihapus");
    },
  });

  const pairUsb = async (scanner: ScannerConfig) => {
    const serialStatus = getSerialSupportStatus();
    if (!serialStatus.supported) {
      toast.error(serialStatus.message);
      return;
    }
    try {
      const port = await navigator.serial!.requestPort();
      const info = port.getInfo();
      await updateScanner.mutateAsync({
        id: scanner.id,
        body: {
          usbVendorId: info.usbVendorId ?? null,
          usbProductId: info.usbProductId ?? null,
        },
      });
    } catch {
      toast.error("Pairing USB dibatalkan atau gagal");
    }
  };

  const usedCctvIds = new Set(
    (scanners.data ?? []).map((s) => s.cctvConfigId),
  );
  const availableCctv = (cctvList.data ?? []).filter(
    (c) => c.isActive && !usedCctvIds.has(c.id),
  );
  const q = quota.data;
  const quotaFull = q ? q.currentScanner >= q.maxScanner : false;

  if (!activeWs && wsList.length === 0 && !workstations.isLoading) {
    return (
      <p className="text-sm text-base-content/60">
        Buat workstation dulu sebelum menambah scanner.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {q && (
        <div className="flex flex-wrap gap-2">
          <span className="badge badge-outline">Plan {q.plan}</span>
          <span className="badge badge-outline">
            Scanner {q.currentScanner}/{q.maxScanner}
          </span>
        </div>
      )}

      <section className="card bg-base-100 border border-base-300">
        <div className="card-body gap-4">
          <h2 className="font-semibold">Workstation (PC Kasir)</h2>
          <div className="flex flex-wrap gap-2">
            {wsList.map((ws) => (
              <button
                key={ws.id}
                type="button"
                className={`btn btn-sm ${activeWs === ws.id ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setSelectedWs(ws.id)}
              >
                {ws.label}
                {ws.lastSeenAt && (
                  <span className="badge badge-xs badge-success ml-1">online</span>
                )}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              className="input input-bordered input-sm"
              placeholder="Label PC baru..."
              value={wsLabel}
              onChange={(e) => setWsLabel(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={!wsLabel.trim() || createWs.isPending}
              onClick={() => createWs.mutate()}
            >
              Tambah workstation
            </button>
          </div>
        </div>
      </section>

      {activeWs && (
        <section className="card bg-base-100 border border-base-300">
          <div className="card-body gap-4">
            <h2 className="font-semibold">Tambah Scanner</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <input
                className="input input-bordered input-sm"
                placeholder="Label scanner / meja"
                value={scannerForm.label}
                onChange={(e) =>
                  setScannerForm((f) => ({ ...f, label: e.target.value }))
                }
              />
              <select
                className="select select-bordered select-sm"
                value={scannerForm.assignedUsername}
                onChange={(e) =>
                  setScannerForm((f) => ({
                    ...f,
                    assignedUsername: e.target.value,
                  }))
                }
              >
                <option value="">Pilih operator</option>
                {(members.data?.items ?? []).map((m) => (
                  <option key={m.username} value={m.username}>
                    {m.displayName} ({m.username})
                  </option>
                ))}
              </select>
              <select
                className="select select-bordered select-sm"
                value={scannerForm.cctvConfigId}
                onChange={(e) =>
                  setScannerForm((f) => ({
                    ...f,
                    cctvConfigId: e.target.value,
                  }))
                }
              >
                <option value="">Pilih CCTV</option>
                {availableCctv.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                className="input input-bordered input-sm"
                placeholder="Baud rate"
                value={scannerForm.baudRate}
                onChange={(e) =>
                  setScannerForm((f) => ({
                    ...f,
                    baudRate: Number(e.target.value) || 9600,
                  }))
                }
              />
            </div>
            <button
              type="button"
              className="btn btn-sm btn-primary w-fit"
              disabled={
                createScanner.isPending ||
                !scannerForm.label.trim() ||
                !scannerForm.cctvConfigId ||
                quotaFull
              }
              onClick={() => createScanner.mutate()}
            >
              Tambah scanner
            </button>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold">Daftar Scanner</h2>
        {(scanners.data ?? []).length === 0 ? (
          <p className="text-sm text-base-content/60">
            Belum ada scanner di workstation ini.
          </p>
        ) : (
          <ul className="space-y-3">
            {(scanners.data ?? []).map((s) => (
              <li key={s.id} className="card bg-base-200 border border-base-300">
                <div className="card-body gap-2 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{s.label}</p>
                      <p className="text-xs text-base-content/60">
                        Operator: {s.assignedUser?.displayName ?? "—"} · CCTV:{" "}
                        {s.cctvConfig?.label ?? "—"}
                      </p>
                      <p className="text-xs font-mono text-base-content/50 mt-1">
                        USB:{" "}
                        {s.usbVendorId != null
                          ? `${s.usbVendorId}:${s.usbProductId}`
                          : "belum di-pair"}
                        {" · "}
                        {s.baudRate} baud
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn btn-xs btn-outline"
                        onClick={() => pairUsb(s)}
                      >
                        Pair USB
                      </button>
                      <button
                        type="button"
                        className="btn btn-xs btn-error btn-outline"
                        onClick={() => setDeleteScanner(s)}
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(deleteScanner)}
        title="Hapus scanner?"
        message={
          deleteScanner ? (
            <>
              Scanner <strong>{deleteScanner.label}</strong> akan dihapus.
            </>
          ) : null
        }
        danger
        confirmLabel="Hapus"
        onCancel={() => setDeleteScanner(null)}
        onConfirm={() => {
          if (deleteScanner) removeScanner.mutate(deleteScanner.id);
        }}
      />
    </div>
  );
}
