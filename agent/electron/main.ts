import {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  Tray,
  Menu,
  nativeImage,
} from "electron";
import path from "path";
import { AgentRuntime, AGENT_VERSION } from "../src/core/runtime";
import { loadConfig } from "../src/core/config-store";
import { loadAgentEnv, resolveDefaultApiBaseUrl } from "../src/core/env-loader";

loadAgentEnv();

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let runtime: AgentRuntime | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 520,
    height: 720,
    show: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      // UI di-load via file:// — iframe ke go2rtc (127.0.0.1:1984) perlu ini
      webSecurity: false,
    },
  });

  const uiPath = path.join(__dirname, "../app/index.html");
  mainWindow.loadFile(uiPath);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function refreshTray() {
  if (!tray || !runtime) return;
  const status = runtime.getStatus();
  const label = status.recording
    ? `Rekam: ${status.lastScan ?? "aktif"}`
    : status.paired
      ? "BuktiScan Agent — siap"
      : "BuktiScan Agent — belum paired";
  tray.setToolTip(label);
}

async function startRuntimeIfPaired() {
  const config = loadConfig();
  runtime = new AgentRuntime(config);
  if (!config.deviceToken) return;

  try {
    runtime.purgeOldClips(30);
    await runtime.start();
    refreshTray();
  } catch {
    /* UI handles errors */
  }
}

app.whenReady().then(async () => {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "Buka BuktiScan Agent",
        click: () => {
          if (!mainWindow) createWindow();
          else mainWindow.show();
        },
      },
      { type: "separator" },
      { label: `Versi ${AGENT_VERSION}`, enabled: false },
      {
        label: "Keluar",
        click: () => app.quit(),
      },
    ]),
  );

  createWindow();
  await startRuntimeIfPaired();
  setInterval(refreshTray, 3000);
});

app.on("window-all-closed", () => {
  /* keep tray */
});

app.on("before-quit", async () => {
  if (runtime) await runtime.stop();
});

ipcMain.handle("agent:get-status", () => runtime?.getStatus() ?? null);
ipcMain.handle("agent:get-config", () => runtime?.getConfig() ?? loadConfig());
ipcMain.handle("agent:get-default-api-url", () => resolveDefaultApiBaseUrl());

ipcMain.handle("agent:get-scanners", () => runtime?.getScanners() ?? []);

ipcMain.handle("agent:list-serial-ports", async () => {
  if (!runtime) return [];
  return runtime.listSerialPorts();
});

ipcMain.handle(
  "agent:pair-usb",
  async (
    _evt,
    payload: {
      scannerId: string;
      usbVendorId: number;
      usbProductId: number;
      serialPortPath: string;
    },
  ) => {
    if (!runtime) throw new Error("Agent belum siap");
    await runtime.pairUsbScanner(
      payload.scannerId,
      payload.usbVendorId,
      payload.usbProductId,
      payload.serialPortPath,
    );
    return runtime.getScanners();
  },
);

ipcMain.handle("agent:open-clips-folder", async () => {
  const config = runtime?.getConfig() ?? loadConfig();
  if (config.clipsDir) {
    await shell.openPath(config.clipsDir);
  }
});

ipcMain.handle("agent:refresh-config", async () => {
  if (!runtime) throw new Error("Agent belum siap");
  await runtime.refreshConfig();
  return runtime.getStatus();
});

ipcMain.handle("agent:sync-clips", async () => {
  if (!runtime) throw new Error("Agent belum siap");
  await runtime.syncClipsNow();
  return runtime.getStatus();
});

ipcMain.handle("agent:cctv-snapshot", async (_evt, cctvId: string) => {
  if (!runtime) throw new Error("Agent belum siap");
  const buf = await runtime.captureCctvSnapshot(cctvId);
  return buf.toString("base64");
});

ipcMain.handle("agent:start-monitor", async () => {
  if (!runtime) return [];
  await runtime.startMonitor();
  return runtime.getMonitorGrid();
});

ipcMain.handle("agent:resync-monitor", async () => {
  if (!runtime) return [];
  await runtime.resyncMonitor();
  return runtime.getMonitorGrid();
});

ipcMain.handle("agent:stop-monitor", () => {
  runtime?.stopMonitor();
});

ipcMain.handle("agent:get-monitor-grid", () => runtime?.getMonitorGrid() ?? []);

ipcMain.handle("agent:get-active-recordings", () =>
  runtime?.getActiveRecordings() ?? [],
);

ipcMain.handle("agent:get-recent-scans", async () => {
  if (!runtime) return [];
  return runtime.getRecentScans();
});

ipcMain.handle("agent:stop-recording", async (_evt, scanId: string) => {
  if (!runtime) throw new Error("Agent belum siap");
  await runtime.stopRecording(scanId);
});

ipcMain.handle("agent:refresh-preview", async (_evt, cctvId: string) => {
  await runtime?.refreshPreview(cctvId);
});

ipcMain.handle("agent:start-camera-preview", async (_evt, cctvId: string) => {
  await runtime?.startCameraPreview(cctvId);
});

ipcMain.handle("agent:stop-camera-preview", async (_evt, cctvId: string) => {
  await runtime?.stopCameraPreview(cctvId);
});

ipcMain.handle(
  "agent:update-tts-settings",
  (_evt, payload: { ttsEnabled?: boolean; ttsVolume?: number }) => {
    if (!runtime) throw new Error("Agent belum siap");
    return runtime.updateTtsSettings(payload);
  },
);

ipcMain.handle("agent:test-tts", () => {
  runtime?.testTts();
});

ipcMain.handle("agent:monitor-mode", (_evt, enabled: boolean) => {
  if (!mainWindow) return;
  if (enabled) {
    mainWindow.setMinimumSize(900, 600);
    mainWindow.setSize(1100, 820);
  } else {
    mainWindow.setMinimumSize(400, 500);
    mainWindow.setSize(520, 720);
  }
});

ipcMain.handle(
  "agent:pair",
  async (
    _evt,
    payload: {
      apiBaseUrl: string;
      workstationId: string;
      pairingCode: string;
      clipsDir?: string;
    },
  ) => {
    runtime = new AgentRuntime(loadConfig());
    await runtime.pair(
      payload.apiBaseUrl,
      payload.workstationId,
      payload.pairingCode,
      payload.clipsDir,
    );
    await runtime.start();
    refreshTray();
    return runtime.getStatus();
  },
);
