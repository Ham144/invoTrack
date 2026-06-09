import DashboardFrame from "@/components/islands/DashboardFrame";
import OrgSwitcher from "@/components/islands/OrgSwitcher";
import PageHeader from "@/components/ui/PageHeader";

export default function OrganizationAdminPage() {
  return (
    <DashboardFrame>
      <PageHeader
        title="Organisasi"
        subtitle="Ganti organisasi aktif atau kelola tenant multi-gudang."
      />
      <OrgSwitcher />
    </DashboardFrame>
  );
}
