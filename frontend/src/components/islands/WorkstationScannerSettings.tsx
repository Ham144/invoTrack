import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthApi } from "@/api/auth";
import { BuktiScanApi } from "@/api/invo-track";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { PaginatedMembers } from "@/types/auth";
import { ROLE } from "@/types/auth";
import { AGENT_DOWNLOAD_LABEL, AGENT_DOWNLOAD_URL } from "@/lib/agent-download";
import {
  formatDiskGb,
  formatLastSeen,
  isAgentOnline,
  isDiskLow,
} from "@/lib/format";
import { canManageInfrastructure } from "@/lib/permissions";
import { toastApiError } from "@/lib/api-error";
import AgentWorkstationSettings from "@/components/islands/AgentWorkstationSettings";
import { useSessionStore } from "@/stores/sessionStore";
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
  const user = useSessionStore((s) => s.user);
  const canEdit = canManageInfrastructure(user?.role);
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
  const [editScanner, setEditScanner] = useState<ScannerConfig | null>(null);
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

  const wsAgentStatuses = useQueries({
    queries: wsList.map((ws) => ({
      queryKey: ["agent-status", ws.id],
      queryFn: async () => {
        const res = await BuktiScanApi.agentStatus(ws.id);
        return res.data as AgentStatus;
      },
      staleTime: 20_000,
      refetchInterval: 30_000,
    })),
  });

  const agentOnlineByWs = new Map(
    wsList.map((ws, i) => {
      const lastSeen = wsAgentStatuses[i]?.data?.agentLastSeenAt;
      return [ws.id, lastSeen ? isAgentOnline(lastSeen) : false] as const;
    }),
  );

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
    onError: (err) => toastApiError(err, "Gagal membuat kode pairing"),
  });

  const createWs = useMutation({
    mutationFn: () => BuktiScanApi.workstationCreate({ label: wsLabel }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workstations"] });
      setWsLabel("");
      toast.success("Workstation ditambahkan");
    },
    onError: (err) => toastApiError(err, "Gagal menambah workstation"),
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
    onError: (err) => toastApiError(err, "Gagal menambah scanner"),
  });

  const updateScanner = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      BuktiScanApi.scannerUpdate(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scanner-config"] });
      toast.success("Scanner diperbarui");
    },
    onError: (err) => toastApiError(err, "Gagal memperbarui scanner"),
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
      <div className="info-callout">
        <p className="font-medium text-base-content mb-1">
          Web: definisi meja & mapping
        </p>
        <p>
          Tambah scanner, operator, CCTV, baud rate, pairing agent, TTS di sini.
          <strong> Pair port COM</strong> hanya di BuktiScan Agent (PC kasir).
        </p>
      </div>

      {q && (
        <div className="flex flex-wrap gap-2">
          <span className="badge badge-outline">Plan {q.plan}</span>
          <span className="badge badge-outline">
            Scanner {q.currentScanner}/{q.maxScanner}
          </span>
        </div>
      )}

      <section className="subsection">
        <h2 className="subsection-title">Workstation (PC Kasir)</h2>
        <div className="flex flex-wrap gap-2">
          {wsList.map((ws) => (
            <button
              key={ws.id}
              type="button"
              className={`btn btn-sm ${activeWs === ws.id ? "btn-primary border p-2 rounded-lg bg-primary text-white" : "btn-ghost"}`}
              onClick={() => setSelectedWs(ws.id)}
            >
              {ws.label}
              {agentOnlineByWs.get(ws.id) ? (
                <span className="badge badge-xs badge-success ml-1">
                  online
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            className="input input-bordered input-sm border p-2 rounded-lg "
            placeholder="Label PC baru..."
            value={wsLabel}
            onChange={(e) => setWsLabel(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-sm btn-primary border p-2 rounded-lg bg-primary text-white"
            disabled={!wsLabel.trim() || createWs.isPending || !canEdit}
            onClick={() => createWs.mutate()}
          >
            Tambah workstation
          </button>
        </div>
      </section>

      {activeWs && (
        <section className="subsection">
          <h2 className="subsection-title">BuktiScan Agent (PC Kasir)</h2>
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
              className="btn btn-sm btn-primary text-white"
              download
            >
              {AGENT_DOWNLOAD_LABEL}
            </a>
            <button
              type="button"
              className="btn btn-sm btn-outline border p-2 rounded-lg bg-primary text-white"
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
          {agentStatus.data?.diskFreeBytes != null && (
            <p
              className={`text-xs ${
                isDiskLow(agentStatus.data.diskFreeBytes)
                  ? "text-error font-medium"
                  : "text-base-content/50"
              }`}
            >
              Ruang disk PC kasir:{" "}
              {formatDiskGb(agentStatus.data.diskFreeBytes)}
              {isDiskLow(agentStatus.data.diskFreeBytes)
                ? " — segera kosongkan drive klip"
                : ""}
            </p>
          )}

          <AgentWorkstationSettings
            workstationId={activeWs}
            status={agentStatus.data}
            canEdit={canEdit}
          />
        </section>
      )}

      {activeWs && (
        <section className="subsection">
          <h2 className="subsection-title">Tambah Scanner</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              className="input input-bordered input-sm border p-2 rounded-lg "
              placeholder="Label scanner / meja"
              value={scannerForm.label}
              onChange={(e) =>
                setScannerForm((f) => ({ ...f, label: e.target.value }))
              }
            />
            <select
              className="select select-bordered select-sm border p-2 rounded-lg "
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
              className="select select-bordered select-sm border p-2 rounded-lg "
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
              className="input input-bordered input-sm border p-2 rounded-lg "
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
            className="btn btn-sm btn-primary w-fit border p-2 rounded-lg bg-primary text-white"
            disabled={
              createScanner.isPending ||
              !scannerForm.label.trim() ||
              !scannerForm.cctvConfigId ||
              quotaFull ||
              !canEdit
            }
            onClick={() => createScanner.mutate()}
          >
            Tambah scanner
          </button>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="subsection-title">Daftar Scanner</h2>
        {(scanners.data ?? []).length === 0 ? (
          <p className="text-sm muted">Belum ada scanner di workstation ini.</p>
        ) : (
          <ul className="space-y-3">
            {(scanners.data ?? []).map((s) => (
              <li key={s.id} className="subsection border p-2 rounded-lg">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{s.label}</p>
                    <p className="text-xs text-base-content/60">
                      Operator: {s.assignedUser?.displayName ?? "—"} · CCTV:{" "}
                      {s.cctvConfig?.label ?? "—"}
                    </p>
                    <p className="text-xs font-mono text-base-content/50 mt-1">
                      COM: {s.serialPortPath ?? "belum di-pair"}
                      {s.usbVendorId != null
                        ? ` · USB ${s.usbVendorId}:${s.usbProductId}`
                        : ""}
                      {" · "}
                      {s.baudRate} baud
                    </p>
                  </div>
                  <div className="flex gap-2 items-center">
                    {s.serialPortPath ? (
                      <span className="badge badge-sm badge-success badge-outline">
                        COM {s.serialPortPath}
                      </span>
                    ) : (
                      <span className="badge badge-sm badge-ghost">
                        Pair COM di agent
                      </span>
                    )}
                    <button
                      type="button"
                      className="btn btn-xs btn-outline border p-2 rounded-lg bg-primary text-white"
                      disabled={!canEdit}
                      onClick={() => setEditScanner(s)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-xs btn-error btn-outline border p-2 rounded-lg bg-primary text-white"
                      disabled={!canEdit}
                      onClick={() => setDeleteScanner(s)}
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <dialog className={`modal ${editScanner ? "modal-open" : ""}`}>
        <div className="modal-box">
          <h3 className="font-bold text-lg border p-2 rounded-lg bg-primary text-white">
            Edit Scanner
          </h3>
          {editScanner && (
            <div className="py-4 grid gap-3">
              <input
                className="input input-bordered input-sm border p-2 rounded-lg w-full"
                defaultValue={editScanner.label}
                id="edit-scanner-label"
              />
              <select
                className="select select-bordered select-sm border p-2 rounded-lg w-full"
                defaultValue={editScanner.assignedUsername ?? ""}
                id="edit-scanner-operator"
              >
                <option value="">Tanpa operator</option>
                {(members.data?.items ?? []).map((m) => (
                  <option key={m.username} value={m.username}>
                    {m.displayName}
                  </option>
                ))}
              </select>
              <select
                className="select select-bordered select-sm border p-2 rounded-lg w-full"
                defaultValue={editScanner.cctvConfigId}
                id="edit-scanner-cctv"
              >
                {(cctvList.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="modal-action">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setEditScanner(null)}
            >
              Batal
            </button>
            <button
              type="button"
              className="btn btn-primary border p-2 rounded-lg bg-primary text-white"
              onClick={() => {
                if (!editScanner) return;
                const label = (
                  document.getElementById(
                    "edit-scanner-label",
                  ) as HTMLInputElement
                ).value.trim();
                const assignedUsername = (
                  document.getElementById(
                    "edit-scanner-operator",
                  ) as HTMLSelectElement
                ).value;
                const cctvConfigId = (
                  document.getElementById(
                    "edit-scanner-cctv",
                  ) as HTMLSelectElement
                ).value;
                updateScanner.mutate({
                  id: editScanner.id,
                  body: {
                    label,
                    assignedUsername: assignedUsername || null,
                    cctvConfigId,
                  },
                });
                setEditScanner(null);
              }}
            >
              Simpan
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button type="button" onClick={() => setEditScanner(null)}>
            close
          </button>
        </form>
      </dialog>

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
