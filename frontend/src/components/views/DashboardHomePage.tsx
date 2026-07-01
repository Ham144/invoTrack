import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Camera, ClipboardList, Radio } from "lucide-react";
import DashboardFrame from "@/components/islands/DashboardFrame";
import ActiveRecordingsPanel from "@/components/islands/ActiveRecordingsPanel";
import DeviceStatusPanel from "@/components/islands/DeviceStatusPanel";
import StatusBadge from "@/components/ui/StatusBadge";
import StatCard from "@/components/ui/StatCard";
import PageHeader from "@/components/ui/PageHeader";
import { BuktiScanApi } from "@/api/invo-track";
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
      const res = await BuktiScanApi.deviceStatus();
      return res.data as { cctv: { isOnline: boolean }[] };
    },
  });

  const { data: scans, isLoading: scansLoading } = useQuery({
    queryKey: ["dashboard-summary", "recent-scans"],
    queryFn: async () => {
      const res = await BuktiScanApi.scanList({ page: 1, limit: 5 });
      return res.data as { items: InvoiceScan[]; total: number };
    },
    refetchInterval: 30000,
  });

  const { data: active = [] } = useQuery({
    queryKey: ["active-recordings"],
    queryFn: async () => {
      const res = await BuktiScanApi.activeRecordings();
      return res.data as { invoiceNumber: string }[];
    },
    refetchInterval: 5000,
  });

  const cctvTotal = devices?.cctv.length ?? 0;
  const cctvOnline = devices?.cctv.filter((c) => c.isOnline).length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ringkasan"
        subtitle="Monitor aktivitas scan, rekam CCTV, dan status perangkat gudang."
        actions={
          <a href="/dashboard/scan-log" className="btn-primary-soft">
            Scan Log
          </a>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Scan hari ini"
          value={statsLoading ? "…" : (stats?.totalScansToday ?? "—")}
          icon={ClipboardList}
          tone="primary"
        />
        <StatCard
          label="Sedang merekam"
          value={active.length}
          hint="Invoice aktif"
          icon={Radio}
          tone={active.length > 0 ? "warning" : "default"}
        />
        <StatCard
          label="CCTV online"
          value={devices ? `${cctvOnline}/${cctvTotal}` : "…"}
          icon={Camera}
          tone="success"
        />
      </div>

      {active.length > 0 && (
        <section className="surface-card">
          <div className="section-head">
            <h2 className="section-title">Rekam aktif</h2>
            <p className="section-desc">Invoice yang sedang direkam</p>
          </div>
          <div className="surface-card-body pt-4">
            <ActiveRecordingsPanel />
          </div>
        </section>
      )}

      <section className="surface-card">
        <div className="section-head flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="section-title">Scan terbaru</h2>
            <p className="section-desc">5 entri terakhir · refresh 30 detik</p>
          </div>
          <a
            href="/dashboard/scan-log"
            className="text-sm font-medium text-primary hover:underline"
          >
            Lihat semua
          </a>
        </div>

        {scansLoading ? (
          <div className="p-10 flex justify-center">
            <span className="loading loading-spinner loading-md text-primary" />
          </div>
        ) : (scans?.items.length ?? 0) === 0 ? (
          <div className="p-12 text-center text-base-content/50 text-sm">
            Belum ada scan. Gunakan BuktiScan Agent di PC kasir.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr className="border-b border-base-300 text-base-content/50">
                  <th className="font-medium">Invoice</th>
                  <th className="font-medium">Status</th>
                  <th className="font-medium">Durasi</th>
                  <th className="font-medium">Scanner</th>
                </tr>
              </thead>
              <tbody>
                {scans?.items.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-base-300/50 last:border-0"
                  >
                    <td className="font-mono text-sm font-medium">
                      {row.invoiceNumber}
                    </td>
                    <td>
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="font-mono text-sm text-base-content/70">
                      {scanDuration(row)}
                    </td>
                    <td className="text-sm text-base-content/70">
                      {row.scannerConfig?.label ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="surface-card">
        <div className="section-head">
          <h2 className="section-title">Status CCTV</h2>
          <p className="section-desc">Ketersediaan kamera organisasi</p>
        </div>
        <div className="surface-card-body pt-4">
          <DeviceStatusPanel />
        </div>
      </section>
    </div>
  );
}
