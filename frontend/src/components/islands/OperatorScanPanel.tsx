import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Copy, Download, Monitor, Radio, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { BuktiScanApi } from "@/api/invo-track";
import type {
  AgentPairingResult,
  AgentStatus,
  Workstation,
} from "@/types/invo-track";
import {
  AGENT_DOWNLOAD_HINT,
  AGENT_DOWNLOAD_LABEL,
  AGENT_DOWNLOAD_URL,
} from "@/lib/agent-download";

const WS_STORAGE_KEY = "BuktiScan-active-workstation";

function formatLastSeen(iso?: string | null) {
  if (!iso) return "Belum pernah";
  return new Date(iso).toLocaleString("id-ID");
}

async function copyText(label: string, value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} disalin`);
  } catch {
    toast.error(`Gagal menyalin ${label}`);
  }
}

export default function OperatorScanPanel() {
  const [workstationId, setWorkstationId] = useState("");
  const qc = useQueryClient();

  const workstations = useQuery({
    queryKey: ["workstations"],
    queryFn: async () => {
      const res = await BuktiScanApi.workstationList();
      return res.data as Workstation[];
    },
  });

  const wsList = workstations.data ?? [];

  useEffect(() => {
    if (!workstationId && wsList.length) {
      const saved = localStorage.getItem(WS_STORAGE_KEY);
      const found = wsList.find((w) => w.id === saved);
      setWorkstationId(found?.id ?? wsList[0].id);
    }
  }, [wsList, workstationId]);

  useEffect(() => {
    if (workstationId) localStorage.setItem(WS_STORAGE_KEY, workstationId);
  }, [workstationId]);

  const agentStatus = useQuery({
    queryKey: ["agent-status", workstationId],
    queryFn: async () => {
      const res = await BuktiScanApi.agentStatus(workstationId);
      return res.data as AgentStatus;
    },
    enabled: Boolean(workstationId),
    refetchInterval: 15_000,
  });

  const generatePairing = useMutation({
    mutationFn: async () => {
      const res = await BuktiScanApi.agentGeneratePairingCode(workstationId);
      return res.data as AgentPairingResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent-status", workstationId] });
      qc.invalidateQueries({ queryKey: ["workstations"] });
    },
  });

  const status = agentStatus.data;
  const pairing = generatePairing.data;
  const activeWs = wsList.find((w) => w.id === workstationId);

  if (workstations.isLoading) {
    return <div className="skeleton h-48 w-full rounded-xl" />;
  }

  if (!wsList.length) {
    return (
      <div className="alert alert-warning max-w-2xl">
        <div>
          <p className="font-semibold">Belum ada workstation</p>
          <p className="text-sm mt-1">
            Minta admin buat workstation dan scanner di halaman Perangkat.
          </p>
          <a
            href="/dashboard/devices"
            className="link text-sm mt-2 inline-block"
          >
            Ke Perangkat →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="alert alert-info">
        <div>
          <p className="font-semibold">Halaman ini: install + pairing agent</p>
          <p className="text-sm mt-1">
            Scan barcode, preview CCTV, dan pair USB scanner dilakukan di
            aplikasi <strong>BuktiScan Agent</strong> di PC kasir — bukan di
            browser.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <label className="text-sm font-medium shrink-0">Workstation</label>
        <select
          className="select select-bordered select-sm max-w-md"
          value={workstationId}
          onChange={(e) => setWorkstationId(e.target.value)}
        >
          {wsList.map((ws) => (
            <option key={ws.id} value={ws.id}>
              {ws.label}
            </option>
          ))}
        </select>
      </div>

      <div className="card bg-base-100 border border-base-300">
        <div className="card-body gap-4">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">1. Download & install agent</h2>
          </div>
          <p className="text-sm text-base-content/70">
            Download ZIP portable (~220 MB), ekstrak, lalu jalankan{" "}
            <span className="font-mono">BuktiScan Agent.exe</span> di dalam
            folder. {AGENT_DOWNLOAD_HINT}
          </p>
          <a
            href={AGENT_DOWNLOAD_URL}
            className="btn btn-primary btn-sm w-fit gap-2 text-white"
            download
          >
            <Download className="w-4 h-4" />
            {AGENT_DOWNLOAD_LABEL}
          </a>
        </div>
      </div>

      <div className="card bg-base-100 border border-base-300">
        <div className="card-body gap-4">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">2. Pairing ke workstation</h2>
          </div>
          <p className="text-sm text-base-content/70">
            Generate kode di bawah, lalu masukkan{" "}
            <strong>Workstation ID</strong> dan kode pairing di aplikasi agent
            (berlaku 15 menit). ID ini bukan rahasia — hanya penanda PC kasir
            mana yang dipasangkan.
          </p>

          {activeWs && (
            <div className="bg-base-200 rounded-lg p-4 space-y-3">
              <div>
                <p className="text-xs text-base-content/60">Workstation</p>
                <p className="font-medium">{activeWs.label}</p>
              </div>
              <div>
                <p className="text-xs text-base-content/60">Workstation ID</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <code className="text-xs font-mono break-all">
                    {workstationId}
                  </code>
                  <button
                    type="button"
                    className="btn btn-xs btn-ghost gap-1"
                    onClick={() =>
                      void copyText("Workstation ID", workstationId)
                    }
                  >
                    <Copy className="w-3 h-3" />
                    Salin
                  </button>
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            className="btn btn-outline btn-sm w-fit"
            disabled={!workstationId || generatePairing.isPending}
            onClick={() => generatePairing.mutate()}
          >
            Generate kode pairing
          </button>
          {pairing && pairing.workstationId === workstationId && (
            <div className="bg-base-200 rounded-lg p-4 space-y-3 border border-primary/20">
              <p className="text-xs font-medium text-primary">
                Salin ke aplikasi agent di PC kasir
              </p>
              <div>
                <p className="text-xs text-base-content/60">Kode pairing</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <p className="font-mono text-2xl font-bold tracking-widest">
                    {pairing.pairingCode}
                  </p>
                  <button
                    type="button"
                    className="btn btn-xs btn-ghost gap-1"
                    onClick={() =>
                      void copyText("Kode pairing", pairing.pairingCode)
                    }
                  >
                    <Copy className="w-3 h-3" />
                    Salin
                  </button>
                </div>
              </div>
              <p className="text-xs text-base-content/50">
                Kedaluwarsa:{" "}
                {new Date(pairing.expiresAt).toLocaleString("id-ID")}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="card bg-base-100 border border-base-300">
        <div className="card-body gap-3">
          <div className="flex items-center gap-2">
            <Monitor className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">3. Status agent</h2>
          </div>
          {agentStatus.isLoading ? (
            <div className="skeleton h-16 w-full" />
          ) : status ? (
            <dl className="grid sm:grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-base-content/50">Paired</dt>
                <dd>
                  <span
                    className={`badge badge-sm ${status.paired ? "badge-success" : "badge-ghost"}`}
                  >
                    {status.paired ? "Ya" : "Belum"}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-base-content/50">Terakhir online</dt>
                <dd>{formatLastSeen(status.agentLastSeenAt)}</dd>
              </div>
              <div>
                <dt className="text-base-content/50">Versi agent</dt>
                <dd>{status.agentVersion ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-base-content/50">Folder klip</dt>
                <dd className="font-mono text-xs break-all">
                  {status.clipsDir ?? "—"}
                </dd>
              </div>
            </dl>
          ) : null}
        </div>
      </div>

      {status?.paired && (
        <div className="card bg-base-100 border border-primary/30">
          <div className="card-body gap-4">
            <div className="flex items-center gap-2">
              <ScanLine className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">
                4. Tes scan (di PC kasir, bukan dashboard)
              </h2>
            </div>
            <p className="text-sm text-base-content/70">
              Scan barcode <strong>tidak</strong> dilakukan di halaman web ini.
              Agent di PC kasir yang membaca scanner USB (mode VCOM) lalu rekam
              CCTV.
            </p>
            <ol className="list-decimal list-inside text-sm space-y-2 text-base-content/80">
              <li>
                Buka <strong>BuktiScan Agent</strong> di PC kasir → bagian{" "}
                <strong>Preview CCTV</strong> → Refresh (tes RTSP dari LAN).
              </li>
              <li>
                Di agent → <strong>Scanner USB</strong> → Pair USB (pilih port
                COM scanner, mode VCOM).
              </li>
              <li>
                Pastikan <strong>FFmpeg</strong> terpasang di Windows PC kasir.
              </li>
              <li>Scan invoice di scanner fisik.</li>
              <li>
                Cek Scan Log di web — file lokal disinkron otomatis saat agent
                jalan.
              </li>
            </ol>
            <p className="text-xs text-base-content/50">
              Dashboard web hanya untuk admin (RTSP, workstation, log). Tidak
              perlu setup ulang di web untuk preview atau pair USB.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
