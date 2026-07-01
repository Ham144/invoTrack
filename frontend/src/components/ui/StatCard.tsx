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
  const toneAccent = {
    default: "border-t-base-300",
    primary: "border-t-primary",
    success: "border-t-success",
    warning: "border-t-warning",
    error: "border-t-error",
  }[tone];

  const iconWrap = {
    default: "bg-base-200 text-base-content/70",
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    error: "bg-error/10 text-error",
  }[tone];

  return (
    <div className={`surface-card border-t-[3px] ${toneAccent}`}>
      <div className="p-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium muted">{label}</p>
          <p className="text-2xl md:text-[1.75rem] font-semibold mt-1 tabular-nums tracking-tight text-base-content">
            {value}
          </p>
          {hint && (
            <p className="text-xs muted mt-2 leading-relaxed">{hint}</p>
          )}
        </div>
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconWrap}`}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
