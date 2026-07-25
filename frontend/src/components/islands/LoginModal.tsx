import { useState } from "react";
import { AuthApi } from "@/api/auth";
import { getApiErrorMessage } from "@/lib/api-error";
import { useSessionStore } from "@/stores/sessionStore";
import { APP_NAME } from "@/lib/constants";
import { LogIn } from "lucide-react";

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
      setError(getApiErrorMessage(err, "Login gagal, terjadi kesalahan."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <dialog className={`modal ${open ? "modal-open" : ""}`}>
      <div className="modal-box max-w-md p-0 border border-base-300 shadow-panel">
        <div className="px-6 pt-6 pb-4 border-b border-base-300">
          <div className="flex items-center gap-3">
            <img src="/favicon.png" alt="" className="w-10 h-10 rounded-lg" />
            <div>
              <h3 className="font-semibold text-lg">{APP_NAME}</h3>
              <p className="text-sm muted">Masuk ke dashboard</p>
            </div>
          </div>
        </div>

        <form className="px-6 py-5 flex flex-col gap-4" onSubmit={handleLogin}>
          <label className="form-control w-full gap-1.5">
            <span className="text-sm font-medium">Username</span>
            <input
              className="input-field w-full"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
              autoComplete="username"
              required
            />
          </label>

          <label className="form-control w-full gap-1.5">
            <span className="text-sm font-medium">Password</span>
            <input
              className="input-field w-full"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {error && (
            <div className="rounded-lg border border-error/30 bg-error/5 px-3 py-2 text-sm text-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary w-full mt-1 gap-2 border p-2 rounded-lg bg-primary text-white"
            disabled={loading}
          >
            {loading ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            Masuk
          </button>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop bg-slate-900/50">
        <button type="button" onClick={onClose}>
          tutup
        </button>
      </form>
    </dialog>
  );
}
