import axios from "axios";
import { BASE_URL } from "./constants";
import { toast } from "sonner";

const axiosInstance = axios.create({
  withCredentials: true,
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

let refreshPromise: Promise<boolean> | null = null;

function runRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = axios
    .post(
      "/api/user/refresh-token",
      {},
      {
        withCredentials: true,
        baseURL: BASE_URL || undefined,
        timeout: 15000,
      },
    )
    .then((res) => res.status >= 200 && res.status < 300)
    .catch(() => false)
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    const isAuthError = error.response?.status === 401;
    const isForbiddenError = error.response?.status === 403;
    const requestUrl = originalRequest.url || "";
    const isPublicRoute =
      requestUrl.includes("/api/user/login") ||
      requestUrl.includes("/api/user/refresh-token");

    if (isAuthError && !originalRequest._retry && !isPublicRoute) {
      originalRequest._retry = true;
      const ok = await runRefresh();
      if (ok) return axiosInstance(originalRequest);
      if (typeof window !== "undefined" && window.location.pathname !== "/") {
        window.location.href = "/";
      }
    }

    if (isForbiddenError) {
      toast.error("Anda tidak memiliki hak akses.");
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
