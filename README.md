# BuktiScan CSI

Sistem manajemen logistik IoT multi-tenant: pemindaian invoice + auto-record CCTV.

## Struktur

- `backend/` — NestJS API, Prisma, FFmpeg autocut, Socket.IO
- `frontend/` — Astro + React islands (TanStack Query, Zustand, DaisyUI) — dashboard admin
- `agent/` — Electron desktop di PC kasir (USB serial VCOM, FFmpeg rekam, sync clip)

## Arsitektur scan

```
Workstation (PC kasir) → BuktiScan Agent → N× ScannerConfig (USB serial COM) → Operator + CCTV
```

- **Web** = konfigurasi admin (workstation, scanner, CCTV, TTS, log scan)
- **Agent** = runtime edge di PC kasir: baca barcode dari port COM, rekam RTSP, upload klip
- Login JWT hanya untuk akses UI web
- Ingest scan memakai `scannerConfigId`, bukan user yang sedang login
- Scanner harus mode **USB VCOM/serial** (bukan HID keyboard) agar tiap meja punya port COM sendiri — mendukung hingga **6 scanner + 6 CCTV paralel** per workstation (plan PRO)

## Menjalankan

### Backend

```bash
cd backend
# pastikan backend/.env berisi DATABASE_URL, JWT_SECRET, JWT_SECRET_REFRESH
pnpm install
npx prisma db push
pnpm run format-and-seed   # atau: npx ts-node -r tsconfig-paths/register prisma/seed.ts
pnpm dev                   # port 3001
```

Seed membuat organisasi demo, workstation **PC Kasir Utama**, 2 scanner (jasa/ham), 2 CCTV, dan mock invoice scan. Password: `jasa.js` / `ham.js` (lihat `SEED_*` di `backend/.env.example`).

### Frontend

```bash
cd frontend
pnpm install
pnpm dev   # bind 0.0.0.0:4321 — buka http://IP-server:4321 di browser
```

Login lewat proxy `/api` → backend.

### Agent (PC kasir)

```bash
cd agent
pnpm install
pnpm dev          # development
pnpm dist:win     # build installer Windows
```

## Setup scanner di kasir

1. Admin buat **Workstation** + **ScannerConfig** di web → Perangkat → Workstation & Scanner
2. Assign operator + CCTV per scanner (1:1:1)
3. Install **BuktiScan Agent** di PC kasir, pairing workstation
4. Di agent tab **Scanner**: pair tiap scanner — pilih **port COM** (tersimpan per scanner, termasuk 6 unit model sama)
5. Scan barcode → agent ingest + rekam CCTV operator yang di-assign
6. Preview live (Monitor/Kamera) opsional — matikan saat operasional penuh untuk hemat resource PC

## API utama

| Endpoint                                | Keterangan                          |
| --------------------------------------- | ----------------------------------- |
| `POST /api/user/login`                  | Login username + password           |
| `GET/POST /api/workstation`             | CRUD PC kasir                       |
| `GET/POST /api/scanner-config`          | CRUD scanner + assign operator/CCTV |
| `POST /api/invoice-scan/ingest/scanner` | Scan via `scannerConfigId`          |
| `GET/POST /api/cctv-config`             | Pengaturan RTSP                     |
| `POST /api/agent/scanner/:id/pair-usb`  | Pair COM + VID/PID dari agent       |

WebSocket: `join_org` → event `scan-log-update`, `device-status-update`
