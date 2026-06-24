import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BuktiScanApi } from "@/api/invo-track";
import { scanDuration, scanVideoLocalOnly } from "@/lib/scan-utils";
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

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["scan-log", page, limit, statusFilter, debouncedSearch],
    queryFn: async () => {
      const res = await BuktiScanApi.scanList({
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
    refetchInterval: 10_000,
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
    <div className="space-y-6">
      {/* Alert Info dengan desain lebih menarik */}
      <div className="alert alert-info py-3 px-4 text-sm bg-gradient-to-r from-info/10 to-info/5 border border-info/20 rounded-xl shadow-sm">
        <div className="flex items-start gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5 text-info shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-info-content/90 leading-relaxed">
            Daftar scan dari database cloud. File MP4 di{" "}
            <span className="font-mono bg-info/20 px-1.5 py-0.5 rounded text-info-content font-semibold">
              D:\BuktiScan\clips
            </span>{" "}
            otomatis disinkronkan saat agent jalan. Putar video hanya di PC
            kasir (agent localhost:19500).
          </p>
        </div>
      </div>

      {/* Error Alert dengan desain lebih baik */}
      {isError && (
        <div className="alert alert-error py-3 px-4 text-sm bg-gradient-to-r from-error/10 to-error/5 border border-error/20 rounded-xl shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 w-full">
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 text-error shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <p className="text-error-content/90">
                Gagal memuat scan log
                {error instanceof Error && error.message
                  ? `: ${error.message}`
                  : ""}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-xs btn-ghost text-error-content hover:bg-error/20"
              onClick={() => void refetch()}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-3.5 h-3.5 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Coba lagi
            </button>
          </div>
        </div>
      )}

      {/* Filter & Search dengan desain lebih baik */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between bg-base-100/50 p-4 rounded-xl border border-base-300/30 backdrop-blur-sm">
        <div className="flex flex-wrap gap-1.5 justify-center">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`btn btn-sm min-w-[70px] px-3 rounded-lg transition-all duration-200 ${
                statusFilter === t.key
                  ? "btn-primary shadow-md shadow-primary/20"
                  : "btn-ghost hover:bg-base-200/70"
              }`}
              onClick={() => {
                setStatusFilter(t.key);
                setPage(1);
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            className="input input-sm w-full pl-9 font-mono rounded-lg border-base-300/50 bg-base-100/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 placeholder:text-base-content/30"
            placeholder="Cari invoice..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Data Table dengan desain lebih baik */}
      <div className="bg-base-100/50 rounded-xl border border-base-300/30 backdrop-blur-sm overflow-hidden">
        <DataTable
          loading={isLoading}
          empty={!isLoading && !isError && items.length === 0}
          emptyTitle="Belum ada scan"
          emptyDescription="Scan via BuktiScan Agent di PC kasir. File .mp4 di folder klip akan muncul di sini setelah agent sinkron (heartbeat). Pastikan agent paired dan backend jalan."
        >
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead className="bg-base-200/50">
                <tr>
                  <th className="text-xs uppercase tracking-wider text-base-content/50">
                    Invoice
                  </th>
                  <th className="text-xs uppercase tracking-wider text-base-content/50">
                    Waktu
                  </th>
                  <th className="text-xs uppercase tracking-wider text-base-content/50">
                    Scanner
                  </th>
                  <th className="text-xs uppercase tracking-wider text-base-content/50">
                    CCTV
                  </th>
                  <th className="text-xs uppercase tracking-wider text-base-content/50">
                    Operator
                  </th>
                  <th className="text-xs uppercase tracking-wider text-base-content/50">
                    Status
                  </th>
                  <th className="text-xs uppercase tracking-wider text-base-content/50">
                    Durasi
                  </th>
                  <th className="text-xs uppercase tracking-wider text-base-content/50">
                    Sebelumnya
                  </th>
                  <th className="text-xs uppercase tracking-wider text-base-content/50">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-base-200/30 transition-colors duration-150"
                  >
                    {/* Invoice dengan truncate dan tooltip */}
                    <td>
                      <div className="flex items-center gap-2 group">
                        <span
                          className="font-mono font-semibold text-sm truncate max-w-[120px] md:max-w-[180px] block"
                          title={row.invoiceNumber}
                        >
                          {row.invoiceNumber}
                        </span>
                        {row.invoiceNumber.length > 15 && (
                          <span className="badge badge-xs badge-ghost opacity-0 group-hover:opacity-100 transition-opacity">
                            {row.invoiceNumber.length}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-sm whitespace-nowrap text-base-content/70">
                      {new Date(row.scannedAt).toLocaleString("id-ID")}
                    </td>
                    <td className="text-sm text-base-content/70">
                      <span className="inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                        {row.scannerConfig?.label ?? "—"}
                      </span>
                    </td>
                    <td className="text-sm text-base-content/70">
                      <span className="inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-info/40" />
                        {row.cctvConfig?.label ?? "—"}
                      </span>
                    </td>
                    <td className="text-sm text-base-content/70">
                      {row.scannedByUsername ?? "—"}
                    </td>
                    <td>
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="font-mono text-xs text-base-content/60">
                      {scanDuration(row)}
                    </td>
                    <td
                      className="font-mono text-xs text-base-content/60 max-w-[100px] truncate"
                      title={row.previousInvoice ?? "—"}
                    >
                      {row.previousInvoice ?? "—"}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-xs btn-ghost btn-primary hover:bg-primary/10 hover:scale-105 transition-all duration-200"
                        onClick={() => setWatchScan(row)}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        {scanVideoLocalOnly(row) ? "Putar lokal" : "Putar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DataTable>
      </div>

      {/* Pagination dengan desain lebih baik */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm bg-base-100/50 p-3 rounded-xl border border-base-300/30 backdrop-blur-sm">
        <span className="text-base-content/60 flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          {total} record · halaman {page} dari {totalPages}
        </span>
        <div className="join">
          <button
            type="button"
            className="btn btn-sm join-item btn-ghost hover:bg-primary/10"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ‹
          </button>
          {pageNumbers.map((n, i) =>
            n === "..." ? (
              <span
                key={`e-${i}`}
                className="btn btn-sm join-item btn-disabled border-none"
              >
                …
              </span>
            ) : (
              <button
                key={n}
                type="button"
                className={`btn btn-sm join-item transition-all duration-200 ${
                  page === n
                    ? "btn-primary shadow-md shadow-primary/20 scale-105"
                    : "btn-ghost hover:bg-base-200/70"
                }`}
                onClick={() => setPage(n)}
              >
                {n}
              </button>
            ),
          )}
          <button
            type="button"
            className="btn btn-sm join-item btn-ghost hover:bg-primary/10"
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
