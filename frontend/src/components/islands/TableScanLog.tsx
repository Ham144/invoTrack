import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BuktiScanApi } from "@/api/invo-track";
import { scanDuration, scanVideoLocalOnly } from "@/lib/scan-utils";
import ScanWatchModal from "@/components/islands/ScanWatchModal";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import type { InvoiceScan, ScanStatusFilter } from "@/types/invo-track";
import {
  SlidersHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
  Filter,
} from "lucide-react";

export default function TableScanLog() {
  const qc = useQueryClient();
  const [watchScan, setWatchScan] = useState<InvoiceScan | null>(null);
  const [statusFilter, setStatusFilter] = useState<ScanStatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [, tick] = useState(0);

  // New advanced filters states
  const [operatorFilter, setOperatorFilter] = useState("ALL");
  const [workstationFilter, setWorkstationFilter] = useState("ALL");
  const [scannerFilter, setScannerFilter] = useState("ALL");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

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

  // Fetch workstations, scanners, and operators lists for filter dropdowns
  const { data: workstations } = useQuery({
    queryKey: ["workstations"],
    queryFn: async () => {
      const res = await BuktiScanApi.workstationList();
      return res.data as { id: string; label: string; isActive: boolean }[];
    },
  });

  const { data: scanners } = useQuery({
    queryKey: ["scanners", workstationFilter],
    queryFn: async () => {
      const res = await BuktiScanApi.scannerList(
        workstationFilter !== "ALL" ? workstationFilter : undefined,
      );
      return res.data as {
        id: string;
        label: string;
        workstationId?: string;
      }[];
    },
  });

  const { data: operators } = useQuery({
    queryKey: ["operators"],
    queryFn: async () => {
      const res = await BuktiScanApi.operators();
      return res.data as string[];
    },
  });

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [
      "scan-log",
      page,
      limit,
      statusFilter,
      debouncedSearch,
      operatorFilter,
      workstationFilter,
      scannerFilter,
      startDateFilter,
      endDateFilter,
    ],
    queryFn: async () => {
      const res = await BuktiScanApi.scanList({
        page,
        limit,
        status: statusFilter,
        search: debouncedSearch,
        operator: operatorFilter !== "ALL" ? operatorFilter : undefined,
        workstationId: workstationFilter,
        scannerConfigId: scannerFilter,
        startDate: startDateFilter,
        endDate: endDateFilter,
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

  // Date constraints helper change handlers
  const handleStartDateChange = (val: string) => {
    setStartDateFilter(val);
    setPage(1);
    if (endDateFilter && val > endDateFilter) {
      setEndDateFilter("");
    }
  };

  const handleEndDateChange = (val: string) => {
    setEndDateFilter(val);
    setPage(1);
  };

  const resetAllFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setOperatorFilter("ALL");
    setWorkstationFilter("ALL");
    setScannerFilter("ALL");
    setStartDateFilter("");
    setEndDateFilter("");
    setStatusFilter("ALL");
    setPage(1);
  };

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
    <div className="space-y-6 w-full justify-center">
      {isError && (
        <div className="rounded-lg border border-error bg-error/10 px-4 py-3 text-sm text-error">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p>
              Gagal memuat scan log
              {error instanceof Error && error.message
                ? `: ${error.message}`
                : ""}
            </p>
            <button
              type="button"
              className="btn btn-xs btn-ghost text-error"
              onClick={() => void refetch()}
            >
              Coba lagi
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 bg-base-100/50 p-4 rounded-xl border border-base-300/30">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
          <div className="tab-segment flex-wrap">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`tab-segment-btn ${
                  statusFilter === t.key ? "tab-segment-btn-active" : ""
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

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative w-full sm:w-72">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40 w-4 h-4" />
              <input
                className="input-field w-full pl-9 font-mono"
                placeholder="Cari invoice…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <button
              type="button"
              className={`btn btn-sm gap-2 transition-all duration-200 ${
                showAdvanced ? "btn-primary" : "btn-outline btn-primary"
              }`}
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filter</span>
              {(operatorFilter !== "ALL" ||
                workstationFilter !== "ALL" ||
                scannerFilter !== "ALL" ||
                startDateFilter ||
                endDateFilter) && (
                <span className="badge badge-xs badge-secondary rounded-full w-2 h-2 p-0 animate-pulse" />
              )}
            </button>

            {(search ||
              operatorFilter !== "ALL" ||
              workstationFilter !== "ALL" ||
              scannerFilter !== "ALL" ||
              startDateFilter ||
              endDateFilter ||
              statusFilter !== "ALL") && (
              <button
                type="button"
                className="btn btn-sm btn-ghost gap-2 text-base-content/60 hover:text-error transition-colors"
                onClick={resetAllFilters}
                title="Reset semua filter"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </div>

        {showAdvanced && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-base-300/30">
            {/* Operator Filter */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs font-semibold text-base-content/60">
                  Operator
                </span>
              </label>
              <select
                className="select select-sm select-bordered w-full font-medium"
                value={operatorFilter}
                onChange={(e) => {
                  setOperatorFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">Semua Operator</option>
                {operators?.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
            </div>

            {/* Workstation Filter */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs font-semibold text-base-content/60">
                  Kasir / Workstation
                </span>
              </label>
              <select
                className="select select-sm select-bordered w-full font-medium"
                value={workstationFilter}
                onChange={(e) => {
                  setWorkstationFilter(e.target.value);
                  setScannerFilter("ALL");
                  setPage(1);
                }}
              >
                <option value="ALL">Semua Kasir</option>
                {workstations?.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Scanner Filter */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs font-semibold text-base-content/60">
                  Alat Scanner
                </span>
              </label>
              <select
                className="select select-sm select-bordered w-full font-medium"
                value={scannerFilter}
                onChange={(e) => {
                  setScannerFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">Semua Scanner</option>
                {scanners?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Filters */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs font-semibold text-base-content/60">
                  Rentang Tanggal
                </span>
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  className="input input-sm input-bordered w-full px-2"
                  value={startDateFilter}
                  max={endDateFilter || undefined}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                />
                <span className="text-base-content/40 text-xs">s/d</span>
                <input
                  type="date"
                  className="input input-sm input-bordered w-full px-2"
                  value={endDateFilter}
                  min={startDateFilter || undefined}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="surface-card">
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
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm bg-base-100/50 p-4 rounded-xl border border-base-300/30 backdrop-blur-sm shadow-sm">
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-between md:justify-start">
          <span className="text-base-content/60 flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4 text-primary/70"
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
            <span className="font-medium text-base-content/85">{total}</span>{" "}
            records · Halaman{" "}
            <span className="font-semibold text-primary">{page}</span> dari{" "}
            {totalPages}
          </span>

          <div className="flex items-center gap-2">
            <span className="text-xs text-base-content/50">Tampilkan</span>
            <select
              className="select select-bordered select-xs w-20 font-medium"
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-xs text-base-content/50">baris</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-1.5 w-full md:w-auto justify-center">
          {/* First Page */}
          <button
            type="button"
            className="btn btn-xs sm:btn-sm btn-ghost btn-square text-base-content/70 hover:bg-primary/10 hover:text-primary transition-all"
            disabled={page <= 1}
            onClick={() => setPage(1)}
            title="Halaman Pertama"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>

          {/* Prev Page */}
          <button
            type="button"
            className="btn btn-xs sm:btn-sm btn-ghost btn-square text-base-content/70 hover:bg-primary/10 hover:text-primary transition-all"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            title="Halaman Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Page Numbers */}
          <div className="hidden sm:flex items-center gap-1">
            {pageNumbers.map((n, i) =>
              n === "..." ? (
                <span
                  key={`e-${i}`}
                  className="px-2 text-base-content/40 font-bold"
                >
                  …
                </span>
              ) : (
                <button
                  key={n}
                  type="button"
                  className={`btn btn-sm btn-square transition-all duration-200 ${
                    page === n
                      ? "btn-primary shadow-md shadow-primary/20 scale-105"
                      : "btn-ghost hover:bg-base-200/70 text-base-content/85"
                  }`}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              ),
            )}
          </div>

          {/* Mobile pagination indicator */}
          <div className="sm:hidden px-3 py-1 bg-base-200/50 rounded-lg text-xs font-semibold text-base-content/70">
            {page} / {totalPages}
          </div>

          {/* Next Page */}
          <button
            type="button"
            className="btn btn-xs sm:btn-sm btn-ghost btn-square text-base-content/70 hover:bg-primary/10 hover:text-primary transition-all"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            title="Halaman Berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Last Page */}
          <button
            type="button"
            className="btn btn-xs sm:btn-sm btn-ghost btn-square text-base-content/70 hover:bg-primary/10 hover:text-primary transition-all"
            disabled={page >= totalPages}
            onClick={() => setPage(totalPages)}
            title="Halaman Terakhir"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <ScanWatchModal scan={watchScan} onClose={() => setWatchScan(null)} />
    </div>
  );
}
