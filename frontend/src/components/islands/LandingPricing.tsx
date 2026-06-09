import { Check, MessageCircle } from "lucide-react";
import { LANDING_PLANS, whatsappConsultUrl } from "@/lib/landing";
import { landingBtn } from "@/lib/landing-ui";

export default function LandingPricing() {
  return (
    <div>
      <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
        {LANDING_PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`rounded-2xl border bg-white p-6 shadow-sm transition-shadow ${
              plan.highlighted
                ? "border-blue-300 ring-2 ring-blue-500/20 lg:scale-[1.02] shadow-md"
                : "border-slate-200 hover:shadow-md"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-xl text-slate-900">{plan.name}</h3>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  plan.highlighted
                    ? "bg-blue-600 text-white"
                    : "border border-slate-200 bg-slate-50 text-slate-600"
                }`}
              >
                {plan.badge}
              </span>
            </div>
            <ul className="mt-6 space-y-3">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2.5 items-center text-sm">
                  <Check className="h-4 w-4 text-blue-600 shrink-0" />
                  <span className="text-slate-700">{feature}</span>
                </li>
              ))}
            </ul>
            <a
              href={whatsappConsultUrl(plan.ctaMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-8 flex w-full ${
                plan.ctaPrimary ? landingBtn.primary : landingBtn.ghostNav
              }`}
            >
              <MessageCircle className="h-4 w-4 shrink-0" />
              {plan.ctaLabel}
            </a>
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-slate-500 mt-8">
        Harga dan penawaran khusus via konsultasi
      </p>
    </div>
  );
}
