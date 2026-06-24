# BuktiScan CSI

Sistem manajemen logistik IoT multi-tenant: pemindaian invoice + auto-record CCTV.

## Struktur

- `backend/` — NestJS API, Prisma, FFmpeg autocut, Socket.IO
- `frontend/` — Astro + React islands (TanStack Query, Zustand, DaisyUI)
- `old frontend/` — arsip Next.js (Orbit), referensi saja

## Arsitektur scan

```
Workstation (PC kasir) → ScannerConfig (USB serial) → Operator + CCTV
```

- Login JWT hanya untuk akses UI
- Ingest scan memakai `scannerConfigId`, bukan user yang sedang login
- Web Serial API (Chrome/Edge) membaca barcode dari port COM scanner Panda

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

Login lewat proxy `/api` → backend. Halaman scan butuh **Chrome atau Edge** untuk Web Serial.

## Setup scanner di kasir

1. Admin buat **Workstation** + **ScannerConfig** di Perangkat → tab Workstation & Scanner
2. Assign operator + CCTV per scanner (1:1:1)
3. Klik **Pair USB** untuk simpan Vendor/Product ID scanner
4. Di PC kasir: buka halaman Scan, pilih workstation, **Hubungkan USB** per scanner
5. Scan barcode → otomatis ingest ke CCTV operator yang di-assign

## API utama

| Endpoint                                | Keterangan                          |
| --------------------------------------- | ----------------------------------- |
| `POST /api/user/login`                  | Login username + password           |
| `GET/POST /api/workstation`             | CRUD PC kasir                       |
| `GET/POST /api/scanner-config`          | CRUD scanner + assign operator/CCTV |
| `POST /api/invoice-scan/ingest/scanner` | Scan via `scannerConfigId`          |
| `GET/POST /api/cctv-config`             | Pengaturan RTSP                     |

WebSocket: `join_org` → event `scan-log-update`, `device-status-update`
