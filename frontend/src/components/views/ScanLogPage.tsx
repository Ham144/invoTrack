import DashboardFrame from "@/components/islands/DashboardFrame";
import TableScanLog from "@/components/islands/TableScanLog";
import PageHeader from "@/components/ui/PageHeader";

export default function ScanLogPage() {
  return (
    <DashboardFrame>
      <PageHeader
        title="Scan Log"
        subtitle="Metadata scan dari cloud — video lokal disinkronkan oleh agent di PC kasir."
      />
      <TableScanLog />
    </DashboardFrame>
  );
}
