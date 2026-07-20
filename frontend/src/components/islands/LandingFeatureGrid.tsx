import { LANDING_FEATURES } from "@/lib/landing";

export default function LandingFeatureGrid() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {LANDING_FEATURES.map((feature) => (
        <div
          key={feature.title}
          className="group relative overflow-hidden rounded-[2rem] border border-slate-200/60 bg-white/60 p-8 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200/60 hover:shadow-xl hover:shadow-indigo-500/10"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          
          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 transition-all duration-300 group-hover:bg-gradient-to-br group-hover:from-indigo-500 group-hover:to-blue-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-indigo-500/30 group-hover:scale-105">
                <feature.icon className="h-6 w-6" />
              </div>
              {feature.comingSoon && (
                <span className="rounded-full border border-indigo-200/50 bg-indigo-50/50 px-3 py-1 text-xs font-semibold tracking-wide text-indigo-700 backdrop-blur-sm">
                  Segera hadir
                </span>
              )}
            </div>
            
            <h3 className="mt-6 font-bold text-lg text-slate-900 tracking-tight transition-colors group-hover:text-indigo-950">
              {feature.title}
            </h3>
            
            <p className="mt-3 text-sm font-medium text-slate-600 leading-relaxed">
              {feature.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
