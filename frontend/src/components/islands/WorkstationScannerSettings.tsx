import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthApi } from "@/api/auth";
import { BuktiScanApi } from "@/api/invo-track";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { PaginatedMembers } from "@/types/auth";
import { ROLE } from "@/types/auth";
import { AGENT_DOWNLOAD_LABEL, AGENT_DOWNLOAD_URL } from "@/lib/agent-download";
import type {
  AgentPairingResult,
  AgentStatus,
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
  const [pairingResult, setPairingResult] = useState<AgentPairingResult | null>(
    null,
  );

  const workstations = useQuery({
    queryKey: ["workstations"],
    queryFn: async () => {
      const res = await BuktiScanApi.workstationList();
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
      const res = await BuktiScanApi.scannerList(activeWs || undefined);
      return res.data as ScannerConfig[];
    },
    enabled: Boolean(activeWs),
  });

  const quota = useQuery({
    queryKey: ["scanner-quota"],
    queryFn: async () => {
      const res = await BuktiScanApi.scannerQuota();
      return res.data as ScannerQuota;
    },
  });

  const cctvList = useQuery({
    queryKey: ["cctv-config"],
    queryFn: async () => {
      const res = await BuktiScanApi.cctvList();
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

  const agentStatus = useQuery({
    queryKey: ["agent-status", activeWs],
    queryFn: async () => {
      const res = await BuktiScanApi.agentStatus(activeWs);
      return res.data as AgentStatus;
    },
    enabled: Boolean(activeWs),
    refetchInterval: 20_000,
  });

  const generatePairing = useMutation({
    mutationFn: async () => {
      const res = await BuktiScanApi.agentGeneratePairingCode(activeWs);
      return res.data as AgentPairingResult;
    },
    onSuccess: (data) => {
      setPairingResult(data);
      qc.invalidateQueries({ queryKey: ["agent-status", activeWs] });
      qc.invalidateQueries({ queryKey: ["workstations"] });
      toast.success("Kode pairing dibuat");
    },
    onError: () => toast.error("Gagal membuat kode pairing"),
  });

  const createWs = useMutation({
    mutationFn: () => BuktiScanApi.workstationCreate({ label: wsLabel }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workstations"] });
      setWsLabel("");
      toast.success("Workstation ditambahkan");
    },
    onError: () => toast.error("Gagal menambah workstation"),
  });

  const createScanner = useMutation({
    mutationFn: () =>
      BuktiScanApi.scannerCreate({
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
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      BuktiScanApi.scannerUpdate(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scanner-config"] });
      toast.success("Scanner diperbarui");
    },
    onError: () => toast.error("Gagal memperbarui scanner"),
  });

  const removeScanner = useMutation({
    mutationFn: (id: string) => BuktiScanApi.scannerDelete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scanner-config"] });
      qc.invalidateQueries({ queryKey: ["scanner-quota"] });
      setDeleteScanner(null);
      toast.success("Scanner dihapus");
    },
  });

  const usedCctvIds = new Set((scanners.data ?? []).map((s) => s.cctvConfigId));
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
      <div className="alert alert-info py-3 text-sm">
        <div className="space-y-1">
          <p className="font-semibold">
            Admin atur di sini: workstation, scanner, mapping CCTV
          </p>
          <p>
            Pair USB port COM dan preview CCTV dilakukan di{" "}
            <strong>BuktiScan Agent</strong> di PC kasir — bukan di browser.
          </p>
        </div>
      </div>

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
                  <span className="badge badge-xs badge-success ml-1">
                    online
                  </span>
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
            <h2 className="font-semibold">BuktiScan Agent (PC Kasir)</h2>
            <p className="text-sm text-base-content/70">
              Setiap workstation butuh agent desktop. Workstation ID wajib
              dimasukkan di aplikasi agent bersama kode pairing.
            </p>
            {activeWs && (
              <div className="bg-base-200 rounded-lg p-3 text-sm">
                <p className="text-xs text-base-content/60">Workstation ID</p>
                <code className="text-xs font-mono break-all">{activeWs}</code>
              </div>
            )}
            <div className="flex flex-wrap gap-2 items-center">
              <a
                href={AGENT_DOWNLOAD_URL}
                className="btn btn-sm btn-primary"
                download
              >
                {AGENT_DOWNLOAD_LABEL}
              </a>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                disabled={generatePairing.isPending}
                onClick={() => generatePairing.mutate()}
              >
                Generate kode pairing
              </button>
              {agentStatus.data && (
                <span
                  className={`badge badge-sm ${agentStatus.data.paired ? "badge-success" : "badge-ghost"}`}
                >
                  {agentStatus.data.paired ? "Agent paired" : "Belum paired"}
                </span>
              )}
            </div>
            {pairingResult && pairingResult.workstationId === activeWs && (
              <div className="bg-base-200 rounded-lg p-4 space-y-2">
                <div>
                  <p className="text-xs text-base-content/60">Workstation ID</p>
                  <code className="text-xs font-mono break-all">
                    {pairingResult.workstationId}
                  </code>
                </div>
                <div>
                  <p className="text-xs text-base-content/60">Kode pairing</p>
                  <p className="font-mono text-xl font-bold tracking-widest">
                    {pairingResult.pairingCode}
                  </p>
                </div>
                <p className="text-xs text-base-content/50">
                  Kedaluwarsa:{" "}
                  {new Date(pairingResult.expiresAt).toLocaleString("id-ID")}
                </p>
              </div>
            )}
            {agentStatus.data?.agentLastSeenAt && (
              <p className="text-xs text-base-content/50">
                Agent terakhir online:{" "}
                {new Date(agentStatus.data.agentLastSeenAt).toLocaleString(
                  "id-ID",
                )}
                {agentStatus.data.agentVersion
                  ? ` · v${agentStatus.data.agentVersion}`
                  : ""}
              </p>
            )}
          </div>
        </section>
      )}

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
              <li
                key={s.id}
                className="card bg-base-200 border border-base-300"
              >
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
                    <div className="flex gap-2 items-center">
                      {s.usbVendorId != null ? (
                        <span className="badge badge-sm badge-success badge-outline">
                          USB paired
                        </span>
                      ) : (
                        <span className="badge badge-sm badge-ghost">
                          Pair USB di agent
                        </span>
                      )}
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
