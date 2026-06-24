import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AgentScannerView,
  ListedSerialPortView,
  RuntimeStatusView,
  ScannerLinkView,
} from "../../electron/preload";
import { findDuplicateUsbBindings, parseUsbId } from "../core/scan-parse";

const AGENT_VERSION = "0.1.2";

type Tab = "beranda" | "kamera" | "scanner" | "penyimpanan" | "tentang";

interface AgentConfig {
  apiBaseUrl: string;
  workstationId?: string;
  organizationName?: string;
  workstationLabel?: string;
  clipsDir: string;
}

const TABS: { id: Tab; label: string }[] = [
  { id: "beranda", label: "Beranda" },
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

function formatSyncedAt(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("id-ID");
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
      setPairError(err instanceof Error ? err.message : "Pairing gagal");
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
      setPreviewError(err instanceof Error ? err.message : "Preview gagal");
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
      setUsbError(err instanceof Error ? err.message : "Pair USB gagal");
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
          <TabBeranda status={status} config={config} onNavigate={setTab} />
        )}
        {tab === "kamera" && (
          <TabKamera
            cctvs={cctvs}
            activeCctvId={previewCctvId}
            onSelectCctv={setPreviewCctvId}
            previewUrl={previewUrl}
            previewLoading={previewLoading}
            previewError={previewError}
            onLoadPreview={() => void loadPreview()}
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

function TabBeranda({
  status,
  config,
  onNavigate,
}: {
  status: RuntimeStatusView;
  config: AgentConfig | null;
  onNavigate: (tab: Tab) => void;
}) {
  const links = status.scanners ?? [];
  const anyConnected = links.some((l) => l.connected);

  return (
    <div>
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
                <span style={S.badgeBlue}>Merekam {status.lastScan ?? ""}</span>
              ) : (
                <span style={S.badgeGreen}>Siap scan</span>
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <button
          type="button"
          style={S.btnOutline}
          onClick={() => onNavigate("kamera")}
        >
          Tes preview CCTV →
        </button>
        <button
          type="button"
          style={S.btnOutline}
          onClick={() => onNavigate("scanner")}
        >
          Pair USB scanner →
        </button>
      </div>
    </div>
  );
}

function TabKamera({
  cctvs,
  activeCctvId,
  onSelectCctv,
  previewUrl,
  previewLoading,
  previewError,
  onLoadPreview,
}: {
  cctvs: AgentScannerView["cctv"][];
  activeCctvId: string;
  onSelectCctv: (id: string) => void;
  previewUrl: string | null;
  previewLoading: boolean;
  previewError: string | null;
  onLoadPreview: () => void;
}) {
  const activeCctv =
    cctvs.find((c) => c.id === activeCctvId) ?? cctvs[0] ?? null;

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
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <select
            style={{ ...S.input, marginTop: 0, flex: 1 }}
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
            style={{ ...S.btnPrimary, opacity: previewLoading ? 0.7 : 1 }}
            disabled={previewLoading || !activeCctv}
            onClick={onLoadPreview}
          >
            {previewLoading ? "Mengambil..." : "Test Koneksi RTSP"}
          </button>
        </div>

        {activeCctv && (
          <div style={{ marginTop: 8 }}>
            <div style={S.label}>
              URL RTSP (read-only — edit di dashboard web)
            </div>
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

      <div style={S.previewBox}>
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Preview CCTV"
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        ) : (
          <p
            style={{
              color: "#94a3b8",
              fontSize: 12,
              padding: 16,
              textAlign: "center",
            }}
          >
            {previewError ??
              "Klik 'Test Koneksi RTSP' untuk tes apakah kamera dapat diakses dari PC ini."}
          </p>
        )}
      </div>
      {previewError && (
        <p style={{ ...S.error, marginTop: 8 }}>{previewError}</p>
      )}
      <p style={S.hint}>
        Snapshot diambil langsung dari LAN toko — bukan dari server cloud.
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

function TabTentang({ config }: { config: AgentConfig | null }) {
  return (
    <div>
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
