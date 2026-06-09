import DashboardFrame from "@/components/islands/DashboardFrame";
import OperatorScanPanel from "@/components/islands/OperatorScanPanel";
import PageHeader from "@/components/ui/PageHeader";

export default function OperatorScanPage() {
  return (
    <DashboardFrame>
      <PageHeader
        title="Scan Invoice"
        subtitle="Scan barcode invoice untuk memulai atau melanjutkan rekam CCTV packing."
      />
      <OperatorScanPanel />
    </DashboardFrame>
  );
}
