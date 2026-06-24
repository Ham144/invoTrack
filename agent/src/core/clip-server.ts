import http from "http";
import fs from "fs";
import path from "path";
import { safeInvoiceName } from "./recorder";

export const CLIP_SERVER_PORT = 19500;

export class ClipServer {
  private server: http.Server | null = null;

  start(clipsDir: string): void {
    if (this.server) return;

    this.server = http.createServer((req, res) => {
      const url = new URL(req.url || "/", `http://127.0.0.1:${CLIP_SERVER_PORT}`);
      const match = url.pathname.match(/^\/clips\/(.+)\.mp4$/);
      if (!match) {
        res.writeHead(404);
        res.end();
        return;
      }

      const invoiceSafe = decodeURIComponent(match[1]);
      const filePath = path.join(clipsDir, `${invoiceSafe}.mp4`);
      if (!fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end();
        return;
      }

      const stat = fs.statSync(filePath);
      res.writeHead(200, {
        "Content-Type": "video/mp4",
        "Content-Length": stat.size,
        "Accept-Ranges": "bytes",
      });
      fs.createReadStream(filePath).pipe(res);
    });

    this.server.listen(CLIP_SERVER_PORT, "127.0.0.1");
  }

  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
}

export function clipFilePath(clipsDir: string, invoiceNumber: string): string {
  return path.join(clipsDir, `${safeInvoiceName(invoiceNumber)}.mp4`);
}
