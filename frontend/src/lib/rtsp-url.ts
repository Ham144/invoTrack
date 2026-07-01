/** Hikvision main stream: rtsp://host:554/Streaming/Channels/101 */

export type RtspFormFields = {
  host: string;
  channel: string;
  username: string;
  password: string;
};

export function sanitizeHost(input: string): string {
  let s = input.trim();
  if (!s) return "";
  try {
    if (s.includes("://")) {
      return new URL(s).hostname;
    }
  } catch {
    /* fall through */
  }
  if (s.includes("@")) {
    s = s.split("@").pop() ?? s;
  }
  return s.split("/")[0].split(":")[0];
}

export function buildHikvisionRtspUrl(
  host: string,
  channel: string | number = "101",
  port = 554,
): string {
  const h = sanitizeHost(host);
  const ch = String(channel).replace(/\D/g, "") || "101";
  return `rtsp://${h}:${port}/Streaming/Channels/${ch}`;
}

export function parseRtspConfig(cfg: {
  rtspUrl: string;
  username?: string | null;
  password?: string | null;
}): RtspFormFields {
  let url: URL;
  try {
    url = new URL(cfg.rtspUrl.trim());
  } catch {
    return { host: sanitizeHost(cfg.rtspUrl), channel: "101", username: "", password: "" };
  }

  const channelMatch = url.pathname.match(/Channels\/(\d+)/i);
  const username =
    cfg.username?.trim() ||
    (url.username ? decodeURIComponent(url.username) : "");
  const password =
    cfg.password?.trim() ||
    (url.password ? decodeURIComponent(url.password) : "");

  return {
    host: url.hostname,
    channel: channelMatch?.[1] ?? "101",
    username,
    password,
  };
}

export function rtspPayloadFromForm(
  fields: RtspFormFields & { label: string },
): {
  label: string;
  rtspUrl: string;
  username: string;
  password: string;
} {
  return {
    label: fields.label.trim(),
    rtspUrl: buildHikvisionRtspUrl(fields.host, fields.channel),
    username: fields.username.trim(),
    password: fields.password,
  };
}
