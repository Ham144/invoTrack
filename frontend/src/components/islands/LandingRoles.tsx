import { Check } from "lucide-react";
import { LANDING_ROLES } from "@/lib/landing";

export default function LandingRoles() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {LANDING_ROLES.map((role) => (
        <div
          key={role.title}
          className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-100">
            <role.icon className="h-6 w-6" />
          </div>
          <h3 className="mt-4 font-semibold text-lg text-slate-900">
            {role.title}
          </h3>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            {role.description}
          </p>
          <ul className="mt-5 space-y-2.5 border-t border-slate-100 pt-5">
            {role.capabilities.map((cap) => (
              <li key={cap} className="flex gap-2 items-start text-sm">
                <Check className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <span className="text-slate-700">{cap}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
