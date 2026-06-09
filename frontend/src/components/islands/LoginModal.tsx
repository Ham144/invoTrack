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
      <div className="modal-box p-0 overflow-hidden">
        {/* Header with brand color */}
        <div
          className="px-6 pt-6 pb-4 border-b"
          style={{ borderColor: "#e2e8f0" }}
        >
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-1 h-6 rounded-full"
              style={{ backgroundColor: "#2563eb" }}
            ></div>
            <h3 className="font-bold text-xl" style={{ color: "#0f172a" }}>
              Masuk
            </h3>
          </div>
          <p className="text-sm mt-1" style={{ color: "#475569" }}>
            Gunakan akun organisasi Anda.
          </p>
        </div>

        {/* Form Content */}
        <form className="px-6 py-5 flex flex-col gap-4" onSubmit={handleLogin}>
          <div className="form-control w-full">
            <label
              className="text-sm font-medium mb-1.5"
              style={{ color: "#0f172a" }}
            >
              Username
            </label>
            <input
              className="input w-full transition-all duration-200 focus:ring-2 focus:ring-opacity-20 px-2 font-bold"
              style={{
                backgroundColor: "#f8fafc",
                borderColor: "#e2e8f0",
                color: "#0f172a",
              }}
              placeholder="Masukkan username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="form-control w-full">
            <label
              className="text-sm font-medium mb-1.5"
              style={{ color: "#0f172a" }}
            >
              Password
            </label>
            <input
              className="input w-full transition-all duration-200 focus:ring-2 focus:ring-opacity-20 px-2 font-bold"
              type="password"
              style={{
                backgroundColor: "#f8fafc",
                borderColor: "#e2e8f0",
                color: "#0f172a",
              }}
              placeholder="Masukkan password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div
              className="alert p-3 rounded-lg"
              style={{ backgroundColor: "#fee2e2", color: "#dc2626" }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="stroke-current flex-shrink-0 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm">{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="btn mt-2 text-white font-semibold py-2.5 transition-all duration-200 hover:opacity-90 focus:ring-2 focus:ring-opacity-50"
            style={{
              backgroundColor: "#2563eb",
              border: "none",
            }}
            disabled={loading}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#1d4ed8")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#2563eb")
            }
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="loading loading-spinner loading-sm"></div>
                <span>Memproses...</span>
              </div>
            ) : (
              "Login"
            )}
          </button>
        </form>
      </div>

      <form method="dialog" className="modal-backdrop bg-black bg-opacity-50">
        <button
          type="button"
          onClick={onClose}
          className="cursor-default"
          style={{ background: "transparent" }}
        >
          tutup
        </button>
      </form>
    </dialog>
  );
}
