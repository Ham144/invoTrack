import DashboardFrame from "@/components/islands/DashboardFrame";
import PageHeader from "@/components/ui/PageHeader";
import MemberManagementTable from "@/components/islands/MemberManagementTable.tsx";

export default function MembersAdminPage() {
  return (
    <DashboardFrame>
      <PageHeader
        title="Anggota"
        subtitle="Kelola akun operator, assign CCTV, dan hak akses organisasi."
      />
      <MemberManagementTable />
    </DashboardFrame>
  );
}
