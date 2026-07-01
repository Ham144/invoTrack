import axios from "axios";
import { toast } from "sonner";

function messageFromBody(data: unknown): string | null {
  if (typeof data !== "object" || data === null || !("message" in data)) {
    return null;
  }
  const msg = (data as { message?: string | string[] }).message;
  if (Array.isArray(msg)) return msg.join(", ");
  if (typeof msg === "string" && msg.trim()) return msg;
  return null;
}

/** Ambil pesan error dari response NestJS / axios (sinkron, untuk JSON biasa). */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const fromBody = messageFromBody(err.response?.data);
    if (fromBody) return fromBody;
    if (err.code === "ECONNREFUSED") {
      return "Tidak bisa hubung ke server. Pastikan backend jalan.";
    }
  }
  if (err instanceof Error && err.message && !/^Request failed with status code \d+$/.test(err.message)) {
    return err.message;
  }
  return fallback;
}

export function toastApiError(err: unknown, fallback: string) {
  toast.error(getApiErrorMessage(err, fallback));
}

/** Untuk response blob (mis. snapshot gagal) — fallback ke getApiErrorMessage. */
export async function extractApiErrorMessage(
  err: unknown,
  fallback: string,
): Promise<string> {
  if (axios.isAxiosError(err) && err.response?.data instanceof Blob) {
    try {
      const text = await err.response.data.text();
      try {
        const parsed = messageFromBody(JSON.parse(text));
        if (parsed) return parsed;
      } catch {
        if (text.trim()) return text.trim().slice(0, 400);
      }
    } catch {
      /* ignore */
    }
  }
  return getApiErrorMessage(err, fallback);
}
