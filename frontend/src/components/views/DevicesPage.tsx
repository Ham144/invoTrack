import { useState } from "react";
import {
  Camera,
  Circle,
  Clapperboard,
  Gauge,
  ScanLine,
  Settings,
  Video,
} from "lucide-react";
import DashboardFrame from "@/components/islands/DashboardFrame";
import TenantIoTSettings, {
  CctvLivePreview,
} from "@/components/islands/TenantIoTSettings";
import WorkstationScannerSettings from "@/components/islands/WorkstationScannerSettings";
import RecordingSettingsPanel from "@/components/islands/RecordingSettingsPanel";
import StatCard from "@/components/ui/StatCard";
import { useQuery } from "@tanstack/react-query";
import { InvoTrackApi } from "@/api/invo-track";
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
      const res = await InvoTrackApi.deviceStatus();
      return res.data as DeviceStatus;
    },
    refetchInterval: 15000,
  });

  const { data: quota, isLoading: quotaLoading } = useQuery({
    queryKey: ["cctv-quota"],
    queryFn: async () => {
      const res = await InvoTrackApi.cctvQuota();
      return res.data as SubscriptionQuota;
    },
  });

  const cctvTotal = devices?.cctv.length ?? 0;
  const cctvOnline = devices?.cctv.filter((c) => c.isOnline).length ?? 0;
  const allOnline = cctvTotal > 0 && cctvOnline === cctvTotal;
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
      description: "RTSP, label, dan status kamera",
      icon: Camera,
    },
    {
      key: "scanners",
      label: "Workstation & Scanner",
      description: "PC kasir, operator, pairing USB",
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
                Pantau kamera gudang secara langsung, kelola stream RTSP, dan
                atur kebijakan rekam organisasi dari satu tempat.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 shrink-0">
              <a
                href="/dashboard/scan"
                className="btn btn-sm md:btn-md bg-base-100 text-primary border-0 shadow-md hover:shadow-lg"
              >
                <Video className="w-4 h-4" />
                Halaman Scan
              </a>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5">
        <StatCard
          label="CCTV online"
          value={devicesLoading ? "…" : `${cctvOnline}/${cctvTotal}`}
          hint={
            cctvTotal === 0
              ? "Belum ada kamera terdaftar"
              : allOnline
                ? "Semua kamera terhubung"
                : `${cctvTotal - cctvOnline} kamera offline`
          }
          icon={Camera}
          tone={allOnline && cctvTotal > 0 ? "success" : cctvOnline > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Kuota CCTV"
          value={quotaLoading ? "…" : `${quota?.currentCctv ?? 0}/${quota?.maxCctv ?? "—"}`}
          hint={quotaFull ? "Kuota penuh — upgrade plan" : "Slot kamera tersedia"}
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
        <div className="flex flex-col gap-4 border-b border-base-300 px-5 py-4 md:px-6 md:flex-row md:items-center md:justify-between bg-base-200/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base md:text-lg">Live Preview</h2>
              <p className="text-xs md:text-sm text-base-content/60">
                Snapshot RTSP diperbarui otomatis setiap 8 detik
              </p>
            </div>
          </div>
          <span className="badge badge-outline gap-2 w-fit">
            <Circle
              className={`w-2 h-2 fill-current ${cctvOnline > 0 ? "text-success" : "text-base-content/30"}`}
            />
            {cctvOnline} stream aktif
          </span>
        </div>

        <div className="p-5 md:p-6">
          {!devicesLoading && devices && devices.cctv.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-2">
              {devices.cctv.map((c) => (
                <span
                  key={c.id}
                  className={`badge badge-lg gap-2 font-normal ${
                    c.isOnline
                      ? "badge-success badge-outline"
                      : "badge-ghost border border-base-300"
                  }`}
                >
                  <Circle
                    className={`w-2 h-2 fill-current shrink-0 ${c.isOnline ? "text-success" : "text-error"}`}
                  />
                  {c.label}
                </span>
              ))}
            </div>
          )}
          <CctvLivePreview />
        </div>
      </section>

      <section className="rounded-2xl border border-base-300 bg-base-100 shadow-sm overflow-hidden">
        <div className="border-b border-base-300 bg-base-200/30 p-2 md:p-3">
          <div
            role="tablist"
            className="grid grid-cols-1 sm:grid-cols-3 gap-2"
          >
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
