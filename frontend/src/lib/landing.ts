import type { LucideIcon } from "lucide-react";
import {
  Archive,
  Building2,
  Camera,
  ClipboardList,
  HardDrive,
  ScanLine,
  Users,
  Warehouse,
} from "lucide-react";

export const WHATSAPP_NUMBER =
  import.meta.env.PUBLIC_WHATSAPP_NUMBER ?? "628888888888";

export const whatsappConsultUrl = (message?: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    message ?? "Halo, saya ingin konsultasi InvoTrack.",
  )}`;

export function getBrandName(): string {
  if (typeof window === "undefined") return "InvoTrack";
  const host = window.location.hostname.split(".")[0];
  return host
    ? `${host.charAt(0).toUpperCase()}${host.slice(1)}Track`
    : "InvoTrack";
}

export interface LandingFeature {
  title: string;
  description: string;
  icon: LucideIcon;
  comingSoon?: boolean;
}

export const LANDING_FEATURES: LandingFeature[] = [
  {
    title: "Auto-record CCTV",
    description:
      "Setiap scan invoice memicu perekaman CCTV operator yang di-assign — bukti visual otomatis tanpa langkah manual.",
    icon: Camera,
  },
  {
    title: "Multi-scanner per PC kasir",
    description:
      "Beberapa scanner USB di satu workstation via Web Serial. Cocok untuk gudang dengan banyak meja operator.",
    icon: ScanLine,
  },
  {
    title: "Mapping 1:1:1",
    description:
      "Satu scanner, satu operator, satu CCTV. Routing scan tidak bergantung pada siapa yang sedang login.",
    icon: Users,
  },
  {
    title: "Log scan real-time",
    description:
      "Dashboard audit, live log, dan notifikasi WebSocket — pantau aktivitas gudang dari mana saja.",
    icon: ClipboardList,
  },
  {
    title: "Kontrol rekam",
    description:
      "Stop rekam manual dan batas durasi per organisasi. Auto-cut saat invoice berikutnya di-scan.",
    icon: Archive,
  },
  {
    title: "Simpan video offline",
    description:
      "Ekspor dan simpan klip rekam di perangkat lokal Anda — akses bukti meski jaringan terputus.",
    icon: HardDrive,
    comingSoon: true,
  },
];

export const HOW_IT_WORKS_STEPS = [
  {
    step: 1,
    title: "Setup admin",
    description:
      "Buat workstation, scanner, dan assign operator + CCTV di halaman Perangkat.",
  },
  {
    step: 2,
    title: "Hubungkan scanner",
    description:
      "Operator buka halaman Scan di PC kasir, klik Hubungkan USB, pilih port COM scanner.",
  },
  {
    step: 3,
    title: "Scan invoice",
    description:
      "Scan barcode — sistem otomatis mulai rekam CCTV operator yang di-assign.",
  },
  {
    step: 4,
    title: "Tinjau & audit",
    description:
      "Lihat log scan, status rekam, dan video di dashboard. Ekspor offline segera hadir.",
  },
];

export const LANDING_BENEFITS = [
  "Bukti visual per transaksi gudang — kurangi sengketa dan klaim",
  "Routing scan via scannerConfig, bukan user login — konsisten di shift berganti",
  "Multi-meja kasir dalam satu PC tanpa bentrok port scanner",
  "Deploy on-premise — data dan stream CCTV di infrastruktur Anda",
];

export const HERO_PILLS = ["Multi-scanner", "On-premise", "Audit real-time"];

export interface LandingRole {
  title: string;
  description: string;
  icon: LucideIcon;
  capabilities: string[];
}

export const LANDING_ROLES: LandingRole[] = [
  {
    title: "Admin Organisasi",
    description:
      "Pengelola utama organisasi — setup infrastruktur, anggota, dan kebijakan rekam.",
    icon: Building2,
    capabilities: [
      "Kelola anggota & role",
      "Setup workstation & scanner",
      "Konfigurasi CCTV & RTSP",
      "Atur batas durasi rekam",
    ],
  },
  {
    title: "Admin Gudang",
    description:
      "Supervisor lapangan — pantau perangkat dan log tanpa akses kelola anggota.",
    icon: Warehouse,
    capabilities: [
      "Kelola perangkat & CCTV",
      "Live preview kamera",
      "Pantau scan log & status",
      "Akses dashboard operasional",
    ],
  },
  {
    title: "Operator",
    description:
      "Petugas di meja kasir — scan invoice dan rekam otomatis via scanner yang di-assign.",
    icon: ScanLine,
    capabilities: [
      "Halaman scan multi-scanner",
      "Hubungkan USB scanner",
      "Stop rekam milik sendiri",
      "Lihat log aktivitas scan",
    ],
  },
];

export interface LandingPlan {
  id: string;
  name: string;
  badge: string;
  highlighted?: boolean;
  features: string[];
  ctaLabel: string;
  ctaMessage: string;
  ctaPrimary?: boolean;
}

export const LANDING_PLANS: LandingPlan[] = [
  {
    id: "trial",
    name: "Trial",
    badge: "Cocok mencoba",
    features: [
      "1 CCTV",
      "1 scanner",
      "1 workstation",
      "Durasi 14 hari",
      "Log scan & dashboard",
    ],
    ctaLabel: "Coba Trial",
    ctaMessage: "Halo, saya ingin coba Trial InvoTrack.",
  },
  {
    id: "pro",
    name: "Pro",
    badge: "Paling populer",
    highlighted: true,
    features: [
      "3 CCTV",
      "3 scanner",
      "Multi-workstation",
      "Perpanjangan bulanan",
      "Prioritas dukungan setup",
    ],
    ctaLabel: "Tanya Paket Pro",
    ctaMessage: "Halo, saya ingin info paket Pro InvoTrack.",
    ctaPrimary: true,
  },
];
