/** Kelas UI landing — warna eksplisit, hindari konflik theme corporate */

export const landingBtn = {
  /** Tombol utama di hero / CTA gelap */
  solidLight:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-slate-900 shadow-md transition-colors hover:bg-slate-100 active:bg-slate-200 min-h-12",
  solidLightLg:
    "inline-flex items-center justify-center gap-2.5 rounded-xl bg-white px-8 py-4 text-base font-semibold text-slate-900 shadow-lg transition-colors hover:bg-slate-100 active:bg-slate-200 min-h-[3.25rem]",
  /** Outline di atas background gelap/hero */
  outlineLight:
    "inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/50 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:border-white hover:bg-white hover:text-slate-900 min-h-12",
  outlineLightLg:
    "inline-flex items-center justify-center gap-2.5 rounded-xl border-2 border-white/50 bg-white/5 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition-colors hover:border-white hover:bg-white hover:text-slate-900 min-h-[3.25rem]",
  /** Header & section terang */
  primary:
    "inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 active:bg-blue-800 min-h-10",
  primarySm:
    "inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 active:bg-blue-800 min-h-9",
  ghostNav:
    "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 min-h-9",
  /** CTA section gelap — tombol terang */
  onDarkSolid:
    "inline-flex items-center justify-center gap-2.5 rounded-xl bg-white px-8 py-4 text-base font-semibold text-slate-900 shadow-md transition-colors hover:bg-slate-100 min-h-[3.25rem]",
  onDarkOutline:
    "inline-flex items-center justify-center gap-2.5 rounded-xl border-2 border-slate-400 bg-transparent px-8 py-4 text-base font-semibold text-slate-100 transition-colors hover:border-white hover:bg-white/10 hover:text-white min-h-[3.25rem]",
} as const;

export const landingBadge = {
  hero:
    "inline-flex items-center rounded-full bg-white/20 px-4 py-1.5 text-xs font-semibold tracking-wide text-white ring-1 ring-white/30 backdrop-blur-sm",
  pill:
    "inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/95 ring-1 ring-white/25",
} as const;
