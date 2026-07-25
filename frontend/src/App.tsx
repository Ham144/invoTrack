import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ROLE } from "@/types/auth";
import SessionBootstrap from "@/components/islands/SessionBootstrap";
import AuthGuard from "@/components/AuthGuard";
import IndexPage from "@/components/islands/IndexPage";
import DashboardHomePage from "@/components/views/DashboardHomePage";
import DevicesPage from "@/components/views/DevicesPage";
import DocsPage from "@/components/views/DocsPage";
import ScanLogPage from "@/components/views/ScanLogPage";
import OrganizationAdminPage from "@/components/views/OrganizationAdminPage";
import MembersAdminPage from "@/components/views/MembersAdminPage";
import ForbiddenPage from "@/components/views/ForbiddenPage";

export default function App() {
  return (
    <BrowserRouter>
      <SessionBootstrap />
      <Routes>
        {/* Public Route */}
        <Route path="/" element={<IndexPage />} />
        
        {/* Error Route */}
        <Route path="/forbidden" element={<ForbiddenPage />} />

        {/* Protected Dashboard Routes (All authenticated users) */}
        <Route
          element={
            <AuthGuard
              allowedRoles={[
                ROLE.SUPERTENANT,
                ROLE.ADMIN_ORGANIZATION,
                ROLE.ADMIN_GUDANG,
                ROLE.OPERATOR,
              ]}
            />
          }
        >
          <Route path="/dashboard" element={<DashboardHomePage />} />
          <Route path="/dashboard/devices" element={<DevicesPage />} />
          <Route path="/dashboard/docs" element={<DocsPage />} />
          <Route path="/dashboard/scan-log" element={<ScanLogPage />} />
          <Route path="/dashboard/scan" element={<Navigate to="/dashboard/devices?tab=scanners" replace />} />
          <Route path="/dashboard/proof" element={<Navigate to="/dashboard/scan-log" replace />} />
          <Route path="/dashboard/settings" element={<Navigate to="/dashboard/devices" replace />} />
        </Route>

        {/* Protected Admin Routes (Only Supertenant and Admin Org) */}
        <Route
          element={
            <AuthGuard
              allowedRoles={[ROLE.SUPERTENANT, ROLE.ADMIN_ORGANIZATION]}
            />
          }
        >
          <Route path="/admin/organization" element={<OrganizationAdminPage />} />
          <Route path="/admin/members" element={<MembersAdminPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
