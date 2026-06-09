import type { LucideIcon } from "lucide-react";

export default function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "error" | "primary";
}) {
  const toneClass = {
    default: "text-base-content",
    success: "text-success",
    warning: "text-warning",
    error: "text-error",
    primary: "text-primary",
  }[tone];

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm">
      <div className="card-body p-5 gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-base-content/60">{label}</span>
          <Icon className={`w-5 h-5 ${toneClass} opacity-80`} />
        </div>
        <p className={`text-3xl font-bold ${toneClass}`}>{value}</p>
        {hint && <p className="text-xs text-base-content/50">{hint}</p>}
      </div>
    </div>
  );
}
