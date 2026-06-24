/** Static installer served from `frontend/public/downloads/`. */
export const AGENT_DOWNLOAD_FILE = "BuktiScanAgent-portable.zip";
export const AGENT_DOWNLOAD_URL = `/downloads/${AGENT_DOWNLOAD_FILE}`;

export const AGENT_DOWNLOAD_LABEL = "Download BuktiScan Agent (ZIP)";

export const AGENT_DOWNLOAD_HINT =
  "Ekstrak ZIP (~220 MB, sudah termasuk FFmpeg), lalu jalankan BuktiScan Agent.exe. Rebuild: cd agent && pnpm dist:win:web";
