import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { BuktiScanApi } from "@/api/invo-track";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { CctvConfig, SubscriptionQuota } from "@/types/invo-track";

type PendingAction = { type: "delete-cctv"; id: string; label: string };

export default function TenantIoTSettings() {
  const qc = useQueryClient();
  const [cctvForm, setCctvForm] = useState({ label: "", rtspUrl: "" });
  const [pending, setPending] = useState<PendingAction | null>(null);

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

  const addCctv = useMutation({
    mutationFn: () => BuktiScanApi.cctvCreate(cctvForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cctv-config"] });
      qc.invalidateQueries({ queryKey: ["cctv-quota"] });
      setCctvForm({ label: "", rtspUrl: "" });
    },
  });

  const deleteCctv = useMutation({
    mutationFn: (id: string) => BuktiScanApi.cctvDelete(id),
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
    }) => BuktiScanApi.cctvUpdate(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cctv-config"] }),
  });

  const cameras = cctv.data ?? [];
  const q = quota.data;

  return (
    <div className="space-y-6">
      <div className="alert alert-info py-3 text-sm">
        <p>
          Preview CCTV ada di <strong>BuktiScan Agent</strong> di PC kasir (bisa
          akses LAN). Di sini hanya simpan URL RTSP untuk rekam.
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
          <p className="text-sm text-base-content/60">
            Belum ada CCTV dikonfigurasi.
          </p>
        ) : (
          <ul className="space-y-3">
            {cameras.map((c) => (
              <li
                key={c.id}
                className="card bg-base-200 border border-base-300"
              >
                <div className="card-body gap-2 p-4">
                  <input
                    className="input input-bordered input-xs w-full"
                    defaultValue={c.label}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== c.label)
                        updateCctv.mutate({ id: c.id, label: v });
                    }}
                  />
                  <input
                    className="input input-bordered input-xs w-full font-mono"
                    defaultValue={c.rtspUrl}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== c.rtspUrl)
                        updateCctv.mutate({ id: c.id, rtspUrl: v });
                    }}
                  />
                  <div className="flex items-center justify-between gap-2">
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
                      Aktif
                    </label>
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
