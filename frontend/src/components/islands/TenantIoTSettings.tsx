import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { InvoTrackApi } from "@/api/invo-track";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { CctvConfig, SubscriptionQuota } from "@/types/invo-track";

type PendingAction = { type: "delete-cctv"; id: string; label: string };

function CctvPreview({ camera }: { camera: CctvConfig }) {
  const [tick, setTick] = useState(0);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    const load = async () => {
      setLoading(true);
      try {
        const res = await InvoTrackApi.cctvSnapshot(camera.id);
        if (!active) return;
        objectUrl = URL.createObjectURL(res.data);
        setBlobUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return objectUrl;
        });
        setError(null);
      } catch {
        if (!active) return;
        setBlobUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
        setError("Preview gagal. Pastikan kamera menyala dan dapat diakses.");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [camera.id, tick]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 8000);
    return () => window.clearInterval(id);
  }, [camera.id]);

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm">
      <div className="card-body gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold">{camera.label}</p>
          <span
            className={`badge badge-sm ${camera.isOnline ? "badge-success" : "badge-error"}`}
          >
            {camera.isOnline ? "Online" : "Offline"}
          </span>
        </div>
        <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
          {loading && !blobUrl && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="loading loading-spinner loading-md text-primary" />
            </div>
          )}
          {blobUrl && !error && (
            <img
              src={blobUrl}
              alt={`Preview ${camera.label}`}
              className="w-full h-full object-contain"
            />
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-base-content/80">
              {error}
            </div>
          )}
        </div>
        <button
          type="button"
          className="btn btn-sm btn-outline"
          onClick={() => setTick((t) => t + 1)}
          disabled={loading}
        >
          {loading ? "Memuat..." : "Refresh preview"}
        </button>
      </div>
    </div>
  );
}

export function CctvLivePreview() {
  const [selectedCctvId, setSelectedCctvId] = useState<string | null>(null);

  const cctv = useQuery({
    queryKey: ["cctv-config"],
    queryFn: async () => {
      const res = await InvoTrackApi.cctvList();
      return res.data as CctvConfig[];
    },
  });

  const cameras = cctv.data ?? [];
  const activePreview =
    cameras.find((c) => c.id === selectedCctvId) ?? cameras[0] ?? null;

  useEffect(() => {
    if (cameras.length && !selectedCctvId) {
      setSelectedCctvId(cameras[0].id);
    }
  }, [cameras, selectedCctvId]);

  if (cctv.isLoading) {
    return <div className="skeleton h-64 w-full rounded-xl" />;
  }

  if (!cameras.length) {
    return (
      <div className="card bg-base-100 border border-dashed border-base-300">
        <div className="card-body items-center text-center py-10">
          <p className="font-medium">Belum ada CCTV</p>
          <p className="text-sm text-base-content/60 mt-1">
            Tambahkan kamera di tab Konfigurasi.
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Preview CCTV</h2>
      <div className="flex flex-wrap gap-2">
        {cameras.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`btn btn-sm ${activePreview?.id === c.id ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setSelectedCctvId(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>
      {activePreview && <CctvPreview camera={activePreview} />}
    </section>
  );
}

export default function TenantIoTSettings() {
  const qc = useQueryClient();
  const [cctvForm, setCctvForm] = useState({ label: "", rtspUrl: "" });
  const [pending, setPending] = useState<PendingAction | null>(null);

  const quota = useQuery({
    queryKey: ["cctv-quota"],
    queryFn: async () => {
      const res = await InvoTrackApi.cctvQuota();
      return res.data as SubscriptionQuota;
    },
  });

  const cctv = useQuery({
    queryKey: ["cctv-config"],
    queryFn: async () => {
      const res = await InvoTrackApi.cctvList();
      return res.data as CctvConfig[];
    },
  });

  const addCctv = useMutation({
    mutationFn: () => InvoTrackApi.cctvCreate(cctvForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cctv-config"] });
      qc.invalidateQueries({ queryKey: ["cctv-quota"] });
      setCctvForm({ label: "", rtspUrl: "" });
    },
  });

  const deleteCctv = useMutation({
    mutationFn: (id: string) => InvoTrackApi.cctvDelete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cctv-config"] });
      qc.invalidateQueries({ queryKey: ["cctv-quota"] });
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
      isActive?: boolean;
    }) => InvoTrackApi.cctvUpdate(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cctv-config"] }),
  });

  const cameras = cctv.data ?? [];
  const q = quota.data;

  return (
    <div className="space-y-6">
      {q && (
        <div className="flex flex-wrap gap-2">
          <span className="badge badge-outline">Plan {q.plan}</span>
          <span className="badge badge-outline">
            CCTV {q.currentCctv}/{q.maxCctv}
          </span>
        </div>
      )}

      <section className="card bg-base-100 border border-base-300">
        <div className="card-body gap-4">
          <h2 className="font-semibold">Tambah CCTV RTSP</h2>
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
              placeholder="rtsp://..."
              value={cctvForm.rtspUrl}
              onChange={(e) =>
                setCctvForm((f) => ({ ...f, rtspUrl: e.target.value }))
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

      <section className="space-y-3">
        <h2 className="font-semibold">Daftar CCTV</h2>
        {cameras.length === 0 ? (
          <p className="text-sm text-base-content/60">Belum ada CCTV dikonfigurasi.</p>
        ) : (
          <ul className="space-y-3">
            {cameras.map((c) => (
              <li key={c.id} className="card bg-base-200 border border-base-300">
                <div className="card-body gap-2 p-4">
                  <input
                    className="input input-bordered input-xs w-full"
                    defaultValue={c.label}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== c.label) updateCctv.mutate({ id: c.id, label: v });
                    }}
                  />
                  <input
                    className="input input-bordered input-xs w-full font-mono"
                    defaultValue={c.rtspUrl}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== c.rtspUrl) updateCctv.mutate({ id: c.id, rtspUrl: v });
                    }}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-xs"
                        defaultChecked={c.isActive}
                        onChange={(e) =>
                          updateCctv.mutate({ id: c.id, isActive: e.target.checked })
                        }
                      />
                      Aktif
                    </label>
                    <button
                      type="button"
                      className="btn btn-xs btn-error btn-outline"
                      onClick={() =>
                        setPending({ type: "delete-cctv", id: c.id, label: c.label })
                      }
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
