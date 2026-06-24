# BuktiScan Agent download

**File:** `BuktiScanAgent-portable.zip` (~220 MB, termasuk FFmpeg Windows)

Portable Windows build (Electron). Customer workflow:

1. Download ZIP from dashboard
2. Extract to e.g. `C:\BuktiScan Agent\`
3. Run `BuktiScan Agent.exe`
4. Pair with code from dashboard

## Rebuild (on Linux CI / dev server)

```bash
cd agent
pnpm install
pnpm dist:win:web
```

`dist:win` otomatis mengunduh `ffmpeg.exe` (Windows x64) sebelum pack. Salin ke frontend:

```bash
cp release/BuktiScanAgent-portable.zip ../frontend/public/downloads/
```

**Fallback:** jika preview/rekam masih gagal, install FFmpeg di PATH Windows atau set `FFMPEG_PATH` di `.env` sebelah exe.

## NSIS installer (.exe setup)

Build on **Windows**:

```bash
cd agent
pnpm install
pnpm dist:win
```

Copy `release/BuktiScanAgent-setup.exe` here if you switch back to NSIS target in `package.json`.
