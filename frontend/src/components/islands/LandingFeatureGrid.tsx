import { LANDING_FEATURES } from "@/lib/landing";

export default function LandingFeatureGrid() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {LANDING_FEATURES.map((feature) => (
        <div
          key={feature.title}
          className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-100">
              <feature.icon className="h-5 w-5" />
            </div>
            {feature.comingSoon && (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                Segera hadir
              </span>
            )}
          </div>
          <h3 className="mt-4 font-semibold text-slate-900">{feature.title}</h3>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            {feature.description}
          </p>
        </div>
      ))}
    </div>
  );
}
