import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Camera, ClipboardList, Radio, Loader2, ExternalLink } from "lucide-react";
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
    <div className="space-y-8 animate-fade-in pb-12">
      <PageHeader
        title="Ringkasan"
        subtitle="Monitor aktivitas scan, rekam CCTV, dan status perangkat gudang."
        actions={
          <a href="/dashboard/scan-log" className="btn-primary-soft">
            Scan Log
          </a>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
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
            <h2 className="section-title text-amber-600 flex items-center gap-2">
              <Radio className="h-4 w-4 animate-pulse" />
              Rekam aktif
            </h2>
            <p className="section-desc">Invoice yang sedang direkam secara real-time</p>
          </div>
          <div className="surface-card-body">
            <ActiveRecordingsPanel />
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <section className="surface-card xl:col-span-2 flex flex-col">
          <div className="section-head flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="section-title">Scan terbaru</h2>
              <p className="section-desc">5 entri terakhir (refresh 30s)</p>
            </div>
            <a
              href="/dashboard/scan-log"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
            >
              Lihat semua <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="flex-1 p-0 overflow-x-auto">
            {scansLoading ? (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : (scans?.items.length ?? 0) === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center text-center text-slate-500">
                <ClipboardList className="h-8 w-8 mb-3 opacity-20" />
                <p className="text-sm">Belum ada scan. Gunakan BuktiScan Agent di PC kasir.</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50/50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-slate-600">Invoice</th>
                    <th className="px-6 py-3 font-semibold text-slate-600">Status</th>
                    <th className="px-6 py-3 font-semibold text-slate-600">Durasi</th>
                    <th className="px-6 py-3 font-semibold text-slate-600">Scanner</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {scans?.items.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-3 font-mono text-sm font-medium text-slate-900">
                        {row.invoiceNumber}
                      </td>
                      <td className="px-6 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-6 py-3 font-mono text-sm text-slate-500">
                        {scanDuration(row)}
                      </td>
                      <td className="px-6 py-3 text-slate-500">
                        {row.scannerConfig?.label ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="surface-card flex flex-col">
          <div className="section-head">
            <h2 className="section-title">Status CCTV</h2>
            <p className="section-desc">Ketersediaan kamera</p>
          </div>
          <div className="surface-card-body flex-1 bg-slate-50/30">
            <DeviceStatusPanel />
          </div>
        </section>
      </div>
    </div>
  );
}
