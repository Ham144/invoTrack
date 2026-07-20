import axiosInstance from "@/lib/axios";
import type { ScanStatusFilter } from "@/types/invo-track";

export const BuktiScanApi = {
  scanList: (params?: {
    page?: number;
    limit?: number;
    status?: ScanStatusFilter;
    search?: string;
    operator?: string;
    workstationId?: string;
    scannerConfigId?: string;
    startDate?: string;
    endDate?: string;
  }) =>
    axiosInstance.get("/api/invoice-scan/list", {
      params: {
        page: params?.page ?? 1,
        limit: params?.limit ?? 20,
        status:
          params?.status && params.status !== "ALL" ? params.status : undefined,
        search: params?.search || undefined,
        operator: params?.operator || undefined,
        workstationId:
          params?.workstationId && params.workstationId !== "ALL"
            ? params.workstationId
            : undefined,
        scannerConfigId:
          params?.scannerConfigId && params.scannerConfigId !== "ALL"
            ? params.scannerConfigId
            : undefined,
        startDate: params?.startDate || undefined,
        endDate: params?.endDate || undefined,
      },
    }),
  operators: () => axiosInstance.get("/api/invoice-scan/operators"),
  scanFind: (invoiceNumber: string) =>
    axiosInstance.get(`/api/invoice-scan/${encodeURIComponent(invoiceNumber)}`),
  deviceStatus: () => axiosInstance.get("/api/invo-track/devices/status"),
  activeRecordings: (params?: {
    cctvConfigId?: string;
    scannerConfigId?: string;
  }) => axiosInstance.get("/api/invo-track/recording/active", { params }),
  stopRecording: (scanId: string) =>
    axiosInstance.post(`/api/invo-track/recording/${scanId}/stop`),
  cctvList: () => axiosInstance.get("/api/cctv-config"),
  cctvQuota: () => axiosInstance.get("/api/cctv-config/quota"),
  cctvCreate: (body: Record<string, unknown>) =>
    axiosInstance.post("/api/cctv-config", body),
  cctvUpdate: (id: string, body: Record<string, unknown>) =>
    axiosInstance.patch(`/api/cctv-config/${id}`, body),
  cctvDelete: (id: string) => axiosInstance.delete(`/api/cctv-config/${id}`),
  workstationList: () => axiosInstance.get("/api/workstation"),
  workstationCreate: (body: { label: string; isActive?: boolean }) =>
    axiosInstance.post("/api/workstation", body),
  workstationUpdate: (
    id: string,
    body: { label?: string; isActive?: boolean },
  ) => axiosInstance.patch(`/api/workstation/${id}`, body),
  workstationDelete: (id: string) =>
    axiosInstance.delete(`/api/workstation/${id}`),
  workstationHeartbeat: (id: string) =>
    axiosInstance.post(`/api/workstation/${id}/heartbeat`),
  scannerList: (workstationId?: string) =>
    axiosInstance.get("/api/scanner-config", {
      params: workstationId ? { workstationId } : undefined,
    }),
  scannerQuota: () => axiosInstance.get("/api/scanner-config/quota"),
  scannerCreate: (body: Record<string, unknown>) =>
    axiosInstance.post("/api/scanner-config", body),
  scannerUpdate: (id: string, body: Record<string, unknown>) =>
    axiosInstance.patch(`/api/scanner-config/${id}`, body),
  scannerDelete: (id: string) =>
    axiosInstance.delete(`/api/scanner-config/${id}`),
  agentGeneratePairingCode: (workstationId: string) =>
    axiosInstance.post(`/api/workstation/${workstationId}/agent/pairing-code`),
  agentStatus: (workstationId: string) =>
    axiosInstance.get(`/api/workstation/${workstationId}/agent/status`),
  agentUpdateSettings: (
    workstationId: string,
    body: {
      ttsEnabled?: boolean;
      ttsVolume?: number;
      clipsDir?: string;
      clipRetentionDays?: number;
    },
  ) =>
    axiosInstance.patch(
      `/api/workstation/${workstationId}/agent/settings`,
      body,
    ),
  cctvSnapshot: (id: string) =>
    axiosInstance.get(`/api/cctv-config/${id}/snapshot`, {
      responseType: "blob",
    }),
};
