import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Volume2 } from "lucide-react";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { BuktiScanApi } from "@/api/invo-track";
import type { AgentStatus } from "@/types/invo-track";

export default function AgentWorkstationSettings({
  workstationId,
  status,
  canEdit,
}: {
  workstationId: string;
  status: AgentStatus | undefined;
  canEdit: boolean;
}) {
  const qc = useQueryClient();
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [ttsVolume, setTtsVolume] = useState(80);
  const [clipsDir, setClipsDir] = useState("");

  useEffect(() => {
    if (!status) return;
    setTtsEnabled(status.ttsEnabled !== false);
    setTtsVolume(status.ttsVolume ?? 80);
    setClipsDir(status.clipsDir ?? "");
  }, [status]);

  const save = useMutation({
    mutationFn: () =>
      BuktiScanApi.agentUpdateSettings(workstationId, {
        ttsEnabled,
        ttsVolume,
        clipsDir: clipsDir.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent-status", workstationId] });
      toast.success(
        "Pengaturan agent disimpan — sinkron saat agent refresh config",
      );
    },
    onError: (err) => toastApiError(err, "Gagal menyimpan pengaturan agent"),
  });

  if (!status?.paired) return null;

  return (
    <div className="rounded-xl border border-primary/15 bg-primary/5 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Volume2 className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">Pengaturan Agent (PC kasir)</h3>
      </div>
      <p className="text-xs text-base-content/60">
        Disimpan di server. Agent menerapkan setelah sync config (~30 detik)
        atau restart.
      </p>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          className="toggle toggle-primary toggle-sm"
          checked={ttsEnabled}
          disabled={!canEdit || save.isPending}
          onChange={(e) => setTtsEnabled(e.target.checked)}
        />
        <span className="text-sm">Bunyikan suara saat mulai rekam</span>
      </label>

      <div>
        <label className="text-xs text-base-content/60 mb-1 block">
          Volume TTS ({ttsVolume})
        </label>
        <input
          type="range"
          min={0}
          max={100}
          value={ttsVolume}
          disabled={!canEdit || !ttsEnabled}
          className="range range-primary range-xs w-full"
          onChange={(e) => setTtsVolume(Number(e.target.value))}
        />
      </div>

      <div>
        <label className="text-xs text-base-content/60 mb-1 block">
          Folder klip (opsional)
        </label>
        <input
          className="input input-bordered input-sm w-full font-mono"
          placeholder="D:\BuktiScan\clips"
          value={clipsDir}
          disabled={!canEdit}
          onChange={(e) => setClipsDir(e.target.value)}
        />
      </div>

      {canEdit && (
        <button
          type="button"
          className="btn btn-sm btn-primary border p-2 rounded-lg bg-primary text-white"
          disabled={save.isPending}
          onClick={() => save.mutate()}
        >
          Simpan pengaturan agent
        </button>
      )}
    </div>
  );
}
