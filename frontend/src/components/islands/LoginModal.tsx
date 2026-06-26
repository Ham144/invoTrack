import { useState } from "react";
import axios from "axios";
import { AuthApi } from "@/api/auth";
import { useSessionStore } from "@/stores/sessionStore";

function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string | string[] };
    if (Array.isArray(data?.message)) return data.message.join(", ");
    if (typeof data?.message === "string") return data.message;
  }
  return "Login gagal, terjadi kesalahan.";
}

export default function LoginModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const setUser = useSessionStore((s) => s.setUser);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await AuthApi.login(username, password);
      setUser(res.data);
      window.location.href = "/dashboard";
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <dialog className={`modal ${open ? "modal-open" : ""}`}>
      <div className="modal-box max-w-md p-0 overflow-hidden border border-base-300">
        <div className="bg-gradient-to-br from-primary to-primary/80 px-6 py-6 text-primary-content">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-content/15 flex items-center justify-center font-bold text-sm">
              BS
            </div>
            <div>
              <h3 className="font-bold text-lg">Masuk BuktiScan</h3>
              <p className="text-sm text-primary-content/80">
                Dashboard organisasi Anda
              </p>
            </div>
          </div>
        </div>

        <form className="px-6 py-5 flex flex-col gap-4" onSubmit={handleLogin}>
          <div className="form-control w-full">
            <label className="label py-1">
              <span className="label-text font-medium">Username</span>
            </label>
            <input
              className="input input-bordered w-full"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="form-control w-full">
            <label className="label py-1">
              <span className="label-text font-medium">Password</span>
            </label>
            <input
              className="input input-bordered w-full"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div className="alert alert-error py-2 text-sm">
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary w-full mt-1"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="loading loading-spinner loading-sm" />
                Memproses…
              </>
            ) : (
              "Login"
            )}
          </button>
        </form>
      </div>

      <form method="dialog" className="modal-backdrop bg-black/50">
        <button type="button" onClick={onClose}>
          tutup
        </button>
      </form>
    </dialog>
  );
}
