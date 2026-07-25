import { Camera, Clapperboard, Gauge, ScanLine, Settings } from "lucide-react";
import DashboardFrame from "@/components/islands/DashboardFrame";
import TenantIoTSettings from "@/components/islands/TenantIoTSettings";
import WorkstationScannerSettings from "@/components/islands/WorkstationScannerSettings";
import RecordingSettingsPanel from "@/components/islands/RecordingSettingsPanel";
import StatCard from "@/components/ui/StatCard";
import PageHeader from "@/components/ui/PageHeader";
import { useQuery } from "@tanstack/react-query";
import { BuktiScanApi } from "@/api/invo-track";
import { canManageInfrastructure } from "@/lib/permissions";
import { useSessionStore } from "@/stores/sessionStore";
import type { DeviceStatus, SubscriptionQuota } from "@/types/invo-track";
import { useState } from "react";

type Tab = "config" | "scanners" | "recording";

const TAB_VALUES: Tab[] = ["config", "scanners", "recording"];

function tabFromUrl(): Tab {
  if (typeof window === "undefined") return "config";
  const t = new URLSearchParams(window.location.search).get("tab");
  return TAB_VALUES.includes(t as Tab) ? (t as Tab) : "config";
}

export default function DevicesPage() {
  return (
    <DashboardFrame>
      <DevicesPageContent />
    </DashboardFrame>
  );
}

function DevicesPageContent() {
  const [tab, setTab] = useState<Tab>(tabFromUrl);
  const user = useSessionStore((s) => s.user);
  const canEdit = canManageInfrastructure(user?.role);

  const { data: devices, isLoading: devicesLoading } = useQuery({
    queryKey: ["device-status"],
    queryFn: async () => {
      const res = await BuktiScanApi.deviceStatus();
      return res.data as DeviceStatus;
    },
    refetchInterval: 15000,
  });

  const { data: quota, isLoading: quotaLoading } = useQuery({
    queryKey: ["cctv-quota"],
    queryFn: async () => {
      const res = await BuktiScanApi.cctvQuota();
      return res.data as SubscriptionQuota;
    },
  });

  const cctvTotal = devices?.cctv.length ?? 0;
  const quotaFull = quota ? quota.currentCctv >= quota.maxCctv : false;

  const tabs: {
    key: Tab;
    label: string;
    icon: typeof Camera;
  }[] = [
    { key: "config", label: "CCTV", icon: Camera },
    { key: "scanners", label: "Workstation", icon: ScanLine },
    { key: "recording", label: "Rekam", icon: Settings },
  ];

  const tabMetadata: Record<Tab, { title: string; desc: string }> = {
    config: {
      title: "Koneksi Kamera CCTV",
      desc: "Koneksi RTSP, IP, dan kredensial stream kamera",
    },
    scanners: {
      title: "Konfigurasi Workstation & Scanner",
      desc: "Pairing agent PC Kasir, COM port, dan mapping operator/CCTV",
    },
    recording: {
      title: "Batas Waktu Rekaman",
      desc: "Konfigurasi durasi rekam maksimal dan perilaku auto-cut",
    },
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Perangkat & CCTV"
        subtitle="Konfigurasi admin: RTSP, workstation, scanner, pairing agent. Operasional USB & scan hanya di BuktiScan Agent PC kasir."
        badge={
          quota ? (
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              Plan {quota.plan}
            </span>
          ) : undefined
        }
        actions={
          <a href="/dashboard/scan-log" className="btn-primary-soft">
            Scan Log
          </a>
        }
      />

      {!canEdit && (
        <div className="warn-callout">
          Mode baca saja — perubahan membutuhkan peran Admin Organisasi.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="CCTV terdaftar"
          value={devicesLoading ? "…" : String(cctvTotal)}
          hint="Rekam & preview lewat agent"
          icon={Camera}
          tone="primary"
        />
        <StatCard
          label="Kuota CCTV"
          value={
            quotaLoading
              ? "…"
              : `${quota?.currentCctv ?? 0}/${quota?.maxCctv ?? "—"}`
          }
          hint={quotaFull ? "Kuota penuh" : "Slot tersedia"}
          icon={Gauge}
          tone={quotaFull ? "warning" : "default"}
        />
        <StatCard
          label="Auto-cut"
          value={tab === "recording" ? "Atur" : "Siap"}
          hint="Stop saat scan berikutnya"
          icon={Clapperboard}
        />
      </div>

      <section className="surface-card animate-fade-in-up">
        <div className="section-head flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="section-title">{tabMetadata[tab].title}</h2>
            <p className="section-desc">{tabMetadata[tab].desc}</p>
          </div>
          <div className="tab-segment" role="tablist">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                className={`tab-segment-btn flex items-center gap-1.5 ${
                  tab === t.key ? "tab-segment-btn-active" : ""
                }`}
                onClick={() => setTab(t.key)}
              >
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="surface-card-body">
          {tab === "config" && <TenantIoTSettings />}
          {tab === "scanners" && <WorkstationScannerSettings />}
          {tab === "recording" && <RecordingSettingsPanel />}
        </div>
      </section>
    </div>
  );
}
