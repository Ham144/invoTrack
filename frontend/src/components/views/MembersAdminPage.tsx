import DashboardFrame from "@/components/islands/DashboardFrame";
import MembersPanel from "@/components/islands/MembersPanel";
import PageHeader from "@/components/ui/PageHeader";

export default function MembersAdminPage() {
  return (
    <DashboardFrame>
      <PageHeader
        title="Anggota"
        subtitle="Kelola akun operator, assign CCTV, dan hak akses organisasi."
      />
      <MembersPanel />
    </DashboardFrame>
  );
}
