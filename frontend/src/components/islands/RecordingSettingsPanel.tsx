import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { OrganizationApi } from "@/api/organization";
import { extractApiErrorMessage } from "@/lib/api-error";
import { canManageInfrastructure } from "@/lib/permissions";
import { useSessionStore } from "@/stores/sessionStore";

function formatDuration(sec: number) {
  if (sec <= 0) return "Tanpa batas waktu";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (s === 0) return `${m} menit`;
  return `${m} menit ${s} detik`;
}

export default function RecordingSettingsPanel() {
  const qc = useQueryClient();
  const user = useSessionStore((s) => s.user);
  const canEdit = canManageInfrastructure(user?.role);
  const { data, isLoading } = useQuery({
    queryKey: ["org-settings"],
    queryFn: async () => {
      const res = await OrganizationApi.getSettings();
      return res.data as { name: string; recordingMaxDurationSec: number };
    },
  });

  const [minutes, setMinutes] = useState(5);
  const [noLimit, setNoLimit] = useState(false);

  useEffect(() => {
    if (!data) return;
    const sec = data.recordingMaxDurationSec ?? 300;
    if (sec <= 0) {
      setNoLimit(true);
      setMinutes(5);
    } else {
      setNoLimit(false);
      setMinutes(Math.max(1, Math.round(sec / 60)));
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const recordingMaxDurationSec = noLimit ? 0 : minutes * 60;
      await OrganizationApi.updateSettings({
        name: data!.name,
        recordingMaxDurationSec,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-settings"] });
      qc.invalidateQueries({ queryKey: ["active-recordings"] });
      toast.success("Pengaturan rekam disimpan");
    },
    onError: async (err: unknown) => {
      toast.error(await extractApiErrorMessage(err, "Gagal menyimpan"));
    },
  });

  if (isLoading) return <div className="skeleton h-40 w-full rounded-xl" />;

  const previewSec = noLimit ? 0 : minutes * 60;

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body gap-5">
        {!canEdit && (
          <div className="alert alert-warning text-sm py-3">
            Mode baca saja — hanya Admin Organisasi yang dapat mengubah
            pengaturan rekam.
          </div>
        )}
        <div>
          <h3 className="font-semibold text-lg">Pengaturan Rekam</h3>
          <p className="text-sm text-base-content/70 mt-1">
            Rekam otomatis berhenti saat salah satu kondisi terpenuhi (mana yang
            lebih dulu):
          </p>
        </div>

        <ul className="text-sm space-y-2 list-disc list-inside text-base-content/80">
          <li>Operator scan invoice berikutnya pada scanner/CCTV yang sama</li>
          <li>Mencapai batas waktu di bawah (jika diaktifkan)</li>
        </ul>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="checkbox checkbox-primary"
            checked={noLimit}
            disabled={!canEdit}
            onChange={(e) => setNoLimit(e.target.checked)}
          />
          <span className="text-sm">Tanpa batas waktu (hanya auto-cut scan berikutnya)</span>
        </label>

        {!noLimit && (
          <div className="form-control max-w-xs">
            <label className="label">
              <span className="label-text">Batas durasi rekam (menit)</span>
            </label>
            <input
              type="number"
              min={1}
              max={120}
              className="input input-bordered"
              value={minutes}
              disabled={!canEdit}
              onChange={(e) => setMinutes(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
        )}

        <div className="alert alert-info text-sm">
          <span>
            Preview: Rekam berhenti otomatis
            {previewSec > 0
              ? ` setelah ${formatDuration(previewSec)}`
              : " hanya saat invoice berikutnya di-scan"}
            .
          </span>
        </div>

        {canEdit && (
          <button
            type="button"
            className="btn btn-primary w-fit"
            disabled={save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? "Menyimpan..." : "Simpan pengaturan"}
          </button>
        )}
      </div>
    </div>
  );
}
