import { Link } from "react-router-dom";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-base-200 p-6">
      <div className="card bg-base-100 border border-base-300 shadow-lg max-w-md w-full">
        <div className="card-body items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center text-error text-2xl font-bold">
            403
          </div>
          <h1 className="text-xl font-bold">Akses ditolak</h1>
          <p className="text-sm text-base-content/70">
            Anda tidak memiliki hak akses ke halaman ini. Hubungi admin organisasi jika ini keliru.
          </p>
          <div className="card-actions flex-col w-full gap-2 mt-2">
            <Link to="/dashboard" className="btn btn-primary w-full">
              Kembali ke Ringkasan
            </Link>
            <Link to="/" className="btn btn-ghost btn-sm w-full">
              Ke beranda
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
