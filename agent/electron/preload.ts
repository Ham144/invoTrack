import { contextBridge, ipcRenderer } from "electron";

export interface AgentScannerView {
  id: string;
  label: string;
  baudRate: number;
  usbVendorId: number | null;
  usbProductId: number | null;
  assignedUsername: string | null;
  cctv: {
    id: string;
    label: string;
    rtspUrl: string;
    username: string | null;
    password: string | null;
    isActive: boolean;
  };
}

export interface ScannerLinkView {
  id: string;
  label: string;
  connected: boolean;
  portPath: string | null;
  usbLabel: string | null;
  error: string | null;
}

export interface RuntimeStatusView {
  paired: boolean;
  recording: boolean;
  lastError: string | null;
  lastScan: string | null;
  busyMessage: string | null;
  clipsDir: string;
  localClipCount?: number;
  scanners: ScannerLinkView[];
  configSyncedAt: string | null;
}

export interface ListedSerialPortView {
  path: string;
  vendorId: string | null;
  productId: string | null;
  manufacturer: string | null;
}

contextBridge.exposeInMainWorld("BuktiScanAgent", {
  getStatus: () =>
    ipcRenderer.invoke("agent:get-status") as Promise<RuntimeStatusView | null>,
  getConfig: () => ipcRenderer.invoke("agent:get-config"),
  getDefaultApiUrl: () => ipcRenderer.invoke("agent:get-default-api-url"),
  getScanners: () =>
    ipcRenderer.invoke("agent:get-scanners") as Promise<AgentScannerView[]>,
  listSerialPorts: () =>
    ipcRenderer.invoke("agent:list-serial-ports") as Promise<
      ListedSerialPortView[]
    >,
  captureCctvSnapshot: (cctvId: string) =>
    ipcRenderer.invoke("agent:cctv-snapshot", cctvId) as Promise<string>,
  openClipsFolder: () => ipcRenderer.invoke("agent:open-clips-folder"),
  refreshConfig: () =>
    ipcRenderer.invoke("agent:refresh-config") as Promise<RuntimeStatusView>,
  syncClips: () =>
    ipcRenderer.invoke("agent:sync-clips") as Promise<RuntimeStatusView>,
  pairUsb: (payload: {
    scannerId: string;
    usbVendorId: number;
    usbProductId: number;
  }) =>
    ipcRenderer.invoke("agent:pair-usb", payload) as Promise<
      AgentScannerView[]
    >,
  pair: (payload: {
    apiBaseUrl: string;
    workstationId: string;
    pairingCode: string;
    clipsDir?: string;
  }) => ipcRenderer.invoke("agent:pair", payload),
});

export interface BuktiScanAgentBridge {
  getStatus: () => Promise<RuntimeStatusView | null>;
  getConfig: () => Promise<unknown>;
  getDefaultApiUrl: () => Promise<string>;
  getScanners: () => Promise<AgentScannerView[]>;
  listSerialPorts: () => Promise<ListedSerialPortView[]>;
  captureCctvSnapshot: (cctvId: string) => Promise<string>;
  openClipsFolder: () => Promise<void>;
  refreshConfig: () => Promise<RuntimeStatusView>;
  syncClips: () => Promise<RuntimeStatusView>;
  pairUsb: (payload: {
    scannerId: string;
    usbVendorId: number;
    usbProductId: number;
  }) => Promise<AgentScannerView[]>;
  pair: (payload: {
    apiBaseUrl: string;
    workstationId: string;
    pairingCode: string;
    clipsDir?: string;
  }) => Promise<unknown>;
}

declare global {
  interface Window {
    BuktiScanAgent: BuktiScanAgentBridge;
  }
}
