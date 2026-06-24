import { useState } from "react";
import { CheckCircle2, LogIn, MessageCircle } from "lucide-react";
import AppProviders from "./AppProviders";
import LandingFeatureGrid from "./LandingFeatureGrid";
import LandingHowItWorks from "./LandingHowItWorks";
import LandingPricing from "./LandingPricing";
import LandingRoles from "./LandingRoles";
import LandingStats from "./LandingStats";
import LoginModal from "./LoginModal";
import {
  HERO_PILLS,
  LANDING_BENEFITS,
  whatsappConsultUrl,
} from "@/lib/landing";
import { landingBadge, landingBtn } from "@/lib/landing-ui";

function ConsultButton({
  className = "",
  size = "sm",
}: {
  className?: string;
  size?: "sm" | "lg";
}) {
  const cls = size === "lg" ? landingBtn.outlineLightLg : landingBtn.ghostNav;
  return (
    <a
      href={whatsappConsultUrl()}
      target="_blank"
      rel="noopener noreferrer"
      className={`${cls} ${className}`}
    >
      <MessageCircle className="h-4 w-4 shrink-0" />
      Konsultasi
    </a>
  );
}

function SectionHeader({
  id,
  title,
  subtitle,
}: {
  id?: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="text-center max-w-2xl mx-auto mb-12">
      <h2
        id={id}
        className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight"
      >
        {title}
      </h2>
      <p className="mt-3 text-slate-600 leading-relaxed">{subtitle}</p>
    </div>
  );
}

export default function IndexPage() {
  const [loginOpen, setLoginOpen] = useState(false);
  const brand = "BuktiScan";

  return (
    <AppProviders>
      <div className="min-h-screen bg-slate-50">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            <a
              href="/"
              className="font-bold text-lg text-slate-900 tracking-tight shrink-0"
            >
              {brand}
            </a>
            <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600">
              <a
                href="#fitur"
                className="hover:text-blue-600 transition-colors"
              >
                Fitur
              </a>
              <a
                href="#peran"
                className="hover:text-blue-600 transition-colors"
              >
                Peran
              </a>
              <a
                href="#cara-kerja"
                className="hover:text-blue-600 transition-colors"
              >
                Cara Kerja
              </a>
              <a
                href="#paket"
                className="hover:text-blue-600 transition-colors"
              >
                Paket
              </a>
              <a
                href="#konsultasi"
                className="hover:text-blue-600 transition-colors"
              >
                Konsultasi
              </a>
            </nav>
            <div className="flex items-center gap-2 shrink-0">
              {/* <ConsultButton className="hidden sm:inline-flex" /> */}
              <button
                type="button"
                className={landingBtn.primarySm}
                onClick={() => setLoginOpen(true)}
              >
                <LogIn className="h-4 w-4 shrink-0" />
                Masuk
              </button>
            </div>
          </div>
        </header>

        <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(96,165,250,0.15),_transparent_50%)]" />
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-16 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="relative max-w-6xl mx-auto px-6 lg:px-8 py-20 lg:py-28">
            <div className="flex flex-col lg:flex-row gap-14 items-center">
              <div className="flex-1 text-center lg:text-left">
                <span className={landingBadge.hero}>
                  IoT Scan Invoice · On-Premise
                </span>
                <h1 className="mt-5 text-4xl lg:text-[2.75rem] font-bold text-white leading-[1.15] tracking-tight">
                  Scan invoice,
                  <br />
                  CCTV otomatis merekam
                </h1>
                <p className="mt-6 text-lg text-slate-300 max-w-xl leading-relaxed">
                  {brand} menghubungkan scanner barcode, operator, dan CCTV
                  gudang Anda. Multi-scanner di satu PC kasir, audit per
                  transaksi, tanpa rekaman manual.
                </p>
                <div className="mt-5 flex flex-wrap gap-2 justify-center lg:justify-start">
                  {HERO_PILLS.map((pill) => (
                    <span key={pill} className={landingBadge.pill}>
                      {pill}
                    </span>
                  ))}
                </div>
                <div className="mt-9 flex flex-wrap gap-3 justify-center lg:justify-start">
                  <button
                    type="button"
                    className={landingBtn.solidLightLg}
                    onClick={() => setLoginOpen(true)}
                  >
                    <LogIn className="h-5 w-5 shrink-0" />
                    Masuk ke dashboard
                  </button>
                  {/* <a
                    href={whatsappConsultUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={landingBtn.outlineLightLg}
                  >
                    <MessageCircle className="h-5 w-5 shrink-0" />
                    Konsultasi
                  </a> */}
                </div>
              </div>
              <div className="flex-1 w-full max-w-md lg:max-w-lg">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-1 backdrop-blur-sm shadow-2xl">
                  <div className="rounded-xl bg-white p-5 shadow-inner">
                    <p className="text-xs font-semibold text-slate-500 mb-4 uppercase tracking-wider">
                      Aktivitas sistem
                    </p>
                    <LandingStats />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 lg:py-24 bg-white">
          <div className="max-w-6xl mx-auto px-6 lg:px-8">
            <SectionHeader
              id="fitur"
              title="Fitur unggulan"
              subtitle="Semua yang dibutuhkan gudang modern untuk bukti visual per transaksi — dari scan hingga audit."
            />
            <LandingFeatureGrid />
          </div>
        </section>

        <section className="py-20 lg:py-24 bg-slate-50 border-y border-slate-100">
          <div className="max-w-6xl mx-auto px-6 lg:px-8">
            <SectionHeader
              id="peran"
              title="Peran pengguna"
              subtitle="Setiap role punya akses yang jelas — dari setup admin hingga scan operator di lapangan."
            />
            <LandingRoles />
          </div>
        </section>

        <section className="py-20 lg:py-24 bg-white">
          <div className="max-w-6xl mx-auto px-6 lg:px-8">
            <SectionHeader
              id="cara-kerja"
              title="Cara kerja"
              subtitle="Dari setup admin hingga scan di lapangan — empat langkah sederhana."
            />
            <LandingHowItWorks />
          </div>
        </section>

        {/* <section className="py-20 lg:py-24 bg-slate-50 border-y border-slate-100">
          <div className="max-w-6xl mx-auto px-6 lg:px-8">
            <SectionHeader
              id="paket"
              title="Paket berlangganan"
              subtitle="Pilih paket sesuai skala gudang Anda. Hubungi kami untuk detail dan penawaran."
            />
            <LandingPricing />
          </div>
        </section> */}

        <section className="py-20 lg:py-24 bg-white">
          <div className="max-w-6xl mx-auto px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
                  Kenapa {brand}?
                </h2>
                <p className="mt-4 text-slate-600 leading-relaxed">
                  Dirancang untuk operasional gudang nyata — banyak operator,
                  satu PC kasir, dan kebutuhan bukti yang bisa
                  dipertanggungjawabkan.
                </p>
              </div>
              <ul className="space-y-4">
                {LANDING_BENEFITS.map((benefit) => (
                  <li key={benefit} className="flex gap-3 items-start">
                    <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-700 leading-relaxed">
                      {benefit}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section
          id="konsultasi"
          className="py-20 lg:py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
        >
          <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
            <h2 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
              Siap tingkatkan audit gudang Anda?
            </h2>
            <p className="mt-4 text-slate-400 leading-relaxed max-w-xl mx-auto">
              Tanya paket, demo setup multi-scanner, atau konsultasi deploy
              on-premise. Tim kami siap membantu.
            </p>
            <div className="mt-10 flex flex-wrap gap-4 justify-center">
              {/* <a
                href={whatsappConsultUrl(
                  "Halo, saya tertarik demo BuktiScan untuk gudang kami.",
                )}
                target="_blank"
                rel="noopener noreferrer"
                className={landingBtn.onDarkOutline}
              >
                <MessageCircle className="h-5 w-5 shrink-0" />
                Hubungi via WhatsApp
              </a> */}
              <button
                type="button"
                className={landingBtn.onDarkSolid}
                onClick={() => setLoginOpen(true)}
              >
                <LogIn className="h-5 w-5 shrink-0" />
                Sudah punya akun? Masuk
              </button>
            </div>
          </div>
        </section>

        <footer className="border-t border-slate-200 bg-white py-10">
          <div className="max-w-6xl mx-auto px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
            <span>
              © {new Date().getFullYear()} {brand}. Sistem scan invoice & CCTV
              recording.
            </span>
            <button
              type="button"
              className="font-medium text-blue-600 hover:text-blue-800 transition-colors px-2 py-1"
              onClick={() => setLoginOpen(true)}
            >
              Masuk
            </button>
          </div>
        </footer>
      </div>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </AppProviders>
  );
}
