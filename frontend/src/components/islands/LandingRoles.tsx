import { Check } from "lucide-react";
import { LANDING_ROLES } from "@/lib/landing";

export default function LandingRoles() {
  return (
    <div className="grid gap-8 md:grid-cols-3">
      {LANDING_ROLES.map((role) => (
        <div
          key={role.title}
          className="group relative overflow-hidden rounded-[2rem] border border-slate-200/60 bg-white/60 p-8 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:border-blue-200/60 hover:shadow-2xl hover:shadow-blue-500/10"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          
          <div className="relative">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30 transition-transform duration-300 group-hover:scale-110">
              <role.icon className="h-6 w-6" />
            </div>
            
            <h3 className="mt-6 font-bold text-xl text-slate-900 tracking-tight">
              {role.title}
            </h3>
            
            <p className="mt-3 text-sm text-slate-600 leading-relaxed font-medium">
              {role.description}
            </p>
            
            <div className="mt-6 border-t border-slate-100/80 pt-6">
              <ul className="space-y-3">
                {role.capabilities.map((cap) => (
                  <li key={cap} className="flex gap-3 items-start text-sm group/item">
                    <div className="rounded-full bg-blue-50 p-1 transition-colors group-hover/item:bg-blue-100 mt-0.5">
                      <Check className="h-3 w-3 text-blue-600" />
                    </div>
                    <span className="text-slate-600 font-medium group-hover/item:text-slate-900 transition-colors">
                      {cap}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
