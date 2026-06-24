import fs from "fs";
import path from "path";
import { AgentApiClient, AgentScannerConfig } from "./api-client";
import { captureCctvSnapshot } from "./cctv-snapshot";
import { shouldReconnectSerial } from "./config-sync";
import { ClipServer } from "./clip-server";
import { AgentConfig, loadConfig, saveConfig } from "./config-store";
import { listLocalClipFiles, resolveClipPath } from "./local-clips";
import { LocalRecorder } from "./recorder";
import { listSerialPorts, ListedSerialPort, SerialManager } from "./serial";

export const AGENT_VERSION = "0.1.2";

export interface ScannerLinkStatus {
  id: string;
  label: string;
  connected: boolean;
  portPath: string | null;
  usbLabel: string | null;
  error: string | null;
}

export interface RuntimeStatus {
  paired: boolean;
  recording: boolean;
  lastError: string | null;
  lastScan: string | null;
  busyMessage: string | null;
  clipsDir: string;
  localClipCount: number;
  scanners: ScannerLinkStatus[];
  configSyncedAt: string | null;
}

export class AgentRuntime {
  private config: AgentConfig;
  private api: AgentApiClient;
  private recorder = new LocalRecorder();
  private serial = new SerialManager();
  private clipServer = new ClipServer();
  private pollTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private configSyncTimer: NodeJS.Timeout | null = null;
  private remoteConfig: Awaited<
    ReturnType<AgentApiClient["fetchConfig"]>
  > | null = null;
  private ingestLock = false;
  private reconcileLock = false;
  private finishingScans = new Set<string>();
  private cctvGate = new Map<string, Promise<void>>();
  private status: RuntimeStatus = {
    paired: false,
    recording: false,
    lastError: null,
    lastScan: null,
    busyMessage: null,
    clipsDir: "",
    localClipCount: 0,
    scanners: [],
    configSyncedAt: null,
  };

  constructor(config?: AgentConfig) {
    this.config = config ?? loadConfig();
    this.status.clipsDir = this.config.clipsDir;
    this.api = new AgentApiClient(this.config);
    this.status.paired = Boolean(this.config.deviceToken);
  }

  getStatus(): RuntimeStatus {
    this.status.localClipCount = listLocalClipFiles(this.config.clipsDir).length;
    this.updateScannerStatus();
    return { ...this.status };
  }

  getConfig(): AgentConfig {
    return { ...this.config };
  }

  getScanners(): AgentScannerConfig[] {
    return this.remoteConfig?.scanners ?? [];
  }

  async listSerialPorts(): Promise<ListedSerialPort[]> {
    return listSerialPorts();
  }

  async pairUsbScanner(
    scannerId: string,
    usbVendorId: number,
    usbProductId: number,
  ): Promise<void> {
    await this.api.pairUsb(scannerId, usbVendorId, usbProductId);
    await this.refreshConfig(true);
  }

  async refreshConfig(forceReconnect = false): Promise<void> {
    if (!this.config.deviceToken) return;

    const prevScanners = this.remoteConfig?.scanners ?? null;
    const next = await this.api.fetchConfig();
    const reconnect = shouldReconnectSerial(
      prevScanners,
      next.scanners,
      forceReconnect,
    );

    this.remoteConfig = next;
    if (next.clipsDir) {
      this.config.clipsDir = next.clipsDir;
    }
    this.status.clipsDir = this.config.clipsDir;
    fs.mkdirSync(this.config.clipsDir, { recursive: true });
    this.clipServer.start(this.config.clipsDir);
    saveConfig(this.config);

    if (!next.scanners.length) {
      await this.serial.disconnectAll();
    } else if (reconnect) {
      await this.serial.reconnectAll(next.scanners, (id, inv) =>
        this.handleScan(id, inv),
      );
    }

    this.status.configSyncedAt = new Date().toISOString();
    this.updateScannerStatus();
  }

  async syncClipsNow(): Promise<void> {
    await this.reconcileLocalClips();
  }

  private updateScannerStatus(): void {
    const connected = new Set(this.serial.getConnectedScannerIds());
    this.status.scanners = (this.remoteConfig?.scanners ?? []).map((s) => ({
      id: s.id,
      label: s.label,
      connected: connected.has(s.id),
      portPath: this.serial.getPortPath(s.id),
      usbLabel:
        s.usbVendorId != null && s.usbProductId != null
          ? `${s.usbVendorId}:${s.usbProductId}`
          : null,
      error: this.serial.getScannerError(s.id),
    }));
  }

  private async withCctvLock<T>(
    cctvId: string,
    work: () => Promise<T>,
  ): Promise<T> {
    const tail = this.cctvGate.get(cctvId) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const next = tail.then(() => gate);
    this.cctvGate.set(cctvId, next);
    await tail;
    try {
      return await work();
    } finally {
      release();
      if (this.cctvGate.get(cctvId) === next) {
        this.cctvGate.delete(cctvId);
      }
    }
  }

  async captureCctvSnapshot(cctvId: string): Promise<Buffer> {
    return this.withCctvLock(cctvId, async () => {
      const scanner = this.remoteConfig?.scanners.find(
        (s) => s.cctv.id === cctvId,
      );
      if (!scanner?.cctv?.rtspUrl) {
        throw new Error("CCTV tidak ditemukan di konfigurasi workstation");
      }
      const rtspUrl = this.buildRtspUrl(
        scanner.cctv.rtspUrl,
        scanner.cctv.username,
        scanner.cctv.password,
      );
      return captureCctvSnapshot(rtspUrl);
    });
  }

  async pair(
    apiBaseUrl: string,
    workstationId: string,
    pairingCode: string,
    clipsDir?: string,
  ): Promise<void> {
    this.config.apiBaseUrl = apiBaseUrl.replace(/\/$/, "");
    this.config.clipsDir = clipsDir || this.config.clipsDir;
    this.api.updateConfig(this.config);

    const result = await this.api.pair(workstationId, pairingCode);
    this.config.deviceToken = result.deviceToken;
    this.config.workstationId = result.workstationId;
    this.config.organizationName = result.organizationName;
    this.config.workstationLabel = result.workstationLabel;
    saveConfig(this.config);
    this.api.updateConfig(this.config);
    this.status.paired = true;
    this.status.clipsDir = this.config.clipsDir;
  }

  private buildRtspUrl(
    baseUrl: string,
    username: string | null,
    password: string | null,
  ): string {
    const trimmed = baseUrl.trim();
    if (!username || trimmed.includes("@")) return trimmed;
    try {
      const u = new URL(trimmed);
      u.username = username;
      if (password) u.password = password;
      return u.toString();
    } catch {
      return trimmed;
    }
  }

  private async handleScan(
    scannerConfigId: string,
    invoiceNumber: string,
  ): Promise<void> {
    if (!this.remoteConfig) return;

    if (this.ingestLock) {
      this.status.busyMessage = `Sedang merekam — scan "${invoiceNumber}" diabaikan, tunggu selesai`;
      return;
    }

    this.ingestLock = true;
    this.status.busyMessage = null;
    let scanId: string | null = null;
    try {
      const scan = await this.api.ingest(scannerConfigId, invoiceNumber);
      scanId = scan.id;
      this.status.lastScan = scan.invoiceNumber;

      const scanner = this.remoteConfig.scanners.find(
        (s) => s.id === scannerConfigId,
      );
      if (!scanner?.cctv?.rtspUrl) {
        throw new Error("RTSP CCTV tidak dikonfigurasi");
      }

      const rtspUrl = this.buildRtspUrl(
        scanner.cctv.rtspUrl,
        scanner.cctv.username,
        scanner.cctv.password,
      );

      fs.mkdirSync(this.config.clipsDir, { recursive: true });
      await this.withCctvLock(scanner.cctv.id, () =>
        this.recorder.start({
          scanId: scan.id,
          cctvConfigId: scanner.cctv.id,
          invoiceNumber: scan.invoiceNumber,
          rtspUrl,
          clipsDir: this.config.clipsDir,
        }),
      );
      this.status.recording = true;
      this.status.lastError = null;
    } catch (err) {
      if (scanId) {
        try {
          await this.api.failRecording(scanId);
        } catch {
          /* ignore */
        }
      }
      this.status.lastError =
        err instanceof Error ? err.message : "Scan gagal";
    } finally {
      this.ingestLock = false;
    }
  }

  private async finishRecordingRow(row: {
    scanId: string;
    invoiceNumber: string;
    maxDurationSec: number;
    remainingSec: number;
  }): Promise<void> {
    if (this.finishingScans.has(row.scanId)) return;
    this.finishingScans.add(row.scanId);

    try {
      let localPath: string | null = null;

      if (this.recorder.isRecording(row.scanId)) {
        localPath = await this.recorder.stop(row.scanId);
      }

      if (!localPath) {
        localPath = resolveClipPath(this.config.clipsDir, row.invoiceNumber);
      }

      if (localPath) {
        const durationSec = Math.max(0, row.maxDurationSec - row.remainingSec);
        await this.api.complete(row.scanId, localPath, durationSec);
        return;
      }

      await this.api.failRecording(row.scanId);
    } finally {
      this.finishingScans.delete(row.scanId);
    }
  }

  private async reconcileLocalClips(): Promise<void> {
    if (this.reconcileLock || !this.config.deviceToken) return;
    const clips = listLocalClipFiles(this.config.clipsDir);
    if (!clips.length) return;

    this.reconcileLock = true;
    try {
      await this.api.reconcileClips(clips);
    } catch {
      /* retry on next heartbeat */
    } finally {
      this.reconcileLock = false;
    }
  }

  private async pollRecordings(): Promise<void> {
    if (!this.config.deviceToken) return;

    try {
      const rows = await this.api.activeRecordings();

      for (const row of rows) {
        const shouldStop = row.stopRequested || row.remainingSec <= 0;
        const isLocal = this.recorder.isRecording(row.scanId);

        if (!isLocal && !shouldStop && row.rtspUrl) {
          const rtspUrl = this.buildRtspUrl(
            row.rtspUrl,
            row.cctvUsername,
            row.cctvPassword,
          );
          try {
            const cctvId = row.cctvConfigId || "unknown";
            await this.withCctvLock(cctvId, () =>
              this.recorder.start({
                scanId: row.scanId,
                cctvConfigId: cctvId,
                invoiceNumber: row.invoiceNumber,
                rtspUrl,
                clipsDir: this.config.clipsDir,
              }),
            );
            this.status.recording = true;
          } catch {
            await this.api.failRecording(row.scanId);
          }
        }

        if (shouldStop) {
          await this.finishRecordingRow(row);
        }
      }

      this.status.recording = this.recorder.hasActiveRecordings();
    } catch (err) {
      this.status.lastError =
        err instanceof Error ? err.message : "Poll gagal";
    }
  }

  private async syncRemote(): Promise<void> {
    await this.refreshConfig(true);
  }

  async start(): Promise<void> {
    if (!this.config.deviceToken) {
      throw new Error("Agent belum dipairing");
    }

    fs.mkdirSync(this.config.clipsDir, { recursive: true });
    this.clipServer.start(this.config.clipsDir);
    await this.syncRemote();
    await this.reconcileLocalClips();

    const heartbeat = async () => {
      try {
        await this.api.heartbeat({
          agentVersion: AGENT_VERSION,
          clipsDir: this.config.clipsDir,
          isRecording: this.status.recording,
        });
        await this.reconcileLocalClips();
      } catch (err) {
        this.status.lastError =
          err instanceof Error ? err.message : "Heartbeat gagal";
      }
    };

    await heartbeat();
    this.heartbeatTimer = setInterval(() => void heartbeat(), 60_000);
    this.pollTimer = setInterval(() => void this.pollRecordings(), 2000);
    this.configSyncTimer = setInterval(
      () => void this.refreshConfig().catch(() => {}),
      30_000,
    );
  }

  async stop(): Promise<void> {
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.configSyncTimer) clearInterval(this.configSyncTimer);
    this.clipServer.stop();
    await this.serial.disconnectAll();
  }

  purgeOldClips(retentionDays = 30): void {
    const dir = this.config.clipsDir;
    if (!fs.existsSync(dir)) return;
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith(".mp4")) continue;
      const filePath = path.join(dir, name);
      try {
        const stat = fs.statSync(filePath);
        if (stat.mtimeMs < cutoff) fs.unlinkSync(filePath);
      } catch {
        /* ignore */
      }
    }
  }
}
