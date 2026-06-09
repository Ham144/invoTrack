import { useCallback, useEffect, useRef, useState } from "react";
import { InvoTrackApi } from "@/api/invo-track";
import { getSerialSupportStatus, serialSupported } from "@/lib/serial-support";
import type { ScannerConfig } from "@/types/invo-track";

export { serialSupported };

type ConnectionState = "idle" | "connecting" | "connected" | "error";

interface SerialSession {
  scannerId: string;
  state: ConnectionState;
  lastBarcode?: string;
  error?: string;
}

function debugLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
) {
  // #region agent log
  fetch("http://localhost:7525/ingest/56fe92df-f231-454d-96a6-16be82610eed", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "92cfd8",
    },
    body: JSON.stringify({
      sessionId: "92cfd8",
      runId: "serial-read",
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

async function readLoop(
  port: SerialPort,
  scannerId: string,
  onBarcode: (raw: string) => void,
  signal: AbortSignal,
) {
  const readable = port.readable;
  // #endregion
  if (!readable) return;

  const decoder = new TextDecoderStream();
  const pipeClosed = readable.pipeTo(
    decoder.writable as WritableStream<Uint8Array<ArrayBufferLike>>,
    { signal },
  );
  const reader = decoder.readable.getReader();
  let buffer = "";
  let readCount = 0;

  try {
    while (!signal.aborted) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;

      readCount += 1;
      buffer += value;
      const parts = buffer.split(/[\r\n]+/);
      buffer = parts.pop() ?? "";

      // #region agent log
      debugLog(
        "use-serial-scanners.ts:readLoop:chunk",
        "serial chunk received",
        {
          scannerId,
          readCount,
          chunkLen: value.length,
          bufferLen: buffer.length,
          partsFound: parts.length,
        },
        "B",
      );
      // #endregion

      for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed) {
          // #region agent log
          debugLog(
            "use-serial-scanners.ts:readLoop:barcode",
            "barcode parsed",
            { scannerId, len: trimmed.length },
            "C",
          );
          // #endregion
          onBarcode(trimmed);
        }
      }
    }
  } finally {
    reader.releaseLock();
    await pipeClosed.catch(() => {});
  }
}

export function useSerialScanners(
  scanners: ScannerConfig[],
  onIngest: (scannerId: string, invoice: string) => void,
) {
  const [sessions, setSessions] = useState<Record<string, SerialSession>>({});
  const portsRef = useRef<Map<string, SerialPort>>(new Map());
  const abortRef = useRef<Map<string, AbortController>>(new Map());

  const updateSession = useCallback(
    (scannerId: string, patch: Partial<SerialSession>) => {
      setSessions((prev) => ({
        ...prev,
        [scannerId]: {
          ...prev[scannerId],
          scannerId,
          ...patch,
        },
      }));
    },
    [],
  );

  const disconnect = useCallback(
    async (scannerId: string) => {
      abortRef.current.get(scannerId)?.abort();
      abortRef.current.delete(scannerId);
      const port = portsRef.current.get(scannerId);
      portsRef.current.delete(scannerId);
      if (port) {
        try {
          await port.close();
        } catch {
          /* port may already be closed */
        }
      }
      updateSession(scannerId, { state: "idle", error: undefined });
    },
    [updateSession],
  );

  const connect = useCallback(
    async (scanner: ScannerConfig) => {
      if (!serialSupported()) {
        updateSession(scanner.id, {
          state: "error",
          error: getSerialSupportStatus().message,
        });
        return;
      }

      await disconnect(scanner.id);
      updateSession(scanner.id, { state: "connecting", error: undefined });

      try {
        const filters =
          scanner.usbVendorId != null && scanner.usbProductId != null
            ? [
                {
                  usbVendorId: scanner.usbVendorId,
                  usbProductId: scanner.usbProductId,
                },
              ]
            : undefined;

        const port = await navigator.serial!.requestPort(
          filters ? { filters } : undefined,
        );
        const baudRate = scanner.baudRate || 9600;
        await port.open({ baudRate });
        const portInfo = port.getInfo();

        // #region agent log
        debugLog(
          "use-serial-scanners.ts:connect:opened",
          "port opened",
          {
            scannerId: scanner.id,
            baudRate,
            usbVendorId: portInfo.usbVendorId,
            usbProductId: portInfo.usbProductId,
            hasReadable: Boolean(port.readable),
          },
          "A",
        );
        // #endregion

        portsRef.current.set(scanner.id, port);
        const controller = new AbortController();
        abortRef.current.set(scanner.id, controller);

        readLoop(
          port,
          scanner.id,
          (raw) => {
            const invoice = raw.trim().toUpperCase();
            // #region agent log
            debugLog(
              "use-serial-scanners.ts:connect:onBarcode",
              "calling onIngest",
              { scannerId: scanner.id, invoiceLen: invoice.length },
              "E",
            );
            // #endregion
            updateSession(scanner.id, {
              lastBarcode: invoice,
              state: "connected",
            });
            onIngest(scanner.id, invoice);
          },
          controller.signal,
        ).catch((err: unknown) => {
          // #region agent log
          debugLog(
            "use-serial-scanners.ts:connect:readLoop-error",
            "readLoop failed",
            {
              scannerId: scanner.id,
              error: err instanceof Error ? err.message : String(err),
            },
            "D",
          );
          // #endregion
          updateSession(scanner.id, {
            state: "error",
            error: "Koneksi serial terputus",
          });
        });

        updateSession(scanner.id, { state: "connected" });
      } catch (err: unknown) {
        // #region agent log
        debugLog(
          "use-serial-scanners.ts:connect:catch",
          "connect failed",
          {
            scannerId: scanner.id,
            error: err instanceof Error ? err.message : String(err),
          },
          "A",
        );
        // #endregion
        updateSession(scanner.id, {
          state: "error",
          error: "Gagal membuka port scanner",
        });
      }
    },
    [disconnect, onIngest, updateSession],
  );

  const autoConnect = useCallback(async () => {
    if (!serialSupported()) return;
    const ports = await navigator.serial!.getPorts();
    // #region agent log
    debugLog(
      "use-serial-scanners.ts:autoConnect",
      "previously granted ports",
      { portCount: ports.length },
      "A",
    );
    // #endregion
    for (const port of ports) {
      const info = port.getInfo();
      const match = scanners.find(
        (s) =>
          s.usbVendorId != null &&
          s.usbProductId != null &&
          s.usbVendorId === info.usbVendorId &&
          s.usbProductId === info.usbProductId,
      );
      if (!match) continue;

      try {
        if (!port.readable) {
          await port.open({ baudRate: match.baudRate || 9600 });
        }
        portsRef.current.set(match.id, port);
        const controller = new AbortController();
        abortRef.current.set(match.id, controller);
        readLoop(
          port,
          match.id,
          (raw) => {
            const invoice = raw.trim().toUpperCase();
            updateSession(match.id, {
              lastBarcode: invoice,
              state: "connected",
            });
            onIngest(match.id, invoice);
          },
          controller.signal,
        ).catch(() => {
          updateSession(match.id, {
            state: "error",
            error: "Koneksi serial terputus",
          });
        });
        updateSession(match.id, { state: "connected" });
      } catch {
        /* skip failed auto-connect */
      }
    }
  }, [onIngest, scanners, updateSession]);

  useEffect(() => {
    if (scanners.length) autoConnect();
    return () => {
      for (const id of [...portsRef.current.keys()]) {
        disconnect(id);
      }
    };
  }, [scanners.map((s) => s.id).join(",")]);

  return { sessions, connect, disconnect, serialSupported: serialSupported() };
}

export async function sendManualIngest(
  scannerConfigId: string,
  invoiceNumber: string,
) {
  const res = await InvoTrackApi.ingestScanner(scannerConfigId, invoiceNumber);
  return res.data;
}
