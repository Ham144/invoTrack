import type { InvoiceScan } from "@/types/invo-track";
import {
  scanClipPurged,
  scanDuration,
  scanVideoFromAgent,
  scanVideoSrc,
} from "@/lib/scan-utils";
import StatusBadge from "@/components/ui/StatusBadge";

interface ScanWatchModalProps {
  scan: InvoiceScan | null;
  onClose: () => void;
}

export default function ScanWatchModal({ scan, onClose }: ScanWatchModalProps) {
  if (!scan) return null;

  const purged = scanClipPurged(scan);
  const videoSrc = scanVideoSrc(scan);
  const fromAgent = scanVideoFromAgent(scan);
  const workstationLabel =
    scan.workstation?.label ?? scan.scannerConfig?.label ?? "PC kasir";

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-3xl">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="font-bold font-mono text-xl">
              {scan.invoiceNumber}
            </h3>
            <p className="text-sm text-base-content/60 mt-1">
              {scan.scannerConfig?.label ?? "—"}
              {scan.cctvConfig?.label ? ` · ${scan.cctvConfig.label}` : ""}
              {scan.scannedByUsername ? ` · ${scan.scannedByUsername}` : ""}
            </p>
          </div>
          <StatusBadge status={scan.status} />
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          <div className="bg-base-200 rounded-lg p-3">
            <p className="text-base-content/50 text-xs">Mulai</p>
            <p>{new Date(scan.scannedAt).toLocaleString("id-ID")}</p>
          </div>
          <div className="bg-base-200 rounded-lg p-3">
            <p className="text-base-content/50 text-xs">Durasi</p>
            <p className="font-mono">{scanDuration(scan)}</p>
          </div>
        </div>

        {purged && (
          <p className="text-xs text-error mb-3">
            Video otomatis terhapus karena melewati batas retensi di{" "}
            {workstationLabel}.
          </p>
        )}

        {!purged && fromAgent && (
          <p className="text-xs text-base-content/60 mb-3">
            Streaming dari agent di {workstationLabel} (LAN). Pastikan PC kasir
            online dan firewall mengizinkan port media agent.
          </p>
        )}

        {videoSrc ? (
          <video
            className="w-full max-h-[55vh] rounded-lg bg-black"
            controls
            autoPlay
            src={videoSrc}
          />
        ) : (
          <p className="text-sm text-base-content/60 py-12 text-center border border-dashed border-base-300 rounded-lg">
            {scan.status === "RECORDING"
              ? "Rekaman masih berjalan di agent..."
              : purged
                ? "File video sudah dihapus oleh retensi agent."
                : fromAgent || scan.recordingSource === "EDGE"
                  ? `Video belum bisa di-stream — agent ${workstationLabel} belum melaporkan alamat LAN, atau file belum tersedia.`
                  : "Video belum tersedia."}
          </p>
        )}

        <div className="modal-action">
          {videoSrc && (
            <a href={videoSrc} download className="btn btn-sm btn-outline">
              Unduh
            </a>
          )}
          <button type="button" className="btn btn-sm" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={onClose}>
          tutup
        </button>
      </form>
    </dialog>
  );
}
