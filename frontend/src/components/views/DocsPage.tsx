import DashboardFrame from "@/components/islands/DashboardFrame";
import PageHeader from "@/components/ui/PageHeader";
import { Camera, ScanLine, Users } from "lucide-react";

export default function DocsPage() {
  return (
    <DashboardFrame>
      <div className="space-y-8 animate-fade-in pb-12">
        <PageHeader
          title="Dokumentasi & Panduan"
          subtitle="Panduan lengkap penggunaan sistem BuktiScan untuk Admin dan Operator."
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section className="surface-card">
              <div className="section-head flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-600" />
                <h2 className="section-title">1. Setup Perangkat CCTV</h2>
              </div>
              <div className="surface-card-body prose prose-slate max-w-none prose-headings:font-bold prose-a:text-blue-600">
                <p>
                  Untuk menghubungkan CCTV ke sistem BuktiScan, pastikan kamera
                  CCTV Anda mendukung protokol <strong>RTSP</strong>.
                </p>
                <ol className="list-decimal pl-5 space-y-2 mt-4 text-slate-700">
                  <li>
                    Buka menu <strong>Perangkat & CCTV</strong>.
                  </li>
                  <li>
                    Pilih tab <strong>CCTV</strong> dan klik{" "}
                    <strong>Tambah CCTV</strong>.
                  </li>
                  <li>
                    Masukkan URL RTSP (contoh:{" "}
                    <code>rtsp://admin:password@192.168.1.10:554/stream1</code>
                    ).
                  </li>
                  <li>
                    Sistem akan melakukan ping otomatis. Jika berhasil, kamera
                    akan berstatus <strong>Online</strong>.
                  </li>
                </ol>
              </div>
            </section>

            <section className="surface-card">
              <div className="section-head flex items-center gap-2">
                <ScanLine className="w-5 h-5 text-blue-600" />
                <h2 className="section-title">
                  2. Pairing Scanner & Workstation
                </h2>
              </div>
              <div className="surface-card-body prose prose-slate max-w-none prose-headings:font-bold prose-a:text-blue-600">
                <p>
                  Setiap meja kasir/operator (Workstation) memerlukan aplikasi{" "}
                  <strong>BuktiScan Agent</strong> yang berjalan di PC tersebut.
                </p>
                <ul className="list-disc pl-5 space-y-2 mt-4 text-slate-700">
                  <li>Unduh dan install BuktiScan Agent di PC Kasir.</li>
                  <li>
                    Di menu <strong>Perangkat & CCTV</strong> - tab{" "}
                    <strong>Workstation</strong>, buat Workstation baru.
                  </li>
                  <li>
                    Masukkan kode pairing yang muncul di Agent ke dalam
                    Dashboard.
                  </li>
                  <li>
                    Setelah terhubung, Anda dapat memetakan Scanner USB ke
                    kamera CCTV tertentu secara 1:1.
                  </li>
                </ul>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="surface-card">
              <div className="section-head">
                <h3 className="section-title">Akses Cepat</h3>
              </div>
              <div className="surface-card-body p-0">
                <ul className="divide-y divide-slate-100">
                  <li>
                    <a
                      href="/dashboard/devices"
                      className="flex items-center gap-3 p-4 hover:bg-slate-50 text-sm font-medium text-slate-700"
                    >
                      <Camera className="w-4 h-4 text-slate-400" /> Kelola CCTV
                    </a>
                  </li>
                  <li>
                    <a
                      href="/dashboard/scan-log"
                      className="flex items-center gap-3 p-4 hover:bg-slate-50 text-sm font-medium text-slate-700"
                    >
                      <ScanLine className="w-4 h-4 text-slate-400" /> Lihat Log
                      Scan
                    </a>
                  </li>
                  <li>
                    <a
                      href="/admin/members"
                      className="flex items-center gap-3 p-4 hover:bg-slate-50 text-sm font-medium text-slate-700"
                    >
                      <Users className="w-4 h-4 text-slate-400" /> Kelola
                      Anggota
                    </a>
                  </li>
                </ul>
              </div>
            </section>
          </div>
        </div>
      </div>
    </DashboardFrame>
  );
}
