import axios from 'axios';

export async function extractApiErrorMessage(
  err: unknown,
  fallback: string,
): Promise<string> {
  if (!axios.isAxiosError(err) || err.response?.data == null) {
    return err instanceof Error ? err.message : fallback;
  }

  const data = err.response.data;

  if (data instanceof Blob) {
    try {
      const text = await data.text();
      try {
        const json = JSON.parse(text) as { message?: string | string[] };
        if (Array.isArray(json.message)) return json.message.join(', ');
        if (typeof json.message === 'string' && json.message) return json.message;
      } catch {
        if (text.trim()) return text.trim().slice(0, 400);
      }
    } catch {
      /* ignore */
    }
    return fallback;
  }

  if (typeof data === 'object' && data !== null && 'message' in data) {
    const msg = (data as { message?: string | string[] }).message;
    if (Array.isArray(msg)) return msg.join(', ');
    if (typeof msg === 'string' && msg) return msg;
  }

  return fallback;
}
