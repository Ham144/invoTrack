import fs from "fs";
import path from "path";

export const MIN_CLIP_BYTES = 65536;

export interface LocalClipFile {
  invoiceNumber: string;
  localClipPath: string;
  sizeBytes: number;
}

export function listLocalClipFiles(clipsDir: string): LocalClipFile[] {
  if (!clipsDir || !fs.existsSync(clipsDir)) return [];

  return fs
    .readdirSync(clipsDir)
    .filter((name) => name.toLowerCase().endsWith(".mp4"))
    .map((name) => {
      const filePath = path.join(clipsDir, name);
      try {
        const stat = fs.statSync(filePath);
        return {
          invoiceNumber: name.replace(/\.mp4$/i, ""),
          localClipPath: filePath,
          sizeBytes: stat.size,
        };
      } catch {
        return null;
      }
    })
    .filter((row): row is LocalClipFile => row !== null);
}

export function resolveClipPath(
  clipsDir: string,
  invoiceNumber: string,
): string | null {
  const filePath = path.join(
    clipsDir,
    `${invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, "_")}.mp4`,
  );
  if (!fs.existsSync(filePath)) return null;
  try {
    const stat = fs.statSync(filePath);
    return stat.size >= MIN_CLIP_BYTES ? filePath : null;
  } catch {
    return null;
  }
}
