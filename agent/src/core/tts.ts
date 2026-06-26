import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

export interface TtsOptions {
  enabled: boolean;
  volume: number;
}

/** Bersihkan username operator agar TTS terdengar natural. */
export function sanitizeOperatorName(
  username: string | null | undefined,
): string {
  if (!username?.trim()) return "Operator";
  const cleaned = username
    .replace(/[._\-@+#/\\|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "Operator";
}

export function invoiceTailDigits(invoiceNumber: string, len = 17): string {
  const trimmed = invoiceNumber.trim();
  if (!trimmed) return "";
  return trimmed.length > len ? trimmed.slice(-len) : trimmed;
}

export function buildRecordingStartMessage(
  operatorUsername: string | null | undefined,
  invoiceNumber: string,
): string {
  const name = sanitizeOperatorName(operatorUsername);
  const tail = invoiceTailDigits(invoiceNumber);
  return `${name} mulai merekam invoice ${tail}`;
}

function clampVolume(volume: number): number {
  return Math.max(0, Math.min(100, Math.round(volume)));
}

function escapePsLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

function speakWindows(text: string, volume: number): void {
  const textFile = path.join(
    os.tmpdir(),
    `bukti-scan-tts-${process.pid}-${Date.now()}.txt`,
  );
  fs.writeFileSync(textFile, text, "utf8");

  const fileLiteral = escapePsLiteral(textFile);
  const script = [
    "Add-Type -AssemblyName System.Speech",
    "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer",
    "$s.SetOutputToDefaultAudioDevice()",
    `$s.Volume = ${volume}`,
    `$s.Speak((Get-Content -LiteralPath '${fileLiteral}' -Raw -Encoding UTF8))`,
    `$s.Dispose()`,
    `Remove-Item -LiteralPath '${fileLiteral}' -Force -ErrorAction SilentlyContinue`,
  ].join("; ");

  const proc = spawn(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-STA", "-Command", script],
    { windowsHide: true, stdio: "ignore" },
  );

  proc.on("exit", () => {
    try {
      if (fs.existsSync(textFile)) fs.unlinkSync(textFile);
    } catch {
      /* ignore */
    }
  });
}

export function speak(text: string, options: TtsOptions): void {
  if (!options.enabled || !text.trim()) return;

  const volume = clampVolume(options.volume);

  if (process.platform === "win32") {
    speakWindows(text, volume);
    return;
  }

  if (process.platform === "linux") {
    spawn("espeak", ["-a", String(volume), text], {
      stdio: "ignore",
      windowsHide: true,
    });
  }
}
