export type SerialBlockReason =
  | "ok"
  | "ssr"
  | "insecure"
  | "unsupported-browser"
  | "no-api";

export interface SerialSupportStatus {
  supported: boolean;
  reason: SerialBlockReason;
  message: string;
}

function isChromiumDesktop(): boolean {
  const ua = navigator.userAgent;
  return (
    /Chrome|Edg/i.test(ua) &&
    !/Firefox|OPR|Opera|Brave|Mobile|Android|iPhone|iPad/i.test(ua)
  );
}

export function getSerialSupportStatus(): SerialSupportStatus {
  if (typeof navigator === "undefined" || typeof window === "undefined") {
    return {
      supported: false,
      reason: "ssr",
      message: "Web Serial tidak tersedia saat render server.",
    };
  }

  const hasApi = "serial" in navigator && navigator.serial != null;
  if (hasApi) {
    return { supported: true, reason: "ok", message: "" };
  }

  if (!window.isSecureContext) {
    return {
      supported: false,
      reason: "insecure",
      message:
        "Web Serial membutuhkan HTTPS atau localhost. Buka dari PC kasir via http://localhost:4321, atau aktifkan HTTPS.",
    };
  }

  if (!isChromiumDesktop()) {
    return {
      supported: false,
      reason: "unsupported-browser",
      message: "Web Serial hanya didukung di Chrome/Edge desktop.",
    };
  }

  return {
    supported: false,
    reason: "no-api",
    message:
      "Web Serial tidak tersedia di browser ini. Gunakan Chrome/Edge desktop di PC yang terhubung ke scanner USB.",
  };
}

export function serialSupported(): boolean {
  return getSerialSupportStatus().supported;
}
