import type { ReactNode } from "react";
import AppProviders from "./AppProviders";
import SessionBootstrap from "./SessionBootstrap";
import DashboardShell from "./DashboardShell";

export default function DashboardFrame({ children }: { children: ReactNode }) {
  return (
    <AppProviders>
      <SessionBootstrap />
      <DashboardShell>{children}</DashboardShell>
    </AppProviders>
  );
}
