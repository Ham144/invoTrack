import { HOW_IT_WORKS_STEPS } from "@/lib/landing";

export default function LandingHowItWorks() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 relative">
      {HOW_IT_WORKS_STEPS.map((item, idx) => (
        <div
          key={item.step}
          className="group relative overflow-hidden rounded-[2rem] border border-slate-200/60 bg-white/60 p-8 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-sky-200/60 hover:shadow-xl hover:shadow-sky-500/10"
        >
          {idx < HOW_IT_WORKS_STEPS.length - 1 && (
            <div className="hidden lg:block absolute top-[4.5rem] -right-4 w-8 h-[2px] bg-gradient-to-r from-sky-200 to-transparent z-10" />
          )}
          
          <div className="absolute inset-0 bg-gradient-to-br from-sky-50/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-lg font-bold text-white shadow-lg shadow-sky-500/30 transition-transform duration-300 group-hover:scale-110">
              {item.step}
            </div>
            
            <h3 className="mt-6 font-bold text-lg text-slate-900 tracking-tight transition-colors group-hover:text-sky-950">
              {item.title}
            </h3>
            
            <p className="mt-3 text-sm font-medium text-slate-600 leading-relaxed">
              {item.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
