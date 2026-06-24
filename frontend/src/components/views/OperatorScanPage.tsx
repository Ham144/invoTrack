import DashboardFrame from "@/components/islands/DashboardFrame";
import OperatorScanPanel from "@/components/islands/OperatorScanPanel";
import PageHeader from "@/components/ui/PageHeader";

export default function OperatorScanPage() {
  return (
    <DashboardFrame>
      <PageHeader
        title="BuktiScan Agent"
        subtitle="Atur pairing dan status agent desktop di PC kasir. Scan barcode, preview CCTV, dan pair USB dilakukan di aplikasi agent — bukan di sini."
      />
      <OperatorScanPanel />
    </DashboardFrame>
  );
}
