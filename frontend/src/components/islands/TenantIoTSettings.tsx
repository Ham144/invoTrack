import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Camera, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { BuktiScanApi } from "@/api/invo-track";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { canManageInfrastructure } from "@/lib/permissions";
import { toastApiError } from "@/lib/api-error";
import {
  parseRtspConfig,
  rtspPayloadFromForm,
  type RtspFormFields,
} from "@/lib/rtsp-url";
import { useSessionStore } from "@/stores/sessionStore";
import type {
  CctvConfig,
  DeviceStatus,
  SubscriptionQuota,
} from "@/types/invo-track";

type PendingAction = { type: "delete-cctv"; id: string; label: string };

const EMPTY_FORM = {
  label: "",
  host: "",
  channel: "101",
  username: "",
  password: "",
};

function CctvConnectionFields({
  fields,
  onChange,
  size = "sm",
}: {
  fields: RtspFormFields;
  onChange: (patch: Partial<RtspFormFields>) => void;
  size?: "sm" | "xs";
}) {
  const inputCls =
    size === "xs"
      ? "input input-bordered input-xs w-full"
      : "input-field w-full";

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <label className="space-y-1">
        <span className="text-xs font-medium muted">IP kamera</span>
        <input
          className={inputCls}
          placeholder="192.168.168.50"
          value={fields.host}
          onChange={(e) => onChange({ host: e.target.value })}
          autoComplete="off"
        />
      </label>
      <label className="space-y-1">
        <span className="text-xs font-medium muted">Kanal</span>
        <input
          className={inputCls}
          placeholder="101"
          value={fields.channel}
          onChange={(e) => onChange({ channel: e.target.value })}
          autoComplete="off"
        />
      </label>
      <label className="space-y-1">
        <span className="text-xs font-medium muted">Username</span>
        <input
          className={inputCls}
          placeholder="admin"
          value={fields.username}
          onChange={(e) => onChange({ username: e.target.value })}
          autoComplete="off"
        />
      </label>
      <label className="space-y-1">
        <span className="text-xs font-medium muted">Password</span>
        <input
          className={inputCls}
          type="password"
          placeholder="••••••••"
          value={fields.password}
          onChange={(e) => onChange({ password: e.target.value })}
          autoComplete="new-password"
        />
      </label>
    </div>
  );
}

function CctvListItem({
  c,
  online,
  canEdit,
  onSnapshot,
  onDelete,
  onUpdateConnection,
  onToggleActive,
}: {
  c: CctvConfig;
  online?: boolean;
  canEdit: boolean;
  onSnapshot: () => void;
  onDelete: () => void;
  onUpdateConnection: (body: {
    rtspUrl: string;
    username: string;
    password: string;
  }) => void;
  onToggleActive: (isActive: boolean) => void;
}) {
  const [fields, setFields] = useState(() => parseRtspConfig(c));

  const saveConnection = () => {
    if (!fields.host.trim() || !fields.username.trim()) {
      toast.error("IP dan username wajib diisi");
      return;
    }
    const parsed = parseRtspConfig(c);
    const payload = rtspPayloadFromForm({ label: c.label, ...fields });
    const unchanged =
      parsed.host === fields.host &&
      parsed.channel === fields.channel &&
      parsed.username === fields.username &&
      parsed.password === fields.password;
    if (unchanged) return;
    onUpdateConnection({
      rtspUrl: payload.rtspUrl,
      username: payload.username,
      password: payload.password,
    });
  };

  return (
    <li className="subsection">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">{c.label}</span>
          {online === true && (
            <span className="badge badge-success badge-xs">online</span>
          )}
          {online === false && (
            <span className="badge badge-ghost badge-xs">offline</span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-xs btn-outline gap-1"
            onClick={onSnapshot}
          >
            <ImageIcon className="w-3 h-3" />
            Snapshot
          </button>
          {canEdit && (
            <button
              type="button"
              className="btn btn-xs btn-error btn-outline"
              onClick={onDelete}
            >
              Hapus
            </button>
          )}
        </div>
      </div>

      {canEdit ? (
        <div className="space-y-3">
          <CctvConnectionFields
            size="xs"
            fields={fields}
            onChange={(patch) => setFields((f) => ({ ...f, ...patch }))}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                className="checkbox checkbox-xs"
                defaultChecked={c.isActive}
                onChange={(e) => onToggleActive(e.target.checked)}
              />
              Aktif untuk rekam
            </label>
            <button
              type="button"
              className="btn btn-xs btn-primary border p-2 rounded-lg bg-primary text-white"
              onClick={saveConnection}
            >
              Simpan koneksi
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs muted">
          {parseRtspConfig(c).host} · kanal {parseRtspConfig(c).channel}
        </p>
      )}
    </li>
  );
}

export default function TenantIoTSettings() {
  const qc = useQueryClient();
  const user = useSessionStore((s) => s.user);
  const canEdit = canManageInfrastructure(user?.role);
  const [cctvForm, setCctvForm] = useState(EMPTY_FORM);
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
    mutationFn: () => BuktiScanApi.cctvCreate(rtspPayloadFromForm(cctvForm)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cctv-config"] });
      qc.invalidateQueries({ queryKey: ["cctv-quota"] });
      setCctvForm(EMPTY_FORM);
      toast.success("CCTV ditambahkan");
    },
    onError: (err) => toastApiError(err, "Gagal menambah CCTV"),
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
      rtspUrl?: string;
      username?: string | null;
      password?: string | null;
      isActive?: boolean;
    }) => BuktiScanApi.cctvUpdate(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cctv-config"] });
      toast.success("CCTV diperbarui");
    },
    onError: (err) => toastApiError(err, "Gagal memperbarui CCTV"),
  });

  const takeSnapshot = async (id: string) => {
    try {
      const res = await BuktiScanApi.cctvSnapshot(id);
      const url = URL.createObjectURL(res.data as Blob);
      if (snapshotUrl) URL.revokeObjectURL(snapshotUrl);
      setSnapshotUrl(url);
    } catch {
      toast.error("Snapshot gagal — cek IP, kanal, username & password");
    }
  };

  const cameras = cctv.data ?? [];
  const q = quota.data;
  const canAdd =
    cctvForm.label.trim() &&
    cctvForm.host.trim() &&
    cctvForm.username.trim() &&
    !(q && q.currentCctv >= q.maxCctv);

  return (
    <div className="space-y-6">
      <div className="info-callout space-y-2">
        <p>
          Isi <strong>IP</strong>, <strong>kanal</strong> (101 = stream utama, 102
          = sub), <strong>username</strong>, dan <strong>password</strong> kamera
          Hikvision. Tidak perlu mengetik URL RTSP panjang.
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
          ⚠️ Penting: Pastikan pengaturan <b>Video Encoding</b> pada kamera Anda (terutama Sub-Stream) diset ke <b>H.264</b>. Penggunaan H.265 dapat menyebabkan preview video di PC kasir sering terputus atau gagal dimuat.
        </p>
      </div>

      {canEdit && (
        <section className="subsection">
          <h2 className="subsection-title flex items-center gap-2">
            <Camera className="w-4 h-4 text-primary" />
            Tambah CCTV
          </h2>
          <label className="block space-y-1 max-w-md">
            <span className="text-xs font-medium muted">Label titik rekam</span>
            <input
              className="input-field w-full"
              placeholder="Kasir Muara — Meja 1"
              value={cctvForm.label}
              onChange={(e) =>
                setCctvForm((f) => ({ ...f, label: e.target.value }))
              }
            />
          </label>
          <CctvConnectionFields
            fields={cctvForm}
            onChange={(patch) => setCctvForm((f) => ({ ...f, ...patch }))}
          />
          <button
            type="button"
            className="btn-primary-soft"
            onClick={() => addCctv.mutate()}
            disabled={addCctv.isPending || !canAdd}
          >
            {addCctv.isPending ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              "Tambah CCTV"
            )}
          </button>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="subsection-title">Daftar CCTV</h2>
        {cameras.length === 0 ? (
          <p className="text-sm muted">Belum ada CCTV dikonfigurasi.</p>
        ) : (
          <ul className="grid gap-3">
            {cameras.map((c) => (
              <CctvListItem
                key={c.id}
                c={c}
                online={onlineById.get(c.id)}
                canEdit={canEdit}
                onSnapshot={() => void takeSnapshot(c.id)}
                onDelete={() =>
                  setPending({ type: "delete-cctv", id: c.id, label: c.label })
                }
                onUpdateConnection={(body) =>
                  updateCctv.mutate({ id: c.id, ...body })
                }
                onToggleActive={(isActive) =>
                  updateCctv.mutate({ id: c.id, isActive })
                }
              />
            ))}
          </ul>
        )}
      </section>

      {snapshotUrl && (
        <dialog className="modal modal-open" >
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
