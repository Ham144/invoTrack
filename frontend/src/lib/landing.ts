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

export const WHATSAPP_NUMBER = import.meta.env.PUBLIC_WHATSAPP_NUMBER ?? "";

export const whatsappConsultUrl = (message?: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    message ?? "Halo, saya ingin konsultasi BuktiScan.",
  )}`;

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
      "Beberapa scanner USB di satu workstation via BuktiScan Agent desktop. Cocok untuk gudang dengan banyak meja operator.",
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
      "Log dan notifikasi WebSocket dari server kantor — pantau aktivitas gudang. File video tetap di disk PC kasir.",
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
      "Klip rekam disimpan di disk PC kasir via agent desktop — bukti visual tetap ada di lokasi toko.",
    icon: HardDrive,
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
    title: "Install agent",
    description:
      "Download BuktiScan Agent di PC kasir, pairing dengan kode dari dashboard admin.",
  },
  {
    step: 3,
    title: "Pair USB & tes kamera",
    description:
      "Di BuktiScan Agent: pilih port COM scanner (VCOM), pair USB, lalu tes preview RTSP. Setelah terhubung, scan barcode otomatis mulai rekam CCTV.",
  },
  {
    step: 4,
    title: "Tinjau & audit",
    description:
      "Lihat log scan dan status rekam di dashboard. Video tersimpan di disk PC kasir. Putar rekaman di Scan Log dari browser yang jalan di PC kasir yang sama dengan agent.",
  },
];

export const LANDING_BENEFITS = [
  "Bukti visual per transaksi untuk audit internal gudang",
  "Routing scan via scannerConfig, bukan user login — konsisten di shift berganti",
  "Beberapa meja operator (scanner + CCTV + petugas) dalam satu workstation — agent satu, tanpa bentrok USB",
  "Video tersimpan di PC meja kasir, metadata log di server kantor",
];

export const HERO_PILLS = ["Multi-scanner", "Rekam lokal", "Audit real-time"];

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
      "Pantau status perangkat & log",
      "Preview kamera lewat agent di lokasi",
      "Akses dashboard operasional",
    ],
  },
  {
    title: "Operator",
    description:
      "Petugas di meja gudang — scan via scanner yang di-assign; rekam CCTV otomatis lewat agent di PC workstation.",
    icon: ScanLine,
    capabilities: [
      "Scan barcode di meja (via agent, tanpa buka browser)",
      "Lihat log scan di dashboard",
      "Stop rekam transaksi sendiri dari Scan Log",
      "Tanpa login untuk scan — routing via scannerConfig",
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
    ctaMessage: "Halo, saya ingin coba Trial BuktiScan.",
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
    ctaMessage: "Halo, saya ingin info paket Pro BuktiScan.",
    ctaPrimary: true,
  },
];
