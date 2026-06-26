import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Camera, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { BuktiScanApi } from "@/api/invo-track";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { canManageInfrastructure } from "@/lib/permissions";
import { useSessionStore } from "@/stores/sessionStore";
import type { CctvConfig, DeviceStatus, SubscriptionQuota } from "@/types/invo-track";

type PendingAction = { type: "delete-cctv"; id: string; label: string };

export default function TenantIoTSettings() {
  const qc = useQueryClient();
  const user = useSessionStore((s) => s.user);
  const canEdit = canManageInfrastructure(user?.role);
  const [cctvForm, setCctvForm] = useState({
    label: "",
    rtspUrl: "",
    username: "",
    password: "",
  });
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);

  const quota = useQuery({
    queryKey: ["cctv-quota"],
    queryFn: async () => {
      const res = await BuktiScanApi.cctvQuota();
      return res.data as SubscriptionQuota;
    },
  });

  const cctv = useQuery({
    queryKey: ["cctv-config"],
    queryFn: async () => {
      const res = await BuktiScanApi.cctvList();
      return res.data as CctvConfig[];
    },
  });

  const deviceStatus = useQuery({
    queryKey: ["device-status"],
    queryFn: async () => {
      const res = await BuktiScanApi.deviceStatus();
      return res.data as DeviceStatus;
    },
  });

  const onlineById = new Map(
    (deviceStatus.data?.cctv ?? []).map((c) => [c.id, c.isOnline]),
  );

  const addCctv = useMutation({
    mutationFn: () =>
      BuktiScanApi.cctvCreate({
        label: cctvForm.label,
        rtspUrl: cctvForm.rtspUrl,
        username: cctvForm.username || undefined,
        password: cctvForm.password || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cctv-config"] });
      qc.invalidateQueries({ queryKey: ["cctv-quota"] });
      setCctvForm({ label: "", rtspUrl: "", username: "", password: "" });
      toast.success("CCTV ditambahkan");
    },
    onError: () => toast.error("Gagal menambah CCTV"),
  });

  const deleteCctv = useMutation({
    mutationFn: (id: string) => BuktiScanApi.cctvDelete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cctv-config"] });
      qc.invalidateQueries({ queryKey: ["cctv-quota"] });
      toast.success("CCTV dihapus");
    },
  });

  const updateCctv = useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      label?: string;
      rtspUrl?: string;
      username?: string | null;
      password?: string | null;
      isActive?: boolean;
    }) => BuktiScanApi.cctvUpdate(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cctv-config"] });
      toast.success("CCTV diperbarui");
    },
    onError: () => toast.error("Gagal memperbarui CCTV"),
  });

  const takeSnapshot = async (id: string) => {
    try {
      const res = await BuktiScanApi.cctvSnapshot(id);
      const url = URL.createObjectURL(res.data as Blob);
      if (snapshotUrl) URL.revokeObjectURL(snapshotUrl);
      setSnapshotUrl(url);
    } catch {
      toast.error("Snapshot gagal — cek URL RTSP & kredensial");
    }
  };

  const cameras = cctv.data ?? [];
  const q = quota.data;

  return (
    <div className="space-y-6">
      {!canEdit && (
        <div className="alert alert-warning text-sm py-3">
          Mode baca saja — hanya Admin Organisasi yang dapat mengubah CCTV.
        </div>
      )}

      <div className="alert alert-info py-3 text-sm">
        <p>
          Preview live & tes USB scanner ada di <strong>BuktiScan Agent</strong>{" "}
          di PC kasir. Di sini kelola URL RTSP dan kredensial rekam.
        </p>
      </div>

      {q && (
        <div className="flex flex-wrap gap-2">
          <span className="badge badge-outline">Plan {q.plan}</span>
          <span className="badge badge-outline">
            CCTV {q.currentCctv}/{q.maxCctv}
          </span>
        </div>
      )}

      {canEdit && (
        <section className="surface-card">
          <div className="card-body gap-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Camera className="w-4 h-4 text-primary" />
              Tambah CCTV RTSP
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <input
                className="input input-bordered input-sm"
                placeholder="Label titik rekam"
                value={cctvForm.label}
                onChange={(e) =>
                  setCctvForm((f) => ({ ...f, label: e.target.value }))
                }
              />
              <input
                className="input input-bordered input-sm font-mono"
                placeholder="rtsp://192.168.x.x/..."
                value={cctvForm.rtspUrl}
                onChange={(e) =>
                  setCctvForm((f) => ({ ...f, rtspUrl: e.target.value }))
                }
              />
              <input
                className="input input-bordered input-sm"
                placeholder="Username RTSP (opsional)"
                value={cctvForm.username}
                onChange={(e) =>
                  setCctvForm((f) => ({ ...f, username: e.target.value }))
                }
              />
              <input
                className="input input-bordered input-sm"
                type="password"
                placeholder="Password RTSP (opsional)"
                value={cctvForm.password}
                onChange={(e) =>
                  setCctvForm((f) => ({ ...f, password: e.target.value }))
                }
              />
            </div>
            <button
              type="button"
              className="btn btn-sm btn-primary w-fit"
              onClick={() => addCctv.mutate()}
              disabled={
                addCctv.isPending ||
                !cctvForm.label.trim() ||
                !cctvForm.rtspUrl.trim() ||
                (q ? q.currentCctv >= q.maxCctv : false)
              }
            >
              Tambah CCTV
            </button>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold">Daftar CCTV</h2>
        {cameras.length === 0 ? (
          <p className="text-sm text-base-content/60">
            Belum ada CCTV dikonfigurasi.
          </p>
        ) : (
          <ul className="grid gap-3">
            {cameras.map((c) => {
              const online = onlineById.get(c.id);
              return (
                <li
                  key={c.id}
                  className="card bg-base-100 border border-base-300 shadow-sm"
                >
                  <div className="card-body gap-3 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{c.label}</span>
                        {online === true && (
                          <span className="badge badge-success badge-xs">
                            online
                          </span>
                        )}
                        {online === false && (
                          <span className="badge badge-ghost badge-xs">
                            offline
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="btn btn-xs btn-outline gap-1"
                          onClick={() => void takeSnapshot(c.id)}
                        >
                          <ImageIcon className="w-3 h-3" />
                          Snapshot
                        </button>
                        {canEdit && (
                          <button
                            type="button"
                            className="btn btn-xs btn-error btn-outline"
                            onClick={() =>
                              setPending({
                                type: "delete-cctv",
                                id: c.id,
                                label: c.label,
                              })
                            }
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                    </div>
                    {canEdit ? (
                      <>
                        <input
                          className="input input-bordered input-xs w-full font-mono"
                          defaultValue={c.rtspUrl}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v && v !== c.rtspUrl)
                              updateCctv.mutate({ id: c.id, rtspUrl: v });
                          }}
                        />
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            className="checkbox checkbox-xs"
                            defaultChecked={c.isActive}
                            onChange={(e) =>
                              updateCctv.mutate({
                                id: c.id,
                                isActive: e.target.checked,
                              })
                            }
                          />
                          Aktif untuk rekam
                        </label>
                      </>
                    ) : (
                      <p className="text-xs font-mono text-base-content/60 break-all">
                        {c.rtspUrl}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {snapshotUrl && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold mb-3">Snapshot CCTV</h3>
            <img
              src={snapshotUrl}
              alt="Snapshot"
              className="w-full rounded-lg border border-base-300"
            />
            <div className="modal-action">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  URL.revokeObjectURL(snapshotUrl);
                  setSnapshotUrl(null);
                }}
              >
                Tutup
              </button>
            </div>
          </div>
        </dialog>
      )}

      <ConfirmDialog
        open={Boolean(pending)}
        title="Hapus CCTV?"
        message={
          pending ? (
            <>
              CCTV <strong>{pending.label}</strong> akan dihapus.
            </>
          ) : null
        }
        danger
        confirmLabel="Hapus"
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) deleteCctv.mutate(pending.id);
          setPending(null);
        }}
      />
    </div>
  );
}
