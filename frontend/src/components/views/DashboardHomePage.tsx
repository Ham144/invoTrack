import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Camera,
  ClipboardList,
  Radio,
  type LucideIcon,
} from "lucide-react";
import DashboardFrame from "@/components/islands/DashboardFrame";
import DeviceStatusPanel from "@/components/islands/DeviceStatusPanel";
import StatusBadge from "@/components/ui/StatusBadge";
import { InvoTrackApi } from "@/api/invo-track";
import { OrganizationApi } from "@/api/organization";
import { scanDuration } from "@/lib/scan-utils";
import type { InvoiceScan, LandingStats } from "@/types/invo-track";

export default function DashboardHomePage() {
  return (
    <DashboardFrame>
      <DashboardHomeContent />
    </DashboardFrame>
  );
}

function DashboardHomeContent() {
  const [, tick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-summary", "landing"],
    queryFn: async () => {
      const res = await OrganizationApi.landing();
      return res.data as LandingStats;
    },
  });

  const { data: devices } = useQuery({
    queryKey: ["device-status"],
    queryFn: async () => {
      const res = await InvoTrackApi.deviceStatus();
      return res.data as { cctv: { isOnline: boolean }[] };
    },
  });

  const { data: scans, isLoading: scansLoading } = useQuery({
    queryKey: ["dashboard-summary", "recent-scans"],
    queryFn: async () => {
      const res = await InvoTrackApi.scanList({ page: 1, limit: 5 });
      return res.data as { items: InvoiceScan[]; total: number };
    },
    refetchInterval: 30000,
  });

  const { data: active = [] } = useQuery({
    queryKey: ["active-recordings"],
    queryFn: async () => {
      const res = await InvoTrackApi.activeRecordings();
      return res.data as { invoiceNumber: string }[];
    },
    refetchInterval: 5000,
  });

  const cctvTotal = devices?.cctv.length ?? 0;
  const cctvOnline = devices?.cctv.filter((c) => c.isOnline).length ?? 0;

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl shadow-lg overflow-hidden">
        <div className="px-6 py-8 md:px-8 md:py-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-primary-content mb-2">
                Ringkasan Operasional
              </h1>
              <p className="text-primary-content/80 text-sm md:text-base">
                Monitor aktivitas scan, rekam CCTV, dan status perangkat gudang
              </p>
            </div>
            <a href="/dashboard/scan" className="btn btn-lg bg-base-100 text-primary border-0 shadow-md hover:shadow-lg">
              Mulai Scan
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        <HomeStatCard
          label="Scan hari ini"
          value={statsLoading ? "…" : (stats?.totalScansToday ?? "—")}
          icon={ClipboardList}
          tone="primary"
        />
        <HomeStatCard
          label="Sedang merekam"
          value={active.length}
          hint="Invoice status rekam aktif"
          icon={Radio}
          tone={active.length > 0 ? "warning" : "default"}
        />
        <HomeStatCard
          label="CCTV online"
          value={devices ? `${cctvOnline}/${cctvTotal}` : "…"}
          icon={Camera}
          tone="success"
        />
      </div>

      <section className="bg-base-100 rounded-2xl shadow-sm border border-base-300 overflow-hidden">
        <div className="px-6 py-5 border-b border-base-300 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg md:text-xl font-bold">Scan Terbaru</h2>
            <p className="text-sm text-base-content/60 mt-1">5 scan invoice terakhir</p>
          </div>
          <span className="badge badge-ghost badge-sm">Auto refresh 30 detik</span>
        </div>

        <div className="overflow-x-auto">
          {scansLoading ? (
            <div className="p-8 text-center">
              <span className="loading loading-spinner loading-md text-primary" />
              <p className="mt-3 text-base-content/60">Memuat data scan...</p>
            </div>
          ) : (scans?.items.length ?? 0) === 0 ? (
            <div className="p-12 text-center text-base-content/60">
              <p className="font-semibold text-base-content">Belum ada scan</p>
              <p className="text-sm mt-1">Mulai scan invoice dari halaman Scan.</p>
            </div>
          ) : (
            <table className="table table-sm">
              <thead className="bg-base-200">
                <tr>
                  <th>Invoice</th>
                  <th>Status</th>
                  <th>Durasi</th>
                  <th>Scanner</th>
                </tr>
              </thead>
              <tbody>
                {scans?.items.map((row) => (
                  <tr key={row.id} className="hover">
                    <td className="font-mono font-medium">{row.invoiceNumber}</td>
                    <td>
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="font-mono text-sm">{scanDuration(row)}</td>
                    <td className="text-sm">{row.scannerConfig?.label ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-6 py-4 border-t border-base-300 bg-base-200/50">
          <a href="/dashboard/scan-log" className="link link-primary text-sm font-medium">
            Lihat semua scan log →
          </a>
        </div>
      </section>

      <section className="bg-base-100 rounded-2xl shadow-sm border border-base-300 overflow-hidden">
        <div className="px-6 py-5 border-b border-base-300">
          <h2 className="text-lg md:text-xl font-bold">Status Perangkat</h2>
          <p className="text-sm text-base-content/60 mt-1">
            CCTV organisasi Anda
          </p>
        </div>
        <div className="p-6">
          <DeviceStatusPanel />
        </div>
      </section>
    </div>
  );
}

function HomeStatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "primary";
}) {
  const toneRing = {
    primary: "border-primary/20 bg-primary/5",
    success: "border-success/20 bg-success/5",
    warning: "border-warning/20 bg-warning/5",
    default: "border-base-300 bg-base-100",
  }[tone];

  const iconTone = {
    primary: "bg-primary text-primary-content",
    success: "bg-success text-success-content",
    warning: "bg-warning text-warning-content",
    default: "bg-base-300 text-base-content",
  }[tone];

  return (
    <div className={`rounded-xl border p-5 transition-shadow hover:shadow-md ${toneRing}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-base-content/70">{label}</p>
          <p className="text-2xl md:text-3xl font-bold mt-1 tabular-nums">{value}</p>
          {hint && <p className="text-xs text-base-content/50 mt-2">{hint}</p>}
        </div>
        <div className={`p-2.5 rounded-xl shrink-0 ${iconTone}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
