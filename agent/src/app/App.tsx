import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ActiveRecordingView,
  AgentScannerView,
  ListedSerialPortView,
  MonitorCellView,
  RecentScanView,
  RuntimeStatusView,
  ScannerLinkView,
} from "../../electron/preload";
import { findDuplicateUsbBindings, parseUsbId } from "../core/scan-parse";
import { agentErrorMessage } from "../core/agent-error";
import { LiveRtcPlayer } from "./LiveRtcPlayer";

const AGENT_VERSION = "0.1.3";

type Tab = "beranda" | "monitor" | "kamera" | "scanner" | "penyimpanan" | "tentang";

interface AgentConfig {
  apiBaseUrl: string;
  workstationId?: string;
  organizationName?: string;
  workstationLabel?: string;
  clipsDir: string;
  ttsEnabled?: boolean;
  ttsVolume?: number;
}

const TABS: { id: Tab; label: string }[] = [
  { id: "beranda", label: "Beranda" },
  { id: "monitor", label: "Monitor" },
  { id: "kamera", label: "Kamera" },
  { id: "scanner", label: "Scanner" },
  { id: "penyimpanan", label: "Penyimpanan" },
  { id: "tentang", label: "Tentang" },
];

function portLabel(port: ListedSerialPortView): string {
  const vid = parseUsbId(port.vendorId);
  const pid = parseUsbId(port.productId);
  const ids = vid != null && pid != null ? ` (${vid}:${pid})` : "";
  const maker = port.manufacturer ? ` — ${port.manufacturer}` : "";
  return `${port.path}${ids}${maker}`;
}

function currentMonthClipsSubdir(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatSyncedAt(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("id-ID");
}

function DiskLowBanner({ status }: { status: RuntimeStatusView }) {
  if (!status.diskLow) return null;
  return (
    <div
      style={{
        ...S.warn,
        background: "#fef2f2",
        borderColor: "#fca5a5",
        color: "#991b1b",
        marginBottom: 12,
      }}
    >
      <strong>Disk hampir penuh.</strong> Tersisa {status.diskFreeLabel ?? "—"} di
      drive folder klip. Kosongkan ruang atau pindahkan folder klip sebelum rekam
      gagal.
    </div>
  );
}

function TtsRemoteHintCard({ config }: { config: AgentConfig | null }) {
  const enabled = config?.ttsEnabled !== false;
  const volume = config?.ttsVolume ?? 80;

  return (
    <div style={S.card}>
      <div style={S.label}>Suara saat mulai rekam</div>
      <p style={{ ...S.hint, marginTop: 8 }}>
        Diatur dari <strong>dashboard web</strong> → Perangkat → Workstation &amp;
        Scanner → Pengaturan Agent.
      </p>
      <p style={{ ...S.hint, marginTop: 6 }}>
        Status: {enabled ? `aktif (volume ${volume})` : "nonaktif"} — sinkron
        otomatis ~30 detik.
      </p>
    </div>
  );
}

const S = {
  page: {
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontSize: 13,
    background: "#f8fafc",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column" as const,
  },
  header: {
    background: "#1e40af",
    color: "#fff",
    padding: "12px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 16, fontWeight: 700, margin: 0 },
  tabBar: {
    display: "flex",
    background: "#fff",
    borderBottom: "1px solid #e2e8f0",
    padding: "0 20px",
  },
  tab: (active: boolean): React.CSSProperties => ({
    padding: "10px 14px",
    border: "none",
    background: "none",
    cursor: "pointer",
    borderBottom: active ? "2px solid #2563eb" : "2px solid transparent",
    color: active ? "#2563eb" : "#64748b",
    fontWeight: active ? 600 : 400,
    fontSize: 13,
  }),
  content: { flex: 1, padding: 20, overflowY: "auto" as const },
  card: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
  },
  label: { fontSize: 12, color: "#64748b", marginBottom: 3 },
  value: { fontWeight: 600, wordBreak: "break-all" as const },
  badgeGreen: {
    display: "inline-block",
    background: "#dcfce7",
    color: "#166534",
    borderRadius: 4,
    padding: "2px 8px",
    fontSize: 11,
    fontWeight: 600,
  },
  badgeRed: {
    display: "inline-block",
    background: "#fee2e2",
    color: "#991b1b",
    borderRadius: 4,
    padding: "2px 8px",
    fontSize: 11,
    fontWeight: 600,
  },
  badgeBlue: {
    display: "inline-block",
    background: "#dbeafe",
    color: "#1e40af",
    borderRadius: 4,
    padding: "2px 8px",
    fontSize: 11,
    fontWeight: 600,
  },
  badgeGray: {
    display: "inline-block",
    background: "#f1f5f9",
    color: "#64748b",
    borderRadius: 4,
    padding: "2px 8px",
    fontSize: 11,
    fontWeight: 600,
  },
  badgeAmber: {
    display: "inline-block",
    background: "#fef3c7",
    color: "#92400e",
    borderRadius: 4,
    padding: "2px 8px",
    fontSize: 11,
    fontWeight: 600,
  },
  btnPrimary: {
    padding: "8px 14px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
  },
  btnOutline: {
    padding: "8px 14px",
    background: "#fff",
    color: "#374151",
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
  },
  btnSmall: {
    padding: "5px 10px",
    background: "#fff",
    color: "#374151",
    border: "1px solid #cbd5e1",
    borderRadius: 5,
    cursor: "pointer",
    fontSize: 12,
  },
  input: {
    width: "100%",
    padding: "7px 10px",
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    fontSize: 13,
    boxSizing: "border-box" as const,
    marginTop: 4,
  },
  error: { color: "#dc2626", fontSize: 12, marginTop: 6 },
  success: { color: "#166534", fontSize: 12, marginTop: 6 },
  warn: {
    padding: "8px 10px",
    background: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: 6,
    color: "#92400e",
    fontSize: 12,
    marginBottom: 12,
  },
  hint: { color: "#94a3b8", fontSize: 11, marginTop: 4 },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  previewBox: {
    aspectRatio: "16/9",
    background: "#0f172a",
    borderRadius: 8,
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  divider: { borderTop: "1px solid #f1f5f9", margin: "12px 0" },
};

export default function App() {
  const [tab, setTab] = useState<Tab>("beranda");
  const [status, setStatus] = useState<RuntimeStatusView | null>(null);
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [scanners, setScanners] = useState<AgentScannerView[]>([]);
  const [serialPorts, setSerialPorts] = useState<ListedSerialPortView[]>([]);

  const [apiBaseUrl, setApiBaseUrl] = useState("");
  const [workstationId, setWorkstationId] = useState("");
  const [pairingCode, setPairingCode] = useState("");
  const [clipsDir, setClipsDir] = useState("");
  const [pairLoading, setPairLoading] = useState(false);
  const [pairError, setPairError] = useState<string | null>(null);

  const [previewCctvId, setPreviewCctvId] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [pairingScannerId, setPairingScannerId] = useState<string | null>(null);
  const [selectedPortPath, setSelectedPortPath] = useState("");
  const [usbLoading, setUsbLoading] = useState(false);
  const [usbError, setUsbError] = useState<string | null>(null);
  const [usbSuccess, setUsbSuccess] = useState<string | null>(null);

  const cctvs = useMemo(() => {
    const map = new Map<string, AgentScannerView["cctv"]>();
    for (const scanner of scanners) {
      if (scanner.cctv?.isActive) map.set(scanner.cctv.id, scanner.cctv);
    }
    return [...map.values()];
  }, [scanners]);

  const activeCctv =
    cctvs.find((c) => c.id === previewCctvId) ?? cctvs[0] ?? null;

  const applyStatus = useCallback((s: RuntimeStatusView | null) => {
    setStatus(s);
  }, []);

  const refresh = useCallback(
    async (opts?: { full?: boolean }) => {
      const c = (await window.BuktiScanAgent.getConfig()) as AgentConfig;
      const defaultApi = await window.BuktiScanAgent.getDefaultApiUrl();
      setConfig(c);
      setApiBaseUrl((prev) => prev || c.apiBaseUrl || defaultApi);
      if (!clipsDir && c.clipsDir) setClipsDir(c.clipsDir);
      if (!workstationId && c.workstationId) setWorkstationId(c.workstationId);

      let s = await window.BuktiScanAgent.getStatus();
      if (s?.paired && opts?.full) {
        s = await window.BuktiScanAgent.refreshConfig();
      }
      applyStatus(s);

      if (s?.paired) {
        setScanners(await window.BuktiScanAgent.getScanners());
        setSerialPorts(await window.BuktiScanAgent.listSerialPorts());
      }
    },
    [applyStatus, clipsDir, workstationId],
  );

  useEffect(() => {
    void refresh({ full: true });
    const fast = setInterval(() => void refresh(), 5000);
    const slow = setInterval(() => void refresh({ full: true }), 30_000);
    return () => {
      clearInterval(fast);
      clearInterval(slow);
    };
  }, [refresh]);

  useEffect(() => {
    if (!previewCctvId && cctvs[0]?.id) setPreviewCctvId(cctvs[0].id);
  }, [cctvs, previewCctvId]);

  const onPair = async () => {
    setPairLoading(true);
    setPairError(null);
    try {
      await window.BuktiScanAgent.pair({
        apiBaseUrl,
        workstationId,
        pairingCode,
        clipsDir: clipsDir || undefined,
      });
      await refresh({ full: true });
    } catch (err) {
      setPairError(agentErrorMessage(err, "Pairing gagal"));
    } finally {
      setPairLoading(false);
    }
  };

  const loadPreview = async () => {
    if (!activeCctv) return;
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const b64 = await window.BuktiScanAgent.captureCctvSnapshot(
        activeCctv.id,
      );
      setPreviewUrl(`data:image/jpeg;base64,${b64}`);
    } catch (err) {
      setPreviewUrl(null);
      setPreviewError(agentErrorMessage(err, "Preview gagal"));
    } finally {
      setPreviewLoading(false);
    }
  };

  const onPairUsb = async (scannerId: string) => {
    const port = serialPorts.find((p) => p.path === selectedPortPath);
    if (!port) {
      setUsbError("Pilih port COM terlebih dahulu");
      return;
    }
    const usbVendorId = parseUsbId(port.vendorId);
    const usbProductId = parseUsbId(port.productId);
    if (usbVendorId == null || usbProductId == null) {
      setUsbError("Port tidak punya Vendor/Product ID — coba port lain");
      return;
    }
    setUsbLoading(true);
    setUsbError(null);
    setUsbSuccess(null);
    try {
      const label =
        scanners.find((s) => s.id === scannerId)?.label ?? "Scanner";
      await window.BuktiScanAgent.pairUsb({
        scannerId,
        usbVendorId,
        usbProductId,
        serialPortPath: port.path,
      });
      const s = await window.BuktiScanAgent.refreshConfig();
      applyStatus(s);
      setScanners(await window.BuktiScanAgent.getScanners());
      setPairingScannerId(null);
      setSelectedPortPath("");
      setUsbSuccess(
        `USB tersimpan: ${port.path} (${usbVendorId}:${usbProductId}) → ${label}`,
      );
    } catch (err) {
      setUsbError(agentErrorMessage(err, "Pair USB gagal"));
    } finally {
      setUsbLoading(false);
    }
  };

  if (!status?.paired) {
    return (
      <div
        style={{
          ...S.page,
          alignItems: "center",
          justifyContent: "center",
          background: "#fff",
        }}
      >
        <div style={{ width: "100%", maxWidth: 400, padding: 32 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
            BuktiScan Agent
          </h1>
          <p style={{ color: "#64748b", marginTop: 0, marginBottom: 24 }}>
            Masukkan Workstation ID + kode pairing dari dashboard web.
          </p>
          <div style={{ display: "grid", gap: 12 }}>
            <label>
              <div style={S.label}>URL API cloud</div>
              <input
                style={S.input}
                value={apiBaseUrl}
                onChange={(e) => setApiBaseUrl(e.target.value)}
              />
            </label>
            <label>
              <div style={S.label}>Workstation ID</div>
              <input
                style={S.input}
                value={workstationId}
                onChange={(e) => setWorkstationId(e.target.value)}
              />
            </label>
            <label>
              <div style={S.label}>Kode pairing</div>
              <input
                style={S.input}
                value={pairingCode}
                onChange={(e) => setPairingCode(e.target.value.toUpperCase())}
              />
            </label>
            <label>
              <div style={S.label}>Folder klip (opsional)</div>
              <input
                style={S.input}
                placeholder="D:\BuktiScan\clips"
                value={clipsDir}
                onChange={(e) => setClipsDir(e.target.value)}
              />
            </label>
            <button
              type="button"
              style={{
                ...S.btnPrimary,
                opacity:
                  pairLoading || !workstationId || !pairingCode ? 0.6 : 1,
              }}
              disabled={pairLoading || !workstationId || !pairingCode}
              onClick={() => void onPair()}
            >
              {pairLoading ? "Menghubungkan..." : "Pair & mulai agent"}
            </button>
            {pairError && <p style={S.error}>{pairError}</p>}
          </div>
          <p style={{ ...S.hint, marginTop: 20 }}>
            Generate kode pairing di dashboard web → Agent → Generate kode
            pairing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.header}>
        <span style={S.headerTitle}>BuktiScan Agent v{AGENT_VERSION}</span>
        <span style={{ fontSize: 12, opacity: 0.8 }}>
          {status.recording ? (
            <span style={{ color: "#fbbf24" }}>
              ● Merekam {status.lastScan ?? ""}
            </span>
          ) : (
            <span style={{ color: "#86efac" }}>● Siap scan</span>
          )}
        </span>
      </div>

      <div style={S.tabBar}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            style={S.tab(tab === t.id)}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={S.content}>
        {tab === "beranda" && (
          <TabBeranda
            status={status}
            config={config}
            onNavigate={setTab}
            onConfigUpdated={() => void refresh()}
          />
        )}
        {tab === "monitor" && <TabMonitor />}
        {tab === "kamera" && (
          <TabKamera
            cctvs={cctvs}
            activeCctvId={previewCctvId}
            onSelectCctv={setPreviewCctvId}
          />
        )}
        {tab === "scanner" && (
          <TabScanner
            scanners={scanners}
            links={status.scanners ?? []}
            serialPorts={serialPorts}
            pairingScannerId={pairingScannerId}
            selectedPortPath={selectedPortPath}
            usbLoading={usbLoading}
            usbError={usbError}
            usbSuccess={usbSuccess}
            configSyncedAt={status.configSyncedAt}
            onStartPair={(id) => {
              setPairingScannerId(id);
              setUsbError(null);
              setUsbSuccess(null);
            }}
            onCancelPair={() => {
              setPairingScannerId(null);
              setSelectedPortPath("");
              setUsbError(null);
            }}
            onSelectPort={setSelectedPortPath}
            onConfirmPair={(id) => void onPairUsb(id)}
            onRefreshConfig={() => void refresh({ full: true })}
          />
        )}
        {tab === "penyimpanan" && (
          <TabPenyimpanan
            status={status}
            config={config}
            onSync={() => void refresh({ full: true })}
          />
        )}
        {tab === "tentang" && <TabTentang config={config} />}
      </div>
    </div>
  );
}

function scanStatusLabel(status: string): string {
  switch (status) {
    case "RECORDING":
      return "Rekam";
    case "COMPLETED":
      return "Selesai";
    case "FAILED":
      return "Gagal";
    default:
      return status;
  }
}

function RecentScansCard() {
  const [rows, setRows] = useState<RecentScanView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => {
      void window.BuktiScanAgent.getRecentScans().then((data) => {
        setRows(data);
        setLoading(false);
      });
    };
    load();
    const timer = setInterval(load, 10_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={S.card}>
      <div style={S.label}>Riwayat scan (PC ini)</div>
      <p style={{ ...S.hint, marginTop: 0, marginBottom: 8 }}>
        Daftar lengkap + video ada di dashboard web → Scan Log. Di sini hanya
        ringkasan workstation ini.
      </p>
      {loading ? (
        <p style={{ color: "#94a3b8", fontSize: 12, margin: 0 }}>Memuat…</p>
      ) : !rows.length ? (
        <p style={{ color: "#94a3b8", fontSize: 12, margin: 0 }}>
          Belum ada scan hari ini.
        </p>
      ) : (
        <ul
          style={{
            margin: 0,
            padding: 0,
            listStyle: "none",
            display: "grid",
            gap: 6,
            maxHeight: 220,
            overflowY: "auto",
          }}
        >
          {rows.map((row) => (
            <li
              key={row.scanId}
              style={{
                fontSize: 12,
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                borderBottom: "1px solid #f1f5f9",
                paddingBottom: 4,
              }}
            >
              <span>
                <strong>{row.invoiceNumber}</strong>
                {row.operatorUsername ? (
                  <span style={{ color: "#64748b" }}> · {row.operatorUsername}</span>
                ) : null}
              </span>
              <span style={{ textAlign: "right", flexShrink: 0 }}>
                <span
                  style={
                    row.status === "COMPLETED"
                      ? S.badgeGreen
                      : row.status === "FAILED"
                        ? S.badgeRed
                        : S.badgeBlue
                  }
                >
                  {scanStatusLabel(row.status)}
                </span>
                <span
                  style={{
                    display: "block",
                    color: "#94a3b8",
                    fontSize: 10,
                    marginTop: 2,
                  }}
                >
                  {new Date(row.scannedAt).toLocaleTimeString("id-ID")}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TabBeranda({
  status,
  config,
  onNavigate,
  onConfigUpdated,
}: {
  status: RuntimeStatusView;
  config: AgentConfig | null;
  onNavigate: (tab: Tab) => void;
  onConfigUpdated: () => void;
}) {
  const links = status.scanners ?? [];
  const anyConnected = links.some((l) => l.connected);
  const [activeRecs, setActiveRecs] = useState<ActiveRecordingView[]>([]);
  const [stoppingId, setStoppingId] = useState<string | null>(null);

  useEffect(() => {
    if (!status.recording) {
      setActiveRecs([]);
      return;
    }
    void window.BuktiScanAgent.getActiveRecordings().then(setActiveRecs);
  }, [status.recording]);

  const handleStop = async (scanId: string) => {
    setStoppingId(scanId);
    try {
      await window.BuktiScanAgent.stopRecording(scanId);
      setActiveRecs((prev) => prev.filter((r) => r.scanId !== scanId));
    } finally {
      setStoppingId(null);
    }
  };

  return (
    <div>
      <DiskLowBanner status={status} />
      <div
        style={{
          ...S.warn,
          background: "#eff6ff",
          borderColor: "#bfdbfe",
          color: "#1e40af",
        }}
      >
        <strong>Operasional scan:</strong> tutup window ini boleh — agent tetap
        jalan di tray. Scan barcode langsung; tidak perlu buka browser. Cek
        hasil di web → Scan Log.
      </div>

      <div style={S.card}>
        <div style={S.grid2}>
          <div>
            <div style={S.label}>Organisasi</div>
            <div style={S.value}>{config?.organizationName ?? "—"}</div>
          </div>
          <div>
            <div style={S.label}>Workstation</div>
            <div style={S.value}>{config?.workstationLabel ?? "—"}</div>
          </div>
          <div>
            <div style={S.label}>Status rekam</div>
            <div>
              {status.recording ? (
                <span style={S.badgeBlue}>● Merekam {status.lastScan ?? ""}</span>
              ) : (
                <span style={S.badgeGreen}>○ Siap scan</span>
              )}
            </div>
          </div>
          <div>
            <div style={S.label}>Scan terakhir</div>
            <div style={S.value}>{status.lastScan ?? "—"}</div>
          </div>
          <div>
            <div style={S.label}>Scanner terhubung</div>
            <div>
              {links.length === 0 ? (
                <span style={S.badgeGray}>Belum ada scanner</span>
              ) : anyConnected ? (
                <span style={S.badgeGreen}>
                  {links.filter((l) => l.connected).length}/{links.length} aktif
                </span>
              ) : (
                <span style={S.badgeRed}>
                  Tidak terhubung — pair USB di tab Scanner
                </span>
              )}
            </div>
          </div>
          <div>
            <div style={S.label}>File MP4 lokal</div>
            <div style={S.value}>{status.localClipCount ?? 0}</div>
          </div>
          <div>
            <div style={S.label}>Ruang disk tersisa</div>
            <div style={S.value}>
              {status.diskFreeLabel ?? "—"}
              {status.diskLow ? (
                <span style={{ ...S.badgeRed, marginLeft: 6 }}>Rendah</span>
              ) : null}
            </div>
          </div>
        </div>

        {status.busyMessage && (
          <div
            style={{
              marginTop: 10,
              padding: "8px 10px",
              background: "#fffbeb",
              borderRadius: 6,
              color: "#92400e",
              fontSize: 12,
            }}
          >
            {status.busyMessage}
          </div>
        )}
        {status.lastError && (
          <div
            style={{
              marginTop: 10,
              padding: "8px 10px",
              background: "#fef2f2",
              borderRadius: 6,
              color: "#dc2626",
              fontSize: 12,
            }}
          >
            {status.lastError}
          </div>
        )}
      </div>

      {status.recording && activeRecs.length > 0 && (
        <div style={S.card}>
          <div style={S.label}>Rekam aktif</div>
          <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
            {activeRecs.map((rec) => (
              <li
                key={rec.scanId}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}
              >
                <span>
                  <strong>{rec.invoiceNumber}</strong>
                  {rec.remainingSec > 0 && (
                    <span style={{ color: "#64748b", marginLeft: 6 }}>
                      sisa {rec.remainingSec}s
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  style={{
                    ...S.btnSmall,
                    background: "#fee2e2",
                    color: "#dc2626",
                    border: "1px solid #fca5a5",
                    opacity: stoppingId === rec.scanId ? 0.6 : 1,
                  }}
                  disabled={stoppingId === rec.scanId}
                  onClick={() => void handleStop(rec.scanId)}
                >
                  {stoppingId === rec.scanId ? "Menghentikan…" : "Stop Rekam"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {links.length > 0 && (
        <div style={S.card}>
          <div style={S.label}>Status per scanner</div>
          <ul
            style={{
              margin: "8px 0 0",
              padding: 0,
              listStyle: "none",
              display: "grid",
              gap: 6,
            }}
          >
            {links.map((link) => (
              <li key={link.id} style={{ fontSize: 12 }}>
                <strong>{link.label}</strong>{" "}
                {link.connected ? (
                  <span style={S.badgeGreen}>Terhubung {link.portPath}</span>
                ) : (
                  <span style={S.badgeRed}>Putus</span>
                )}
                {link.error && (
                  <span
                    style={{ display: "block", color: "#dc2626", marginTop: 2 }}
                  >
                    {link.error}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <TtsRemoteHintCard config={config} />

      <RecentScansCard />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <button
          type="button"
          style={S.btnOutline}
          onClick={() => onNavigate("monitor")}
        >
          Monitor live meja →
        </button>
        <button
          type="button"
          style={S.btnOutline}
          onClick={() => onNavigate("kamera")}
        >
          Preview CCTV →
        </button>
      </div>
      <button
        type="button"
        style={{ ...S.btnOutline, marginTop: 10, width: "100%" }}
        onClick={() => onNavigate("scanner")}
      >
        Pair USB scanner →
      </button>
    </div>
  );
}

function TabKamera({
  cctvs,
  activeCctvId,
  onSelectCctv,
}: {
  cctvs: AgentScannerView["cctv"][];
  activeCctvId: string;
  onSelectCctv: (id: string) => void;
}) {
  const activeCctv = cctvs.find((c) => c.id === activeCctvId) ?? cctvs[0] ?? null;
  const [liveActive, setLiveActive] = useState(false);
  const [liveKey, setLiveKey] = useState(0);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const prevCctvIdRef = useRef<string | null>(null);

  useEffect(() => {
    const prev = prevCctvIdRef.current;
    if (prev && prev !== activeCctv?.id) {
      void window.BuktiScanAgent.stopCameraPreview(prev);
      setLiveActive(false);
      setSnapshotUrl(null);
    }
    prevCctvIdRef.current = activeCctv?.id ?? null;
  }, [activeCctv?.id]);

  useEffect(() => {
    return () => {
      if (prevCctvIdRef.current) {
        void window.BuktiScanAgent.stopCameraPreview(prevCctvIdRef.current);
      }
    };
  }, []);

  const handleStartLive = async () => {
    if (!activeCctv) return;
    setSnapshotUrl(null);
    setSnapshotError(null);
    try {
      await window.BuktiScanAgent.startCameraPreview(activeCctv.id);
      setLiveActive(true);
      setLiveKey((k) => k + 1);
    } catch (err) {
      setLiveActive(false);
      setSnapshotError(agentErrorMessage(err, "Live preview gagal"));
    }
  };

  const handleSnapshot = async () => {
    if (!activeCctv) return;
    setSnapshotLoading(true);
    setSnapshotError(null);
    setSnapshotUrl(null);
    try {
      const b64 = await window.BuktiScanAgent.captureCctvSnapshot(activeCctv.id);
      setSnapshotUrl(`data:image/jpeg;base64,${b64}`);
    } catch (err) {
      setSnapshotError(agentErrorMessage(err, "Snapshot gagal"));
    } finally {
      setSnapshotLoading(false);
    }
  };

  if (!cctvs.length) {
    return (
      <div style={S.card}>
        <p style={{ color: "#64748b" }}>Belum ada CCTV dikonfigurasi.</p>
        <p style={S.hint}>
          Tambahkan CCTV di dashboard web → Perangkat → Konfigurasi CCTV.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={S.card}>
        <div style={S.label}>Pilih kamera</div>
        <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
          <select
            style={{ ...S.input, marginTop: 0, flex: 1, minWidth: 120 }}
            value={activeCctvId}
            onChange={(e) => onSelectCctv(e.target.value)}
          >
            {cctvs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            style={S.btnPrimary}
            disabled={!activeCctv}
            onClick={() => void handleStartLive()}
          >
            {liveActive ? "Restart Live" : "Mulai Live"}
          </button>
          <button
            type="button"
            style={{ ...S.btnOutline, opacity: snapshotLoading ? 0.7 : 1 }}
            disabled={snapshotLoading || !activeCctv}
            onClick={() => void handleSnapshot()}
          >
            {snapshotLoading ? "Mengambil…" : "Snapshot"}
          </button>
        </div>

        {activeCctv && (
          <div style={{ marginTop: 8 }}>
            <div style={S.label}>URL RTSP (read-only — edit di dashboard web)</div>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 11,
                color: "#475569",
                wordBreak: "break-all",
                marginTop: 2,
              }}
            >
              {activeCctv.rtspUrl}
            </div>
          </div>
        )}
      </div>

      <div style={{ ...S.previewBox, padding: 0, overflow: "hidden" }}>
        {liveActive && activeCctv ? (
          <LiveRtcPlayer key={liveKey} src={`cctv_${activeCctv.id.replace(/[^a-zA-Z0-9]/g, "_")}`} />
        ) : snapshotUrl ? (
          <img
            src={snapshotUrl}
            alt="Snapshot CCTV"
            style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
          />
        ) : (
          <p style={{ color: "#94a3b8", fontSize: 12, padding: 16, textAlign: "center", margin: 0 }}>
            {snapshotError ?? "Klik 'Mulai Live' untuk preview live atau 'Snapshot' untuk tes satu frame."}
          </p>
        )}
      </div>
      {snapshotError && !liveActive && (
        <p style={{ ...S.error, marginTop: 8 }}>{snapshotError}</p>
      )}
      <p style={S.hint}>
        Live preview substream via go2rtc. Snapshot diambil langsung dari LAN.
      </p>
    </div>
  );
}

function TabScanner({
  scanners,
  links,
  serialPorts,
  pairingScannerId,
  selectedPortPath,
  usbLoading,
  usbError,
  usbSuccess,
  configSyncedAt,
  onStartPair,
  onCancelPair,
  onSelectPort,
  onConfirmPair,
  onRefreshConfig,
}: {
  scanners: AgentScannerView[];
  links: ScannerLinkView[];
  serialPorts: ListedSerialPortView[];
  pairingScannerId: string | null;
  selectedPortPath: string;
  usbLoading: boolean;
  usbError: string | null;
  usbSuccess: string | null;
  configSyncedAt: string | null;
  onStartPair: (id: string) => void;
  onCancelPair: () => void;
  onSelectPort: (path: string) => void;
  onConfirmPair: (id: string) => void;
  onRefreshConfig: () => void;
}) {
  const dupes = findDuplicateUsbBindings(scanners);
  const linkById = new Map(links.map((l) => [l.id, l]));

  if (!scanners.length) {
    return (
      <div style={S.card}>
        <p style={{ color: "#64748b" }}>
          Belum ada scanner di workstation ini.
        </p>
        <p style={S.hint}>
          Tambahkan scanner di dashboard web → Perangkat → Workstation &
          Scanner.
        </p>
        <button
          type="button"
          style={{ ...S.btnOutline, marginTop: 10 }}
          onClick={onRefreshConfig}
        >
          Refresh daftar dari server
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <p style={{ color: "#64748b", margin: 0, fontSize: 12 }}>
          Pair USB di sini. Label, baud, CCTV → atur di dashboard web.
        </p>
        <button type="button" style={S.btnSmall} onClick={onRefreshConfig}>
          Refresh
        </button>
      </div>
      <p style={S.hint}>
        Config terakhir sync: {formatSyncedAt(configSyncedAt)} (otomatis ~30
        detik)
      </p>

      {dupes.length > 0 && (
        <div style={S.warn}>
          Beberapa scanner memakai USB ID sama — hanya satu yang bisa terhubung.
          Hapus duplikat di web atau pair ulang ke scanner yang benar.
        </div>
      )}

      {usbSuccess && (
        <div
          style={{
            ...S.success,
            padding: "8px 10px",
            background: "#dcfce7",
            borderRadius: 6,
            marginBottom: 10,
          }}
        >
          {usbSuccess}
        </div>
      )}

      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "grid",
          gap: 10,
        }}
      >
        {scanners.map((scanner) => {
          const link = linkById.get(scanner.id);
          return (
            <li key={scanner.id} style={S.card}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: 3 }}>
                    {scanner.label}
                  </div>
                  <div style={{ color: "#64748b", fontSize: 11 }}>
                    CCTV: {scanner.cctv?.label ?? "—"} · {scanner.baudRate} baud
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      marginTop: 6,
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 4,
                    }}
                  >
                    {link?.connected ? (
                      <span style={S.badgeGreen}>
                        Terhubung {link.portPath}
                      </span>
                    ) : scanner.usbVendorId != null ? (
                      <span style={S.badgeAmber}>
                        USB {scanner.usbVendorId}:{scanner.usbProductId} — putus
                      </span>
                    ) : (
                      <span style={S.badgeGray}>USB belum di-pair</span>
                    )}
                  </div>
                  {link?.error && (
                    <p style={{ ...S.error, marginTop: 4, marginBottom: 0 }}>
                      {link.error}
                    </p>
                  )}
                </div>
                {pairingScannerId !== scanner.id && (
                  <button
                    type="button"
                    style={S.btnSmall}
                    onClick={() => onStartPair(scanner.id)}
                  >
                    {scanner.usbVendorId != null ? "Ganti port" : "Pair USB"}
                  </button>
                )}
              </div>

              {pairingScannerId === scanner.id && (
                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  <div style={S.divider} />
                  <div style={S.label}>
                    Colok scanner (mode VCOM) lalu pilih port COM:
                  </div>
                  <select
                    style={S.input}
                    value={selectedPortPath}
                    onChange={(e) => onSelectPort(e.target.value)}
                  >
                    <option value="">Pilih port COM...</option>
                    {serialPorts.map((port) => (
                      <option key={port.path} value={port.path}>
                        {portLabel(port)}
                      </option>
                    ))}
                  </select>
                  {usbError && <p style={S.error}>{usbError}</p>}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      style={{
                        ...S.btnPrimary,
                        opacity: usbLoading || !selectedPortPath ? 0.6 : 1,
                      }}
                      disabled={usbLoading || !selectedPortPath}
                      onClick={() => onConfirmPair(scanner.id)}
                    >
                      {usbLoading ? "Menyimpan..." : "Simpan"}
                    </button>
                    <button
                      type="button"
                      style={S.btnOutline}
                      onClick={onCancelPair}
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p style={S.hint}>
        Setelah badge hijau &quot;Terhubung COMx&quot;, scan barcode — agent
        otomatis rekam CCTV.
      </p>
    </div>
  );
}

function TabPenyimpanan({
  status,
  config,
  onSync,
}: {
  status: RuntimeStatusView;
  config: AgentConfig | null;
  onSync: () => void;
}) {
  const [opening, setOpening] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const openFolder = async () => {
    setOpening(true);
    try {
      await window.BuktiScanAgent.openClipsFolder();
    } finally {
      setOpening(false);
    }
  };

  const syncNow = async () => {
    setSyncing(true);
    try {
      await window.BuktiScanAgent.syncClips();
      onSync();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div>
      <DiskLowBanner status={status} />
      <div style={S.card}>
        <div style={S.label}>Folder klip</div>
        <div
          style={{
            ...S.value,
            fontFamily: "monospace",
            fontSize: 12,
            marginBottom: 10,
          }}
        >
          {status.clipsDir || config?.clipsDir || "—"}
        </div>
        <button
          type="button"
          style={{ ...S.btnOutline, opacity: opening ? 0.7 : 1 }}
          disabled={opening || !status.clipsDir}
          onClick={() => void openFolder()}
        >
          {opening ? "Membuka..." : "Buka folder di Explorer"}
        </button>
      </div>

      <div style={S.card}>
        <div style={S.label}>Struktur penyimpanan</div>
        <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.5 }}>
          MP4 final disimpan per bulan-tahun:
          <div
            style={{
              fontFamily: "monospace",
              marginTop: 6,
              padding: "8px 10px",
              background: "#f8fafc",
              borderRadius: 6,
              wordBreak: "break-all",
            }}
          >
            {(status.clipsDir || config?.clipsDir || "D:\\BuktiScan\\clips")}/
            {currentMonthClipsSubdir()}/
            {"{invoice}.mp4"}
          </div>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>
          Ruang disk tersisa: <strong>{status.diskFreeLabel ?? "—"}</strong>
          {status.diskLow ? (
            <span style={{ color: "#dc2626", marginLeft: 6 }}>
              — segera kosongkan drive
            </span>
          ) : null}
        </div>
      </div>

      <div style={S.card}>
        <div style={S.grid2}>
          <div>
            <div style={S.label}>File MP4 lokal</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {status.localClipCount ?? 0}
            </div>
          </div>
          <div>
            <div style={S.label}>Sinkron ke Scan Log</div>
            <div style={{ ...S.value, fontSize: 12 }}>
              Otomatis ~1 menit + manual di bawah
            </div>
          </div>
        </div>
        <button
          type="button"
          style={{ ...S.btnPrimary, marginTop: 12, opacity: syncing ? 0.7 : 1 }}
          disabled={syncing}
          onClick={() => void syncNow()}
        >
          {syncing ? "Menyinkronkan..." : "Sinkron sekarang"}
        </button>
      </div>

      <p style={S.hint}>
        Video tersimpan di disk PC kasir. MP4 muncul setelah rekam selesai
        (bukan langsung saat bip). Cek hasil di web → Scan Log (browser di PC
        yang sama untuk putar video).
      </p>
    </div>
  );
}

function TabMonitor() {
  const [cells, setCells] = useState<MonitorCellView[]>([]);
  const [loading, setLoading] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);
  const [stoppingId, setStoppingId] = useState<string | null>(null);
  const [snapshotCell, setSnapshotCell] = useState<{ label: string; src: string } | null>(null);
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;

    const boot = async () => {
      setLoading(true);
      setBootError(null);
      try {
        await window.BuktiScanAgent.setMonitorMode(true);
        const rows = await window.BuktiScanAgent.startMonitor();
        if (activeRef.current) setCells(rows);
      } catch (err) {
        if (activeRef.current) {
          setBootError(agentErrorMessage(err, "Gagal menghubungkan stream"));
        }
      } finally {
        if (activeRef.current) setLoading(false);
      }
    };

    void boot();

    const poll = setInterval(() => {
      void window.BuktiScanAgent.getMonitorGrid().then((rows) => {
        if (activeRef.current) setCells(rows);
      });
    }, 2000);

    return () => {
      activeRef.current = false;
      clearInterval(poll);
      void window.BuktiScanAgent.stopMonitor();
      void window.BuktiScanAgent.setMonitorMode(false);
    };
  }, []);

  const handleStop = async (scanId: string) => {
    setStoppingId(scanId);
    try {
      await window.BuktiScanAgent.stopRecording(scanId);
    } finally {
      setStoppingId(null);
    }
  };

  const handleSnapshot = async (cctvId: string, label: string) => {
    try {
      const b64 = await window.BuktiScanAgent.captureCctvSnapshot(cctvId);
      setSnapshotCell({ label, src: `data:image/jpeg;base64,${b64}` });
    } catch {
      /* ignore */
    }
  };

  const handleRetryBoot = async () => {
    setLoading(true);
    setBootError(null);
    try {
      const rows = await window.BuktiScanAgent.startMonitor();
      if (activeRef.current) setCells(rows);
    } catch (err) {
      if (activeRef.current) {
        setBootError(agentErrorMessage(err, "Gagal menghubungkan stream"));
      }
    } finally {
      if (activeRef.current) setLoading(false);
    }
  };

  const handleRefreshAll = async () => {
    const rows = await window.BuktiScanAgent.resyncMonitor();
    if (activeRef.current) setCells(rows);
  };

  if (loading) {
    return (
      <div style={S.card}>
        <p style={{ color: "#64748b", margin: 0 }}>Menyiapkan stream kamera…</p>
      </div>
    );
  }

  if (bootError) {
    return (
      <div style={S.card}>
        <p style={{ ...S.error, margin: 0 }}>{bootError}</p>
        <p style={S.hint}>
          Pastikan go2rtc.exe ada di folder agent, port 1984 tidak dipakai aplikasi lain,
          dan URL RTSP substream benar di dashboard web.
        </p>
        <button type="button" style={S.btnPrimary} onClick={() => void handleRetryBoot()}>
          Coba lagi
        </button>
      </div>
    );
  }

  if (!cells.length) {
    return (
      <div style={S.card}>
        <p style={{ color: "#64748b", margin: 0 }}>Belum ada CCTV di workstation ini.</p>
        <p style={S.hint}>Tambahkan scanner + CCTV di dashboard web → Perangkat.</p>
      </div>
    );
  }

  const cols = Math.min(Math.max(cells.length, 1), 3);
  const recCount = cells.filter((c) => c.state === "recording").length;
  const offlineCount = cells.filter((c) => !c.scannerConnected).length;

  return (
    <div>
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, fontSize: 12, color: "#64748b" }}>
          Live substream via go2rtc.{" "}
          {recCount > 0 && <span style={{ color: "#b45309", fontWeight: 600 }}>{recCount} rekam aktif.</span>}
          {offlineCount > 0 && <span style={{ color: "#dc2626" }}> {offlineCount} scanner putus.</span>}
        </div>
        <button type="button" style={S.btnSmall} onClick={() => void handleRefreshAll()}>
          Refresh semua
        </button>
        <button
          type="button"
          style={S.btnSmall}
          onClick={() => void window.BuktiScanAgent.refreshConfig()}
        >
          Sync config
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gap: 10,
        }}
      >
        {cells.map((cell, index) => (
          <div
            key={cell.cctvId}
            style={{
              ...S.card,
              marginBottom: 0,
              padding: 0,
              overflow: "hidden",
              borderColor: cell.state === "recording" ? "#fbbf24" : "#e2e8f0",
              borderWidth: cell.state === "recording" ? 2 : 1,
            }}
          >
            <div style={{ position: "relative", aspectRatio: "16/9" }}>
              <LiveRtcPlayer
                src={cell.previewSrc}
                baseUrl={cell.go2rtcBaseUrl}
              />
              {/* Status badges overlay */}
              <div
                style={{
                  position: "absolute",
                  top: 6,
                  left: 6,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 3,
                  pointerEvents: "none",
                }}
              >
                {cell.state === "recording" ? (
                  <span style={S.badgeAmber}>
                    ● REKAM {cell.invoiceNumber}
                    {cell.remainingSec != null && ` ${cell.remainingSec}s`}
                  </span>
                ) : (
                  <span style={S.badgeGreen}>○ IDLE</span>
                )}
                {cell.scannerConnected ? (
                  <span style={S.badgeGreen}>Scanner OK</span>
                ) : (
                  <span style={S.badgeRed}>Scanner putus</span>
                )}
              </div>
              {/* Refresh stream button */}
              <button
                type="button"
                title="Refresh stream"
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  background: "rgba(0,0,0,0.5)",
                  border: "none",
                  borderRadius: 4,
                  color: "#fff",
                  fontSize: 11,
                  padding: "2px 6px",
                  cursor: "pointer",
                }}
                onClick={() => void window.BuktiScanAgent.refreshPreview(cell.cctvId)}
              >
                ↺
              </button>
            </div>

            <div style={{ padding: "8px 10px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 12 }}>{cell.scannerLabel}</div>
                  <div style={{ color: "#64748b", fontSize: 11, marginTop: 1 }}>
                    {cell.cctvLabel}
                    {cell.operatorUsername ? ` · ${cell.operatorUsername}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button
                    type="button"
                    style={S.btnSmall}
                    title="Ambil snapshot"
                    onClick={() => void handleSnapshot(cell.cctvId, cell.cctvLabel)}
                  >
                    📷
                  </button>
                  {cell.state === "recording" && cell.scanId && (
                    <button
                      type="button"
                      style={{
                        ...S.btnSmall,
                        background: "#fee2e2",
                        color: "#dc2626",
                        border: "1px solid #fca5a5",
                        opacity: stoppingId === cell.scanId ? 0.6 : 1,
                      }}
                      disabled={stoppingId === cell.scanId}
                      onClick={() => void handleStop(cell.scanId!)}
                    >
                      {stoppingId === cell.scanId ? "…" : "Stop"}
                    </button>
                  )}
                </div>
              </div>
              {cell.previewError && (
                <p style={{ ...S.error, marginTop: 4, marginBottom: 0, fontSize: 11 }}>
                  {cell.previewError}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Snapshot modal */}
      {snapshotCell && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
          }}
          onClick={() => setSnapshotCell(null)}
        >
          <div style={{ maxWidth: "90vw", maxHeight: "80vh", textAlign: "center" }}>
            <div style={{ color: "#fff", marginBottom: 8, fontSize: 13 }}>{snapshotCell.label}</div>
            <img
              src={snapshotCell.src}
              alt={snapshotCell.label}
              style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: 6 }}
            />
            <div style={{ color: "#94a3b8", marginTop: 8, fontSize: 11 }}>Klik untuk tutup</div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabTentang({ config }: { config: AgentConfig | null }) {
  return (
    <div>
      <div style={S.card}>
        <div style={S.label}>Peran aplikasi</div>
        <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.55, margin: "6px 0 0" }}>
          <strong>Agent (aplikasi ini)</strong> jalan di PC kasir: baca scanner USB,
          rekam CCTV, simpan MP4 lokal, sinkron ke cloud. Tab Scanner/Kamera/Monitor
          hanya untuk <em>operasional &amp; tes</em> — bukan tempat edit konfigurasi.
        </p>
        <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.55, margin: "10px 0 0" }}>
          <strong>Dashboard web</strong> untuk admin: buat workstation, assign operator +
          CCTV, lihat Scan Log lengkap, kelola organisasi. Satu sumber konfigurasi
          (server); agent hanya menarik config dan menjalankannya.
        </p>
      </div>

      <div style={S.card}>
        <div style={S.grid2}>
          <div>
            <div style={S.label}>Versi agent</div>
            <div style={S.value}>{AGENT_VERSION}</div>
          </div>
          <div>
            <div style={S.label}>Organisasi</div>
            <div style={S.value}>{config?.organizationName ?? "—"}</div>
          </div>
          <div>
            <div style={S.label}>Workstation</div>
            <div style={S.value}>{config?.workstationLabel ?? "—"}</div>
          </div>
          <div>
            <div style={S.label}>Workstation ID</div>
            <div
              style={{
                ...S.value,
                fontFamily: "monospace",
                fontSize: 11,
                wordBreak: "break-all",
              }}
            >
              {config?.workstationId ?? "—"}
            </div>
          </div>
        </div>
        <div style={S.divider} />
        <div>
          <div style={S.label}>URL API cloud</div>
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 11,
              wordBreak: "break-all",
            }}
          >
            {config?.apiBaseUrl ?? "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
