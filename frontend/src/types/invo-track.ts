export interface InvoiceScan {
  id: string;
  organizationName: string;
  invoiceNumber: string;
  scannedAt: string;
  completedAt?: string | null;
  videoPath?: string | null;
  localClipPath?: string | null;
  recordingSource?: 'EDGE' | 'SERVER' | string;
  status: 'RECORDING' | 'COMPLETED' | 'FAILED';
  clipPurgedAt?: string | null;
  stopRequestedAt?: string | null;
  previousInvoice?: string | null;
  workstationId?: string | null;
  workstation?: { id: string; label: string } | null;
  scannerConfigId?: string | null;
  scannerConfig?: {
    id: string;
    label: string;
    assignedUsername?: string | null;
    workstationId?: string;
  } | null;
  cctvConfigId?: string | null;
  cctvConfig?: { id: string; label: string } | null;
  scannedByUsername?: string | null;
  updatedAt?: string;
}

export interface PaginatedScanList {
  items: InvoiceScan[];
  total: number;
  page: number;
  limit: number;
}

export interface CctvConfig {
  id: string;
  label: string;
  rtspUrl: string;
  username?: string;
  password?: string;
  isActive: boolean;
  isOnline: boolean;
}

export interface Workstation {
  id: string;
  label: string;
  isActive: boolean;
  lastSeenAt?: string | null;
  _count?: { scanners: number };
  agentDevice?: {
    pairedAt?: string | null;
    lastSeenAt?: string | null;
    agentVersion?: string | null;
    clipsDir?: string | null;
    clipsDirSecondary?: string | null;
  } | null;
}

export interface AgentPairingResult {
  workstationId: string;
  pairingCode: string;
  expiresAt: string;
  paired: boolean;
  agentLastSeenAt?: string | null;
  agentVersion?: string | null;
}

export interface AgentStatus {
  workstationId: string;
  label: string;
  paired: boolean;
  agentLastSeenAt?: string | null;
  agentVersion?: string | null;
  clipsDir?: string | null;
  clipsDirSecondary?: string | null;
  diskFreeBytes?: number | null;
  diskCheckedAt?: string | null;
  ttsEnabled?: boolean;
  ttsVolume?: number;
  clipRetentionDays?: number;
  lanIp?: string | null;
  mediaPort?: number;
  pairingExpiresAt?: string | null;
}

export interface ScannerConfig {
  id: string;
  label: string;
  workstationId: string;
  assignedUsername?: string | null;
  cctvConfigId: string;
  baudRate: number;
  usbVendorId?: number | null;
  usbProductId?: number | null;
  serialPortPath?: string | null;
  isActive: boolean;
  workstation?: { id: string; label: string };
  assignedUser?: { username: string; displayName: string } | null;
  cctvConfig?: { id: string; label: string; isOnline: boolean };
}

export interface SubscriptionQuota {
  plan: string;
  maxCctv: number;
  durationDays: number;
  currentCctv: number;
}

export interface ScannerQuota {
  plan: string;
  maxScanner: number;
  currentScanner: number;
}

export interface DeviceStatus {
  cctv: Array<{
    id: string;
    label: string;
    isOnline: boolean;
    lastSeenAt?: string;
  }>;
}

export interface LandingStats {
  totalOrganizations: number;
  totalScansToday: number;
  activeCctv: number;
  onlineCctv: number;
}

export type ScanStatusFilter = 'ALL' | 'RECORDING' | 'COMPLETED' | 'FAILED';

export interface ActiveRecording {
  scanId: string;
  invoiceNumber: string;
  scannedAt: string;
  maxDurationSec: number;
  remainingSec: number;
  scannerConfigId: string | null;
  scannerLabel: string | null;
  cctvConfigId: string | null;
  cctvLabel: string | null;
  recordingSource?: string;
  stopRequested?: boolean;
}
