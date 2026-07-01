import type { ReactNode } from "react";
import EmptyState from "./EmptyState";

export default function DataTable({
  children,
  loading,
  empty,
  emptyTitle = "Belum ada data",
  emptyDescription,
}: {
  children: ReactNode;
  loading?: boolean;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (loading) {
    return <div className="skeleton h-48 w-full rounded-lg" />;
  }
  if (empty) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }
  return <div className="overflow-x-auto">{children}</div>;
}
