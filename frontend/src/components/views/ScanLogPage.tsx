import DashboardFrame from "@/components/islands/DashboardFrame";
import LiveScanLog from "@/components/islands/LiveScanLog";
import PageHeader from "@/components/ui/PageHeader";

export default function ScanLogPage() {
  return (
    <DashboardFrame>
      <PageHeader
        title="Scan Log"
        subtitle="Audit trail semua scan invoice — durasi rekam, status, dan putar video."
      />
      <LiveScanLog />
    </DashboardFrame>
  );
}
