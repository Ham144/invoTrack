import type { ReactNode } from "react";

export default function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center border border-dashed border-base-300 rounded-xl bg-base-200/40">
      <p className="font-semibold text-lg">{title}</p>
      {description && (
        <p className="text-sm text-base-content/60 mt-2 max-w-md">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
