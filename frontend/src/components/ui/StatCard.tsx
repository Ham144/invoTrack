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
    default: "border-t-slate-200",
    primary: "border-t-blue-500",
    success: "border-t-emerald-500",
    warning: "border-t-amber-500",
    error: "border-t-red-500",
  }[tone];

  const iconWrap = {
    default: "bg-slate-100 text-slate-500",
    primary: "bg-blue-50 text-blue-600",
    success: "bg-emerald-50 text-emerald-600",
    warning: "bg-amber-50 text-amber-600",
    error: "bg-red-50 text-red-600",
  }[tone];

  return (
    <div className={`surface-card border-t-[3px] ${toneAccent}`}>
      <div className="p-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="text-2xl md:text-3xl font-bold mt-1.5 tabular-nums tracking-tight text-slate-900">
            {value}
          </p>
          {hint && (
            <p className="text-xs text-slate-400 mt-2 leading-relaxed font-medium">{hint}</p>
          )}
        </div>
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconWrap}`}
        >
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
