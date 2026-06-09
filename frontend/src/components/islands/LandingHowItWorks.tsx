import { HOW_IT_WORKS_STEPS } from "@/lib/landing";

export default function LandingHowItWorks() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {HOW_IT_WORKS_STEPS.map((item, idx) => (
        <div
          key={item.step}
          className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          {idx < HOW_IT_WORKS_STEPS.length - 1 && (
            <div className="hidden lg:block absolute top-10 -right-3 w-6 h-px bg-slate-200 z-10" />
          )}
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-sm">
            {item.step}
          </div>
          <h3 className="mt-4 font-semibold text-slate-900">{item.title}</h3>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            {item.description}
          </p>
        </div>
      ))}
    </div>
  );
}
