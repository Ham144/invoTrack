import type { InvoiceScan } from "@/types/invo-track";
import { scanDuration, scanVideoSrc } from "@/lib/scan-utils";
import StatusBadge from "@/components/ui/StatusBadge";

interface ScanWatchModalProps {
  scan: InvoiceScan | null;
  onClose: () => void;
}

export default function ScanWatchModal({ scan, onClose }: ScanWatchModalProps) {
  if (!scan) return null;

  const videoSrc = scanVideoSrc(scan);

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-3xl">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="font-bold font-mono text-xl">{scan.invoiceNumber}</h3>
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
              ? "Rekaman masih berjalan..."
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
