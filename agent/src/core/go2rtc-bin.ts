import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

let cached: string | null | undefined;

function exists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function findOnSystemPath(): string | null {
  const cmd = process.platform === "win32" ? "where.exe" : "which";
  try {
    const result = spawnSync(cmd, ["go2rtc"], { encoding: "utf8" });
    const line = result.stdout?.trim().split(/\r?\n/).find(Boolean);
    if (line && exists(line)) return line;
  } catch {
    /* ignore */
  }
  return null;
}

function candidatePaths(): string[] {
  const paths: string[] = [];
  const execDir = process.execPath ? path.dirname(process.execPath) : "";
  const bin = process.platform === "win32" ? "go2rtc.exe" : "go2rtc";

  if (process.env.GO2RTC_PATH) {
    paths.push(process.env.GO2RTC_PATH);
  }

  if (execDir) {
    paths.push(path.join(execDir, bin));
    paths.push(path.join(execDir, "resources", bin));
  }

  if (process.resourcesPath) {
    paths.push(path.join(process.resourcesPath, bin));
  }

  const onPath = findOnSystemPath();
  if (onPath) paths.push(onPath);

  return paths;
}

export function resolveGo2RtcBin(): string | null {
  if (cached !== undefined) return cached;

  for (const candidate of candidatePaths()) {
    if (candidate && exists(candidate)) {
      cached = candidate;
      return cached;
    }
  }

  cached = null;
  return null;
}
