import { useState } from "react";
import {
  Camera,
  Clapperboard,
  Gauge,
  ScanLine,
  Settings,
  Video,
} from "lucide-react";
import DashboardFrame from "@/components/islands/DashboardFrame";
import TenantIoTSettings from "@/components/islands/TenantIoTSettings";
import WorkstationScannerSettings from "@/components/islands/WorkstationScannerSettings";
import RecordingSettingsPanel from "@/components/islands/RecordingSettingsPanel";
import StatCard from "@/components/ui/StatCard";
import { useQuery } from "@tanstack/react-query";
import { BuktiScanApi } from "@/api/invo-track";
import type { DeviceStatus, SubscriptionQuota } from "@/types/invo-track";

type Tab = "config" | "scanners" | "recording";

export default function DevicesPage() {
  return (
    <DashboardFrame>
      <DevicesPageContent />
    </DashboardFrame>
  );
}

function DevicesPageContent() {
  const [tab, setTab] = useState<Tab>("config");

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
    description: string;
    icon: typeof Camera;
  }[] = [
    {
      key: "config",
      label: "Konfigurasi CCTV",
      description: "URL RTSP — preview di agent PC kasir",
      icon: Camera,
    },
    {
      key: "scanners",
      label: "Workstation & Scanner",
      description: "Mapping scanner–CCTV, pairing agent",
      icon: ScanLine,
    },
    {
      key: "recording",
      label: "Pengaturan Rekam",
      description: "Batas durasi dan auto-cut",
      icon: Settings,
    },
  ];

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/75 shadow-lg">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-primary-content/10 blur-2xl" />
        <div className="absolute -bottom-12 -left-6 h-32 w-32 rounded-full bg-primary-content/5 blur-xl" />
        <div className="relative px-6 py-8 md:px-8 md:py-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="badge badge-sm bg-primary-content/15 text-primary-content border-0">
                  IoT Gudang
                </span>
                {quota && (
                  <span className="badge badge-sm bg-base-100/90 text-primary border-0">
                    Plan {quota.plan}
                  </span>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-primary-content mb-2">
                Perangkat & CCTV
              </h1>
              <p className="text-primary-content/80 text-sm md:text-base leading-relaxed">
                Admin: atur RTSP, workstation, dan scanner di sini. Operasional
                (preview CCTV, pair USB, scan) di{" "}
                <strong className="text-primary-content">
                  BuktiScan Agent
                </strong>{" "}
                PC kasir.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 shrink-0">
              <a
                href="/dashboard/scan"
                className="btn btn-sm md:btn-md bg-base-100 text-primary border-0 shadow-md hover:shadow-lg"
              >
                <Video className="w-4 h-4" />
                Halaman Scan / Agent
              </a>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5">
        <StatCard
          label="CCTV terdaftar"
          value={devicesLoading ? "…" : String(cctvTotal)}
          hint="Preview & rekam lewat agent di PC kasir"
          icon={Camera}
          tone={cctvTotal > 0 ? "primary" : "default"}
        />
        <StatCard
          label="Kuota CCTV"
          value={
            quotaLoading
              ? "…"
              : `${quota?.currentCctv ?? 0}/${quota?.maxCctv ?? "—"}`
          }
          hint={
            quotaFull ? "Kuota penuh — upgrade plan" : "Slot kamera tersedia"
          }
          icon={Gauge}
          tone={quotaFull ? "warning" : "primary"}
        />
        <StatCard
          label="Mode rekam"
          value={tab === "recording" ? "Aktif" : "Siap"}
          hint="Auto-cut saat scan invoice berikutnya"
          icon={Clapperboard}
          tone="default"
        />
      </div>

      <section className="rounded-2xl border border-base-300 bg-base-100 shadow-sm overflow-hidden">
        <div className="border-b border-base-300 bg-base-200/30 p-2 md:p-3">
          <div role="tablist" className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {tabs.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`flex items-start gap-3 rounded-xl px-4 py-3 text-left transition-all ${
                    active
                      ? "bg-base-100 shadow-sm ring-1 ring-primary/20"
                      : "hover:bg-base-100/60"
                  }`}
                  onClick={() => setTab(t.key)}
                >
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      active
                        ? "bg-primary text-primary-content"
                        : "bg-base-300/60 text-base-content/70"
                    }`}
                  >
                    <t.icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`font-semibold text-sm ${active ? "text-primary" : ""}`}
                    >
                      {t.label}
                    </p>
                    <p className="text-xs text-base-content/55 mt-0.5">
                      {t.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-5 md:p-6">
          {tab === "config" && <TenantIoTSettings />}
          {tab === "scanners" && <WorkstationScannerSettings />}
          {tab === "recording" && <RecordingSettingsPanel />}
        </div>
      </section>
    </div>
  );
}
