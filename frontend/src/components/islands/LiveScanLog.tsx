import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { InvoTrackApi } from "@/api/invo-track";
import { scanDuration } from "@/lib/scan-utils";
import ScanWatchModal from "@/components/islands/ScanWatchModal";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import type { InvoiceScan, ScanStatusFilter } from "@/types/invo-track";

export default function LiveScanLog() {
  const qc = useQueryClient();
  const [watchScan, setWatchScan] = useState<InvoiceScan | null>(null);
  const [statusFilter, setStatusFilter] = useState<ScanStatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;
  const [, tick] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim().toUpperCase());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["scan-log", page, limit, statusFilter, debouncedSearch],
    queryFn: async () => {
      const res = await InvoTrackApi.scanList({
        page,
        limit,
        status: statusFilter,
        search: debouncedSearch,
      });
      return res.data as {
        items: InvoiceScan[];
        total: number;
        page: number;
        limit: number;
      };
    },
  });

  useEffect(() => {
    const handler = () => qc.invalidateQueries({ queryKey: ["scan-log"] });
    window.addEventListener("scan-log-update", handler);
    return () => window.removeEventListener("scan-log-update", handler);
  }, [qc]);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const tabs: { key: ScanStatusFilter; label: string }[] = [
    { key: "ALL", label: "Semua" },
    { key: "RECORDING", label: "Merekam" },
    { key: "COMPLETED", label: "Selesai" },
    { key: "FAILED", label: "Gagal" },
  ];

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
    .reduce<(number | "...")[]>((acc, n, i, arr) => {
      if (i > 0 && n - (arr[i - 1] as number) > 1) acc.push("...");
      acc.push(n);
      return acc;
    }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`btn btn-sm ${statusFilter === t.key ? "btn-primary" : "btn-ghost"}`}
              onClick={() => {
                setStatusFilter(t.key);
                setPage(1);
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          className="input input-bordered input-sm w-full sm:w-72 font-mono"
          placeholder="Cari invoice..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <DataTable loading={isLoading} empty={!isLoading && items.length === 0}>
        <table className="table table-sm">
          <thead className="bg-base-200">
            <tr>
              <th>Invoice</th>
              <th>Waktu</th>
              <th>Scanner</th>
              <th>CCTV</th>
              <th>Operator</th>
              <th>Status</th>
              <th>Durasi</th>
              <th>Sebelumnya</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id} className="hover">
                <td className="font-mono font-semibold">{row.invoiceNumber}</td>
                <td className="text-sm whitespace-nowrap">
                  {new Date(row.scannedAt).toLocaleString("id-ID")}
                </td>
                <td className="text-sm">{row.scannerConfig?.label ?? "—"}</td>
                <td className="text-sm">{row.cctvConfig?.label ?? "—"}</td>
                <td className="text-sm">{row.scannedByUsername ?? "—"}</td>
                <td>
                  <StatusBadge status={row.status} />
                </td>
                <td className="font-mono text-xs">{scanDuration(row)}</td>
                <td className="font-mono text-xs">
                  {row.previousInvoice ?? "—"}
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn-xs btn-outline btn-primary"
                    onClick={() => setWatchScan(row)}
                  >
                    Putar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataTable>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
        <span className="text-base-content/60">
          {total} record · halaman {page} dari {totalPages}
        </span>
        <div className="join">
          <button
            type="button"
            className="btn btn-sm join-item"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ‹
          </button>
          {pageNumbers.map((n, i) =>
            n === "..." ? (
              <span key={`e-${i}`} className="btn btn-sm join-item btn-disabled">
                …
              </span>
            ) : (
              <button
                key={n}
                type="button"
                className={`btn btn-sm join-item ${page === n ? "btn-active" : ""}`}
                onClick={() => setPage(n)}
              >
                {n}
              </button>
            ),
          )}
          <button
            type="button"
            className="btn btn-sm join-item"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            ›
          </button>
        </div>
      </div>

      <ScanWatchModal scan={watchScan} onClose={() => setWatchScan(null)} />
    </div>
  );
}
