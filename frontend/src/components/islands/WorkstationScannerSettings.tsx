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
import { AGENT_DOWNLOAD_LABEL, AGENT_DOWNLOAD_URL } from "@/lib/agent-download";
import {
  formatDiskGb,
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
    <div className="space-y-6">
      <div className="info-callout">
        <p className="font-medium text-slate-900 mb-1">
          Web: Definisi Meja & Mapping
        </p>
        <p className="text-slate-600">
          Tambah scanner, operator, CCTV, baud rate, pairing agent, dan TTS di sini.
          <strong> Pair port COM</strong> dilakukan di BuktiScan Agent (PC kasir).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Kolom Kiri: Daftar Workstation & Tambah Workstation */}
        <div className="space-y-4">
          <div className="subsection bg-white">
            <h3 className="subsection-title mb-3">Pilih PC Kasir (Workstation)</h3>
            <div className="flex flex-col gap-2">
              {wsList.map((ws) => (
                <button
                  key={ws.id}
                  type="button"
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeWs === ws.id
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200"
                  }`}
                  onClick={() => setSelectedWs(ws.id)}
                >
                  <span className="truncate">{ws.label}</span>
                  {agentOnlineByWs.get(ws.id) ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      online
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-50 text-slate-400 border border-slate-200">
                      offline
                    </span>
                  )}
                </button>
              ))}
              {wsList.length === 0 && (
                <p className="text-xs text-slate-400">Belum ada workstation terdaftar.</p>
              )}
            </div>

            {canEdit && (
              <div className="pt-4 border-t border-slate-100 mt-4 space-y-2">
                <p className="text-xs font-semibold text-slate-500">Tambah PC Kasir Baru</p>
                <div className="flex gap-2">
                  <input
                    className="input-field py-1.5 px-3 text-xs"
                    placeholder="Nama/Label PC..."
                    value={wsLabel}
                    onChange={(e) => setWsLabel(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-primary-soft py-1.5 px-3 text-xs shrink-0"
                    disabled={!wsLabel.trim() || createWs.isPending}
                    onClick={() => createWs.mutate()}
                  >
                    Tambah
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Kolom Kanan: Detail Workstation Terpilih, Agent, dan Scanners */}
        <div className="lg:col-span-2 space-y-6">
          {activeWs ? (
            <>
              {/* Agent Settings & Pairing */}
              <section className="subsection bg-white">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                  <h3 className="subsection-title flex items-center gap-2">
                    <span>BuktiScan Agent Desktop</span>
                    {agentStatus.data && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        agentStatus.data.paired
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}>
                        {agentStatus.data.paired ? "Paired" : "Belum Paired"}
                      </span>
                    )}
                  </h3>
                  <div className="flex flex-wrap gap-2 items-center">
                    <a
                      href={AGENT_DOWNLOAD_URL}
                      className="btn-primary-soft text-xs py-1 px-3"
                      download
                    >
                      {AGENT_DOWNLOAD_LABEL}
                    </a>
                    {canEdit && (
                      <button
                        type="button"
                        className="btn-primary-soft bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 shadow-none text-xs py-1 px-3"
                        disabled={generatePairing.isPending}
                        onClick={() => generatePairing.mutate()}
                      >
                        Generate Kode Pairing
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 flex flex-col justify-center">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Workstation ID</p>
                    <code className="text-xs font-mono text-slate-700 select-all break-all">{activeWs}</code>
                  </div>

                  {pairingResult && pairingResult.workstationId === activeWs ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex flex-col justify-center animate-fade-in-up">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-blue-500 uppercase font-bold">Kode Pairing</span>
                        <span className="text-[10px] text-blue-600 font-semibold">
                          Kedaluwarsa: {new Date(pairingResult.expiresAt).toLocaleTimeString("id-ID")}
                        </span>
                      </div>
                      <p className="font-mono text-xl font-black text-blue-900 tracking-wider">
                        {pairingResult.pairingCode}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 flex flex-col justify-center">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Status Agen</p>
                      <p className="text-xs text-slate-600 font-medium">
                        {agentStatus.data?.paired ? "Agen siap & tersambung" : "Butuh kode pairing untuk aktivasi"}
                      </p>
                    </div>
                  )}
                </div>

                {(agentStatus.data?.agentLastSeenAt || agentStatus.data?.diskFreeBytes != null) && (
                  <div className="pt-3 border-t border-slate-100 text-xs space-y-1 text-slate-500">
                    {agentStatus.data.agentLastSeenAt && (
                      <p>
                        Versi Agent: <span className="font-semibold text-slate-700">{agentStatus.data.agentVersion || "—"}</span>
                        {" · "}
                        Koneksi Terakhir: <span className="font-semibold text-slate-700">{new Date(agentStatus.data.agentLastSeenAt).toLocaleString("id-ID")}</span>
                      </p>
                    )}
                    {agentStatus.data.diskFreeBytes != null && (
                      <p className={isDiskLow(agentStatus.data.diskFreeBytes) ? "text-red-600 font-medium animate-pulse" : ""}>
                        Sisa Disk PC Kasir: <span className="font-semibold">{formatDiskGb(agentStatus.data.diskFreeBytes)}</span>
                        {isDiskLow(agentStatus.data.diskFreeBytes) ? " — Peringatan: segera kosongkan drive klip!" : ""}
                      </p>
                    )}
                  </div>
                )}

                <AgentWorkstationSettings
                  workstationId={activeWs}
                  status={agentStatus.data}
                  canEdit={canEdit}
                />
              </section>

              {/* Scanners Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Form Tambah Scanner */}
                {canEdit && (
                  <section className="subsection bg-white h-fit">
                    <h3 className="subsection-title border-b border-slate-100 pb-2 mb-3">Tambah Scanner Baru</h3>
                    <div className="space-y-3">
                      <label className="block space-y-1">
                        <span className="text-xs font-medium text-slate-600">Label Scanner / Meja</span>
                        <input
                          className="input-field w-full"
                          placeholder="Meja Kasir 1"
                          value={scannerForm.label}
                          onChange={(e) =>
                            setScannerForm((f) => ({ ...f, label: e.target.value }))
                          }
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-xs font-medium text-slate-600">Operator</span>
                        <select
                          className="input-field w-full"
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
                              {m.displayName}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block space-y-1">
                        <span className="text-xs font-medium text-slate-600">CCTV Rekam</span>
                        <select
                          className="input-field w-full"
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
                      </label>
                      <label className="block space-y-1">
                        <span className="text-xs font-medium text-slate-600">Baud Rate</span>
                        <input
                          type="number"
                          className="input-field w-full"
                          placeholder="9600"
                          value={scannerForm.baudRate}
                          onChange={(e) =>
                            setScannerForm((f) => ({
                              ...f,
                              baudRate: Number(e.target.value) || 9600,
                            }))
                          }
                        />
                      </label>
                      <button
                        type="button"
                        className="btn-primary-soft w-full mt-2"
                        disabled={
                          createScanner.isPending ||
                          !scannerForm.label.trim() ||
                          !scannerForm.cctvConfigId ||
                          quotaFull
                        }
                        onClick={() => createScanner.mutate()}
                      >
                        Tambah Scanner
                      </button>
                    </div>
                  </section>
                )}

                {/* Daftar Scanner */}
                <section className={`space-y-3 ${canEdit ? "" : "col-span-2"}`}>
                  <h3 className="subsection-title border-b border-slate-100 pb-2">Daftar Scanner Terdaftar</h3>
                  {(scanners.data ?? []).length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                      Belum ada scanner di workstation ini.
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                      {(scanners.data ?? []).map((s) => (
                        <div key={s.id} className="p-3.5 bg-white rounded-lg border border-slate-200 space-y-2 hover:border-slate-300 shadow-sm transition-all">
                          <div>
                            <p className="font-semibold text-sm text-slate-800">{s.label}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              Operator: <span className="font-medium text-slate-700">{s.assignedUser?.displayName ?? "—"}</span>
                            </p>
                            <p className="text-xs text-slate-500">
                              CCTV: <span className="font-medium text-slate-700">{s.cctvConfig?.label ?? "—"}</span>
                            </p>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-400">
                            <span>
                              COM: {s.serialPortPath ?? "belum di-pair"} · {s.baudRate} baud
                            </span>
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                className="text-blue-600 hover:text-blue-800 font-sans font-semibold px-2 py-0.5 rounded bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors"
                                disabled={!canEdit}
                                onClick={() => setEditScanner(s)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="text-red-600 hover:text-red-800 font-sans font-semibold px-2 py-0.5 rounded bg-red-50 border border-red-100 hover:bg-red-100 transition-colors"
                                disabled={!canEdit}
                                onClick={() => setDeleteScanner(s)}
                              >
                                Hapus
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </>
          ) : (
            <div className="text-center py-12 border border-dashed border-slate-200 bg-white rounded-xl">
              <p className="text-slate-400 text-sm">Pilih atau buat PC Kasir (workstation) di sebelah kiri terlebih dahulu.</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Scanner Modal */}
      <dialog className={`modal ${editScanner ? "modal-open" : ""}`}>
        <div className="modal-box max-w-md p-6 border border-slate-200 shadow-xl rounded-xl">
          <h3 className="font-bold text-lg text-slate-900 border-b border-slate-100 pb-3 mb-4">
            Edit Scanner
          </h3>
          {editScanner && (
            <div className="space-y-4">
              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-600">Label Scanner / Meja</span>
                <input
                  className="input-field w-full"
                  defaultValue={editScanner.label}
                  id="edit-scanner-label"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-600">Operator</span>
                <select
                  className="input-field w-full"
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
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-600">CCTV Rekam</span>
                <select
                  className="input-field w-full"
                  defaultValue={editScanner.cctvConfigId}
                  id="edit-scanner-cctv"
                >
                  {(cctvList.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          <div className="modal-action border-t border-slate-100 pt-3 mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="btn-primary-soft bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 shadow-none text-xs"
              onClick={() => setEditScanner(null)}
            >
              Batal
            </button>
            <button
              type="button"
              className="btn-primary-soft text-xs"
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
        <form method="dialog" className="modal-backdrop bg-slate-900/50">
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
