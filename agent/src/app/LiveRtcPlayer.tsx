import { useMemo, useState } from "react";
import { GO2RTC_API_BASE } from "../core/go2rtc-constants";

interface Props {
  src: string;
  baseUrl?: string;
}

/** URL halaman player bawaan go2rtc — sama dengan yang bisa diputar di browser. */
export function go2rtcStreamPageUrl(
  streamName: string,
  baseUrl = GO2RTC_API_BASE,
): string {
  const q = new URLSearchParams({
    src: streamName,
    background: "false",
    width: "100%",
  });
  return `${baseUrl}/stream.html?${q.toString()}`;
}

/**
 * Embed go2rtc stream.html via iframe.
 * Lebih andal di Electron (file://) daripada img MJPEG atau WebRTC manual.
 */
export function LiveRtcPlayer({ src, baseUrl = GO2RTC_API_BASE }: Props) {
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);

  const pageUrl = useMemo(
    () => `${go2rtcStreamPageUrl(src, baseUrl)}&t=${retry}`,
    [src, baseUrl, retry],
  );

  if (failed) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0f172a",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: 8,
        }}
      >
        <span style={{ color: "#f87171", fontSize: 11, textAlign: "center" }}>
          Preview gagal dimuat
        </span>
        <button
          type="button"
          style={{
            fontSize: 11,
            padding: "4px 10px",
            borderRadius: 4,
            border: "1px solid #475569",
            background: "#1e293b",
            color: "#e2e8f0",
            cursor: "pointer",
          }}
          onClick={() => {
            setFailed(false);
            setRetry((n) => n + 1);
          }}
        >
          Coba lagi
        </button>
      </div>
    );
  }

  return (
    <iframe
      key={pageUrl}
      src={pageUrl}
      title={`Preview ${src}`}
      style={{
        width: "100%",
        height: "100%",
        border: "none",
        display: "block",
        background: "#0f172a",
      }}
      allow="autoplay; fullscreen"
      onError={() => setFailed(true)}
    />
  );
}
